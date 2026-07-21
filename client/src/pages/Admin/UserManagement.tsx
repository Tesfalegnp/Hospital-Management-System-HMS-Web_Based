import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import Button from "../../components/ui/Button";
import PermissionGate from "../../components/auth/PermissionGate";
import {
  UserPlus, Search, Edit2, Key, CheckCircle, XCircle, Users,
  Home, Briefcase, Filter, X, ArrowLeft, ArrowRight
} from "lucide-react";

interface LookupItem {
  id: string;
  name: string;
  code?: string;
  branchId?: string;
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "NURSE" | "RECEPTIONIST" | "PHARMACIST" | "LAB_TECHNICIAN" | "ACCOUNTANT" | "PATIENT";
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  branchId: string | null;
  departmentId: string | null;
  isActive: boolean;
  branch?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
}

export const UserManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  // Modal control states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isRolesDrawerOpen, setIsRolesDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // User roles assignment and preview state
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");
  const [roleToAssignId, setRoleToAssignId] = useState("");
  const [scopeBranchId, setScopeBranchId] = useState("");
  const [previewBranchId, setPreviewBranchId] = useState("");

  // Form states
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    gender: "",
    role: "DOCTOR",
    branchId: "",
    departmentId: "",
    isActive: true,
  });

  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Fetch Users List
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["usersList", searchTerm, roleFilter, branchFilter, deptFilter, currentPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit,
      };
      if (searchTerm) params.search = searchTerm;
      if (roleFilter) params.role = roleFilter;
      if (branchFilter) params.branchId = branchFilter;
      if (deptFilter) params.departmentId = deptFilter;

      const res = await api.get("/users", { params });
      return res.data;
    },
  });

  // 2. Fetch Branch and Department dropdown lookup datasets
  const { data: branchesLookupData } = useQuery({
    queryKey: ["branchesLookup"],
    queryFn: async () => {
      const res = await api.get("/users/lookups/branches");
      return res.data;
    },
  });

  const { data: deptsLookupData } = useQuery({
    queryKey: ["deptsLookup"],
    queryFn: async () => {
      const res = await api.get("/users/lookups/departments");
      return res.data;
    },
  });

  const branches: LookupItem[] = branchesLookupData?.data || [];
  const departments: LookupItem[] = deptsLookupData?.data || [];

  // Filtered departments based on selected branch in forms
  const filteredDepartments = formData.branchId
    ? departments.filter((d) => d.branchId === formData.branchId)
    : departments;

  // 3. Fetch all active RoleDefinitions
  const { data: rolesDropdownData } = useQuery({
    queryKey: ["rolesDropdown"],
    queryFn: async () => {
      const res = await api.get("/roles", { params: { limit: 100, isActive: true } });
      return res.data;
    },
    enabled: isRolesDrawerOpen,
  });
  const availableRoles = rolesDropdownData?.data || [];

  // 4. Fetch User Role Assignments
  const { data: userRolesData, refetch: refetchUserRoles, isLoading: isUserRolesLoading } = useQuery({
    queryKey: ["userRolesList", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const res = await api.get(`/users/${selectedUser.id}/roles`);
      return res.data;
    },
    enabled: !!selectedUser && isRolesDrawerOpen,
  });
  const userRolesList = userRolesData?.data || [];

  // 5. Fetch computed effective permissions preview
  const { data: effectivePermissionsData, isLoading: isPermissionsPreviewLoading } = useQuery({
    queryKey: ["userEffectivePermissions", selectedUser?.id, previewBranchId],
    queryFn: async () => {
      if (!selectedUser) return null;
      const res = await api.get(`/users/${selectedUser.id}/effective-permissions`, {
        params: { branchId: previewBranchId || undefined },
      });
      return res.data;
    },
    enabled: !!selectedUser && isRolesDrawerOpen && activeTab === "permissions",
  });
  const effectivePermissionsResult = effectivePermissionsData?.data || { grantedPermissions: [], deniedPermissions: [] };

  // Mutations for Role Assignment
  const assignRoleMutation = useMutation({
    mutationFn: async (payload: { roleId: string; branchId?: string | null }) => {
      return api.post(`/users/${selectedUser?.id}/roles`, payload);
    },
    onSuccess: () => {
      refetchUserRoles();
      showSuccess("Enterprise role assigned successfully.");
      setRoleToAssignId("");
      setScopeBranchId("");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to assign role.");
    },
  });

  const revokeRoleMutation = useMutation({
    mutationFn: async (userRoleId: string) => {
      return api.delete(`/users/${selectedUser?.id}/roles/${userRoleId}`);
    },
    onSuccess: () => {
      refetchUserRoles();
      showSuccess("Role assignment revoked successfully.");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to revoke role assignment.");
    },
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post("/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usersList"] });
      showSuccess("User created successfully.");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to create user.");
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return api.patch(`/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usersList"] });
      showSuccess("User details updated.");
      setIsEditOpen(false);
      setSelectedUser(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to update user.");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, pass }: { id: string; pass: string }) => {
      return api.post(`/users/${id}/reset-password`, { password: pass });
    },
    onSuccess: () => {
      showSuccess("User password updated.");
      setIsResetOpen(false);
      setResetPasswordVal("");
      setSelectedUser(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to reset password.");
    },
  });

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      gender: "",
      role: "DOCTOR",
      branchId: "",
      departmentId: "",
      isActive: true,
    });
    setErrorMsg(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setErrorMsg(null);
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "",
      phone: user.phone || "",
      gender: user.gender || "",
      role: user.role,
      branchId: user.branchId || "",
      departmentId: user.departmentId || "",
      isActive: user.isActive,
    });
    setIsEditOpen(true);
  };

  const handleOpenReset = (user: UserProfile) => {
    setErrorMsg(null);
    setSelectedUser(user);
    setResetPasswordVal("");
    setIsResetOpen(true);
  };

  const handleOpenRoles = (user: UserProfile) => {
    setErrorMsg(null);
    setSelectedUser(user);
    setActiveTab("roles");
    setRoleToAssignId("");
    setScopeBranchId("");
    setPreviewBranchId("");
    setIsRolesDrawerOpen(true);
  };

  const handleAssignRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !roleToAssignId) return;
    setErrorMsg(null);
    assignRoleMutation.mutate({
      roleId: roleToAssignId,
      branchId: scopeBranchId || null,
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    createUserMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMsg(null);
    editUserMutation.mutate({
      id: selectedUser.id,
      data: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        gender: formData.gender || null,
        phone: formData.phone || null,
        branchId: formData.branchId || null,
        departmentId: formData.departmentId || null,
        isActive: formData.isActive,
      },
    });
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (resetPasswordVal.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    setErrorMsg(null);
    resetPasswordMutation.mutate({
      id: selectedUser.id,
      pass: resetPasswordVal,
    });
  };

  const handleToggleActive = (user: UserProfile) => {
    editUserMutation.mutate({
      id: user.id,
      data: { isActive: !user.isActive },
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-rose-55 text-rose-700 border-rose-100";
      case "ADMIN":
        return "bg-red-50 text-red-700 border-red-100";
      case "DOCTOR":
        return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "NURSE":
        return "bg-purple-50 text-purple-700 border-purple-100";
      case "PHARMACIST":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "LAB_TECHNICIAN":
        return "bg-amber-50 text-amber-700 border-amber-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  const users: UserProfile[] = usersData?.data || [];
  const meta = usersData?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">User Management</h1>
          <p className="text-sm font-semibold text-gray-500 mt-1">
            Create, edit, deactivate, or reset passwords for hospital accounts.
          </p>
        </div>
        <PermissionGate permission="system:user:create">
          <button
            onClick={handleOpenCreate}
            className="mt-4 md:mt-0 inline-flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add System User</span>
          </button>
        </PermissionGate>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-100 flex items-center space-x-2 shadow-xs">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Panel */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
          <Filter className="h-4 w-4" />
          <span>Search Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search text */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search by name, email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs placeholder-gray-400"
            />
          </div>

          {/* Role select */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs text-gray-600 bg-white"
          >
            <option value="">All User Roles</option>
            <option value="SUPER_ADMIN">Super Administrator</option>
            <option value="ADMIN">System Administrator</option>
            <option value="DOCTOR">Attending Doctor</option>
            <option value="NURSE">Clinic Nurse</option>
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="PHARMACIST">Pharmacist</option>
            <option value="LAB_TECHNICIAN">Lab Technician</option>
            <option value="ACCOUNTANT">Billing Accountant</option>
          </select>

          {/* Branch select */}
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs text-gray-600 bg-white"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          {/* Department select */}
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs text-gray-600 bg-white"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white shadow-2xs rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50 text-gray-400 uppercase text-4xs font-extrabold tracking-widest">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Clinic Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white text-xs">
              {isUsersLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500 font-semibold">
                    Retrieving registered accounts list...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500 font-semibold">
                    No registered user accounts found matching selected filters.
                  </td>
                </tr>
              ) : (
                users.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition">
                    {/* Name */}
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {item.firstName} {item.lastName}
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 text-gray-600 font-semibold">{item.email}</td>

                    {/* Phone */}
                    <td className="px-6 py-4 text-gray-500 font-medium">{item.phone || "—"}</td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-4xs font-bold border uppercase tracking-wider ${getRoleBadgeColor(item.role)}`}>
                        {item.role.replace("_", " ")}
                      </span>
                    </td>

                    {/* Clinic/Department */}
                    <td className="px-6 py-4 text-gray-500 space-y-1">
                      {item.branch && (
                        <div className="flex items-center space-x-1 font-bold text-2xs">
                          <Home className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span>{item.branch.name}</span>
                        </div>
                      )}
                      {item.department && (
                        <div className="flex items-center space-x-1 text-3xs font-semibold">
                          <Briefcase className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{item.department.name}</span>
                        </div>
                      )}
                      {!item.branch && !item.department && <span className="text-gray-400">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {item.isActive ? (
                        <span className="inline-flex items-center space-x-1 text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-2xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                          <span>Deactivated</span>
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-2">
                        {/* Edit details */}
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Profile"
                          className="p-1.5 border border-gray-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-gray-500 cursor-pointer transition shadow-3xs"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Manage Roles */}
                        <PermissionGate permission="system:user-role:view">
                          <button
                            onClick={() => handleOpenRoles(item)}
                            title="Manage Roles & Permissions"
                            className="p-1.5 border border-gray-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-indigo-600 cursor-pointer transition shadow-3xs"
                          >
                            <Users className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>

                        {/* Reset password */}
                        <button
                          onClick={() => handleOpenReset(item)}
                          title="Reset Password"
                          className="p-1.5 border border-gray-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-gray-500 cursor-pointer transition shadow-3xs"
                        >
                          <Key className="h-3.5 w-3.5" />
                        </button>

                        {/* Toggle active state */}
                        <button
                          onClick={() => handleToggleActive(item)}
                          title={item.isActive ? "Deactivate User" : "Activate User"}
                          className={`p-1.5 border border-gray-100 rounded-lg cursor-pointer transition shadow-3xs ${
                            item.isActive
                              ? "hover:bg-red-50 hover:text-red-600 text-gray-500"
                              : "hover:bg-emerald-50 hover:text-emerald-600 text-gray-500"
                          }`}
                        >
                          {item.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 text-xs">
            <span className="font-semibold text-gray-500">
              Showing page {meta.page} of {meta.totalPages} ({meta.total} registered accounts)
            </span>
            <div className="inline-flex items-center space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="inline-flex items-center space-x-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-600 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-3xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              <button
                disabled={currentPage === meta.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, meta.totalPages))}
                className="inline-flex items-center space-x-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-600 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-3xs"
              >
                <span>Next</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create User */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <Users className="h-5 w-5 text-indigo-500" />
                <span>Register New System User</span>
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-semibold border border-red-100">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-semibold text-gray-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
                  placeholder="name@hospital.local"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block mb-1.5">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
                    placeholder="+251-911..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5">System Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-700"
                  >
                    <option value="SUPER_ADMIN">Super Administrator</option>
                    <option value="ADMIN">System Administrator</option>
                    <option value="DOCTOR">Attending Doctor</option>
                    <option value="NURSE">Clinic Nurse</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="LAB_TECHNICIAN">Lab Technician</option>
                    <option value="ACCOUNTANT">Billing Accountant</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5">Gender (Optional)</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-700"
                  >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5">Clinic Branch (Optional)</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value, departmentId: "" })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-700"
                  >
                    <option value="">No Branch Assigned</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5">Clinic Department (Optional)</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-700"
                  >
                    <option value="">No Department Assigned</option>
                    {filteredDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="create-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded-sm cursor-pointer"
                />
                <label htmlFor="create-active" className="cursor-pointer font-bold text-gray-75">
                  Set user account as active immediately
                </label>
              </div>

              <div className="flex justify-end space-x-3 border-t border-gray-50 pt-4 mt-6">
                <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating..." : "Save User Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <Edit2 className="h-5 w-5 text-indigo-500" />
                <span>Edit User Account Profile</span>
              </h2>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-semibold border border-red-100">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold text-gray-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5">Email Address (Read-Only)</label>
                <input
                  type="email"
                  disabled
                  value={formData.email}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-450 focus:outline-hidden font-medium cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
                    placeholder="+251-911..."
                  />
                </div>
                <div>
                  <label className="block mb-1.5">Gender (Optional)</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-700"
                  >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5">System Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-700"
                  >
                    <option value="SUPER_ADMIN">Super Administrator</option>
                    <option value="ADMIN">System Administrator</option>
                    <option value="DOCTOR">Attending Doctor</option>
                    <option value="NURSE">Clinic Nurse</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="LAB_TECHNICIAN">Lab Technician</option>
                    <option value="ACCOUNTANT">Billing Accountant</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5">Clinic Branch (Optional)</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value, departmentId: "" })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-700"
                  >
                    <option value="">No Branch Assigned</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1.5">Clinic Department (Optional)</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-700"
                >
                  <option value="">No Department Assigned</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded-sm cursor-pointer"
                />
                <label htmlFor="edit-active" className="cursor-pointer font-bold text-gray-75">
                  Keep user account active
                </label>
              </div>

              <div className="flex justify-end space-x-3 border-t border-gray-50 pt-4 mt-6">
                <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={editUserMutation.isPending}>
                  {editUserMutation.isPending ? "Saving..." : "Update Details"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {isResetOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-sm w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <Key className="h-5 w-5 text-indigo-500" />
                <span>Reset User Password</span>
              </h2>
              <button onClick={() => setIsResetOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-semibold">Resetting password for:</p>
              <p className="text-sm font-bold text-gray-900">
                {selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email})
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-semibold border border-red-100">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4 text-xs font-semibold text-gray-600">
              <div>
                <label className="block mb-1.5">New Security Password</label>
                <input
                  type="password"
                  required
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="flex justify-end space-x-3 border-t border-gray-50 pt-4 mt-6">
                <Button type="button" variant="secondary" onClick={() => setIsResetOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={resetPasswordMutation.isPending}>
                  {resetPasswordMutation.isPending ? "Resetting..." : "Save Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roles Drawer / Modal */}
      {isRolesDrawerOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-gray-900/40 backdrop-blur-xs">
          <div className="bg-white border-l border-gray-200 h-full max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden animate-slide-in">
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">
                  Manage Roles & Permissions: {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <p className="text-4xs text-gray-500 font-semibold">{selectedUser.email}</p>
              </div>
              <button
                onClick={() => setIsRolesDrawerOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-gray-100 bg-gray-50/30 px-5">
              <button
                onClick={() => setActiveTab("roles")}
                className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-all ${
                  activeTab === "roles"
                    ? "border-indigo-600 text-indigo-700 font-extrabold"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Role Assignments
              </button>
              <button
                onClick={() => setActiveTab("permissions")}
                className={`py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-all ${
                  activeTab === "permissions"
                    ? "border-indigo-600 text-indigo-700 font-extrabold"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Effective Permissions Preview
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 p-5 space-y-6 overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-4xs font-bold border border-red-100">
                  {errorMsg}
                </div>
              )}

              {activeTab === "roles" ? (
                <div className="space-y-6">
                  {/* Assign Role Form */}
                  <PermissionGate permission="system:user-role:create">
                    <form
                      onSubmit={handleAssignRoleSubmit}
                      className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-4 text-xs font-semibold text-gray-600"
                    >
                      <h4 className="text-4xs font-extrabold uppercase tracking-wider text-indigo-900">
                        Assign New Enterprise Role
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block mb-1">Select Role</label>
                          <select
                            required
                            value={roleToAssignId}
                            onChange={(e) => setRoleToAssignId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Choose role definition...</option>
                            {availableRoles.map((r: any) => (
                              <option key={r.id} value={r.id}>
                                {r.name} ({r.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block mb-1">Clinic Branch Scope (Optional)</label>
                          <select
                            value={scopeBranchId}
                            onChange={(e) => setScopeBranchId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Global Scope (All Branches)</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="text-right">
                        <button
                          type="submit"
                          disabled={!roleToAssignId || assignRoleMutation.isPending}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition cursor-pointer disabled:opacity-50"
                        >
                          {assignRoleMutation.isPending ? "Assigning..." : "Assign Role"}
                        </button>
                      </div>
                    </form>
                  </PermissionGate>

                  {/* Current Assignments list */}
                  <div className="space-y-3">
                    <h4 className="text-4xs font-extrabold uppercase tracking-wider text-gray-500">
                      Active Role Assignments
                    </h4>

                    {isUserRolesLoading ? (
                      <div className="text-center py-6 text-gray-400 text-xs font-semibold">
                        Loading active role mappings...
                      </div>
                    ) : userRolesList.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-xs font-semibold border border-dashed border-gray-200 rounded-xl">
                        No enterprise roles assigned to this user yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {userRolesList.map((ur: any) => (
                          <div
                            key={ur.id}
                            className="p-3 bg-white border border-gray-100 rounded-lg shadow-2xs flex items-center justify-between hover:border-gray-200 transition-colors"
                          >
                            <div>
                              <p className="font-bold text-gray-900 text-xs leading-none">{ur.role.name}</p>
                              <p className="font-mono text-5xs text-indigo-600 font-bold mt-1">{ur.role.code}</p>
                              <div className="flex items-center space-x-2 mt-1.5 text-5xs text-gray-400 font-semibold">
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 uppercase font-bold">
                                  Scope: {ur.branch?.name || "Global / All Branches"}
                                </span>
                                <span>Level {ur.role.level ?? 0}</span>
                              </div>
                            </div>

                            <PermissionGate permission="system:user-role:update">
                              <button
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to revoke this role assignment?")) {
                                    revokeRoleMutation.mutate(ur.id);
                                  }
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition cursor-pointer"
                                title="Revoke Role Assignment"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </PermissionGate>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Select Scope for preview */}
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between text-xs font-semibold text-gray-600">
                    <label>Filter Preview by Scope Branch:</label>
                    <select
                      value={previewBranchId}
                      onChange={(e) => setPreviewBranchId(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Global / All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Effective permissions list */}
                  <div className="space-y-3">
                    <h4 className="text-4xs font-extrabold uppercase tracking-wider text-gray-500">
                      Resolved Effective Permissions
                    </h4>

                    {isPermissionsPreviewLoading ? (
                      <div className="text-center py-6 text-gray-400 text-xs font-semibold">
                        Computing effective permissions matrix...
                      </div>
                    ) : effectivePermissionsResult.grantedPermissions.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-xs font-semibold border border-dashed border-gray-200 rounded-xl">
                        No effective permissions granted under the selected scope.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-medium">
                        {effectivePermissionsResult.grantedPermissions.map((code: string) => (
                          <div
                            key={code}
                            className="p-2.5 bg-emerald-50/50 border border-emerald-100 text-emerald-800 rounded-lg flex items-center space-x-2"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            <span className="font-mono text-5xs leading-none">{code}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-55/40 text-right">
              <button
                onClick={() => setIsRolesDrawerOpen(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
