import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "../services/api";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "NURSE" | "RECEPTIONIST" | "PHARMACIST" | "LAB_TECHNICIAN" | "ACCOUNTANT" | "PATIENT";
  branchId?: string | null;
  departmentId?: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Attempt silent token refresh check on mounting to retrieve logged-in profiles
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const response = await api.post("/auth/refresh");
        if (response.data?.success && response.data?.data) {
          if (response.data.accessToken) {
            localStorage.setItem("token", response.data.accessToken);
          }
          setUser(response.data.data);
        }
      } catch (error) {
        // Silent catch: no active sessions or invalid tokens
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkActiveSession();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", credentials);
      if (response.data?.success && response.data?.data) {
        if (response.data.accessToken) {
          localStorage.setItem("token", response.data.accessToken);
        }
        setUser(response.data.data);
      }
    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // Clear state regardless of server logout response
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
