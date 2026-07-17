import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Calendar, Activity, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import api from "../services/api";

interface Appointment {
  id: string;
  patientId: string;
  patient: {
    user?: {
      firstName: string;
      lastName: string;
    };
  };
  doctorId: string;
  doctor: {
    user?: {
      firstName: string;
      lastName: string;
    };
  };
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "CONFIRMED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  reason?: string;
}

// Fallback Mock Data in case backend connection is unavailable
const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "apt_111111111111111111111111",
    patientId: "pat123456789012345678901234",
    patient: {
      user: { firstName: "Johnathan", lastName: "Carter" }
    },
    doctorId: "doc123456789012345678901234",
    doctor: {
      user: { firstName: "Sarah", lastName: "Jenkins" }
    },
    appointmentDate: new Date().toISOString(),
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 1800000).toISOString(),
    status: "SCHEDULED",
    reason: "Cardiology follow-up scan"
  },
  {
    id: "apt_222222222222222222222222",
    patientId: "pat567890123456789012345678",
    patient: {
      user: { firstName: "Emily", lastName: "Rodriguez" }
    },
    doctorId: "doc567890123456789012345678",
    doctor: {
      user: { firstName: "Marcus", lastName: "Vance" }
    },
    appointmentDate: new Date().toISOString(),
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 5400000).toISOString(),
    status: "CHECKED_IN",
    reason: "General health wellness check"
  },
  {
    id: "apt_333333333333333333333333",
    patientId: "pat123456789012345678901234",
    patient: {
      user: { firstName: "Johnathan", lastName: "Carter" }
    },
    doctorId: "doc567890123456789012345678",
    doctor: {
      user: { firstName: "Marcus", lastName: "Vance" }
    },
    appointmentDate: new Date().toISOString(),
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 5400000).toISOString(),
    status: "COMPLETED",
    reason: "Prescription adjustment review"
  }
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Query to fetch real-time appointments
  const { data: serverResponse, isError } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const res = await api.get("/appointments");
      return res.data;
    },
    retry: false, // Don't block loading UI if database is offline
  });

  // Decide whether to use server data or mock fallback
  const appointments: Appointment[] = isError || !serverResponse?.data
    ? MOCK_APPOINTMENTS
    : serverResponse.data;

  // Calculate Metrics dynamically
  const totalToday = appointments.length;
  const pendingCount = appointments.filter(
    (apt) => apt.status !== "COMPLETED" && apt.status !== "CANCELLED"
  ).length;
  const completedCount = appointments.filter((apt) => apt.status === "COMPLETED").length;

  const handleStartConsultation = (appointmentId: string) => {
    navigate(`/consultations?appointmentId=${appointmentId}`);
  };

  const getStatusBadgeClass = (status: Appointment["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border-red-100";
      case "CHECKED_IN":
      case "IN_PROGRESS":
        return "bg-amber-50 text-amber-700 border-amber-100";
      default:
        return "bg-indigo-50 text-indigo-700 border-indigo-100";
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome to the Enterprise HMS clinical console. Here is today's overview.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* Today's Appointments */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-500">Today's Appointments</span>
            <h3 className="text-3xl font-bold text-gray-900">{totalToday}</h3>
          </div>
          <div className="h-12 w-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
            <Calendar className="h-6 w-6" />
          </div>
        </div>

        {/* Pending Consultations */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-500">Pending Consultations</span>
            <h3 className="text-3xl font-bold text-amber-600">{pendingCount}</h3>
          </div>
          <div className="h-12 w-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
            <Activity className="h-6 w-6" />
          </div>
        </div>

        {/* Completed Encounters */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-500">Completed Encounters</span>
            <h3 className="text-3xl font-bold text-emerald-600">{completedCount}</h3>
          </div>
          <div className="h-12 w-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Today's Queue Card */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Today's Clinic Queue</h2>
            <p className="text-xs text-gray-500 mt-1">Real-time scheduling checklist</p>
          </div>
          {isError && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Demo Sandbox Mode
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-55">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Attending Doctor</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time Slot</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                    No appointments scheduled for today.
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => {
                  const patientName = apt.patient.user
                    ? `${apt.patient.user.firstName} ${apt.patient.user.lastName}`
                    : "Unknown Patient";
                  const doctorName = apt.doctor.user
                    ? `${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`
                    : "Unknown Doctor";
                  const startTimeString = new Date(apt.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  const isPending = apt.status !== "COMPLETED" && apt.status !== "CANCELLED";

                  return (
                    <tr key={apt.id} className="hover:bg-gray-50/50 transition">
                      {/* Patient info */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{patientName}</td>
                      {/* Doctor info */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{doctorName}</td>
                      {/* Time slot */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{startTimeString}</span>
                        </div>
                      </td>
                      {/* Reason */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">{apt.reason || "N/A"}</td>
                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(apt.status)}`}>
                          {apt.status.replace("_", " ")}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {isPending ? (
                          <button
                            onClick={() => handleStartConsultation(apt.id)}
                            className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
                          >
                            <span>Start Consultation</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">Record Closed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
