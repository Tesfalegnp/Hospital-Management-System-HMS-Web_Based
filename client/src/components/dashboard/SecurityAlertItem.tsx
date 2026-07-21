import React from "react";
import { ShieldCheck, Key, Lock, AlertOctagon } from "lucide-react";

export type SecuritySeverity = "critical" | "warning" | "info" | "audit";

export interface SecurityEventItem {
  id: string;
  type: string;
  description: string;
  actor: string;
  timestamp: string;
  severity: SecuritySeverity;
}

export interface SecurityAlertItemProps {
  event: SecurityEventItem;
}

const SEVERITY_ICONS: Record<SecuritySeverity, React.ReactNode> = {
  critical: <AlertOctagon className="h-4 w-4 text-red-600" />,
  warning: <Lock className="h-4 w-4 text-amber-600" />,
  info: <Key className="h-4 w-4 text-indigo-600" />,
  audit: <ShieldCheck className="h-4 w-4 text-emerald-600" />,
};

const SEVERITY_BADGES: Record<SecuritySeverity, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-indigo-50 text-indigo-700 border-indigo-200",
  audit: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export const SecurityAlertItem: React.FC<SecurityAlertItemProps> = ({ event }) => {
  const icon = SEVERITY_ICONS[event.severity] || SEVERITY_ICONS.info;
  const badgeStyle = SEVERITY_BADGES[event.severity] || SEVERITY_BADGES.info;

  return (
    <div className="py-2.5 flex items-start justify-between gap-3 text-xs">
      <div className="flex items-start space-x-3 min-w-0">
        <div className="p-1.5 rounded-md bg-gray-50 border border-gray-100 shrink-0 mt-0.5">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="font-bold text-gray-900 tracking-tight leading-tight">
              {event.type}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-4xs font-extrabold border uppercase tracking-wider ${badgeStyle}`}
            >
              {event.severity}
            </span>
          </div>
          <p className="text-4xs text-gray-500 font-medium truncate mt-0.5">
            {event.description}
          </p>
          <p className="text-4xs text-indigo-600 font-semibold mt-0.5">
            Actor: {event.actor}
          </p>
        </div>
      </div>
      <span className="text-4xs font-semibold text-gray-400 shrink-0">
        {event.timestamp}
      </span>
    </div>
  );
};

export default SecurityAlertItem;
