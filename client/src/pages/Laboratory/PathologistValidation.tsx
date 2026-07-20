import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, X, Search, FileText } from "lucide-react";
import { getLabQueue, validateLabResults } from "../../services/api";
import Button from "../../components/ui/Button";

interface LabOrder {
  id: string;
  patient: {
    user?: {
      firstName: string;
      lastName: string;
    };
  };
  testName: string;
  status: "PENDING" | "SPECIMEN_COLLECTED" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  results?: {
    findings: string;
    value?: number;
    isAbnormal: boolean;
    quantitativeData?: any;
    recordedAt: string;
  };
}

export const PathologistValidation: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: serverResponse, isLoading } = useQuery({
    queryKey: ["labQueue"],
    queryFn: async () => {
      const res = await getLabQueue();
      return res;
    },
  });

  const orders: LabOrder[] = serverResponse?.data || [];

  // Filter for orders that have results entered (PROCESSING)
  const validationQueue = orders.filter(
    (order) => order.status === "PROCESSING" &&
    order.patient.user?.firstName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await validateLabResults(orderId);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQueue"] });
      setSelectedOrder(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Pathologist Validation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review entered diagnostic findings and validate results for clinical release.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Awaiting Validation</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Test Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                    Loading queue...
                  </td>
                </tr>
              ) : validationQueue.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                    No results currently await validation.
                  </td>
                </tr>
              ) : (
                validationQueue.map((order) => {
                  const patientName = order.patient.user
                    ? `${order.patient.user.firstName} ${order.patient.user.lastName}`
                    : "Unknown Patient";

                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {patientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {order.testName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                          Awaiting Review
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Review & Validate</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 overflow-hidden z-50 bg-gray-950/20 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-screen shadow-2xl flex flex-col border-l border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Clinical Validation</h3>
                <p className="text-xs text-gray-500 mt-0.5">Validating: {selectedOrder.testName}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {selectedOrder.results ? (
                <>
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-500" />
                      Findings & Assessment
                    </h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selectedOrder.results.findings}
                    </p>
                  </div>

                  {selectedOrder.results.value !== undefined && selectedOrder.results.value !== null && (
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Primary Numeric Value</h4>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-gray-900">{selectedOrder.results.value}</span>
                        {selectedOrder.results.isAbnormal && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            Abnormal
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedOrder.results.quantitativeData && Object.keys(selectedOrder.results.quantitativeData).length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Quantitative Data</h4>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                        {Object.entries(selectedOrder.results.quantitativeData).map(([key, val]) => (
                          <div key={key} className="sm:col-span-1">
                            <dt className="text-xs font-medium text-gray-500 uppercase">{key}</dt>
                            <dd className="mt-1 text-sm text-gray-900 font-medium">{String(val)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm">
                  Results data is not available or corrupted for this order.
                </div>
              )}

              <div className="pt-6 mt-6 border-t border-gray-100">
                <Button
                  variant="primary"
                  className="w-full flex justify-center items-center gap-2"
                  disabled={validateMutation.isPending || !selectedOrder.results}
                  onClick={() => validateMutation.mutate(selectedOrder.id)}
                >
                  <CheckCircle className="h-4 w-4" />
                  {validateMutation.isPending ? "Validating..." : "Approve & Release Report"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PathologistValidation;
