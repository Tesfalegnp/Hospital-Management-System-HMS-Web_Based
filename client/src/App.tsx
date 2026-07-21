import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { PermissionProvider } from "./context/PermissionContext";
import Dashboard from "./pages/Dashboard";
import BookAppointment from "./pages/Appointments/BookAppointment";
import RecordEncounter from "./pages/Consultations/RecordEncounter";
import LabQueue from "./pages/Laboratory/LabQueue";
import Login from "./pages/Login";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import FormularyCatalog from "./pages/Pharmacy/FormularyCatalog";
import InventoryStock from "./pages/Pharmacy/InventoryStock";
import DispensingQueue from "./pages/Pharmacy/DispensingQueue";
import TariffSettings from "./pages/Billing/TariffSettings";
import CashierPortal from "./pages/Billing/CashierPortal";
import BedBoard from "./pages/IPD/BedBoard";
import PatientChart from "./pages/IPD/PatientChart";
import UserManagement from "./pages/Admin/UserManagement";
import PermissionManagement from "./pages/Admin/PermissionManagement";
import RoleManagement from "./pages/Admin/RoleManagement";


import EnterpriseLayout from "./components/layout/EnterpriseLayout";

// Initialize the TanStack query client for caching and data sync
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PermissionProvider>
          <Router>
            <Routes>
              {/* Public Auth Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Workspace Layout */}
              <Route element={<ProtectedRoute />}>
                <Route element={<EnterpriseLayout />}>
                  {/* General dashboard access */}
                  <Route path="/" element={<Dashboard />} />

                  {/* Appointment scheduling: Restricted to Receptionist and Admin */}
                  <Route element={<ProtectedRoute allowedRoles={["RECEPTIONIST", "ADMIN"]} />}>
                    <Route path="/appointments" element={<BookAppointment />} />
                  </Route>

                  {/* Clinical consultations: Restricted to Doctor and Admin */}
                  <Route element={<ProtectedRoute allowedRoles={["DOCTOR", "ADMIN"]} />}>
                    <Route path="/consultations" element={<RecordEncounter />} />
                  </Route>

                  {/* Inpatient Department (IPD) Workspace: Restricted to Doctors, Nurses, and Admins */}
                  <Route element={<ProtectedRoute allowedRoles={["DOCTOR", "NURSE", "ADMIN"]} />}>
                    <Route path="/ipd/board" element={<BedBoard />} />
                    <Route path="/ipd/admissions/:id" element={<PatientChart />} />
                  </Route>

                  {/* Laboratory Workspace: Restricted to Lab Techs and Admins */}
                  <Route element={<ProtectedRoute allowedRoles={["LAB_TECHNICIAN", "ADMIN"]} />}>
                    <Route path="/labs/queue" element={<LabQueue />} />
                  </Route>

                  {/* Pharmacy Workspace: Restricted to Pharmacists and Admins */}
                  <Route element={<ProtectedRoute allowedRoles={["PHARMACIST", "ADMIN"]} />}>
                    <Route path="/pharmacy/formulary" element={<FormularyCatalog />} />
                    <Route path="/pharmacy/inventory" element={<InventoryStock />} />
                    <Route path="/pharmacy/dispensing" element={<DispensingQueue />} />
                  </Route>

                  {/* Billing Workspace: Restricted to Accountants and Admins */}
                  <Route element={<ProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]} />}>
                    <Route path="/billing/tariffs" element={<TariffSettings />} />
                    <Route path="/billing/cashier" element={<CashierPortal />} />
                  </Route>

                  {/* System Management Workspace: Restricted to Administrators */}
                  <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]} requiredPermissions={["system:user:view"]} />}>
                    <Route path="/admin/users" element={<UserManagement />} />
                  </Route>

                  {/* Permission Management Console: Guarded by system:permission:view */}
                  <Route element={<ProtectedRoute requiredPermissions={["system:permission:view"]} />}>
                    <Route path="/admin/permissions" element={<PermissionManagement />} />
                  </Route>

                  {/* Role Management Console: Guarded by system:role:view */}
                  <Route element={<ProtectedRoute requiredPermissions={["system:role:view"]} />}>
                    <Route path="/admin/roles" element={<RoleManagement />} />
                  </Route>

                </Route>
              </Route>
            </Routes>
          </Router>
        </PermissionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
