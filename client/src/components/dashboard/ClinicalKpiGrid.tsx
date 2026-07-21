import React from "react";
import {
  Users,
  Calendar,
  Bed,
  HeartHandshake,
  Activity,
  Microscope,
  Pill,
  Clock,
  Stethoscope,
  LogOut,
  Sparkles
} from "lucide-react";

import DashboardSection from "./DashboardSection";
import DashboardGrid from "./DashboardGrid";
import MetricCard from "./MetricCard";
import InfrastructureStatusBadge from "./InfrastructureStatusBadge";

export interface ClinicalDashboardData {
  totalPatientsToday: number;
  opdAppointmentsToday: number;
  admissionsToday: number;
  dischargesToday: number;
  emergencyVisits: number;
  icuOccupancy: { occupied: number; total: number; pct: number };
  bedOccupancy: { occupied: number; total: number; pct: number };
  activeConsultations: number;
  labOrdersCount: number;
  radiologyOrdersCount: number;
  pharmacyPrescriptionsCount: number;
  avgWaitingTimeMins: number;
}

const DEFAULT_CLINICAL_DATA: ClinicalDashboardData = {
  totalPatientsToday: 1840,
  opdAppointmentsToday: 1290,
  admissionsToday: 142,
  dischargesToday: 98,
  emergencyVisits: 38,
  icuOccupancy: { occupied: 46, total: 52, pct: 88.4 },
  bedOccupancy: { occupied: 1120, total: 1414, pct: 79.2 },
  activeConsultations: 42,
  labOrdersCount: 284,
  radiologyOrdersCount: 76,
  pharmacyPrescriptionsCount: 310,
  avgWaitingTimeMins: 14,
};

export interface ClinicalKpiGridProps {
  data?: ClinicalDashboardData;
}

export const ClinicalKpiGrid: React.FC<ClinicalKpiGridProps> = ({
  data = DEFAULT_CLINICAL_DATA,
}) => {
  return (
    <DashboardSection
      title="Clinical Operations Executive Overview"
      subtitle="Cross-hospital clinical capacity, patient volume, bed census, and diagnostic order queues"
      badge={
        <InfrastructureStatusBadge
          state="healthy"
          label="Clinical Care Active"
        />
      }
    >
      <DashboardGrid cols={4} gap={4}>
        {/* 1. Total Patients Today */}
        <MetricCard
          label="Total Patients Today"
          value={data.totalPatientsToday.toLocaleString()}
          subtext="OPD, IPD & ER registered"
          icon={<Users className="h-4 w-4" />}
          variant="indigo"
          trend={{ direction: "up", value: "+8.4%" }}
        />

        {/* 2. OPD Appointments Today */}
        <MetricCard
          label="OPD Appointments Today"
          value={data.opdAppointmentsToday.toLocaleString()}
          subtext="Outpatient clinic bookings"
          icon={<Calendar className="h-4 w-4" />}
          variant="indigo"
        />

        {/* 3. Admissions Today */}
        <MetricCard
          label="Admissions Today"
          value={data.admissionsToday}
          subtext="New inpatient ward admissions"
          icon={<Bed className="h-4 w-4" />}
          variant="emerald"
        />

        {/* 4. Discharges Today */}
        <MetricCard
          label="Discharges Today"
          value={data.dischargesToday}
          subtext="Cleared inpatient discharges"
          icon={<LogOut className="h-4 w-4" />}
          variant="slate"
        />

        {/* 5. Emergency Visits (ESI 1-2) */}
        <MetricCard
          label="Emergency Cases (ER)"
          value={`${data.emergencyVisits} Active`}
          subtext="ESI Level 1-2 Critical Triage"
          icon={<HeartHandshake className="h-4 w-4" />}
          variant="crimson"
          trend={{ direction: "neutral", value: "High Priority" }}
        />

        {/* 6. ICU Occupancy Rate */}
        <MetricCard
          label="ICU Occupancy"
          value={`${data.icuOccupancy.pct}%`}
          subtext={`${data.icuOccupancy.occupied} / ${data.icuOccupancy.total} ICU beds in use`}
          icon={<Activity className="h-4 w-4" />}
          variant="amber"
          trend={{ direction: "up", value: "88.4%" }}
        />

        {/* 7. Total Bed Occupancy Rate */}
        <MetricCard
          label="Total Bed Occupancy"
          value={`${data.bedOccupancy.pct}%`}
          subtext={`${data.bedOccupancy.occupied.toLocaleString()} / ${data.bedOccupancy.total.toLocaleString()} beds in use`}
          icon={<Bed className="h-4 w-4" />}
          variant="indigo"
        />

        {/* 8. Active Consultations */}
        <MetricCard
          label="Active Consultations"
          value={data.activeConsultations}
          subtext="In-progress physician encounters"
          icon={<Stethoscope className="h-4 w-4" />}
          variant="emerald"
        />

        {/* 9. Laboratory Orders Queue */}
        <MetricCard
          label="Laboratory Orders"
          value={data.labOrdersCount}
          subtext="Active diagnostic lab tests"
          icon={<Microscope className="h-4 w-4" />}
          variant="indigo"
        />

        {/* 10. Radiology Orders Queue */}
        <MetricCard
          label="Radiology Orders"
          value={data.radiologyOrdersCount}
          subtext="X-Ray, CT & MRI imaging queue"
          icon={<Sparkles className="h-4 w-4" />}
          variant="indigo"
        />

        {/* 11. Pharmacy Prescriptions Queue */}
        <MetricCard
          label="Pharmacy Prescriptions"
          value={data.pharmacyPrescriptionsCount}
          subtext="Pending rx verification & dispensing"
          icon={<Pill className="h-4 w-4" />}
          variant="amber"
        />

        {/* 12. Average Waiting Time */}
        <MetricCard
          label="Average Waiting Time"
          value={`${data.avgWaitingTimeMins} mins`}
          subtext="OPD intake to consultation avg"
          icon={<Clock className="h-4 w-4" />}
          variant="emerald"
          trend={{ direction: "down", value: "-3 mins" }}
        />
      </DashboardGrid>
    </DashboardSection>
  );
};

export default ClinicalKpiGrid;
