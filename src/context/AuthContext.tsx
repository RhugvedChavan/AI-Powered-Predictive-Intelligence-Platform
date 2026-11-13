import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const me = await authService.getMe();
          setUser(me);
        } catch (err) {
          console.error("Token validation failed, logging in as demo user...", err);
          await attemptDemoLogin();
        }
      } else {
        await attemptDemoLogin();
      }
      setIsLoading(false);
    };

    const attemptDemoLogin = async () => {
      try {
        const res = await authService.login('demo@gmail.com', 'demo12345');
        localStorage.setItem('token', res.access_token);
        setToken(res.access_token);
        setUser(res.user);
      } catch (e) {
        console.warn("Demo login unavailable:", e);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password);
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const register = async (email: string, password: string, fullName: string) => {
    const res = await authService.register(email, password, fullName);
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

