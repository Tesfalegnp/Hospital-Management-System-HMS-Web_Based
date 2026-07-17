import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import api from "../../services/api";
import Button from "../../components/ui/Button";

// Zod Schema with custom string refinements to ensure clean form-to-schema compatibility
const recordConsultationSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  branchId: z.string().min(1, "Branch is required"),
  appointmentId: z.string().cuid("Appointment ID must be a valid CUID").optional().or(z.literal("")),
  
  bloodPressure: z.string().max(50).optional().or(z.literal("")),
  heartRate: z.string().refine(val => val === "" || (!isNaN(Number(val)) && Number(val) > 0 && Number.isInteger(Number(val))), {
    message: "Heart rate must be a positive integer",
  }).optional().nullable(),
  temperature: z.string().refine(val => val === "" || (!isNaN(Number(val)) && Number(val) > 0 && Number(val) < 50), {
    message: "Temperature must be a positive number less than 50",
  }).optional().nullable(),
  respiratoryRate: z.string().refine(val => val === "" || (!isNaN(Number(val)) && Number(val) > 0 && Number.isInteger(Number(val))), {
    message: "Respiratory rate must be a positive integer",
  }).optional().nullable(),
  weight: z.string().refine(val => val === "" || (!isNaN(Number(val)) && Number(val) > 0 && Number(val) < 1000), {
    message: "Weight must be a positive number",
  }).optional().nullable(),
  
  chiefComplaint: z.string().max(2000).optional().or(z.literal("")),
  physicalExamination: z.string().max(5000).optional().or(z.literal("")),
  diagnosis: z.string().max(5000).optional().or(z.literal("")),
  treatmentPlan: z.string().max(5000).optional().or(z.literal("")),
});

type ConsultationFormValues = z.infer<typeof recordConsultationSchema>;

// Mock data list for selector fields
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

