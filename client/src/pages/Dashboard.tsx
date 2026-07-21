import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  Users, Stethoscope, Calendar, Clock, LogIn, Microscope,
  AlertCircle, Pill, ShoppingBag, AlertTriangle, CreditCard, ShieldCheck, Activity,
  Bed, CheckCircle, TrendingUp, UserCog, History, ArrowRight, PlusCircle,
  Settings, RefreshCw, FileText, FileSpreadsheet, Lock, ClipboardList, SlidersHorizontal
} from "lucide-react";

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

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "apt_1",
    patientId: "pat_1",
    patient: { user: { firstName: "Johnathan", lastName: "Carter" } },
    doctorId: "doc_1",
    doctor: { user: { firstName: "Sarah", lastName: "Jenkins" } },
    appointmentDate: new Date().toISOString(),
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 1800000).toISOString(),
    status: "SCHEDULED",
    reason: "Cardiology follow-up scan"
  },
  {
    id: "apt_2",
    patientId: "pat_2",
    patient: { user: { firstName: "Emily", lastName: "Rodriguez" } },
    doctorId: "doc_2",
    doctor: { user: { firstName: "Marcus", lastName: "Vance" } },
    appointmentDate: new Date().toISOString(),
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 5400000).toISOString(),
    status: "CHECKED_IN",
    reason: "General health wellness check"
  },
  {
    id: "apt_3",
    patientId: "pat_3",
    patient: { user: { firstName: "Thomas", lastName: "Gable" } },
    doctorId: "doc_1",
    doctor: { user: { firstName: "Sarah", lastName: "Jenkins" } },
    appointmentDate: new Date().toISOString(),
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 5400000).toISOString(),
    status: "COMPLETED",
    reason: "Prescription adjustment review"
  }
];

