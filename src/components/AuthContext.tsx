import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { default as api, LoginData, SignupData } from '@/lib/auth';

interface User {
  id: string;
  userId: string; // Add this for consistency with JWT token
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  username?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: string) => Promise<void>;
  register: (userData: SignupData) => Promise<any>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token with backend
      api.get('/auth/verify')
        .then(response => {
          setUser(response.data.user);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, role: string) => {
    try {
      let loginRole = role;

      // If email ends with @admin.com, automatically set role to admin
      if (email.toLowerCase().endsWith('@admin.com')) {
        loginRole = 'admin';
      }

      const response = await api.post('/auth/login', {
        email,
        password,
        role: loginRole,
      });

      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      setUser(userData);

      // If email is admin email, store that it's an admin login
      if (email.toLowerCase().endsWith('@admin.com')) {
        localStorage.setItem('isAdminLogin', 'true');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (userData: SignupData) => {
    try {
      const response = await api.post('/auth/register', userData);

      // Auto-login if token is provided
      if (response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};