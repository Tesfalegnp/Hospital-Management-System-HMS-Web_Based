import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import PermissionGate from "../../components/auth/PermissionGate";
import {
  ShieldAlert,
  Search,
  Filter,
  PlusCircle,
  Edit2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  ArrowLeft,
  ArrowRight,
  Lock,
  Trash2,
  Key,
  Layers,
  UserCheck
} from "lucide-react";

interface RoleItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  level: number | null;
  isSystem: boolean;
  isBuiltIn: boolean;
  isActive: boolean;
  isTemplate: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  parentRole?: {
    id: string;
    code: string;
    name: string;
  } | null;
  _count?: {
    rolePermissions: number;
    userRoles: number;
  };
}

interface PermissionItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
  resource: string;
  action: string;
  category: string;
  isSystem: boolean;
  isActive: boolean;
}

interface AssignedRolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: string;
  permission: PermissionItem;
}

export const RoleManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [systemFilter, setSystemFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  // Modal & Drawer States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPermissionDrawerOpen, setIsPermissionDrawerOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Permission Assignment Selection State
  const [permissionToAddId, setPermissionToAddId] = useState("");

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    description: "",
    level: 0,
    parentId: "",
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    level: 0,
    parentId: "",
  });

  // Query: Roles List
  const { data: rolesData, isLoading: isRolesLoading, isError: isRolesError, refetch: refetchRoles } = useQuery({
    queryKey: ["roles", searchTerm, statusFilter, systemFilter, currentPage],
    queryFn: async () => {
      const res = await api.get("/roles", {
        params: {
          search: searchTerm || undefined,
          isActive: statusFilter === "" ? undefined : statusFilter === "active",
          isSystem: systemFilter === "" ? undefined : systemFilter === "system",
          page: currentPage,
          limit,
        },
      });
      return res.data;
    },
  });

  // Query: All Roles for Parent Dropdown selection
  const { data: allRolesData } = useQuery({
    queryKey: ["all-roles-dropdown"],
    queryFn: async () => {
      const res = await api.get("/roles", { params: { limit: 100, isActive: true } });
      return res.data;
    },
  });

  // Query: Master Permission Catalog for Assignment
  const { data: allPermissionsData } = useQuery({
    queryKey: ["all-permissions-catalog"],
    queryFn: async () => {
      const res = await api.get("/permissions", { params: { limit: 200, isActive: true } });
      return res.data;
    },
    enabled: isPermissionDrawerOpen,
  });

  // Query: Currently Assigned Permissions for Selected Role
  const {
    data: rolePermissionsData,
    isLoading: isRolePermissionsLoading,
    refetch: refetchRolePermissions,
  } = useQuery({
    queryKey: ["role-permissions", selectedRole?.id],
    queryFn: async () => {
      if (!selectedRole) return [];
      const res = await api.get(`/roles/${selectedRole.id}/permissions`);
      return res.data;
    },
    enabled: !!selectedRole && isPermissionDrawerOpen,
  });

  const roles: RoleItem[] = rolesData?.data || [];
  const meta = rolesData?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };
  const dropdownRoles: RoleItem[] = allRolesData?.data || [];
  const masterPermissions: PermissionItem[] = allPermissionsData?.data || [];
  const assignedPermissions: AssignedRolePermission[] = rolePermissionsData?.data || [];

  // Set of assigned permission IDs for filtering available permissions
  const assignedPermissionIds = new Set(assignedPermissions.map((rp) => rp.permissionId));
  const availablePermissions = masterPermissions.filter((p) => !assignedPermissionIds.has(p.id));

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: typeof createForm) => {
      const res = await api.post("/roles", {
        ...payload,
        parentId: payload.parentId || null,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["all-roles-dropdown"] });
      setIsCreateOpen(false);
      setCreateForm({ name: "", code: "", description: "", level: 0, parentId: "" });
      setSuccessMsg("Enterprise role created successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to create role.");
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof editForm }) => {
      const res = await api.put(`/roles/${id}`, {
        ...payload,
        parentId: payload.parentId === "" ? null : payload.parentId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["all-roles-dropdown"] });
      setIsEditOpen(false);
      setSelectedRole(null);
      setSuccessMsg("Role definition updated successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to update role.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await api.patch(`/roles/${id}/status`, { isActive });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setSuccessMsg(`Role ${variables.isActive ? "enabled" : "disabled"} successfully!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to toggle role status.");
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/roles/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["all-roles-dropdown"] });
      setSuccessMsg("Custom role deleted successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to delete role.");
    },
  });

  const assignPermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: string; permissionId: string }) => {
      const res = await api.post(`/roles/${roleId}/permissions`, { permissionId });
      return res.data;
    },
    onSuccess: () => {
      refetchRolePermissions();
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setPermissionToAddId("");
      setSuccessMsg("Permission granted to role successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to assign permission.");
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: string; permissionId: string }) => {
      const res = await api.delete(`/roles/${roleId}/permissions/${permissionId}`);
      return res.data;
    },
    onSuccess: () => {
      refetchRolePermissions();
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setSuccessMsg("Permission revoked from role successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to revoke permission.");
    },
  });

  const handleOpenEdit = (role: RoleItem) => {
    setSelectedRole(role);
    setEditForm({
      name: role.name,
      description: role.description || "",
      level: role.level || 0,
      parentId: role.parentId || "",
    });
    setErrorMsg(null);
    setIsEditOpen(true);
  };

  const handleOpenPermissionDrawer = (role: RoleItem) => {
    setSelectedRole(role);
    setErrorMsg(null);
    setPermissionToAddId("");
    setIsPermissionDrawerOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    createMutation.mutate(createForm);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setErrorMsg(null);
    editMutation.mutate({ id: selectedRole.id, payload: editForm });
  };

  const handleAssignPermissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !permissionToAddId) return;
    setErrorMsg(null);
    assignPermissionMutation.mutate({ roleId: selectedRole.id, permissionId: permissionToAddId });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center space-x-2">
            <ShieldAlert className="h-6 w-6 text-indigo-600" />
            <span>Enterprise Role Management Console</span>
          </h1>
          <p className="text-xs font-semibold text-gray-500 mt-1">
            Define, structure, and inherit granular permission sets across enterprise role definitions.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <button
            onClick={() => refetchRoles()}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Roles</span>
          </button>

          <PermissionGate permission="system:role:create">
            <button
              onClick={() => {
                setErrorMsg(null);
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create New Role</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search role name, code, or description..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="disabled">Disabled Only</option>
          </select>

          <select
            value={systemFilter}
            onChange={(e) => {
              setSystemFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Role Types</option>
            <option value="system">System Core</option>
            <option value="custom">Custom Roles</option>
          </select>
        </div>
      </div>

      {/* Roles Data Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
        {isRolesLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
            <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading Role Registry...</span>
          </div>
        ) : isRolesError ? (
          <div className="py-12 text-center text-red-500 text-xs font-semibold">
            Failed to load role definitions. Please check authorization or network connection.
          </div>
        ) : roles.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs font-medium space-y-1">
            <ShieldAlert className="h-8 w-8 text-gray-300 mx-auto" />
            <p className="font-bold text-gray-700">No roles found</p>
            <p>No role records match your active query filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100 text-4xs font-extrabold uppercase tracking-widest text-gray-400">
                  <th className="py-3 px-4">Role Name & Code</th>
                  <th className="py-3 px-4">Parent Role</th>
                  <th className="py-3 px-4">Hierarchy Level</th>
                  <th className="py-3 px-4">Role Type</th>
                  <th className="py-3 px-4">Assignments</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900 leading-tight">{role.name}</p>
                      <p className="font-mono text-4xs font-bold text-indigo-600 mt-0.5">{role.code}</p>
                      {role.description && (
                        <p className="text-4xs text-gray-400 mt-0.5 max-w-sm truncate">{role.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {role.parentRole ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-4xs font-bold">
                          <Layers className="h-3 w-3 text-slate-500" />
                          <span>{role.parentRole.name}</span>
                        </span>
                      ) : (
                        <span className="text-4xs font-semibold text-gray-400 italic">Root Level</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-4xs font-extrabold">
                        Level {role.level ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {role.isSystem ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-4xs font-extrabold uppercase tracking-wider">
                          <Lock className="h-3 w-3" />
                          <span>System Core</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-100 text-4xs font-bold uppercase tracking-wider">
                          Custom
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col space-y-0.5 text-4xs font-semibold text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Key className="h-3 w-3 text-indigo-500" />
                          <span>{role._count?.rolePermissions || 0} Permissions</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <UserCheck className="h-3 w-3 text-emerald-500" />
                          <span>{role._count?.userRoles || 0} Users</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-4xs font-bold border uppercase tracking-wider ${
                          role.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${role.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                        <span>{role.isActive ? "Active" : "Disabled"}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Manage Permissions Button */}
                        <PermissionGate permission="system:role:permission">
                          <button
                            onClick={() => handleOpenPermissionDrawer(role)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                            title="Manage Permissions"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>

                        {/* Edit Role Button */}
                        <PermissionGate permission="system:role:update">
                          <button
                            onClick={() => handleOpenEdit(role)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                            title="Edit Role Metadata"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>

                        {/* Enable/Disable Button */}
                        <PermissionGate permission="system:role:disable">
                          <button
                            disabled={role.isSystem}
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                id: role.id,
                                isActive: !role.isActive,
                              })
                            }
                            className={`p-1.5 rounded transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                              role.isActive
                                ? "text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={role.isSystem ? "System roles cannot be disabled" : role.isActive ? "Disable Role" : "Enable Role"}
                          >
                            {role.isActive ? (
                              <XCircle className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </PermissionGate>

                        {/* Soft Delete Custom Role */}
                        {!role.isSystem && (
                          <PermissionGate permission="system:role:disable">
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete custom role '${role.name}'?`)) {
                                  deleteRoleMutation.mutate(role.id);
                                }
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Delete Role"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </PermissionGate>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>
              Page {meta.page} of {meta.totalPages} ({meta.total} Total Roles)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white border border-gray-200 rounded disabled:opacity-40 transition cursor-pointer flex items-center space-x-1"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Prev</span>
              </button>
              <button
                disabled={currentPage >= meta.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))}
                className="px-2.5 py-1 bg-white border border-gray-200 rounded disabled:opacity-40 transition cursor-pointer flex items-center space-x-1"
              >
                <span>Next</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-gray-100 rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/40">
              <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <PlusCircle className="h-4.5 w-4.5 text-indigo-600" />
                <span>Define New Enterprise Role</span>
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs font-medium">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-4xs font-bold border border-red-100">
                  {errorMsg}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hospital Manager, Senior Cardiologist"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  Unique Role Code (Uppercase)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HOSPITAL_MANAGER, CLINICAL_LEAD"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Level & Parent Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                    Hierarchy Level (0 - 100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={createForm.level}
                    onChange={(e) => setCreateForm({ ...createForm, level: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                    Parent Role (Inheritance)
                  </label>
                  <select
                    value={createForm.parentId}
                    onChange={(e) => setCreateForm({ ...createForm, parentId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">None (Root Level)</option>
                    {dropdownRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  Role Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the operational scope governed by this role..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {isEditOpen && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-gray-100 rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/40">
              <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <Edit2 className="h-4.5 w-4.5 text-indigo-600" />
                <span>Edit Role Definition Metadata</span>
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs font-medium">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-4xs font-bold border border-red-100">
                  {errorMsg}
                </div>
              )}

              {/* Immutable Code Display */}
              <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg space-y-1">
                <span className="text-4xs font-extrabold uppercase tracking-wider text-gray-500">
                  Role Code (Immutable):
                </span>
                <p className="font-mono font-bold text-gray-900 text-xs">{selectedRole.code}</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Level & Parent Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                    Hierarchy Level
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editForm.level}
                    onChange={(e) => setEditForm({ ...editForm, level: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                    Parent Role
                  </label>
                  <select
                    value={editForm.parentId}
                    onChange={(e) => setEditForm({ ...editForm, parentId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">None (Root Level)</option>
                    {dropdownRoles
                      .filter((r) => r.id !== selectedRole.id) // Filter self to prevent instant loop
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {editMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Permission Assignment Drawer / Modal */}
      {isPermissionDrawerOpen && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-gray-900/40 backdrop-blur-xs">
          <div className="bg-white border-l border-gray-200 h-full max-w-xl w-full flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">{selectedRole.name}</h3>
                  <p className="font-mono text-4xs text-indigo-600 font-bold">{selectedRole.code}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPermissionDrawerOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 p-5 space-y-6 overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-4xs font-bold border border-red-100">
                  {errorMsg}
                </div>
              )}

              {/* Assign New Permission Section */}
              <PermissionGate permission="system:role:permission">
                <form
                  onSubmit={handleAssignPermissionSubmit}
                  className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-3"
                >
                  <label className="block text-4xs font-extrabold uppercase tracking-wider text-indigo-900">
                    Grant New Atomic Permission to Role
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={permissionToAddId}
                      onChange={(e) => setPermissionToAddId(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select permission to grant...</option>
                      {availablePermissions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} — {p.name} ({p.module})
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      disabled={!permissionToAddId || assignPermissionMutation.isPending}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {assignPermissionMutation.isPending ? "Granting..." : "Grant Access"}
                    </button>
                  </div>
                </form>
              </PermissionGate>

              {/* Currently Granted Permissions List */}
              <div className="space-y-3">
                <h4 className="text-4xs font-extrabold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                  <span>Directly Assigned Permissions</span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-4xs font-bold">
                    {assignedPermissions.length} Granted
                  </span>
                </h4>

                {isRolePermissionsLoading ? (
                  <div className="py-8 text-center text-gray-400 text-xs font-semibold">
                    Loading granted permissions...
                  </div>
                ) : assignedPermissions.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-xs font-medium border border-dashed border-gray-200 rounded-xl">
                    No permissions assigned directly to this role yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignedPermissions.map((rp) => (
                      <div
                        key={rp.id}
                        className="p-3 bg-white border border-gray-100 rounded-lg shadow-2xs flex items-center justify-between hover:border-gray-200 transition-colors"
                      >
                        <div>
                          <p className="font-mono text-xs font-bold text-indigo-700">{rp.permission.code}</p>
                          <p className="text-xs font-semibold text-gray-900 leading-snug">{rp.permission.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-5xs font-bold uppercase">
                              {rp.permission.module}
                            </span>
                            <span className="text-5xs text-gray-400 font-medium">{rp.permission.category}</span>
                          </div>
                        </div>

                        <PermissionGate permission="system:role:permission">
                          <button
                            onClick={() =>
                              removePermissionMutation.mutate({
                                roleId: selectedRole.id,
                                permissionId: rp.permissionId,
                              })
                            }
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition cursor-pointer"
                            title="Revoke Permission"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/40 text-right">
              <button
                onClick={() => setIsPermissionDrawerOpen(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
