import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

// Human-readable dictionary mapping route path segments to enterprise titles
const PATH_NAMES: Record<string, string> = {
  admin: "System Management",
  users: "User Accounts",
  roles: "Roles & Permissions",
  permissions: "Permission Catalog",
  appointments: "Appointments",
  consultations: "Clinical Consultations",
  ipd: "Inpatient Care (IPD)",
  board: "Bed Board",
  admissions: "Admissions",
  labs: "Laboratory Worklist",
  queue: "Work Queue",
  pharmacy: "Pharmacy Services",
  formulary: "Formulary Catalog",
  inventory: "Stock Inventory",
  dispensing: "Dispensing Queue",
  billing: "Financial Administration",
  tariffs: "Tariff Settings",
  cashier: "Cashier Billing",
};

export interface BreadcrumbItem {
  label: string;
  path: string;
  isLast: boolean;
}

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  // Build trail starting with Home / Console Dashboard
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: "Console Dashboard",
      path: "/",
      isLast: pathSegments.length === 0,
    },
  ];

  let currentPath = "";
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const formattedLabel =
      PATH_NAMES[segment.toLowerCase()] ||
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");

    breadcrumbs.push({
      label: formattedLabel,
      path: currentPath,
      isLast: index === pathSegments.length - 1,
    });
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs">
      <Link
        to="/"
        className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
        title="Go to Console Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {breadcrumbs.slice(1).map((item) => (
        <React.Fragment key={item.path}>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          {item.isLast ? (
            <span className="font-semibold text-gray-800 tracking-tight" aria-current="page">
              {item.label}
            </span>
          ) : (
            <Link
              to={item.path}
              className="text-gray-500 hover:text-indigo-600 font-medium transition-colors"
            >
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
