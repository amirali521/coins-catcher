"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  uid: string;
  email: string;
  displayName: string;
  coins: number;
  referralCode: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string) => void;
  signup: (name: string, email: string) => void;
  logout: () => void;
  updateCoins: (newCoins: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('coinCatcherUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (email: string) => {
    setLoading(true);
    const mockUser: User = { 
        uid: '123', 
        email, 
        displayName: email.split('@')[0], 
        coins: 1000, 
        referralCode: 'AB12CD34'
    };
    localStorage.setItem('coinCatcherUser', JSON.stringify(mockUser));
    setUser(mockUser);
    setLoading(false);
    router.push('/dashboard');
  };

  const signup = (name: string, email: string) => {
    setLoading(true);
    const mockUser: User = { 
        uid: '123', 
        email, 
        displayName: name, 
        coins: 500, // Welcome bonus
        referralCode: 'AB12CD34'
    };
    localStorage.setItem('coinCatcherUser', JSON.stringify(mockUser));
    setUser(mockUser);
    setLoading(false);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('coinCatcherUser');
    setUser(null);
    router.push('/login');
  };

  const updateCoins = (newCoins: number) => {
    if (user) {
      const updatedUser = { ...user, coins: newCoins };
      setUser(updatedUser);
      localStorage.setItem('coinCatcherUser', JSON.stringify(updatedUser));
    }
  };

  const value = { user, loading, login, signup, logout, updateCoins };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
