import React from "react";

export interface DashboardPanelProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  padding?: "none" | "small" | "normal" | "large";
  className?: string;
}

const PADDING_MAP: Record<string, string> = {
  none: "p-0",
  small: "p-3",
  normal: "p-5",
  large: "p-6",
};

export const DashboardPanel: React.FC<DashboardPanelProps> = ({
  title,
  subtitle,
  action,
  icon,
  children,
  padding = "normal",
  className = "",
}) => {
  const paddingClass = PADDING_MAP[padding] || PADDING_MAP.normal;

  return (
    <div
      className={`bg-white border border-gray-100 rounded-xl shadow-2xs overflow-hidden flex flex-col justify-between transition-all hover:shadow-xs ${className}`}
    >
      {(title || action || icon) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100/80 bg-gray-50/40">
          <div className="flex items-center space-x-2.5">
            {icon && <div className="text-gray-500">{icon}</div>}
            <div>
              {title && (
                <h3 className="text-xs font-bold text-gray-900 tracking-tight leading-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-4xs text-gray-400 font-medium leading-none mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className={`flex-1 ${paddingClass}`}>{children}</div>
    </div>
  );
};

export default DashboardPanel;
