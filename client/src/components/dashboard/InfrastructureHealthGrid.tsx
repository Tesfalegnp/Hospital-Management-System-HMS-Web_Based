import React from "react";
import {
  Database,
  Server,
  Cpu,
  HardDrive,
  Activity,
  Layers,
  ShieldCheck,
  Zap,
  Globe
} from "lucide-react";

import DashboardSection from "./DashboardSection";
import DashboardGrid from "./DashboardGrid";
import MetricCard from "./MetricCard";
import InfrastructureStatusBadge from "./InfrastructureStatusBadge";

export interface InfrastructureMetricData {
  dbStatus: { state: "healthy" | "warning" | "critical"; latencyMs: number };
  dbPool: { active: number; max: number };
  redisStatus: { state: "healthy" | "warning" | "critical"; hitRatioPct: number };
  queueStatus: { activePending: number; completed24h: number };
  apiHealth: { uptimePct: number; requests24h: string };
  storageUsage: { usedTb: number; maxTb: number };
  cpuUsage: { pct: number; cores: number };
  memoryUsage: { usedGb: number; maxGb: number };
  licenseStatus: { type: string; status: string };
}

// Mock telemetry defaults (Structured for future React Query API swap)
const DEFAULT_INFRASTRUCTURE_DATA: InfrastructureMetricData = {
  dbStatus: { state: "healthy", latencyMs: 4 },
  dbPool: { active: 12, max: 50 },
  redisStatus: { state: "healthy", hitRatioPct: 94.2 },
  queueStatus: { activePending: 2, completed24h: 1240 },
  apiHealth: { uptimePct: 99.98, requests24h: "1.4M" },
  storageUsage: { usedTb: 1.4, maxTb: 10 },
  cpuUsage: { pct: 14, cores: 8 },
  memoryUsage: { usedGb: 3.8, maxGb: 16 },
  licenseStatus: { type: "Multi-Tenant Enterprise", status: "Active" },
};

export interface InfrastructureHealthGridProps {
  data?: InfrastructureMetricData;
}

export const InfrastructureHealthGrid: React.FC<InfrastructureHealthGridProps> = ({
  data = DEFAULT_INFRASTRUCTURE_DATA,
}) => {
  return (
    <DashboardSection
      title="Infrastructure & System Health Telemetry"
      subtitle="Real-time status monitor across PostgreSQL, Redis, Background Queues, and Server Resources"
      badge={
        <InfrastructureStatusBadge
          state="healthy"
          label="All Systems Operational"
        />
      }
    >
      <DashboardGrid cols={3} gap={4}>
        {/* 1. Database Status */}
        <MetricCard
          label="Database Status"
          value={`${data.dbStatus.latencyMs}ms Latency`}
          subtext="PostgreSQL Pool Session Mode"
          icon={<Database className="h-4 w-4" />}
          variant="emerald"
          trend={{ direction: "up", value: "Healthy" }}
        />

        {/* 2. Database Connection Pool */}
        <MetricCard
          label="DB Connection Pool"
          value={`${data.dbPool.active} / ${data.dbPool.max}`}
          subtext="24% Pool Capacity Utilization"
          icon={<Layers className="h-4 w-4" />}
          variant="indigo"
        />

        {/* 3. Redis Cache Status */}
        <MetricCard
          label="Redis Cache Status"
          value={`${data.redisStatus.hitRatioPct}% Hit Ratio`}
          subtext="Distributed In-Memory Cache"
          icon={<Zap className="h-4 w-4" />}
          variant="emerald"
          trend={{ direction: "up", value: "Connected" }}
        />

        {/* 4. Background Job Queue */}
        <MetricCard
          label="Job Queue Status"
          value={`${data.queueStatus.activePending} Pending`}
          subtext={`${data.queueStatus.completed24h.toLocaleString()} jobs completed 24h`}
          icon={<Activity className="h-4 w-4" />}
          variant="indigo"
        />

        {/* 5. API Health & Gateway */}
        <MetricCard
          label="API Gateway Health"
          value={`${data.apiHealth.uptimePct}% Uptime`}
          subtext={`${data.apiHealth.requests24h} requests processed (24h)`}
          icon={<Globe className="h-4 w-4" />}
          variant="emerald"
          trend={{ direction: "up", value: "99.98%" }}
        />

        {/* 6. Storage Utilization */}
        <MetricCard
          label="Storage Utilization"
          value={`${data.storageUsage.usedTb} TB / ${data.storageUsage.maxTb} TB`}
          subtext="14% Object Storage Occupancy"
          icon={<HardDrive className="h-4 w-4" />}
          variant="slate"
        />

        {/* 7. CPU Utilization */}
        <MetricCard
          label="CPU Load"
          value={`${data.cpuUsage.pct}% Utilized`}
          subtext={`${data.cpuUsage.cores} vCPU Core Cluster`}
          icon={<Cpu className="h-4 w-4" />}
          variant="indigo"
        />

        {/* 8. Memory Usage */}
        <MetricCard
          label="RAM Memory Usage"
          value={`${data.memoryUsage.usedGb} GB / ${data.memoryUsage.maxGb} GB`}
          subtext="23.8% Memory Allocation"
          icon={<Server className="h-4 w-4" />}
          variant="indigo"
        />

        {/* 9. License Status */}
        <MetricCard
          label="Platform License"
          value={data.licenseStatus.status}
          subtext={data.licenseStatus.type}
          icon={<ShieldCheck className="h-4 w-4" />}
          variant="emerald"
          trend={{ direction: "up", value: "Valid" }}
        />
      </DashboardGrid>
    </DashboardSection>
  );
};

export default InfrastructureHealthGrid;
