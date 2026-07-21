import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../context/PermissionContext";

export interface ProtectedRouteProps {
  allowedRoles?: ("SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "NURSE" | "RECEPTIONIST" | "PHARMACIST" | "LAB_TECHNICIAN" | "ACCOUNTANT" | "PATIENT")[];
  requiredPermissions?: string[];
  requireAll?: boolean;
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  requiredPermissions,
  requireAll = false,
  fallbackPath = "/",
}) => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { hasAnyPermission, hasAllPermissions, loading: isPermLoading } = usePermissions();

  if (isAuthLoading || isPermLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // 1. Role-based Guarding (Backward Compatibility)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // 2. Permission-driven Guarding
  if (requiredPermissions && requiredPermissions.length > 0) {
    const isAuthorized = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!isAuthorized) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