export const RecordEncounter: React.FC = () => {
  const [searchParams] = useSearchParams();
  const appointmentIdParam = searchParams.get("appointmentId");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ConsultationFormValues>({
    resolver: zodResolver(recordConsultationSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      branchId: "",
      appointmentId: "",
      bloodPressure: "",
      heartRate: "",
      temperature: "",
      respiratoryRate: "",
      weight: "",
      chiefComplaint: "",
      physicalExamination: "",
      diagnosis: "",
      treatmentPlan: "",
    },
  });

  // Pre-populate fields if an appointment ID is in query string
  useEffect(() => {
    if (appointmentIdParam) {
      setValue("appointmentId", appointmentIdParam);
      // Auto-assign mock entities for demonstration if linked to mock appointment
      setValue("patientId", "pat123456789012345678901234");
      setValue("doctorId", "doc123456789012345678901234");
      setValue("branchId", "br1234567890123456789012345");
    }
  }, [appointmentIdParam, setValue]);

  // Mutation to POST consultations
  const mutation = useMutation({
    mutationFn: async (values: ConsultationFormValues) => {
      const payload = {
        patientId: values.patientId,
        doctorId: values.doctorId,
        branchId: values.branchId,
        appointmentId: values.appointmentId || undefined,
        bloodPressure: values.bloodPressure || undefined,
        heartRate: values.heartRate ? Number(values.heartRate) : undefined,
        temperature: values.temperature ? Number(values.temperature) : undefined,
        respiratoryRate: values.respiratoryRate ? Number(values.respiratoryRate) : undefined,
        weight: values.weight ? Number(values.weight) : undefined,
        chiefComplaint: values.chiefComplaint || undefined,
        physicalExamination: values.physicalExamination || undefined,
        diagnosis: values.diagnosis || undefined,
        treatmentPlan: values.treatmentPlan || undefined,
      };

      const response = await api.post("/consultations", payload);
      return response.data;
    },
    onSuccess: () => {
      reset();
    },
  });

  const onSubmit = (data: ConsultationFormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Record Consultation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Record clinical notes, vital signs, and treatment plans for this patient encounter.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Status Messages */}
        {mutation.isSuccess && (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-md text-sm border border-emerald-200">
            Consultation encounter saved successfully! ID: {mutation.data?.data?.id}
          </div>
        )}

        {mutation.isError && (
          <div className="p-4 bg-red-50 text-red-800 rounded-md text-sm border border-red-200">
            {(mutation.error as any)?.response?.data?.message || "Failed to record consultation."}
          </div>
        )}

        {/* 1. Context Information Card */}
        <div className="bg-white shadow rounded-lg border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Encounter Context
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {/* Patient select */}
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

            {/* Doctor select */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Attending Doctor</label>
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

            {/* Branch select */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Branch</label>
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

            {/* Optional Appointment ID */}
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-sm font-medium text-gray-700">
                Linked Appointment ID (Optional)
              </label>
              <input
                type="text"
                {...register("appointmentId")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-50"
                placeholder="Optional CUID to auto-complete appointment schedule"
                readOnly={!!appointmentIdParam}
              />
              {errors.appointmentId && (
                <p className="mt-1 text-xs text-red-600">{errors.appointmentId.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* 2. Vital Signs Card */}
        <div className="bg-white shadow rounded-lg border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Vital Signs
          </h2>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
            {/* Blood Pressure */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Blood Pressure</label>
              <input
                type="text"
                placeholder="120/80"
                {...register("bloodPressure")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              {errors.bloodPressure && (
                <p className="mt-1 text-xs text-red-600">{errors.bloodPressure.message}</p>
              )}
            </div>

            {/* Heart Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Heart Rate (bpm)</label>
              <input
                type="text"
                placeholder="72"
                {...register("heartRate")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              {errors.heartRate && (
                <p className="mt-1 text-xs text-red-600">{errors.heartRate.message}</p>
              )}
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
              <input
                type="text"
                placeholder="36.6"
                {...register("temperature")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              {errors.temperature && (
                <p className="mt-1 text-xs text-red-600">{errors.temperature.message}</p>
              )}
            </div>

            {/* Respiratory Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Respiration (rpm)</label>
              <input
                type="text"
                placeholder="16"
                {...register("respiratoryRate")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              {errors.respiratoryRate && (
                <p className="mt-1 text-xs text-red-600">{errors.respiratoryRate.message}</p>
              )}
            </div>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
              <input
                type="text"
                placeholder="70.5"
                {...register("weight")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              {errors.weight && (
                <p className="mt-1 text-xs text-red-600">{errors.weight.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* 3. Clinical Findings & Assessment Card */}
        <div className="bg-white shadow rounded-lg border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Clinical Assessment
          </h2>

          <div className="space-y-4">
            {/* Chief Complaint */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Chief Complaint</label>
              <textarea
                rows={3}
                {...register("chiefComplaint")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Reason patient is seeking medical care..."
              />
              {errors.chiefComplaint && (
                <p className="mt-1 text-xs text-red-600">{errors.chiefComplaint.message}</p>
              )}
            </div>

            {/* Physical Examination */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Physical Examination</label>
              <textarea
                rows={3}
                {...register("physicalExamination")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Document results of physical checks..."
              />
              {errors.physicalExamination && (
                <p className="mt-1 text-xs text-red-600">{errors.physicalExamination.message}</p>
              )}
            </div>

            {/* Diagnosis */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
              <textarea
                rows={2}
                {...register("diagnosis")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Assessment, findings, or specific ICD codes..."
              />
              {errors.diagnosis && (
                <p className="mt-1 text-xs text-red-600">{errors.diagnosis.message}</p>
              )}
            </div>

            {/* Treatment Plan */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Treatment Plan</label>
              <textarea
                rows={3}
                {...register("treatmentPlan")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Prescribed medications, referrals, therapies, or follow-up timelines..."
              />
              {errors.treatmentPlan && (
                <p className="mt-1 text-xs text-red-600">{errors.treatmentPlan.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form Action buttons */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={mutation.isPending}
            className="w-full sm:w-auto"
          >
            {mutation.isPending ? "Saving Encounter..." : "Record Consultation"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RecordEncounter;
