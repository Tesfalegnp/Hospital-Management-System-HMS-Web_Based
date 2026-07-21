import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import EnterpriseHeader from "./EnterpriseHeader";

export const EnterpriseLayout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50/60 text-gray-900 overflow-hidden w-full">
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <div
            className="w-64 h-full bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main App Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Persistent Top Command Header */}
        <EnterpriseHeader
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />

        {/* Scrollable Page Content Slot */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default EnterpriseLayout;
