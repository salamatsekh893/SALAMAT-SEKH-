import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/api';

type User = {
  id: number;
  name: string;
  role: string;
  branchId: number | null;
  photo_url?: string | null;
  phone?: string;
  email?: string;
  join_date?: string;
  address?: string;
  permissions?: string[];
} | null;

export function useAuth() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const normalizeUser = (u: any) => {
    if (!u) return null;
    const finalBranchId = u.branchId !== undefined ? u.branchId : u.branch_id;
    return {
      ...u,
      branchId: finalBranchId !== undefined ? finalBranchId : null,
      branch_id: finalBranchId !== undefined ? finalBranchId : null
    };
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    const initAuth = async () => {
      if (savedUser && token) {
        try {
          let parsedUser = JSON.parse(savedUser);
          if (parsedUser && parsedUser.role === 'collector') {
            parsedUser.role = 'fo';
          }
          parsedUser = normalizeUser(parsedUser);
          localStorage.setItem('user', JSON.stringify(parsedUser));
          setUser(parsedUser);
          
          // Background fetch to update user info silently
          fetchWithAuth('/me')
          .then(data => {
            if (!data.error) {
               const updatedUser = normalizeUser({ ...parsedUser, ...data });
               localStorage.setItem('user', JSON.stringify(updatedUser));
               setUser(updatedUser);
            }
          })
          .catch(err => {
            // Silently ignore network errors during background profile fetch
            // console.error("Failed to fetch latest profile", err);
          });
          
        } catch (e) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    
    initAuth();
  }, []);

  const login = (userData: User, token: string) => {
    const normalized = normalizeUser(userData);
    localStorage.setItem('user', JSON.stringify(normalized));
    localStorage.setItem('token', token);
    setUser(normalized);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  const getToken = () => localStorage.getItem('token');

  return { user, loading, login, logout, getToken };
}
