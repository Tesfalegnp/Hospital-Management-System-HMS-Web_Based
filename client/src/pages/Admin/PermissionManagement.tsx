import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import PermissionGate from "../../components/auth/PermissionGate";
import {
  Key,
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
  Lock
} from "lucide-react";

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
  createdAt: string;
  updatedAt: string;
}

export const PermissionManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  // Modal Control States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPerm, setSelectedPerm] = useState<PermissionItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    module: "clinical",
    resource: "patient",
    action: "view",
    name: "",
    description: "",
    category: "Clinical Care",
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category: "",
  });

  // Live preview of generated permission code
  const previewGeneratedCode = `${createForm.module.toLowerCase().trim()}:${createForm.resource.toLowerCase().trim()}:${createForm.action.toLowerCase().trim()}`;

  // Queries
  const { data: permissionsData, isLoading, isError, refetch } = useQuery({
    queryKey: ["permissions", searchTerm, moduleFilter, categoryFilter, statusFilter, currentPage],
    queryFn: async () => {
      const res = await api.get("/permissions", {
        params: {
          search: searchTerm || undefined,
          module: moduleFilter || undefined,
          category: categoryFilter || undefined,
          isActive: statusFilter === "" ? undefined : statusFilter === "active",
          page: currentPage,
          limit,
        },
      });
      return res.data;
    },
  });

  const permissions: PermissionItem[] = permissionsData?.data || [];
  const meta = permissionsData?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: typeof createForm) => {
      const res = await api.post("/permissions", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
      setIsCreateOpen(false);
      setCreateForm({
        module: "clinical",
        resource: "patient",
        action: "view",
        name: "",
        description: "",
        category: "Clinical Care",
      });
      setSuccessMsg("Permission created successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to create permission.");
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof editForm }) => {
      const res = await api.put(`/permissions/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
      setIsEditOpen(false);
      setSelectedPerm(null);
      setSuccessMsg("Permission metadata updated successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to update permission.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await api.patch(`/permissions/${id}/status`, { isActive });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
      setSuccessMsg(`Permission ${variables.isActive ? "enabled" : "disabled"} successfully!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to toggle status.");
    },
  });

  const handleOpenEdit = (perm: PermissionItem) => {
    setSelectedPerm(perm);
    setEditForm({
      name: perm.name,
      description: perm.description || "",
      category: perm.category,
    });
    setErrorMsg(null);
    setIsEditOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    createMutation.mutate(createForm);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerm) return;
    setErrorMsg(null);
    editMutation.mutate({ id: selectedPerm.id, payload: editForm });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center space-x-2">
            <Key className="h-6 w-6 text-indigo-600" />
            <span>Permission Registry Management</span>
          </h1>
          <p className="text-xs font-semibold text-gray-500 mt-1">
            Define, group, and manage system-wide atomic authorization permission codes (<code className="text-indigo-600 font-mono">domain:resource:action</code>).
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh List</span>
          </button>

          <PermissionGate permission="system:permission:create">
            <button
              onClick={() => {
                setErrorMsg(null);
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create New Permission</span>
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
            placeholder="Search permission code, name, or description..."
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
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Domains/Modules</option>
            <option value="system">System</option>
            <option value="clinical">Clinical</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="billing">Billing</option>
            <option value="ipd">Inpatient (IPD)</option>
            <option value="labs">Laboratory</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            <option value="System Administration">System Administration</option>
            <option value="User Management">User Management</option>
            <option value="Clinical Care">Clinical Care</option>
            <option value="Pharmacy Management">Pharmacy Management</option>
            <option value="Billing & Finance">Billing & Finance</option>
            <option value="Laboratory">Laboratory</option>
          </select>

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
        </div>
      </div>

      {/* Permissions Data Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
            <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading Permission Registry...</span>
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-red-500 text-xs font-semibold">
            Failed to load permissions. Please check connection or permissions.
          </div>
        ) : permissions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs font-medium space-y-1">
            <Key className="h-8 w-8 text-gray-300 mx-auto" />
            <p className="font-bold text-gray-700">No permissions found</p>
            <p>No permission records match your current filter query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100 text-4xs font-extrabold uppercase tracking-widest text-gray-400">
                  <th className="py-3 px-4">Permission Code</th>
                  <th className="py-3 px-4">Name & Description</th>
                  <th className="py-3 px-4">Domain / Module</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                {permissions.map((perm) => (
                  <tr key={perm.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {perm.code}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900 leading-tight">{perm.name}</p>
                      {perm.description && (
                        <p className="text-4xs text-gray-400 mt-0.5 max-w-sm truncate">
                          {perm.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-4xs font-bold uppercase tracking-wider">
                        {perm.module}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-semibold">{perm.category}</td>
                    <td className="py-3 px-4">
                      {perm.isSystem ? (
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
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-4xs font-bold border uppercase tracking-wider ${
                          perm.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${perm.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                        <span>{perm.isActive ? "Active" : "Disabled"}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <PermissionGate permission="system:permission:update">
                          <button
                            onClick={() => handleOpenEdit(perm)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                            title="Edit metadata"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>

                        <PermissionGate permission="system:permission:disable">
                          <button
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                id: perm.id,
                                isActive: !perm.isActive,
                              })
                            }
                            className={`p-1.5 rounded transition cursor-pointer ${
                              perm.isActive
                                ? "text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={perm.isActive ? "Disable Permission" : "Enable Permission"}
                          >
                            {perm.isActive ? (
                              <XCircle className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </PermissionGate>
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
              Page {meta.page} of {meta.totalPages} ({meta.total} Total Permissions)
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

      {/* Create Permission Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-gray-100 rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/40">
              <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <PlusCircle className="h-4.5 w-4.5 text-indigo-600" />
                <span>Define New Atomic Permission</span>
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

              {/* Domain / Module */}
              <div>
                <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  Domain / Module
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. clinical, system, billing, pharmacy"
                  value={createForm.module}
                  onChange={(e) => setCreateForm({ ...createForm, module: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Resource & Action */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                    Resource Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. patient, invoice, vitals"
                    value={createForm.resource}
                    onChange={(e) => setCreateForm({ ...createForm, resource: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                    Action Verb
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. view, create, update, delete"
                    value={createForm.action}
                    onChange={(e) => setCreateForm({ ...createForm, action: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Generated Code Live Preview */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg space-y-1">
                <span className="text-4xs font-extrabold uppercase tracking-wider text-indigo-700">
                  Generated Code Preview:
                </span>
                <p className="font-mono font-bold text-indigo-900 text-xs">{previewGeneratedCode}</p>
              </div>

              {/* Permission Name */}
              <div>
                <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. View Patient Medical Records"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  Category Grouping
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clinical Care, Billing, System Administration"
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe what access this permission governs..."
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
                  {createMutation.isPending ? "Saving..." : "Create Permission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permission Modal */}
      {isEditOpen && selectedPerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-gray-100 rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/40">
              <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <Edit2 className="h-4.5 w-4.5 text-indigo-600" />
                <span>Edit Permission Metadata</span>
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
                  Permission Code (Immutable):
                </span>
                <p className="font-mono font-bold text-gray-900 text-xs">{selectedPerm.code}</p>
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

              {/* Category */}
              <div>
                <label className="block text-4xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  Category Grouping
                </label>
                <input
                  type="text"
                  required
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
    </div>
  );
};

export default PermissionManagement;
