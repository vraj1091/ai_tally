"""
Authentication Helper
Exports get_current_user for use in other routes
"""

# Import will be done lazily to avoid circular imports
def get_current_user(*args, **kwargs):
    """Lazy import to avoid circular dependency"""
    from app.routes.auth_routes import get_current_user as _get_current_user
    return _get_current_user(*args, **kwargs)

__all__ = ["get_current_user"]