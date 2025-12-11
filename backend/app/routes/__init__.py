"""Routes module"""
from . import chat_routes
from . import tally_routes
from . import document_routes
from . import analytics_routes
from . import vector_store_routes
from . import google_drive_routes
from . import auth_routes
from . import specialized_analytics_routes
from . import backup_routes

__all__ = [
    'chat_routes',
    'tally_routes',
    'document_routes',
    'analytics_routes',
    'vector_store_routes',
    'google_drive_routes',
    'auth_routes',
    'specialized_analytics_routes',
    'backup_routes'
]
 
