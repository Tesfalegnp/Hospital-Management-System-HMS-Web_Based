import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import BookAppointment from "./pages/Appointments/BookAppointment";
import RecordEncounter from "./pages/Consultations/RecordEncounter";

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
        <Router>
          <div className="flex min-h-screen bg-gray-50 text-gray-900">
            {/* Sidebar Navigation */}
            <Sidebar />

            {/* Main Page Content */}
            <main className="flex-1 p-8 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/appointments" element={<BookAppointment />} />
                <Route path="/consultations" element={<RecordEncounter />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
