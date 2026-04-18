"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi, User, setToken, removeToken } from "./api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (emailOrToken: string, passwordOrUser?: string | User | null) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch {
      removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (emailOrToken: string, passwordOrUser?: string | User | null) => {
    // Check if this is a token-based login (from OAuth callback)
    if (typeof passwordOrUser === "object" || passwordOrUser === null || passwordOrUser === undefined) {
      // Token-based login
      if (emailOrToken.trim()) {
        setToken(emailOrToken);
      }
      if (passwordOrUser && typeof passwordOrUser === "object") {
        setUser(passwordOrUser as User);
        setIsLoading(false);
      } else {
        await refreshUser();
      }
    } else {
      // Email/password login
      const response = await authApi.login(emailOrToken, passwordOrUser);
      setToken(response.access_token);
      await refreshUser();
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await authApi.register(email, password, name);
    setToken(response.access_token);
    await refreshUser();
  };

  const logout = () => {
    void authApi.logout().catch(() => {
      // Ignore network failures and clear client state anyway.
    });
    removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
