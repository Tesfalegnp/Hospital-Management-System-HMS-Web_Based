import React from "react";

export type MetricVariant = "indigo" | "emerald" | "amber" | "crimson" | "slate";

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: MetricVariant;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  onClick?: () => void;
  className?: string;
}

const VARIANT_ICONS: Record<MetricVariant, string> = {
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  crimson: "bg-red-50 text-red-600 border-red-100",
  slate: "bg-slate-50 text-slate-600 border-slate-100",
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  variant = "indigo",
  trend,
  onClick,
  className = "",
}) => {
  const iconStyle = VARIANT_ICONS[variant] || VARIANT_ICONS.indigo;

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-gray-100 rounded-xl p-4 flex flex-col justify-between shadow-2xs transition-all duration-150 hover:shadow-md ${
        onClick ? "cursor-pointer hover:border-gray-200" : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider leading-tight max-w-[75%]">
          {label}
        </span>
        {icon && (
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${iconStyle}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="text-xl font-black text-gray-900 tracking-tight leading-none">
          {value}
        </div>

        {trend && (
          <div
            className={`flex items-center space-x-0.5 text-4xs font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider scale-95 ${
              trend.direction === "up"
                ? "bg-emerald-50 text-emerald-700"
                : trend.direction === "down"
                ? "bg-red-50 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <span>{trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "•"}</span>
            <span>{trend.value}</span>
          </div>
        )}
      </div>

      {subtext && (
        <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between text-4xs font-medium text-gray-400">
          <span>{subtext}</span>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
