import React from "react";

export interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  title,
  subtitle,
  badge,
  actions,
  children,
  className = "",
}) => {
  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div className="flex items-center space-x-2.5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 leading-none">
            {title}
          </h2>
          {badge && <div>{badge}</div>}
        </div>
        {actions && <div className="flex items-center space-x-2">{actions}</div>}
      </div>

      {subtitle && (
        <p className="text-4xs text-gray-500 font-medium -mt-1">{subtitle}</p>
      )}

      <div>{children}</div>
    </section>
  );
};

export default DashboardSection;
