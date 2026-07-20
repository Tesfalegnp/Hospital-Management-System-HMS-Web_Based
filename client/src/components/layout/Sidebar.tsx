import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Calendar, FileText, LogOut, ClipboardList, Pill, SlidersHorizontal,
  Users, Stethoscope, ShieldCheck, Activity, Bed, Microscope, HeartHandshake,
  FileSpreadsheet, Settings, History, ShieldAlert, UserCog
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  isPlaceholder?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label, active, isPlaceholder }) => {
  if (isPlaceholder) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg text-gray-400 cursor-not-allowed text-xs font-semibold">
        <div className="flex items-center space-x-3">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-4xs font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-sm uppercase tracking-wider scale-90">
          Soon
        </span>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition duration-150 text-xs font-semibold ${
        active
          ? "bg-indigo-50 text-indigo-700"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const renderSectionHeader = (title: string) => (
    <h3 className="text-4xs font-extrabold text-gray-400 uppercase tracking-widest px-4 mb-2">
      {title}
    </h3>
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col justify-between p-4 overflow-y-auto max-h-screen">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center space-x-2 px-4 py-2 border-b border-gray-100 pb-4">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-sm">
            S
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-gray-800 tracking-tight leading-none">St. Jude HMS</span>
            <span className="text-5xs font-bold text-indigo-600 tracking-widest uppercase mt-0.5">Enterprise Portal</span>
          </div>
        </div>

        {/* 1. Core Modules */}
        <div className="space-y-1">
          <SidebarItem to="/" label="Console Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} active={location.pathname === "/"} />
        </div>

        {/* 2. Clinical Workspaces */}
        <div className="space-y-2">
          {renderSectionHeader("Clinical Services")}
          <div className="space-y-1">
            {/* Patients Placeholder */}
            <SidebarItem to="#" label="Patients Registry" icon={<Users className="h-4 w-4" />} active={false} isPlaceholder />
            {/* Doctors Placeholder */}
            <SidebarItem to="#" label="Attending Doctors" icon={<Stethoscope className="h-4 w-4" />} active={false} isPlaceholder />

            {/* Appointments */}
            {(isAdmin || user?.role === "RECEPTIONIST") && (
              <SidebarItem to="/appointments" label="Book Appointments" icon={<Calendar className="h-4 w-4" />} active={location.pathname === "/appointments"} />
            )}

            {/* Consultations */}
            {(isAdmin || user?.role === "DOCTOR") && (
              <SidebarItem to="/consultations" label="Record Encounters" icon={<FileText className="h-4 w-4" />} active={location.pathname === "/consultations"} />
            )}

            {/* Inpatient (IPD) */}
            {(isAdmin || user?.role === "DOCTOR" || user?.role === "NURSE") && (
              <SidebarItem to="/ipd/board" label="IPD Bed Board" icon={<Bed className="h-4 w-4" />} active={location.pathname.startsWith("/ipd")} />
            )}

            {/* Laboratory */}
            {(isAdmin || user?.role === "LAB_TECHNICIAN") && (
              <SidebarItem to="/labs/queue" label="Lab Worklist" icon={<Microscope className="h-4 w-4" />} active={location.pathname.startsWith("/labs")} />
            )}

            {/* Pharmacy Workspace */}
            {(isAdmin || user?.role === "PHARMACIST") && (
              <>
                <SidebarItem to="/pharmacy/formulary" label="Formulary Catalog" icon={<Pill className="h-4 w-4" />} active={location.pathname === "/pharmacy/formulary"} />
                <SidebarItem to="/pharmacy/inventory" label="Stock Inventory" icon={<ClipboardList className="h-4 w-4" />} active={location.pathname === "/pharmacy/inventory"} />
                <SidebarItem to="/pharmacy/dispensing" label="Dispensing Queue" icon={<FileText className="h-4 w-4" />} active={location.pathname === "/pharmacy/dispensing"} />
              </>
            )}

            {/* Future Clinical placeholders */}
            <SidebarItem to="#" label="Emergency ER" icon={<HeartHandshake className="h-4 w-4" />} active={false} isPlaceholder />
            <SidebarItem to="#" label="Radiology & PACS" icon={<Microscope className="h-4 w-4" />} active={false} isPlaceholder />
            <SidebarItem to="#" label="Blood Bank" icon={<Activity className="h-4 w-4" />} active={false} isPlaceholder />
          </div>
        </div>

        {/* 3. Financials */}
        <div className="space-y-2">
          {renderSectionHeader("Financial Administration")}
          <div className="space-y-1">
            {/* Billing */}
            {(isAdmin || user?.role === "ACCOUNTANT") && (
              <>
                <SidebarItem to="/billing/tariffs" label="Tariff Settings" icon={<SlidersHorizontal className="h-4 w-4" />} active={location.pathname === "/billing/tariffs"} />
                <SidebarItem to="/billing/cashier" label="Cashier Billing" icon={<FileSpreadsheet className="h-4 w-4" />} active={location.pathname === "/billing/cashier"} />
              </>
            )}
            {/* Insurance Placeholder */}
            <SidebarItem to="#" label="Insurance Claims" icon={<ShieldCheck className="h-4 w-4" />} active={false} isPlaceholder />
          </div>
        </div>

        {/* 4. Administration */}
        {isAdmin && (
          <div className="space-y-2">
            {renderSectionHeader("System Management")}
            <div className="space-y-1">
              <SidebarItem to="/admin/users" label="User Accounts CRUD" icon={<UserCog className="h-4 w-4 text-indigo-600" />} active={location.pathname === "/admin/users"} />
              <SidebarItem to="#" label="Rosters & Roles" icon={<ShieldAlert className="h-4 w-4" />} active={false} isPlaceholder />
              <SidebarItem to="#" label="Branch Config" icon={<Settings className="h-4 w-4" />} active={false} isPlaceholder />
              <SidebarItem to="#" label="Departments Config" icon={<Settings className="h-4 w-4" />} active={false} isPlaceholder />
              <SidebarItem to="#" label="Security Audit Logs" icon={<History className="h-4 w-4" />} active={false} isPlaceholder />
              <SidebarItem to="#" label="Tariff Reports" icon={<FileSpreadsheet className="h-4 w-4" />} active={false} isPlaceholder />
            </div>
          </div>
        )}
      </div>

      {/* Footer / Account / Logout */}
      <div className="border-t border-gray-100 pt-4 mt-6 space-y-4">
        {user && (
          <div className="px-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-900 leading-none">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-4xs text-indigo-600 font-extrabold uppercase tracking-widest mt-1">
                {user.role.replace("_", " ")}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center space-x-3 w-full px-4 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-700 transition duration-150 cursor-pointer text-xs font-semibold"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout Portal</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
