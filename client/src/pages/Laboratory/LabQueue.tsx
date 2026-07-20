import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, ClipboardList, Plus, Trash2, X, TestTube } from "lucide-react";
import { getLabQueue, collectLabSpecimen, enterLabResults } from "../../services/api";
import Button from "../../components/ui/Button";

// Validator for entering lab results
const enterResultsSchema = z.object({
  findings: z.string().min(1, "Findings description is required").max(5000),
  value: z.string().optional().refine(val => !val || !isNaN(Number(val)), { message: "Value must be a number" }),
  measurements: z.array(
    z.object({
      key: z.string().min(1, "Key is required"),
      value: z.string().min(1, "Value is required"),
    })
  ).optional(),
});

type EnterResultsValues = z.infer<typeof enterResultsSchema>;

interface LabOrder {
  id: string;
  encounterId: string;
  patientId: string;
  patient: {
    user?: {
      firstName: string;
      lastName: string;
    };
  };
  testName: string;
  clinicalNotes?: string;
  status: "PENDING" | "SPECIMEN_COLLECTED" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

// Fallback Mock Data for demo environment
const MOCK_QUEUE: LabOrder[] = [
  {
    id: "lab123456789012345678901234",
    encounterId: "enc123456789012345678901234",
    patientId: "pat123456789012345678901234",
    patient: {
      user: { firstName: "Johnathan", lastName: "Carter" }
    },
    testName: "Complete Blood Count (CBC)",
    clinicalNotes: "Patient displays severe fatigue. Check iron levels and red cell counts.",
    status: "PENDING",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "lab567890123456789012345678",
    encounterId: "enc567890123456789012345678",
    patientId: "pat567890123456789012345678",
    patient: {
      user: { firstName: "Emily", lastName: "Rodriguez" }
    },
    testName: "Lipid Profile Panel",
    clinicalNotes: "Routine screening for cholesterol levels.",
    status: "SPECIMEN_COLLECTED",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  }
];

export const LabQueue: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);

  // Fetch pending queue
  const { data: serverResponse, isError } = useQuery({
    queryKey: ["labQueue"],
    queryFn: async () => {
      const res = await getLabQueue();
      return res;
    },
    retry: false,
  });

  const orders: LabOrder[] = isError || !serverResponse?.data ? MOCK_QUEUE : serverResponse.data;

  // Form hooks setup
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EnterResultsValues>({
    resolver: zodResolver(enterResultsSchema),
    defaultValues: {
      findings: "",
      value: "",
      measurements: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "measurements",
  });

  const collectMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await collectLabSpecimen(orderId);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQueue"] });
    },
  });

  // Mutation to fulfill lab order
  const mutation = useMutation({
    mutationFn: async (values: EnterResultsValues) => {
      if (!selectedOrder) throw new Error("No order selected");

      // Transform measurement array into key-value JSON record
      const quantitativeData = values.measurements?.reduce(
        (acc, curr) => ({ ...acc, [curr.key]: curr.value }),
        {}
      );

      const payload = {
        findings: values.findings,
        value: values.value ? Number(values.value) : undefined,
        quantitativeData: Object.keys(quantitativeData || {}).length ? quantitativeData : undefined,
      };

      const res = await enterLabResults(selectedOrder.id, payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQueue"] });
      setSelectedOrder(null);
      reset();
    },
  });

  const onSubmit = (data: EnterResultsValues) => {
    mutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">Pending</span>;
      case "SPECIMEN_COLLECTED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">Collected</span>;
      case "PROCESSING":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">Processing</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-100">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Laboratory Queue</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review placed orders, collect specimens, and record testing findings.
        </p>
      </div>

      {/* Main Table Queue Card */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Active Test Orders</h2>
          {isError && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Demo Sandbox Mode
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Requested Test</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Placed</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                    No pending laboratory orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const patientName = order.patient.user
                    ? `${order.patient.user.firstName} ${order.patient.user.lastName}`
                    : "Unknown Patient";
                  const dateStr = new Date(order.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {patientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {order.testName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{dateStr}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                        {order.status === "PENDING" && (
                          <button
                            onClick={() => collectMutation.mutate(order.id)}
                            disabled={collectMutation.isPending}
                            className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
                          >
                            <TestTube className="h-3.5 w-3.5" />
                            <span>Collect Specimen</span>
                          </button>
                        )}
                        {(order.status === "SPECIMEN_COLLECTED" || order.status === "PROCESSING") && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              reset({ findings: "", value: "", measurements: [] });
                            }}
                            className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                            <span>Record Results</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Panel / Drawer Overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 overflow-hidden z-50 bg-gray-950/20 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-screen shadow-2xl flex flex-col border-l border-gray-100">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Record Test Results</h3>
                <p className="text-xs text-gray-500 mt-0.5">Entering results for: {selectedOrder.testName}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Clinical Notes Summary */}
              {selectedOrder.clinicalNotes && (
                <div className="p-4 bg-gray-55 rounded-lg border border-gray-100 bg-gray-50">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Clinical Notes</span>
                  <p className="text-sm text-gray-700 mt-1">{selectedOrder.clinicalNotes}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Single Value */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Primary Numeric Value (Optional)</label>
                  <input
                    type="text"
                    {...register("value")}
                    className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="e.g. 14.5"
                  />
                  {errors.value && (
                    <p className="mt-1 text-xs text-red-600">{errors.value.message}</p>
                  )}
                </div>

                {/* Findings Textarea */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Findings & Assessment</label>
                  <textarea
                    rows={4}
                    {...register("findings")}
                    className="mt-1.5 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="Describe laboratory observations, diagnostic analysis, or conclusions..."
                  />
                  {errors.findings && (
                    <p className="mt-1 text-xs text-red-600">{errors.findings.message}</p>
                  )}
                </div>

                {/* Dynamic Quantitative Data */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <label className="block text-sm font-semibold text-gray-700">Additional Data Points</label>
                    <button
                      type="button"
                      onClick={() => append({ key: "", value: "" })}
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Metric</span>
                    </button>
                  </div>

                  {fields.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No structured data entries. Click "Add Metric" to specify.</p>
                  ) : (
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-3">
                          <input
                            type="text"
                            placeholder="Key (e.g., RBC Count)"
                            {...register(`measurements.${index}.key` as const)}
                            className="block flex-1 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Value (e.g., 4.5)"
                            {...register(`measurements.${index}.value` as const)}
                            className="block flex-1 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Commit Actions */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedOrder(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? "Submitting..." : "Submit Results"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabQueue;
