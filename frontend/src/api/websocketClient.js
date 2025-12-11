/**
 * WebSocket Client for Tally Bridge Connection
 * Connects frontend to backend WebSocket for real-time Tally communication
 */

class TallyBridgeWebSocket {
  constructor() {
    this.socket = null;
    this.userToken = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000; // 3 seconds
    this.messageHandlers = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * Get WebSocket URL based on environment
   * Supports: EC2 (via nginx proxy), Render, Hugging Face, local development
   */
  getWebSocketUrl(userToken) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isRender = hostname.includes('onrender.com') || hostname.includes('render.com');
    
    // Check for explicit WebSocket URL first (highest priority)
    const wsUrl = import.meta.env.VITE_WS_URL;
    if (wsUrl) {
      console.log('🔌 Using VITE_WS_URL:', wsUrl);
      return `${wsUrl}/ws/tally-bridge/${userToken}`;
    }
    
    // Check for API URL and convert to WebSocket
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      // Convert HTTP URL to WebSocket URL
      const convertedWsUrl = apiUrl
        .replace('https://', 'wss://')
        .replace('http://', 'ws://')
        .replace('/api', '');
      console.log('🔌 Converted from VITE_API_URL:', convertedWsUrl);
      return `${convertedWsUrl}/ws/tally-bridge/${userToken}`;
    }
    
    // Render deployment - use Hugging Face backend
    if (isRender) {
      return `wss://vraj1091-ai-tally-backend.hf.space/ws/tally-bridge/${userToken}`;
    }
    
    // EC2 or other production (accessed via IP or domain)
    // Use same host - nginx proxies /ws/ to backend
    if (!isLocalhost) {
      // In EC2/production, nginx handles WebSocket proxy on same port
      // Use port from current location (default 80/443)
      const wsUrlProd = `${protocol}//${hostname}/ws/tally-bridge/${userToken}`;
      console.log('🔌 Production WebSocket URL:', wsUrlProd);
      return wsUrlProd;
    }
    
    // Local development - connect directly to backend port
    const wsUrlDev = `${protocol}//${hostname}:8000/ws/tally-bridge/${userToken}`;
    console.log('🔌 Development WebSocket URL:', wsUrlDev);
    return wsUrlDev;
  }

  /**
   * Connect to WebSocket
   */
  connect(userToken) {
    if (this.socket && this.isConnected) {
      console.log('WebSocket already connected');
      return Promise.resolve(true);
    }

    this.userToken = userToken;
    const wsUrl = this.getWebSocketUrl(userToken);

    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Send ready message
          this.send({
            type: 'bridge_ready',
            tally_connected: false,
            tally_url: 'browser'
          });
          
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.socket.onclose = (event) => {
          console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
          this.isConnected = false;
          
          // Attempt reconnect if not intentional close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        };

        // Timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.userToken) {
        this.connect(this.userToken).catch(err => {
          console.error('Reconnection failed:', err);
        });
      }
    }, delay);
  }

  /**
   * Send message through WebSocket
   */
  send(message) {
    if (!this.socket || !this.isConnected) {
      console.error('WebSocket not connected');
      return false;
    }

    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * Send request and wait for response
   */
  async sendRequest(message, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      message.id = requestId;

      // Set up response handler
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, timeout);

      this.pendingRequests.set(requestId, {
        resolve: (response) => {
          clearTimeout(timeoutId);
          this.pendingRequests.delete(requestId);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          this.pendingRequests.delete(requestId);
          reject(error);
        }
      });

      // Send the message
      if (!this.send(message)) {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(requestId);
        reject(new Error('Failed to send message'));
      }
    });
  }

  /**
   * Handle incoming messages
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      const { type, id } = message;

      // Check if this is a response to a pending request
      if (id && this.pendingRequests.has(id)) {
        const handler = this.pendingRequests.get(id);
        handler.resolve(message);
        return;
      }

      // Handle different message types
      switch (type) {
        case 'ping':
          this.send({ type: 'pong', id });
          break;
          
        case 'tally_request':
          // Forward to local Tally (if running in bridge mode)
          this.handleTallyRequest(message);
          break;
          
        case 'status':
          this.send({
            type: 'status_response',
            id,
            connected: true,
            tally_available: false, // Browser can't access local Tally
            message: 'Browser WebSocket client connected'
          });
          break;

        default:
          // Call registered handlers
          if (this.messageHandlers.has(type)) {
            this.messageHandlers.get(type)(message);
          }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Handle Tally request (for bridge mode)
   */
  async handleTallyRequest(message) {
    // In browser mode, we can't directly access Tally
    // This is for when running as a desktop bridge
    this.send({
      type: 'tally_response',
      id: message.id,
      success: false,
      error: 'Browser cannot access local Tally. Use desktop bridge instead.'
    });
  }

  /**
   * Register message handler
   */
  onMessage(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove message handler
   */
  offMessage(type) {
    this.messageHandlers.delete(type);
  }

  /**
   * Check connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      userToken: this.userToken ? `${this.userToken.slice(0, 8)}...` : null,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Singleton instance
const tallyBridgeWebSocket = new TallyBridgeWebSocket();

export default tallyBridgeWebSocket;
export { TallyBridgeWebSocket };

