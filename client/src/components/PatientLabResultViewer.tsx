import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Calendar, Activity, CheckCircle, AlertCircle } from "lucide-react";
import { getPatientLabHistory } from "../services/api";

interface PatientLabResultViewerProps {
  patientId: string;
}

export const PatientLabResultViewer: React.FC<PatientLabResultViewerProps> = ({ patientId }) => {
  const { data: historyRes, isLoading, isError } = useQuery({
    queryKey: ["patientLabHistory", patientId],
    queryFn: async () => {
      const res = await getPatientLabHistory(patientId);
      return res;
    },
    enabled: !!patientId,
  });

  const history = historyRes?.data || [];

  // Sort by created At descending (newest first)
  const sortedHistory = [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center space-x-2 text-indigo-600 font-medium text-sm animate-pulse">
          <Activity className="h-4 w-4" />
          <span>Loading diagnostic records...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-bold">Failed to load lab history</p>
          <p className="mt-1">Unable to retrieve diagnostic records for this patient. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">No laboratory records found</p>
        <p className="text-xs text-gray-400 mt-1">This patient has no recorded diagnostic history in the system.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedHistory.map((order) => {
        const isCompleted = order.status === "COMPLETED";
        const isProcessing = order.status === "PROCESSING" || order.status === "SPECIMEN_COLLECTED" || order.status === "PENDING";
        const hasResults = !!order.results;

        return (
          <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all hover:shadow-md">
            {/* Header section */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between bg-gray-50">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  {order.testName}
                </h4>
                <div className="flex items-center text-xs text-gray-500 mt-1.5 space-x-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(order.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>
              <div>
                {isCompleted ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Final Report
                  </span>
                ) : isProcessing ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    Processing
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    {order.status}
                  </span>
                )}
              </div>
            </div>

            {/* Content section */}
            <div className="px-5 py-4">
              {hasResults ? (
                <div className="space-y-4">
                  
                  {/* Important metrics block */}
                  {order.results.value !== undefined && order.results.value !== null && (
                    <div className="flex items-center space-x-3 pb-3 border-b border-gray-50">
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Primary Measure</span>
                        <div className="flex items-baseline space-x-2 mt-0.5">
                          <span className="text-xl font-bold text-gray-900">{order.results.value}</span>
                        </div>
                      </div>
                      {order.results.isAbnormal && (
                        <div className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-md text-xs font-bold flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Abnormal Flag
                        </div>
                      )}
                    </div>
                  )}

                  {/* Findings */}
                  <div>
                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Findings</h5>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {order.results.findings}
                    </p>
                  </div>

                  {/* Other structural data */}
                  {order.results.quantitativeData && Object.keys(order.results.quantitativeData).length > 0 && (
                    <div className="pt-3 border-t border-gray-50 grid grid-cols-2 gap-y-3 gap-x-4">
                      {Object.entries(order.results.quantitativeData).map(([key, val]) => (
                        <div key={key}>
                          <dt className="text-xs font-medium text-gray-500">{key}</dt>
                          <dd className="text-sm font-semibold text-gray-900 mt-0.5">{String(val)}</dd>
                        </div>
                      ))}
                    </div>
                  )}
                  
                </div>
              ) : (
                <div className="text-sm text-gray-500 py-2 italic text-center">
                  Results are not yet available for this test.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PatientLabResultViewer;
