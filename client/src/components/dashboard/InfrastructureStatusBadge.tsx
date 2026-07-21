import React from "react";

export type HealthState = "healthy" | "warning" | "critical" | "info";

export interface InfrastructureStatusBadgeProps {
  state: HealthState;
  label: string;
  className?: string;
}

const STATE_CLASSES: Record<HealthState, string> = {
  healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
  info: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const STATE_DOTS: Record<HealthState, string> = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  info: "bg-indigo-500",
};

export const InfrastructureStatusBadge: React.FC<InfrastructureStatusBadgeProps> = ({
  state,
  label,
  className = "",
}) => {
  const badgeStyle = STATE_CLASSES[state] || STATE_CLASSES.healthy;
  const dotStyle = STATE_DOTS[state] || STATE_DOTS.healthy;

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-4xs font-bold border uppercase tracking-wider ${badgeStyle} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyle} animate-pulse`} />
      <span>{label}</span>
    </span>
  );
};

export default InfrastructureStatusBadge;
