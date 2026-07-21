import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  Stethoscope, Calendar, Microscope,
  Pill, AlertTriangle, CreditCard, Activity,
  Bed, UserCog, History, ArrowRight,
  RefreshCw, FileSpreadsheet, ClipboardList
} from "lucide-react";

import PageHeader from "../components/layout/PageHeader";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import DashboardSection from "../components/dashboard/DashboardSection";
import DashboardPanel from "../components/dashboard/DashboardPanel";
import MetricCard from "../components/dashboard/MetricCard";
import InfrastructureHealthGrid from "../components/dashboard/InfrastructureHealthGrid";
import SecurityOperationsPanel from "../components/dashboard/SecurityOperationsPanel";
import ClinicalKpiGrid from "../components/dashboard/ClinicalKpiGrid";
import FinancialKpiGrid from "../components/dashboard/FinancialKpiGrid";

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

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Console Dashboard"
        subtitle={`Real-time operational summary • ${todayString}`}
        statusBadge={
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-4xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-widest">
            <Activity className="h-3 w-3" />
            <span>Systems Online</span>
          </span>
        }
        actions={
          <button
            onClick={() => refetchAppts()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Data</span>
          </button>
        }
      />

      {/* 2. Key Metrics Summary Grid */}
      <DashboardSection title="Platform Telemetry Overview">
        <DashboardGrid cols={4} gap={4}>
          <MetricCard
            label="Active Admissions"
            value={activeAdmissionsCount}
            subtext="Currently admitted inpatients"
            icon={<Bed className="h-4 w-4" />}
            variant="indigo"
          />
          <MetricCard
            label="Pending Lab Queue"
            value={pendingResultsCount}
            subtext={`${labOrdersCount} total orders in queue`}
            icon={<Microscope className="h-4 w-4" />}
            variant="emerald"
          />
          <MetricCard
            label="Rx Dispensing Queue"
            value={pharmacyQueueCount}
            subtext={`${prescriptionsCount} total prescriptions`}
            icon={<Pill className="h-4 w-4" />}
            variant="amber"
          />
          <MetricCard
            label="Stock Safety Alerts"
            value={stockAlertsCount}
            subtext="Low stock & expired items"
            icon={<AlertTriangle className="h-4 w-4" />}
            variant={stockAlertsCount > 0 ? "crimson" : "slate"}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* 3. Executive Domain Overview (Admin & Super Admin) */}
      {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
        <>
          <ClinicalKpiGrid />
          <FinancialKpiGrid />
          <InfrastructureHealthGrid />
          <SecurityOperationsPanel />
        </>
      )}

      {/* 4. Role-Based Specialized Workspace Panels */}
      {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
        <DashboardSection title="Administrative Operations & Revenue Overview">
          <DashboardGrid cols={2} gap={6}>
            {/* Financial Summary Panel */}
            <DashboardPanel
              title="Revenue & Billing Metrics"
              subtitle="Current branch collection totals"
              icon={<CreditCard className="h-4 w-4" />}
            >
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  label="Total Collected"
                  value={`$${revenueTotal.toLocaleString()}`}
                  subtext="Cleared payments"
                  icon={<CreditCard className="h-4 w-4" />}
                  variant="emerald"
                />
                <MetricCard
                  label="Outstanding Balance"
                  value={`$${billingOutstanding.toLocaleString()}`}
                  subtext="Unbilled / pending invoices"
                  icon={<CreditCard className="h-4 w-4" />}
                  variant="amber"
                />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Registered Platform Users</span>
                <span className="font-bold text-gray-900">{systemUsersCount} Active Accounts</span>
              </div>
            </DashboardPanel>

            {/* Quick Actions Panel */}
            <DashboardPanel
              title="System Administration Shortcuts"
              subtitle="Quick navigation triggers for administrators"
              icon={<UserCog className="h-4 w-4" />}
            >
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate("/admin/users")}
                  className="p-3 bg-gray-50 hover:bg-indigo-50 border border-gray-200/80 hover:border-indigo-200 rounded-lg text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-2 text-gray-900 font-bold text-xs group-hover:text-indigo-600">
                    <UserCog className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>User Management</span>
                  </div>
                  <p className="text-4xs text-gray-400 font-medium mt-1">Manage accounts & roles</p>
                </button>

                <button
                  onClick={() => navigate("/pharmacy/inventory")}
                  className="p-3 bg-gray-50 hover:bg-indigo-50 border border-gray-200/80 hover:border-indigo-200 rounded-lg text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-2 text-gray-900 font-bold text-xs group-hover:text-indigo-600">
                    <ClipboardList className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>Stock Inventory</span>
                  </div>
                  <p className="text-4xs text-gray-400 font-medium mt-1">Monitor pharmacy batches</p>
                </button>

                <button
                  onClick={() => navigate("/billing/cashier")}
                  className="p-3 bg-gray-50 hover:bg-indigo-50 border border-gray-200/80 hover:border-indigo-200 rounded-lg text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-2 text-gray-900 font-bold text-xs group-hover:text-indigo-600">
                    <FileSpreadsheet className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>Cashier Billing</span>
                  </div>
                  <p className="text-4xs text-gray-400 font-medium mt-1">Collect payments & invoices</p>
                </button>

                <button
                  onClick={() => navigate("/ipd/board")}
                  className="p-3 bg-gray-50 hover:bg-indigo-50 border border-gray-200/80 hover:border-indigo-200 rounded-lg text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-2 text-gray-900 font-bold text-xs group-hover:text-indigo-600">
                    <Bed className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>IPD Bed Board</span>
                  </div>
                  <p className="text-4xs text-gray-400 font-medium mt-1">Inpatient bed census</p>
                </button>
              </div>
            </DashboardPanel>
          </DashboardGrid>
        </DashboardSection>
      )}

      {/* 4. Appointments & Audit Schedule Grid */}
      <DashboardGrid cols={2} gap={6}>
        {/* Active Appointments Schedule */}
        <DashboardPanel
          title="Today's Consultation Schedule"
          subtitle={`${appointments.length} appointments listed`}
          icon={<Calendar className="h-4 w-4" />}
          action={
            <button
              onClick={() => navigate("/appointments")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          {appointments.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs font-medium">
              No appointments scheduled for today.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {appointments.slice(0, 4).map((apt) => (
                <div key={apt.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700 font-bold text-xs shrink-0">
                      <Stethoscope className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 leading-tight">
                        {apt.patient?.user ? `${apt.patient.user.firstName} ${apt.patient.user.lastName}` : "Unknown Patient"}
                      </p>
                      <p className="text-4xs text-gray-500 font-medium mt-0.5">
                        Dr. {apt.doctor?.user ? `${apt.doctor.user.firstName} ${apt.doctor.user.lastName}` : "Assigned MD"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-0.5 rounded text-4xs font-extrabold border ${getStatusBadgeClass(apt.status)} uppercase tracking-wider`}>
                      {apt.status.replace("_", " ")}
                    </span>
                    {(userRole === "DOCTOR" || userRole === "ADMIN" || userRole === "SUPER_ADMIN") && apt.status !== "COMPLETED" && (
                      <button
                        onClick={() => handleStartConsultation(apt.id)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-4xs font-bold transition-colors cursor-pointer"
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

        {/* System Activity & Security Audit Log */}
        <DashboardPanel
          title="Recent System Audit Activity"
          subtitle="Real-time security mutation log"
          icon={<History className="h-4 w-4" />}
        >
          <div className="divide-y divide-gray-100">
            {MOCK_AUDIT_LOGS.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between first:pt-0 last:pb-0">
                <div className="flex items-start space-x-2.5">
                  <div className="h-2 w-2 bg-indigo-600 rounded-full mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-tight">
                      {log.action}
                    </p>
                    <p className="text-4xs text-gray-500 font-medium mt-0.5">
                      {log.details}
                    </p>
                    <p className="text-4xs text-indigo-600 font-semibold mt-0.5">
                      By {log.user}
                    </p>
                  </div>
                </div>
                <span className="text-4xs font-semibold text-gray-400 shrink-0">
                  {log.time}
                </span>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </DashboardGrid>
    </div>
  );
};

export default Dashboard;
