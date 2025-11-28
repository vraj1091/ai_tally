"""
Phi4 Service
Direct interface to Phi4:14b via Ollama
"""

import requests
import json
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class Phi4Service:
    """Service for Phi4:14b LLM via Ollama"""
    
    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "phi4:14b"
    ):
        self.base_url = base_url
        self.model = model
        self.api_url = f"{base_url}/api"
    
    def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        top_p: float = 0.9,
        top_k: int = 40,
        max_tokens: int = 2048
    ) -> str:
        """
        Generate text using Phi4:14b
        
        Args:
            prompt: Input prompt
            temperature: Sampling temperature
            top_p: Nucleus sampling parameter
            top_k: Top-k sampling parameter
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text
        """
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "top_p": top_p,
                    "top_k": top_k,
                    "num_predict": max_tokens
                }
            }
            
            response = requests.post(
                f"{self.api_url}/generate",
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "")
            else:
                logger.error(f"Phi4 API error: {response.status_code}")
                return ""
                
        except Exception as e:
            logger.error(f"Error generating with Phi4: {e}")
            return ""
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3
    ) -> str:
        """
        Chat with Phi4:14b
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature
            
        Returns:
            Response text
        """
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature
                }
            }
            
            response = requests.post(
                f"{self.api_url}/chat",
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("message", {}).get("content", "")
            else:
                logger.error(f"Phi4 chat API error: {response.status_code}")
                return ""
                
        except Exception as e:
            logger.error(f"Error in Phi4 chat: {e}")
            return ""
    
    def is_available(self) -> bool:
        """Check if Phi4 model is available"""
        try:
            response = requests.get(f"{self.api_url}/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                return any(m.get("name") == self.model for m in models)
            return False
        except Exception as e:
            logger.error(f"Error checking Phi4 availability: {e}")
            return False
    
    def get_model_info(self) -> Dict:
        """Get information about the Phi4 model"""
        try:
            response = requests.post(
                f"{self.api_url}/show",
                json={"name": self.model},
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            return {}
        except Exception as e:
            logger.error(f"Error getting model info: {e}")
            return {}
 
