import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../utils/constants';
import type { AuthUser } from '../types';

interface UseAuthReturn {
  user: AuthUser | null;
  token: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('cd_token');
    const savedUser = localStorage.getItem('cd_user');
    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as AuthUser;
        setUser(parsed);
        setToken(savedToken);
      } catch {
        localStorage.removeItem('cd_token');
        localStorage.removeItem('cd_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('cd_token', data.token);
    localStorage.setItem('cd_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cd_token');
    localStorage.removeItem('cd_user');
    setToken(null);
    setUser(null);
  }, []);

  return {
    user,
    token,
    isAdmin: user?.role === 'admin' || user?.role === 'super-admin',
    isLoading,
    login,
    logout,
  };
};

export default useAuth;
