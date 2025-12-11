"""
WebSocket Bridge Routes
Handles WebSocket connections from user's local TallyDash Bridge

This enables real-time communication between cloud and user's local Tally
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Dict, Optional, List
import json
import asyncio
import logging
from datetime import datetime
import uuid

from app.models.database import get_db

logger = logging.getLogger(__name__)

# Main router for HTTP API endpoints (mounted at /api/bridge)
router = APIRouter()

# Separate router for WebSocket endpoints (mounted at root)
ws_router = APIRouter()


class BridgeConnectionManager:
    """Manage active WebSocket bridge connections"""
    
    def __init__(self):
        # Key: user_token, Value: WebSocket
        self.connections: Dict[str, WebSocket] = {}
        # Key: user_token, Value: connection info
        self.bridge_info: Dict[str, dict] = {}
        # Pending requests waiting for response
        self.pending_requests: Dict[str, asyncio.Future] = {}
    
    async def connect(self, user_token: str, websocket: WebSocket) -> bool:
        """Register a new bridge connection"""
        await websocket.accept()
        
        # Close existing connection if any
        if user_token in self.connections:
            try:
                await self.connections[user_token].close()
            except:
                pass
        
        self.connections[user_token] = websocket
        self.bridge_info[user_token] = {
            'connected_at': datetime.utcnow().isoformat(),
            'tally_connected': False,
            'tally_url': 'unknown',
            'last_activity': datetime.utcnow().isoformat()
        }
        
        logger.info(f"✅ Bridge connected: {user_token[:8]}...")
        return True
    
    def disconnect(self, user_token: str):
        """Remove a bridge connection"""
        if user_token in self.connections:
            del self.connections[user_token]
        if user_token in self.bridge_info:
            del self.bridge_info[user_token]
        logger.info(f"🔌 Bridge disconnected: {user_token[:8]}...")
    
    def is_connected(self, user_token: str) -> bool:
        """Check if bridge is connected"""
        return user_token in self.connections
    
    def get_websocket(self, user_token: str) -> Optional[WebSocket]:
        """Get WebSocket for a user"""
        return self.connections.get(user_token)
    
    def update_info(self, user_token: str, info: dict):
        """Update bridge info"""
        if user_token in self.bridge_info:
            self.bridge_info[user_token].update(info)
            self.bridge_info[user_token]['last_activity'] = datetime.utcnow().isoformat()
    
    def get_all_bridges(self) -> List[dict]:
        """Get all connected bridges"""
        return [
            {
                'token': token[:8] + '...',
                'connected': True,
                **info
            }
            for token, info in self.bridge_info.items()
        ]
    
    async def send_to_bridge(self, user_token: str, message: dict) -> dict:
        """Send message to bridge and wait for response"""
        ws = self.get_websocket(user_token)
        if not ws:
            return {'success': False, 'error': 'Bridge not connected'}
        
        request_id = str(uuid.uuid4())
        message['id'] = request_id
        
        # Create future for response
        future = asyncio.get_event_loop().create_future()
        self.pending_requests[request_id] = future
        
        try:
            await ws.send_text(json.dumps(message))
            
            # Wait for response with timeout
            response = await asyncio.wait_for(future, timeout=message.get('timeout', 60))
            return response
            
        except asyncio.TimeoutError:
            return {'success': False, 'error': 'Request timed out'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
        finally:
            if request_id in self.pending_requests:
                del self.pending_requests[request_id]
    
    def handle_response(self, request_id: str, response: dict):
        """Handle response from bridge"""
        if request_id in self.pending_requests:
            self.pending_requests[request_id].set_result(response)


# Global connection manager
bridge_manager = BridgeConnectionManager()


@ws_router.websocket("/ws/tally-bridge/{user_token}")
async def tally_bridge_websocket(websocket: WebSocket, user_token: str):
    """
    WebSocket endpoint for TallyDash Bridge connections
    
    User's bridge client connects here and maintains persistent connection.
    Cloud can send Tally requests through this WebSocket.
    """
    if not user_token or len(user_token) < 8:
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    await bridge_manager.connect(user_token, websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get('type', '')
            request_id = message.get('id', '')
            
            if msg_type == 'bridge_ready':
                bridge_manager.update_info(user_token, {
                    'tally_connected': message.get('tally_connected', False),
                    'tally_url': message.get('tally_url', 'unknown')
                })
                logger.info(f"📡 Bridge ready: Tally={message.get('tally_connected')}")
                
            elif msg_type == 'pong':
                bridge_manager.update_info(user_token, {'last_ping': datetime.utcnow().isoformat()})
                
            elif msg_type in ['tally_response', 'companies_response', 'status_response']:
                # Response from bridge - resolve pending request
                bridge_manager.handle_response(request_id, message)
                
    except WebSocketDisconnect:
        bridge_manager.disconnect(user_token)
    except Exception as e:
        logger.error(f"Bridge error: {e}")
        bridge_manager.disconnect(user_token)


@router.get("/bridges")
async def list_bridges():
    """List all connected bridges"""
    bridges = bridge_manager.get_all_bridges()
    return {
        'success': True,
        'count': len(bridges),
        'bridges': bridges
    }


@ws_router.websocket("/ws/test")
async def websocket_test(websocket: WebSocket):
    """
    Simple WebSocket test endpoint for debugging connectivity
    Connect and receive a test message, then echo back any messages
    """
    await websocket.accept()
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket test connection successful!",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Echo loop
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({
                "type": "echo",
                "received": data,
                "timestamp": datetime.utcnow().isoformat()
            })
    except WebSocketDisconnect:
        logger.info("WebSocket test client disconnected")
    except Exception as e:
        logger.error(f"WebSocket test error: {e}")


@router.get("/{user_token}/status")
async def get_bridge_status(user_token: str):
    """Get status of a specific bridge (route: /api/bridge/{token}/status)"""
    if not bridge_manager.is_connected(user_token):
        return {
            'success': True,
            'connected': False,
            'message': 'Bridge not connected. Run TallyDash Bridge on your PC.'
        }
    
    # Request status from bridge
    response = await bridge_manager.send_to_bridge(user_token, {
        'type': 'status',
        'timeout': 10
    })
    
    return {
        'success': True,
        'connected': True,
        **response
    }


@router.post("/{user_token}/tally")
async def proxy_tally_request(user_token: str, request: dict):
    """
    Proxy a Tally request through the bridge (route: /api/bridge/{token}/tally)
    
    Frontend calls this endpoint, it forwards to user's bridge,
    bridge queries local Tally and returns response.
    """
    if not bridge_manager.is_connected(user_token):
        raise HTTPException(
            status_code=503,
            detail="Bridge not connected. Please run TallyDash Bridge on your PC."
        )
    
    response = await bridge_manager.send_to_bridge(user_token, {
        'type': 'tally_request',
        'method': request.get('method', 'POST'),
        'payload': request.get('payload', ''),
        'headers': request.get('headers', {'Content-Type': 'text/xml'}),
        'timeout': request.get('timeout', 60)
    })
    
    if not response.get('success'):
        raise HTTPException(status_code=502, detail=response.get('error', 'Unknown error'))
    
    return response


@router.get("/{user_token}/companies")
async def get_companies_via_bridge(user_token: str):
    """Get companies from Tally via bridge (route: /api/bridge/{token}/companies)"""
    if not bridge_manager.is_connected(user_token):
        raise HTTPException(
            status_code=503,
            detail="Bridge not connected"
        )
    
    response = await bridge_manager.send_to_bridge(user_token, {
        'type': 'get_companies',
        'timeout': 30
    })
    
    return response


# Helper function for other routes to use
async def get_tally_data_via_bridge(user_token: str, xml_request: str) -> Optional[str]:
    """
    Helper to get Tally data via bridge
    Can be called from other routes
    """
    if not bridge_manager.is_connected(user_token):
        return None
    
    response = await bridge_manager.send_to_bridge(user_token, {
        'type': 'tally_request',
        'method': 'POST',
        'payload': xml_request,
        'headers': {'Content-Type': 'text/xml'},
        'timeout': 60
    })
    
    if response.get('success'):
        return response.get('content')
    return None

