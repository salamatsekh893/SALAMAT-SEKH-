import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { fetchWithAuth } from '../lib/api';

export function usePermissions() {
  const { user } = useAuth();
  const [myPermissions, setMyPermissions] = useState<string[] | null>(user?.permissions || null);

  useEffect(() => {
    if (user && user?.role !== 'superadmin') {
      fetchWithAuth('/role_permissions')
        .then(data => {
          if (Array.isArray(data)) {
            const rolePerms = data.find((r: any) => r?.role === user?.role);
            if (rolePerms) {
              setMyPermissions(JSON.parse(rolePerms.permissions));
            } else {
              setMyPermissions([]);
            }
          }
        })
        .catch(() => {});
    }
  }, [user?.role]);
  
  const hasPermission = (permissionId: string) => {
    if (!user) return false;
    
    // Superadmin has all permissions
    if (user?.role === 'superadmin') return true;
    
    // Check if permissions exist
    if (myPermissions && Array.isArray(myPermissions)) {
       return myPermissions.includes(permissionId);
    }
    
    // Fallback: strict mode
    return false;
  };

  return {
    canCreate: hasPermission('action_create'),
    canEdit:   hasPermission('action_edit'),
    canDelete: hasPermission('action_delete'),
    hasPermission
  };
}
