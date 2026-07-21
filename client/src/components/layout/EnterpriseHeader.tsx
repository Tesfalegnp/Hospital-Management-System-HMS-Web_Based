import React, { useState } from "react";
import {
  Search,
  Bell,
  Sun,
  Building2,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Shield,
  Sparkles
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Breadcrumb from "./Breadcrumb";

export interface EnterpriseHeaderProps {
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export const EnterpriseHeader: React.FC<EnterpriseHeaderProps> = ({
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}) => {
  const { user, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-4 lg:px-8 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left Section: Mobile Menu Toggle & Breadcrumbs */}
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden sm:block min-w-0">
            <Breadcrumb />
          </div>
        </div>

        {/* Center Section: Global Search Placeholder (UI Only) */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              readOnly
              placeholder="Search patients, medical records, doctors, or commands... (Ctrl+K)"
              className="w-full pl-9 pr-12 py-1.5 bg-gray-50/80 border border-gray-200 rounded-lg text-xs text-gray-700 placeholder-gray-400 focus:outline-none cursor-pointer hover:bg-gray-100/80 transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-0.5">
              <kbd className="px-1.5 py-0.5 text-4xs font-semibold text-gray-400 bg-white border border-gray-200 rounded shadow-2xs">
                Ctrl K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right Section: Enterprise Utilities & User Profile */}
        <div className="flex items-center space-x-2 lg:space-x-3">
          {/* Hospital Scope Placeholder */}
          <div className="hidden xl:flex items-center space-x-2 px-3 py-1.5 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs font-semibold text-indigo-900">
            <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="truncate max-w-[140px]">St. Jude Main Campus</span>
            <span className="text-4xs font-extrabold bg-indigo-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider scale-90">
              HQ
            </span>
          </div>

          {/* Theme Toggle Placeholder */}
          <button
            type="button"
            title="Toggle Light/Dark Theme (System Default)"
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <Sun className="h-4 w-4" />
          </button>

          {/* Notifications Icon (UI Only) */}
          <button
            type="button"
            title="System Notifications & Alerts"
            className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-indigo-600 rounded-full ring-2 ring-white" />
          </button>

          {/* User Profile Menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <div className="h-7 w-7 bg-indigo-600 text-white rounded-md flex items-center justify-center font-bold text-xs shadow-2xs">
                  {user.firstName ? user.firstName.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="hidden lg:flex flex-col text-left leading-tight">
                  <span className="text-xs font-bold text-gray-900">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-4xs font-extrabold text-indigo-600 uppercase tracking-widest">
                    {user.role.replace("_", " ")}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden lg:block" />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 text-xs z-50">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="font-bold text-gray-900 leading-none">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-4xs text-gray-500 truncate mt-1">
                      {user.email}
                    </p>
                    <div className="mt-2 flex items-center space-x-1 text-4xs font-bold text-indigo-600 uppercase tracking-wider">
                      <Shield className="h-3 w-3" />
                      <span>{user.role} PERMISSIONS</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-2.5"
                    >
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <span>Account Profile Settings</span>
                    </button>
                    <button
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-2.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                      <span>System Health Status</span>
                    </button>
                  </div>

                  <div className="border-t border-gray-100 pt-1">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2.5 font-semibold"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out Portal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default EnterpriseHeader;
