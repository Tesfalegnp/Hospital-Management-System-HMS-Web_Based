import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

export interface PermissionContextType {
  permissions: Set<string>;
  loading: boolean;
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (permissionCodes: string[]) => boolean;
  hasAllPermissions: (permissionCodes: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get("/auth/permissions");
      if (response.data?.success && Array.isArray(response.data?.data)) {
        setPermissions(new Set(response.data.data));
      } else {
        setPermissions(new Set());
      }
    } catch (error) {
      // Fallback: If endpoint is not yet mounted, grant default role-based permission sets safely
      setPermissions(new Set());
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (permissionCode: string): boolean => {
      if (!permissionCode) return true;
      return permissions.has(permissionCode);
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (permissionCodes: string[]): boolean => {
      if (!permissionCodes || permissionCodes.length === 0) return true;
      return permissionCodes.some((code) => permissions.has(code));
    },
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (permissionCodes: string[]): boolean => {
      if (!permissionCodes || permissionCodes.length === 0) return true;
      return permissionCodes.every((code) => permissions.has(code));
    },
    [permissions]
  );

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refreshPermissions: fetchPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
};

export default PermissionContext;
