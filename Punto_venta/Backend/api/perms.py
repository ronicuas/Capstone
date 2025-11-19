# api/perms.py
from rest_framework.permissions import BasePermission

class InGroup(BasePermission):
    def __init__(self, *groups): self.groups = set(groups)
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated: return False
        return request.user.groups.filter(name__in=self.groups).exists() or request.user.is_superuser

# helper para declarar bonito
def group_perm(*names):
    class _P(InGroup):
        def __init__(self): super().__init__(*names)
    return _P
