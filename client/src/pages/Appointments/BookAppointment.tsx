import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import api from "../../services/api";
import Button from "../../components/ui/Button";

// Schema for front-end form validation
const bookAppointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  branchId: z.string().min(1, "Branch is required"),
  appointmentDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  reason: z.string().max(500, "Reason must not exceed 500 characters").optional(),
});

type BookFormValues = z.infer<typeof bookAppointmentSchema>;

// Mock data reflecting existing records for demonstration purposes
const MOCK_PATIENTS = [
  { id: "pat123456789012345678901234", name: "Johnathan Carter" },
  { id: "pat567890123456789012345678", name: "Emily Rodriguez" },
];

const MOCK_DOCTORS = [
  { id: "doc123456789012345678901234", name: "Dr. Sarah Jenkins (Cardiology)" },
  { id: "doc567890123456789012345678", name: "Dr. Marcus Vance (General Medicine)" },
];

const MOCK_BRANCHES = [
  { id: "br1234567890123456789012345", name: "Main Medical Center" },
  { id: "br5678901234567890123456789", name: "Northside Clinic" },
];

export const BookAppointment: React.FC = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookAppointmentSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      branchId: "",
      appointmentDate: "",
      startTime: "",
      endTime: "",
      reason: "",
    },
  });

  // Query mutation to POST appointments
  const mutation = useMutation({
    mutationFn: async (values: BookFormValues) => {
      // Combine Date + Time values into complete ISO Datetime formats
      const fullStartTime = new Date(`${values.appointmentDate}T${values.startTime}:00`).toISOString();
      const fullEndTime = new Date(`${values.appointmentDate}T${values.endTime}:00`).toISOString();
      const appointmentDateISO = new Date(values.appointmentDate).toISOString();

      const payload = {
        patientId: values.patientId,
        doctorId: values.doctorId,
        branchId: values.branchId,
        appointmentDate: appointmentDateISO,
        startTime: fullStartTime,
        endTime: fullEndTime,
        reason: values.reason || undefined,
      };

      const response = await api.post("/appointments", payload);
      return response.data;
    },
    onSuccess: () => {
      reset();
    },
  });

  const onSubmit = (data: BookFormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Book Appointment</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete the form below to schedule a new clinical visit.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Status Banners */}
          {mutation.isSuccess && (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-md text-sm border border-emerald-200">
              Appointment scheduled successfully! ID: {mutation.data?.data?.id}
            </div>
          )}

          {mutation.isError && (
            <div className="p-4 bg-red-50 text-red-800 rounded-md text-sm border border-red-200">
              {(mutation.error as any)?.response?.data?.message || "Failed to schedule appointment. Please check availability."}
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Patient dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient</label>
              <select
                {...register("patientId")}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="">Select Patient</option>
                {MOCK_PATIENTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.patientId && (
                <p className="mt-1 text-xs text-red-600">{errors.patientId.message}</p>
              )}
            </div>

            {/* Doctor dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Doctor</label>
              <select
                {...register("doctorId")}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="">Select Doctor</option>
                {MOCK_DOCTORS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.doctorId && (
                <p className="mt-1 text-xs text-red-600">{errors.doctorId.message}</p>
              )}
            </div>

            {/* Branch dropdown */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Branch Location</label>
              <select
                {...register("branchId")}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="">Select Branch</option>
                {MOCK_BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.branchId && (
                <p className="mt-1 text-xs text-red-600">{errors.branchId.message}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                {...register("appointmentDate")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              {errors.appointmentDate && (
                <p className="mt-1 text-xs text-red-600">{errors.appointmentDate.message}</p>
              )}
            </div>

            {/* Start & End Times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="time"
                  {...register("startTime")}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                {errors.startTime && (
                  <p className="mt-1 text-xs text-red-600">{errors.startTime.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="time"
                  {...register("endTime")}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                {errors.endTime && (
                  <p className="mt-1 text-xs text-red-600">{errors.endTime.message}</p>
                )}
              </div>
            </div>

            {/* Reason */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Reason for Visit</label>
              <textarea
                rows={3}
                {...register("reason")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Brief summary of symptoms or check-up purpose"
              />
              {errors.reason && (
                <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={mutation.isPending}
              className="w-full sm:w-auto"
            >
              {mutation.isPending ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookAppointment;
