import React from "react";

export interface DashboardGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 4 | 6 | 8;
  className?: string;
}

const COLS_MAP: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
  6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
};

const GAP_MAP: Record<number, string> = {
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
};

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  children,
  cols = 4,
  gap = 4,
  className = "",
}) => {
  const gridColsClass = COLS_MAP[cols] || COLS_MAP[4];
  const gridGapClass = GAP_MAP[gap] || GAP_MAP[4];

  return (
    <div className={`grid ${gridColsClass} ${gridGapClass} ${className}`}>
      {children}
    </div>
  );
};

export default DashboardGrid;
