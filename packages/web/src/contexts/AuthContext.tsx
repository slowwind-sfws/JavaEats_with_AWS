import React, { createContext, useState, useContext, ReactNode } from 'react';
import { AuthService } from '../services/authService';

interface AuthContextType {
  isLoggedIn: boolean;
  signIn: (username: string, password: string) => Promise<any>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(AuthService.isLoggedIn());

  const signIn = async (username: string, password: string) => {
    const result = await AuthService.signIn(username, password);
    setIsLoggedIn(true);
    return result;
  };

  const signOut = () => {
    AuthService.signOut();
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, signIn, signOut }}>
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
