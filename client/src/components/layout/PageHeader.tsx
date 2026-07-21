import React from "react";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: React.ReactNode;
  tags?: React.ReactNode;
  statusBadge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
  actions,
  tags,
  statusBadge,
}) => {
  return (
    <div className="mb-6 pb-4 border-b border-gray-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center space-x-3 flex-wrap gap-y-1">
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">
            {title}
          </h1>
          {statusBadge && <div>{statusBadge}</div>}
          {tags && <div className="flex items-center space-x-2">{tags}</div>}
        </div>
        {(subtitle || description) && (
          <p className="text-xs text-gray-500 font-medium">
            {subtitle || description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center space-x-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
