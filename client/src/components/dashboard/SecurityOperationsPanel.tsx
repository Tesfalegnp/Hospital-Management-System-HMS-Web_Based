import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Key,
  Users,
  History
} from "lucide-react";

import DashboardSection from "./DashboardSection";
import DashboardGrid from "./DashboardGrid";
import DashboardPanel from "./DashboardPanel";
import MetricCard from "./MetricCard";
import InfrastructureStatusBadge from "./InfrastructureStatusBadge";
import SecurityAlertItem, { type SecurityEventItem } from "./SecurityAlertItem";

export interface SecurityDashboardData {
  failedLogins24h: number;
  lockedAccounts: number;
  activeSessions: number;
  activeApiKeys: number;
  auditEventsToday: number;
  criticalAlerts: number;
  warningAlerts: number;
  expiringApiKeys: number;
  recentEvents: SecurityEventItem[];
}

const DEFAULT_SECURITY_DATA: SecurityDashboardData = {
  failedLogins24h: 14,
  lockedAccounts: 2,
  activeSessions: 412,
  activeApiKeys: 48,
  auditEventsToday: 14290,
  criticalAlerts: 0,
  warningAlerts: 2,
  expiringApiKeys: 3,
  recentEvents: [
    {
      id: "sec_1",
      type: "API Key Generated",
      description: "Issued production API Key #AK-4912 for Quest Lab Gateway",
      actor: "superadmin@stjude.org",
      timestamp: "10 mins ago",
      severity: "info",
    },
    {
      id: "sec_2",
      type: "Failed Login Spike",
      description: "Multiple failed authentication attempts detected from IP 192.168.1.104",
      actor: "unknown_client",
      timestamp: "28 mins ago",
      severity: "warning",
    },
    {
      id: "sec_3",
      type: "Account Locked",
      description: "User account 'dr.jenkins@stjude.org' locked due to 5 consecutive invalid passwords",
      actor: "system_auth",
      timestamp: "1 hour ago",
      severity: "warning",
    },
    {
      id: "sec_4",
      type: "RBAC Role Modified",
      description: "Updated permission matrix for Role 'PHARMACIST_LEAD'",
      actor: "admin@stjude.org",
      timestamp: "2 hours ago",
      severity: "audit",
    },
  ],
};

export interface SecurityOperationsPanelProps {
  data?: SecurityDashboardData;
}

export const SecurityOperationsPanel: React.FC<SecurityOperationsPanelProps> = ({
  data = DEFAULT_SECURITY_DATA,
}) => {
  return (
    <DashboardSection
      title="Security Operations Center (SOC)"
      subtitle="Real-time access control monitoring, identity threat telemetry, and API key audit register"
      badge={
        <InfrastructureStatusBadge
          state={data.criticalAlerts > 0 ? "critical" : data.warningAlerts > 0 ? "warning" : "healthy"}
          label={data.criticalAlerts > 0 ? `${data.criticalAlerts} Critical Alerts` : "SOC Active • Zero Breaches"}
        />
      }
    >
      <div className="space-y-4">
        {/* SOC Metric Summary Cards */}
        <DashboardGrid cols={4} gap={4}>
          <MetricCard
            label="Failed Logins (24h)"
            value={data.failedLogins24h}
            subtext="Tracked brute force attempts"
            icon={<Lock className="h-4 w-4" />}
            variant={data.failedLogins24h > 20 ? "crimson" : "amber"}
            trend={{ direction: "neutral", value: "Normal" }}
          />

          <MetricCard
            label="Locked Accounts"
            value={data.lockedAccounts}
            subtext="Temporarily suspended users"
            icon={<ShieldAlert className="h-4 w-4" />}
            variant={data.lockedAccounts > 0 ? "amber" : "slate"}
          />

          <MetricCard
            label="Active User Sessions"
            value={data.activeSessions}
            subtext="Authenticated JWT sessions"
            icon={<Users className="h-4 w-4" />}
            variant="indigo"
          />

          <MetricCard
            label="Active API Keys"
            value={data.activeApiKeys}
            subtext={`${data.expiringApiKeys} keys expiring in 7 days`}
            icon={<Key className="h-4 w-4" />}
            variant="emerald"
          />
        </DashboardGrid>

        {/* SOC Events Timeline & Audit Summary Panel */}
        <DashboardGrid cols={2} gap={6}>
          {/* Recent Security Events List */}
          <DashboardPanel
            title="Real-Time Security Event Stream"
            subtitle="Live authentication and authorization mutations"
            icon={<ShieldCheck className="h-4 w-4" />}
            action={
              <span className="text-4xs font-bold text-gray-400 uppercase tracking-widest">
                SOC Stream Live
              </span>
            }
          >
            <div className="divide-y divide-gray-100">
              {data.recentEvents.map((event) => (
                <SecurityAlertItem key={event.id} event={event} />
              ))}
            </div>
          </DashboardPanel>

          {/* Security Overview & Compliance Status */}
          <DashboardPanel
            title="Security Audit & Compliance Register"
            subtitle="SOC 2 Type II & HIPAA audit telemetry status"
            icon={<History className="h-4 w-4" />}
          >
            <div className="space-y-3">
              <MetricCard
                label="Audit Events Logged Today"
                value={data.auditEventsToday.toLocaleString()}
                subtext="Centralized immutable AuditLog table"
                icon={<History className="h-4 w-4" />}
                variant="indigo"
              />

              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                  <span>HIPAA Compliance Checks</span>
                  <span className="text-emerald-700 text-4xs uppercase tracking-wider font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Compliant
                  </span>
                </div>
                <p className="text-4xs text-gray-500 font-medium leading-relaxed">
                  Encryption in transit (TLS 1.3) & resting SHA-256 key hashes enforced. Session tokens rotated automatically every 15 minutes.
                </p>
              </div>
            </div>
          </DashboardPanel>
        </DashboardGrid>
      </div>
    </DashboardSection>
  );
};

export default SecurityOperationsPanel;
