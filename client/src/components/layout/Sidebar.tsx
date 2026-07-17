import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Calendar, FileText, LogOut } from "lucide-react";

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label, active }) => {
  return (
    <Link
      to={to}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition duration-150 ${
        active
          ? "bg-indigo-50 text-indigo-700 font-semibold"
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

  const navigation = [
    { to: "/", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { to: "/appointments", label: "Appointments", icon: <Calendar className="h-5 w-5" /> },
    { to: "/consultations", label: "Consultations", icon: <FileText className="h-5 w-5" /> },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col justify-between p-4">
      <div className="space-y-6">
        {/* Brand Logo Header */}
        <div className="flex items-center space-x-2 px-4 py-2 border-b border-gray-100 pb-4">
          <div className="h-8 w-8 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-lg">
            H
          </div>
          <span className="text-xl font-bold text-gray-800 tracking-tight">HMS Enterprise</span>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navigation.map((item) => (
            <SidebarItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to}
            />
          ))}
        </nav>
      </div>

      {/* Footer Info / Logout */}
      <div className="border-t border-gray-100 pt-4">
        <button
          onClick={() => console.log("logging out...")}
          className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-700 transition duration-150 cursor-pointer"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
