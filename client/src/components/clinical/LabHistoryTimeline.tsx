import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Calendar, FileSpreadsheet, User } from "lucide-react";
import api from "../../services/api";

interface LabHistoryTimelineProps {
  patientId: string;
}

interface LabResult {
  id: string;
  findings: string;
  quantitativeData?: Record<string, any>;
  recordedAt: string;
}

interface HistoricalLabOrder {
  id: string;
  testName: string;
  clinicalNotes?: string;
  status: "ORDERED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  results?: LabResult | null;
  fulfilledBy?: {
    firstName: string;
    lastName: string;
  } | null;
}

// Fallback Mock Data for demo sandbox environment
const MOCK_HISTORY: HistoricalLabOrder[] = [
  {
    id: "hist_1",
    testName: "Complete Blood Count (CBC)",
    status: "COMPLETED",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    clinicalNotes: "Patient displays severe fatigue. Check iron levels and red cell counts.",
    results: {
      id: "res_1",
      findings: "Red cell counts within baseline range. Mild thrombocytopenia noted. Hemoglobin levels recovering.",
      quantitativeData: {
        "WBC Count": "6.2 x10^3/uL",
        "RBC Count": "4.5 x10^6/uL",
        "Hemoglobin": "13.8 g/dL",
        "Hematocrit": "41%",
        "Platelets": "142 x10^3/uL"
      },
      recordedAt: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString()
    },
    fulfilledBy: {
      firstName: "Marcus",
      lastName: "Vance"
    }
  },
  {
    id: "hist_2",
    testName: "Fasting Blood Sugar (FBS)",
    status: "ORDERED",
    createdAt: new Date().toISOString(),
    clinicalNotes: "Screening for type 2 diabetes follow-up.",
    results: null,
    fulfilledBy: null
  }
];

export const LabHistoryTimeline: React.FC<LabHistoryTimelineProps> = ({ patientId }) => {
  // Fetch patient history query
  const { data: serverResponse, isError, isLoading } = useQuery({
    queryKey: ["patientLabHistory", patientId],
    queryFn: async () => {
      const res = await api.get(`/labs/patient/${patientId}`);
      return res.data;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const history: HistoricalLabOrder[] = isError || !serverResponse?.data
    ? MOCK_HISTORY
    : serverResponse.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5 text-gray-500" />
          <span>Laboratory & Diagnostic History</span>
        </h3>
        {isError && (
          <span className="text-xs text-gray-400 italic font-medium">
            Demo Sandbox Mode
          </span>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-gray-500 italic text-center py-6">
          No diagnostic history recorded for this patient.
        </p>
      ) : (
        <div className="relative border-l border-gray-200 ml-4 pl-6 space-y-8">
          {history.map((order) => {
            const isCompleted = order.status === "COMPLETED";
            const orderDateStr = new Date(order.createdAt).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric"
            });

            return (
              <div key={order.id} className="relative">
                {/* Timeline Icon Node */}
                <span className={`absolute -left-[35px] top-0 h-6 w-6 rounded-full flex items-center justify-center border-4 bg-white ${
                  isCompleted
                    ? "border-emerald-100 text-emerald-600"
                    : "border-indigo-100 text-indigo-600"
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-3 w-3 fill-current text-emerald-600" />
                  ) : (
                    <Clock className="h-3 w-3 text-indigo-600" />
                  )}
                </span>

                {/* Timeline Panel Card */}
                <div className="bg-white rounded-lg border border-gray-100 shadow-xs p-5 space-y-4">
                  {/* Card Title Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-base">{order.testName}</h4>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Ordered: {orderDateStr}</span>
                        </span>
                        <span>•</span>
                        <span className="capitalize font-medium">Status: {order.status.toLowerCase()}</span>
                      </div>
                    </div>

                    {isCompleted && order.results && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Results Filed
                      </span>
                    )}
                  </div>

                  {/* Clinician Notes */}
                  {order.clinicalNotes && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-md border border-gray-100">
                      <span className="font-semibold text-gray-500 block mb-0.5 uppercase tracking-wider">Clinical Notes:</span>
                      {order.clinicalNotes}
                    </div>
                  )}

                  {/* Test Results Section */}
                  {isCompleted && order.results && (
                    <div className="space-y-4 pt-3 border-t border-gray-100">
                      {/* Findings */}
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Findings:</span>
                        <p className="text-sm text-gray-800 leading-relaxed font-medium">
                          {order.results.findings}
                        </p>
                      </div>

                      {/* Quantitative Grid measurements */}
                      {order.results.quantitativeData && Object.keys(order.results.quantitativeData).length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Structured Measurements:</span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(order.results.quantitativeData).map(([key, value]) => (
                              <div key={key} className="bg-gray-50 border border-gray-100 rounded-md p-2 flex flex-col">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{key}</span>
                                <span className="text-xs font-semibold text-gray-800 mt-0.5">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fulfilled By Technician Info */}
                      {order.fulfilledBy && (
                        <div className="flex items-center space-x-1.5 text-xs text-gray-400 font-medium">
                          <User className="h-3.5 w-3.5" />
                          <span>
                            Fulfilled by Tech: {order.fulfilledBy.firstName} {order.fulfilledBy.lastName} on{" "}
                            {new Date(order.results.recordedAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LabHistoryTimeline;
