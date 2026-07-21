import React from "react";
import {
  CreditCard,
  TrendingUp,
  ShieldCheck,
  Pill,
  Microscope,
  Sparkles,
  FileText,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  PieChart
} from "lucide-react";

import DashboardSection from "./DashboardSection";
import DashboardGrid from "./DashboardGrid";
import MetricCard from "./MetricCard";
import InfrastructureStatusBadge from "./InfrastructureStatusBadge";

export interface FinancialDashboardData {
  revenueToday: number;
  revenueMonth: number;
  outstandingInvoices: number;
  insuranceClaimsPending: number;
  insuranceClaimsApproved: number;
  pharmacyRevenue: number;
  laboratoryRevenue: number;
  radiologyRevenue: number;
  averageInvoiceValue: number;
  unpaidBills: number;
  refundsToday: number;
  collectionRate: number;
}

const DEFAULT_FINANCIAL_DATA: FinancialDashboardData = {
  revenueToday: 248500,
  revenueMonth: 4820000,
  outstandingInvoices: 182400,
  insuranceClaimsPending: 640000,
  insuranceClaimsApproved: 1420000,
  pharmacyRevenue: 68200,
  laboratoryRevenue: 34500,
  radiologyRevenue: 28900,
  averageInvoiceValue: 412,
  unpaidBills: 45200,
  refundsToday: 1250,
  collectionRate: 98.2,
};

export interface FinancialKpiGridProps {
  data?: FinancialDashboardData;
}

export const FinancialKpiGrid: React.FC<FinancialKpiGridProps> = ({
  data = DEFAULT_FINANCIAL_DATA,
}) => {
  return (
    <DashboardSection
      title="Financial Administration & Revenue Cycle Overview"
      subtitle="Executive revenue collection, insurance claims remittance, departmental income, and billing efficiency"
      badge={
        <InfrastructureStatusBadge
          state="healthy"
          label="Revenue Cycle Optimal"
        />
      }
    >
      <DashboardGrid cols={4} gap={4}>
        {/* 1. Revenue Today */}
        <MetricCard
          label="Revenue Today"
          value={`$${data.revenueToday.toLocaleString()}`}
          subtext="Cleared cash & electronic payments"
          icon={<DollarSign className="h-4 w-4" />}
          variant="emerald"
          trend={{ direction: "up", value: "+12.3%" }}
        />

        {/* 2. Revenue This Month */}
        <MetricCard
          label="Revenue This Month"
          value={`$${(data.revenueMonth / 1000000).toFixed(2)}M`}
          subtext="Cumulative monthly gross revenue"
          icon={<TrendingUp className="h-4 w-4" />}
          variant="emerald"
          trend={{ direction: "up", value: "+6.8%" }}
        />

        {/* 3. Outstanding Invoices */}
        <MetricCard
          label="Outstanding Invoices"
          value={`$${data.outstandingInvoices.toLocaleString()}`}
          subtext="Pending patient balances"
          icon={<CreditCard className="h-4 w-4" />}
          variant="amber"
        />

        {/* 4. Pending Insurance Claims */}
        <MetricCard
          label="Pending Claims (RCM)"
          value={`$${(data.insuranceClaimsPending / 1000).toFixed(0)}k`}
          subtext="124 claims submitted to payers"
          icon={<FileText className="h-4 w-4" />}
          variant="indigo"
        />

        {/* 5. Approved Claims */}
        <MetricCard
          label="Approved Claims"
          value={`$${(data.insuranceClaimsApproved / 1000000).toFixed(2)}M`}
          subtext="96.4% payer approval rate"
          icon={<ShieldCheck className="h-4 w-4" />}
          variant="emerald"
          trend={{ direction: "up", value: "96.4%" }}
        />

        {/* 6. Pharmacy Revenue */}
        <MetricCard
          label="Pharmacy Income Today"
          value={`$${data.pharmacyRevenue.toLocaleString()}`}
          subtext="Medication & formulary sales"
          icon={<Pill className="h-4 w-4" />}
          variant="indigo"
        />

        {/* 7. Laboratory Revenue */}
        <MetricCard
          label="Laboratory Income Today"
          value={`$${data.laboratoryRevenue.toLocaleString()}`}
          subtext="Diagnostic lab test billing"
          icon={<Microscope className="h-4 w-4" />}
          variant="indigo"
        />

        {/* 8. Radiology Revenue */}
        <MetricCard
          label="Radiology Income Today"
          value={`$${data.radiologyRevenue.toLocaleString()}`}
          subtext="PACS imaging & scan billing"
          icon={<Sparkles className="h-4 w-4" />}
          variant="indigo"
        />

        {/* 9. Average Invoice Value */}
        <MetricCard
          label="Avg Invoice Value"
          value={`$${data.averageInvoiceValue}`}
          subtext="Average encounter billing size"
          icon={<PieChart className="h-4 w-4" />}
          variant="slate"
        />

        {/* 10. Unpaid Bills */}
        <MetricCard
          label="Overdue Unpaid Bills"
          value={`$${data.unpaidBills.toLocaleString()}`}
          subtext="32 overdue invoices (>30 days)"
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={data.unpaidBills > 50000 ? "crimson" : "amber"}
        />

        {/* 11. Refunds Processed */}
        <MetricCard
          label="Refunds Today"
          value={`$${data.refundsToday.toLocaleString()}`}
          subtext="3 transaction reversals"
          icon={<RotateCcw className="h-4 w-4" />}
          variant="slate"
        />

        {/* 12. Collection Rate */}
        <MetricCard
          label="Collection Efficiency"
          value={`${data.collectionRate}%`}
          subtext="Billed to collected ratio"
          icon={<CheckCircle2 className="h-4 w-4" />}
          variant="emerald"
          trend={{ direction: "up", value: "98.2%" }}
        />
      </DashboardGrid>
    </DashboardSection>
  );
};

export default FinancialKpiGrid;