const MOCK_AUDIT_LOGS = [
  { id: 1, action: "User Login", user: "admin@hospital.local", details: "Super Admin session initialized", time: "5 mins ago" },
  { id: 2, action: "Stock Intake", user: "Sarah Jenkins (MD)", details: "Added 100 units of Amoxicillin Batch B3", time: "25 mins ago" },
  { id: 3, action: "Bed Clear", user: "Emily Smith (RN)", details: "Cleared Bed B-104 (Ward A) from cleaning status", time: "1 hour ago" },
  { id: 4, action: "Invoice Issued", user: "Accountant", details: "Billed invoice #INV-4929 for Johnathan Carter", time: "2 hours ago" },
  { id: 5, action: "Lab Order Completed", user: "Lab Technician", details: "Released CBC results for patient chart", time: "3 hours ago" }
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const branchId = user?.branchId || "default-branch-id";
  const userRole = user?.role || "PATIENT";

  const handleStartConsultation = (_id: string) => {
    navigate("/consultations");
  };

  // General Queries
  const { data: apptsData, refetch: refetchAppts, isError: isApptsError } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const res = await api.get("/appointments");
      return res.data;
    },
    retry: false,
  });

  const appointments: Appointment[] = isApptsError || !apptsData?.data
    ? MOCK_APPOINTMENTS
    : apptsData.data;

  const { data: admissionsData } = useQuery({
    queryKey: ["admissions"],
    queryFn: async () => {
      const res = await api.get("/ipd/admissions");
      return res.data;
    },
  });
  const activeAdmissionsCount = admissionsData?.data?.length || 0;

  const { data: labQueueData } = useQuery({
    queryKey: ["labQueue"],
    queryFn: async () => {
      const res = await api.get("/labs/queue");
      return res.data;
    },
  });
  const labQueue = labQueueData?.data || [];
  const labOrdersCount = labQueue.length;
  const pendingResultsCount = labQueue.filter((l: any) => l.status === "SPECIMEN_COLLECTED" || l.status === "PROCESSING").length;

  const { data: prescriptionsData } = useQuery({
    queryKey: ["prescriptionsQueue"],
    queryFn: async () => {
      const res = await api.get("/pharmacy/prescriptions");
      return res.data;
    },
  });
  const rxQueue = prescriptionsData?.data || [];
  const prescriptionsCount = rxQueue.length;
  const pharmacyQueueCount = rxQueue.filter((rx: any) => rx.status === "PENDING" || rx.status === "PARTIALLY_DISPENSED").length;

  const { data: inventoryData } = useQuery({
    queryKey: ["inventorySafety", branchId],
    queryFn: async () => {
      const res = await api.get("/pharmacy/inventory/reports", { params: { branchId } });
      return res.data;
    },
    retry: false,
  });
  const safetyReport = inventoryData?.data || {};
  const stockAlertsCount = (safetyReport.expiredCount || 0) + (safetyReport.lowStockCount || 0);

  const { data: billingData } = useQuery({
    queryKey: ["billingSafety", branchId],
    queryFn: async () => {
      const res = await api.get("/billing/reports", { params: { branchId } });
      return res.data;
    },
    retry: false,
  });
  const billingReport = billingData?.data || {};
  const revenueTotal = billingReport.totalCollected || 0;
  const billingOutstanding = billingReport.outstandingAmount || 0;

  const { data: usersListData } = useQuery({
    queryKey: ["usersList"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data;
    },
    retry: false,
  });
  const systemUsersCount = usersListData?.data?.length || 1;

  // Helper lists
  const todayString = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

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

  // Card rendering helper
  const renderCard = (card: { label: string; value: string; sub: string; icon: React.ReactNode; color: string }) => (
    <div key={card.label} className="bg-white overflow-hidden shadow-2xs rounded-xl border border-gray-100 p-4 flex flex-col justify-between hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider leading-tight max-w-[80%]">
          {card.label}
        </span>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
          {card.icon}
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-lg font-extrabold text-gray-900 leading-none">{card.value}</h3>
        <p className="text-4xs font-medium text-gray-500 mt-1 leading-none truncate">{card.sub}</p>
      </div>
    </div>
  );

  // -------------------------------------------------------------
  // VIEW A: SUPER_ADMIN & ADMIN (Enterprise Command Dashboard)
  // -------------------------------------------------------------
  const renderAdminDashboard = () => {
    const adminCards = [
      { label: "Total Patients", value: "2,845", sub: "+12 new today", icon: <Users className="h-4 w-4" />, color: "text-blue-600 bg-blue-50" },
      { label: "Active Doctors", value: "34", sub: "8 on duty", icon: <Stethoscope className="h-4 w-4" />, color: "text-teal-600 bg-teal-50" },
      { label: "Appointments Queue", value: appointments.length.toString(), sub: "Today's scheduling", icon: <Calendar className="h-4 w-4" />, color: "text-indigo-600 bg-indigo-50" },
      { label: "Critical Stock Alerts", value: stockAlertsCount.toString(), sub: "Low / Expired meds", icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-600 bg-amber-50" },
      { label: "Hospitalized Admissions", value: activeAdmissionsCount.toString(), sub: "Inpatient Ward", icon: <LogIn className="h-4 w-4" />, color: "text-purple-600 bg-purple-50" },
      { label: "Pending Lab Results", value: pendingResultsCount.toString(), sub: "Awaiting pathologist", icon: <AlertCircle className="h-4 w-4" />, color: "text-red-600 bg-red-50" },
      { label: "Cash Revenue Collected", value: `$${revenueTotal.toLocaleString()}`, sub: "Monthly summary", icon: <TrendingUp className="h-4 w-4" />, color: "text-emerald-600 bg-emerald-50" },
      { label: "Billed Outstanding", value: `$${billingOutstanding.toLocaleString()}`, sub: "Accounts receivable", icon: <CreditCard className="h-4 w-4" />, color: "text-amber-600 bg-amber-50" },
      { label: "Insurance Claims", value: "14", sub: "Awaiting approvals", icon: <ShieldCheck className="h-4 w-4" />, color: "text-blue-600 bg-blue-50" },
      { label: "Available Wards Beds", value: "18", sub: "Ready for admissions", icon: <Bed className="h-4 w-4" />, color: "text-emerald-600 bg-emerald-50" },
      { label: "Active System Users", value: systemUsersCount.toString(), sub: "Registered accounts", icon: <UserCog className="h-4 w-4" />, color: "text-slate-600 bg-slate-50" },
      { label: "Security Audit Events", value: "182", sub: "Logged transactions", icon: <History className="h-4 w-4" />, color: "text-gray-600 bg-gray-50" }
    ];

    return (
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-2xs">
          <h2 className="text-3xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Workstation Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button onClick={() => navigate("/admin/users")} className="flex items-center space-x-2 p-2.5 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <PlusCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Register User</span>
            </button>
            <button onClick={() => navigate("/billing/tariffs")} className="flex items-center space-x-2 p-2.5 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Settings className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Configure Tariffs</span>
            </button>
            <button onClick={() => navigate("/pharmacy/inventory")} className="flex items-center space-x-2 p-2.5 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <PlusCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Intake Stock</span>
            </button>
            <button onClick={() => navigate("/ipd/board")} className="flex items-center space-x-2 p-2.5 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Bed className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Bed Board</span>
            </button>
            <button onClick={() => navigate("/appointments")} className="flex items-center space-x-2 p-2.5 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Calendar className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Book Appointment</span>
            </button>
          </div>
        </div>

        {/* Admin Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {adminCards.map(renderCard)}
        </div>

        {/* Queue and Audit Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white shadow-2xs rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Today's Clinic Queue</h2>
              {isApptsError && <span className="text-4xs font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">Sandbox Fallback</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-4xs tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">Doctor</th>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Reason</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {appointments.slice(0, 5).map((apt) => (
                    <tr key={apt.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-semibold text-gray-900">{apt.patient.user ? `${apt.patient.user.firstName} ${apt.patient.user.lastName}` : "Unknown"}</td>
                      <td className="px-5 py-3 text-gray-600">{apt.doctor.user ? `${apt.doctor.user.firstName} ${apt.doctor.user.lastName}` : "Unknown"}</td>
                      <td className="px-5 py-3 text-gray-600">{new Date(apt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-5 py-3 text-gray-500 truncate max-w-xs">{apt.reason || "N/A"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-4xs font-bold border uppercase tracking-wider ${getStatusBadgeClass(apt.status)}`}>
                          {apt.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="bg-white shadow-2xs rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <History className="h-4 w-4 text-indigo-500" />
              <span>Audit logs</span>
            </h2>
            <div className="space-y-4">
              {MOCK_AUDIT_LOGS.map((log) => (
                <div key={log.id} className="text-2xs border-b border-gray-50 pb-2.5 last:border-0 last:pb-0 space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-800">{log.action}</span>
                    <span className="text-gray-400 font-semibold">{log.time}</span>
                  </div>
                  <p className="text-gray-500">{log.details}</p>
                  <p className="text-indigo-600 font-bold text-3xs">{log.user}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // VIEW B: DOCTOR (Clinical Console)
  // -------------------------------------------------------------
  const renderDoctorDashboard = () => {
    const doctorCards = [
      { label: "My Appointments Today", value: appointments.length.toString(), sub: "Patient schedule bookings", icon: <Calendar className="h-4 w-4" />, color: "text-indigo-600 bg-indigo-50" },
      { label: "Active Consultations", value: appointments.filter(a => a.status === "CHECKED_IN" || a.status === "IN_PROGRESS").length.toString(), sub: "Checked-in clinic list", icon: <Activity className="h-4 w-4" />, color: "text-amber-600 bg-amber-50" },
      { label: "Prescriptions Written", value: prescriptionsCount.toString(), sub: "Pharmacy prescriptions", icon: <Pill className="h-4 w-4" />, color: "text-emerald-600 bg-emerald-50" },
      { label: "Pending Lab Results", value: pendingResultsCount.toString(), sub: "Diagnostic orders", icon: <Microscope className="h-4 w-4" />, color: "text-rose-600 bg-rose-50" }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-2xs">
          <h2 className="text-3xs font-bold text-gray-400 uppercase tracking-widest mb-3">Clinical Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button onClick={() => navigate("/consultations")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <FileText className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Record Encounter</span>
            </button>
            <button onClick={() => navigate("/ipd/board")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Bed className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">IPD Bed Board</span>
            </button>
            <button onClick={() => navigate("/pharmacy/dispensing")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Pill className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Prescriptions Queue</span>
            </button>
            <button onClick={() => navigate("/labs/queue")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Microscope className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Diagnostics Queue</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {doctorCards.map(renderCard)}
        </div>

        <div className="bg-white shadow-2xs rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Attending Appointments Queue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-4xs tracking-wider">
                <tr>
                  <th className="px-5 py-3">Patient Name</th>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-semibold text-gray-900">{apt.patient.user ? `${apt.patient.user.firstName} ${apt.patient.user.lastName}` : "Unknown"}</td>
                    <td className="px-5 py-3 text-gray-600">{new Date(apt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-5 py-3 text-gray-500">{apt.reason || "N/A"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-4xs font-bold border uppercase tracking-wider ${getStatusBadgeClass(apt.status)}`}>
                        {apt.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {apt.status !== "COMPLETED" && (
                        <button onClick={() => handleStartConsultation(apt.id)} className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-4xs font-bold shadow-3xs cursor-pointer">
                          <span>Record Encounter</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // VIEW C: NURSE (Ward Bed Console)
  // -------------------------------------------------------------
  const renderNurseDashboard = () => {
    const nurseCards = [
      { label: "Active Hospitalized", value: activeAdmissionsCount.toString(), sub: "Inpatient Ward", icon: <LogIn className="h-4 w-4" />, color: "text-purple-600 bg-purple-50" },
      { label: "Ward Occupancy", value: "72%", sub: "4 beds occupied", icon: <Bed className="h-4 w-4" />, color: "text-indigo-600 bg-indigo-50" },
      { label: "Available Beds", value: "18", sub: "Ready for admissions", icon: <CheckCircle className="h-4 w-4" />, color: "text-emerald-600 bg-emerald-50" },
      { label: "Critical Stock Warns", value: stockAlertsCount.toString(), sub: "Expired / Low stocks", icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-600 bg-amber-50" }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-2xs">
          <h2 className="text-3xs font-bold text-gray-400 uppercase tracking-widest mb-3">Nurse Operations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button onClick={() => navigate("/ipd/board")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Bed className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">IPD Bed Board</span>
            </button>
            <button onClick={() => navigate("/appointments")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Calendar className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Book Appointment</span>
            </button>
            <button onClick={() => navigate("/labs/queue")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Microscope className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Labs Queue</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {nurseCards.map(renderCard)}
        </div>

        <div className="bg-white shadow-2xs rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Active Hospitalized Inpatient Logs</h2>
          </div>
          <div className="px-6 py-10 text-center text-xs text-gray-500 font-semibold">
            Please use the <button onClick={() => navigate("/ipd/board")} className="text-indigo-600 hover:underline font-bold cursor-pointer">IPD Bed Board</button> to manage vitals, ward transfers, and clinical discharges.
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // VIEW D: RECEPTIONIST (Appointments Desk)
  // -------------------------------------------------------------
  const renderReceptionistDashboard = () => {
    const receptionCards = [
      { label: "Today's Appointments", value: appointments.length.toString(), sub: "Total booked queue", icon: <Calendar className="h-4 w-4" />, color: "text-indigo-600 bg-indigo-50" },
      { label: "Active Queue Patients", value: appointments.filter(a => a.status === "CHECKED_IN" || a.status === "IN_PROGRESS").length.toString(), sub: "Awaiting clinicians", icon: <Clock className="h-4 w-4" />, color: "text-amber-600 bg-amber-50" },
      { label: "Active Inpatients", value: activeAdmissionsCount.toString(), sub: "Ward admissions", icon: <LogIn className="h-4 w-4" />, color: "text-purple-600 bg-purple-50" },
      { label: "Available Beds", value: "18", sub: "Ready for check-in", icon: <CheckCircle className="h-4 w-4" />, color: "text-emerald-600 bg-emerald-50" }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-2xs">
          <h2 className="text-3xs font-bold text-gray-400 uppercase tracking-widest mb-3">Reception Desk Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate("/appointments")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Calendar className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Schedule New Appointment</span>
            </button>
            <button onClick={() => navigate("/ipd/board")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Bed className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">View Bed Board</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {receptionCards.map(renderCard)}
        </div>

        {/* Schedule List */}
        <div className="bg-white shadow-2xs rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Today's Scheduled Bookings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-4xs tracking-wider">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Doctor</th>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-semibold text-gray-900">{apt.patient.user ? `${apt.patient.user.firstName} ${apt.patient.user.lastName}` : "Unknown"}</td>
                    <td className="px-5 py-3 text-gray-600">{apt.doctor.user ? `${apt.doctor.user.firstName} ${apt.doctor.user.lastName}` : "Unknown"}</td>
                    <td className="px-5 py-3 text-gray-600">{new Date(apt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-5 py-3 text-gray-500">{apt.reason || "N/A"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-4xs font-bold border uppercase tracking-wider ${getStatusBadgeClass(apt.status)}`}>
                        {apt.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // VIEW E: LAB_TECHNICIAN (Diagnostics Hub)
  // -------------------------------------------------------------
  const renderLabTechDashboard = () => {
    const labCards = [
      { label: "Lab Orders Queue", value: labOrdersCount.toString(), sub: "Total ordered tests", icon: <Microscope className="h-4 w-4" />, color: "text-orange-600 bg-orange-50" },
      { label: "Awaiting Result Entries", value: labQueue.filter((l: any) => l.status === "PENDING").length.toString(), sub: "Needs specimen collect", icon: <AlertCircle className="h-4 w-4" />, color: "text-red-600 bg-red-50" },
      { label: "Processing Results", value: pendingResultsCount.toString(), sub: "Specimens in process", icon: <Activity className="h-4 w-4" />, color: "text-amber-600 bg-amber-50" },
      { label: "Completed Reports", value: labQueue.filter((l: any) => l.status === "COMPLETED").length.toString(), sub: "Validated & released", icon: <CheckCircle className="h-4 w-4" />, color: "text-emerald-600 bg-emerald-50" }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-2xs">
          <h2 className="text-3xs font-bold text-gray-400 uppercase tracking-widest mb-3">Laboratory Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button onClick={() => navigate("/labs/queue")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Microscope className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Access Lab Queue Workspace</span>
            </button>
            <button onClick={() => navigate("/ipd/board")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Bed className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">IPD Bed Board</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {labCards.map(renderCard)}
        </div>

        <div className="bg-white shadow-2xs rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Lab Specimen Worklist Queue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-4xs tracking-wider">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Ordered By</th>
                  <th className="px-5 py-3">Test Name</th>
                  <th className="px-5 py-3">Notes</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {labQueue.slice(0, 5).map((l: any) => (
                  <tr key={l.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-semibold text-gray-900">{l.patient ? `${l.patient.user?.firstName} ${l.patient.user?.lastName}` : "Unknown"}</td>
                    <td className="px-5 py-3 text-gray-600">{l.orderedBy?.user ? `Dr. ${l.orderedBy.user.lastName}` : "Unknown"}</td>
                    <td className="px-5 py-3 text-gray-900 font-bold">{l.testName}</td>
                    <td className="px-5 py-3 text-gray-500 truncate max-w-xs">{l.clinicalNotes || "—"}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-4xs font-bold border uppercase tracking-wider bg-indigo-50 text-indigo-700 border-indigo-100">
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // VIEW F: PHARMACIST (Prescription & Stock Hub)
  // -------------------------------------------------------------
  const renderPharmacistDashboard = () => {
    const pharmacistCards = [
      { label: "Prescriptions Written", value: prescriptionsCount.toString(), sub: "Total Rx queue", icon: <Pill className="h-4 w-4" />, color: "text-emerald-600 bg-emerald-50" },
      { label: "Pending Dispensing", value: pharmacyQueueCount.toString(), sub: "Needs pharmacist", icon: <ShoppingBag className="h-4 w-4" />, color: "text-violet-600 bg-violet-50" },
      { label: "Critical Stock Warns", value: stockAlertsCount.toString(), sub: "Low / Expired meds", icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-600 bg-amber-50" },
      { label: "Expired Batches", value: (safetyReport.expiredCount || 0).toString(), sub: "Quarantined stocks", icon: <AlertCircle className="h-4 w-4" />, color: "text-red-600 bg-red-50" }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-2xs">
          <h2 className="text-3xs font-bold text-gray-400 uppercase tracking-widest mb-3">Pharmacist Workspace</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={() => navigate("/pharmacy/formulary")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <Pill className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Formulary Catalog</span>
            </button>
            <button onClick={() => navigate("/pharmacy/inventory")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <ClipboardList className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Stock Inventory</span>
            </button>
            <button onClick={() => navigate("/pharmacy/dispensing")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <FileText className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Dispensing Queue</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pharmacistCards.map(renderCard)}
        </div>

        <div className="bg-white shadow-2xs rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Active Prescriptions Queue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-4xs tracking-wider">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Physician</th>
                  <th className="px-5 py-3">Prescription Date</th>
                  <th className="px-5 py-3">Notes</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rxQueue.slice(0, 5).map((rx: any) => (
                  <tr key={rx.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-semibold text-gray-900">{rx.patient ? `${rx.patient.user?.firstName} ${rx.patient.user?.lastName}` : "Unknown"}</td>
                    <td className="px-5 py-3 text-gray-600">{rx.doctor?.user ? `Dr. ${rx.doctor.user.lastName}` : "Unknown"}</td>
                    <td className="px-5 py-3 text-gray-600">{new Date(rx.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-gray-500 truncate max-w-xs">{rx.notes || "—"}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-4xs font-bold border uppercase tracking-wider bg-violet-50 text-violet-750 border-violet-100">
                        {rx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // VIEW G: ACCOUNTANT (Finance & Ledgers)
  // -------------------------------------------------------------
  const renderAccountantDashboard = () => {
    const accountantCards = [
      { label: "Billed Outstanding", value: `$${billingOutstanding.toLocaleString()}`, sub: "Accounts receivable", icon: <CreditCard className="h-4 w-4" />, color: "text-amber-600 bg-amber-50" },
      { label: "Cash Revenue Collected", value: `$${revenueTotal.toLocaleString()}`, sub: "Total payments", icon: <TrendingUp className="h-4 w-4" />, color: "text-emerald-600 bg-emerald-50" },
      { label: "Cash Drawer Collected", value: `$${(billingReport.cashCollected || 0).toLocaleString()}`, sub: "Handover drawer", icon: <CreditCard className="h-4 w-4" />, color: "text-indigo-600 bg-indigo-50" },
      { label: "Insurance Cover", value: `$${(billingReport.insuranceCollected || 0).toLocaleString()}`, sub: "Pending claim settlement", icon: <ShieldCheck className="h-4 w-4" />, color: "text-blue-600 bg-blue-50" }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-2xs">
          <h2 className="text-3xs font-bold text-gray-400 uppercase tracking-widest mb-3">Finance Workflows</h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate("/billing/tariffs")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <SlidersHorizontal className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Configure Tariffs</span>
            </button>
            <button onClick={() => navigate("/billing/cashier")} className="flex items-center space-x-2.5 p-3 border border-gray-100 rounded-lg hover:bg-indigo-50/50 hover:text-indigo-700 transition cursor-pointer text-left text-gray-600">
              <FileSpreadsheet className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold leading-tight">Cashier Portal</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {accountantCards.map(renderCard)}
        </div>

        <div className="bg-white shadow-2xs rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Active Invoice Worklist Ledger</h2>
          </div>
          <div className="px-6 py-10 text-center text-xs text-gray-500 font-semibold">
            Please use the <button onClick={() => navigate("/billing/cashier")} className="text-indigo-600 hover:underline font-bold cursor-pointer">Cashier Portal</button> to review invoice status, collect payments, and view cash transactions.
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // VIEW H: PATIENT & OTHERS (Placeholder Landing)
  // -------------------------------------------------------------
  const renderPatientDashboard = () => {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-6 max-w-xl mx-auto mt-10">
        <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-3xs">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900">Patient Health Portal</h2>
          <p className="text-xs font-semibold text-gray-500 leading-relaxed max-w-sm mx-auto">
            Welcome to St. Jude Patient Portal. We are currently configuring your account environment.
            Once released, you will be able to consult with doctors, view your clinical history, and check lab results online.
          </p>
        </div>
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-5xs font-bold uppercase tracking-widest bg-amber-50 text-amber-800 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span>Module Under Development</span>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // RENDER SELECTION ROUTER
  // -------------------------------------------------------------
  const renderDashboardByRole = () => {
    switch (userRole) {
      case "SUPER_ADMIN":
      case "ADMIN":
        return renderAdminDashboard();
      case "DOCTOR":
        return renderDoctorDashboard();
      case "NURSE":
        return renderNurseDashboard();
      case "RECEPTIONIST":
        return renderReceptionistDashboard();
      case "LAB_TECHNICIAN":
        return renderLabTechDashboard();
      case "PHARMACIST":
        return renderPharmacistDashboard();
      case "ACCOUNTANT":
        return renderAccountantDashboard();
      case "PATIENT":
      default:
        return renderPatientDashboard();
    }
  };

  const getDashboardTitle = () => {
    switch (userRole) {
      case "SUPER_ADMIN":
        return "Enterprise Administrator Command Center";
      case "ADMIN":
        return "Hospital Administration Command Center";
      case "DOCTOR":
        return `Attending Doctor clinical workspace`;
      case "NURSE":
        return "Nurse Ward Monitoring Workspace";
      case "RECEPTIONIST":
        return "Reception Desk Workspace";
      case "LAB_TECHNICIAN":
        return "Laboratory Diagnostics Workstation";
      case "PHARMACIST":
        return "Pharmacist Dispense Console";
      case "ACCOUNTANT":
        return "Finance & Cashier Workspace";
      default:
        return "Patient Portal";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 capitalize">
            {getDashboardTitle()}
          </h1>
          <p className="text-sm font-semibold text-gray-500 mt-1 flex items-center space-x-1.5">
            <span>Welcome back, {user?.firstName || "User"}</span>
            <span>•</span>
            <span className="text-indigo-600">{todayString}</span>
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={() => {
              refetchAppts();
              showSuccessNotification();
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 border border-gray-200 bg-white text-gray-600 rounded-lg text-xs font-semibold shadow-3xs hover:bg-gray-50 cursor-pointer transition"
          >
            <RefreshCw className="h-3.5 w-3.5 animate-spin-hover" />
            <span>Sync Console</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Router */}
      {renderDashboardByRole()}
    </div>
  );
};

// Helper notification
const showSuccessNotification = () => {
  const alertContainer = document.createElement("div");
  alertContainer.className = "fixed bottom-5 right-5 p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-100 shadow-lg flex items-center space-x-2 z-55 animate-bounce";
  alertContainer.innerHTML = `
    <svg class="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>Workstation synced successfully.</span>
  `;
  document.body.appendChild(alertContainer);
  setTimeout(() => alertContainer.remove(), 3000);
};

export default Dashboard;
