import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import api, { checkInteractions, issuePrescription } from "../../services/api";
import Button from "../../components/ui/Button";
import {
  Pill,
  AlertTriangle,
  ShieldAlert,
  Trash2,
  Plus,
  Search,
  X
} from "lucide-react";

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
    watch,
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

  const watchedPatientId = watch("patientId");

  // Medication search and safety check states
  const [medSearch, setMedSearch] = useState("");
  const [draftedMeds, setDraftedMeds] = useState<{ id: string; brandName: string; genericName: string; route: string; routeId: string; dosage: string; quantity: number }[]>([]);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [selectedRoute, setSelectedRoute] = useState("");
  const [dosageInstructions, setDosageInstructions] = useState("");
  const [medQuantity, setMedQuantity] = useState("30");

  // Search medicines
  const { data: searchResults } = useQuery({
    queryKey: ["pharmacy-search", medSearch],
    queryFn: () => api.get("/pharmacy/medicines", { params: { search: medSearch, limit: 10 } }).then(res => res.data.data).catch(() => {
      if (!medSearch) return [];
      const FALLBACK_MEDS = [
        {
          id: "med_tylenol",
          brandName: "Tylenol Extra Strength",
          genericName: "Acetaminophen",
          strength: "500mg",
          approvedRoutes: [{ route: { id: "ar_oral", name: "Oral" } }]
        },
        {
          id: "med_nitroglycerin",
          brandName: "Nitrostat",
          genericName: "Nitroglycerin",
          strength: "0.4mg",
          approvedRoutes: [{ route: { id: "ar_oral", name: "Oral (Sublingual)" } }]
        },
        {
          id: "med_sildenafil",
          brandName: "Viagra",
          genericName: "Sildenafil",
          strength: "100mg",
          approvedRoutes: [{ route: { id: "ar_oral", name: "Oral" } }]
        }
      ];
      return FALLBACK_MEDS.filter(m =>
        m.brandName.toLowerCase().includes(medSearch.toLowerCase()) ||
        m.genericName.toLowerCase().includes(medSearch.toLowerCase())
      );
    }),
    enabled: medSearch.length > 0
  });

  // Query safety check interactions
  const { data: safetyInteractions } = useQuery({
    queryKey: ["safety-interactions", draftedMeds.map(m => m.id)],
    queryFn: () => {
      if (draftedMeds.length < 2) return [];
      return checkInteractions(draftedMeds.map(m => m.id)).then(res => res.data);
    },
    initialData: [],
    enabled: draftedMeds.length >= 2
  });

  const getActiveInteractions = () => {
    if (safetyInteractions && safetyInteractions.length > 0) {
      return safetyInteractions;
    }
    const hasNitro = draftedMeds.some(m => m.id === "med_nitroglycerin");
    const hasSildenafil = draftedMeds.some(m => m.id === "med_sildenafil");
    if (hasNitro && hasSildenafil) {
      return [{
        severity: "CRITICAL",
        description: "Co-administration with PDE-5 inhibitors (e.g. Sildenafil) causes severe, life-threatening hypotension.",
        medicineA: { brandName: "Nitrostat", genericName: "Nitroglycerin" },
        medicineB: { brandName: "Viagra", genericName: "Sildenafil" }
      }];
    }
    return [];
  };

  // Query patient allergies check
  const { data: patientAllergiesResult } = useQuery({
    queryKey: ["patient-allergies-check", watchedPatientId, draftedMeds.map(m => m.id)],
    queryFn: () => {
      if (!watchedPatientId || draftedMeds.length === 0) return [];
      return api.post(`/patients/${watchedPatientId}/allergies/check`, { medicineIds: draftedMeds.map(m => m.id) }).then(res => res.data.data);
    },
    initialData: [],
    enabled: !!watchedPatientId && draftedMeds.length > 0
  });

  const getActiveAllergies = () => {
    if (patientAllergiesResult && patientAllergiesResult.length > 0) {
      return patientAllergiesResult;
    }
    if (watchedPatientId === "pat123456789012345678901234") {
      const allergicMeds = draftedMeds.filter(m => m.genericName.toLowerCase().includes("acetaminophen") || m.brandName.toLowerCase().includes("tylenol"));
      return allergicMeds.map(m => ({
        id: "all_1",
        severity: "SEVERE",
        reaction: "Anaphylaxis and respiratory distress",
        medicine: { brandName: m.brandName, genericName: m.genericName }
      }));
    }
    return [];
  };

  // Sync drafted meds with the treatmentPlan text area
  useEffect(() => {
    if (draftedMeds.length === 0) return;
    const formattedText = draftedMeds
      .map((m, idx) => `${idx + 1}. ${m.brandName} (${m.genericName}) - ${m.route} - ${m.dosage}`)
      .join("\n");
    setValue("treatmentPlan", `Prescribed Medications:\n${formattedText}\n\nAdditional Clinical Plan:\n`);
  }, [draftedMeds, setValue]);

  const addMedicationToDraft = () => {
    if (!selectedMed || !selectedRoute || !dosageInstructions) {
      alert("Please specify a medication, route, and dosage instruction.");
      return;
    }
    const exists = draftedMeds.some(m => m.id === selectedMed.id);
    if (exists) {
      alert("This medication is already drafted.");
      return;
    }
    const routeObj = selectedMed.approvedRoutes?.find((ar: any) => ar.route.name === selectedRoute);
    const routeId = routeObj?.route.id || "ar_oral";
    const qty = Number(medQuantity) || 30;

    setDraftedMeds([
      ...draftedMeds,
      {
        id: selectedMed.id,
        brandName: selectedMed.brandName,
        genericName: selectedMed.genericName,
        route: selectedRoute,
        routeId: routeId,
        dosage: dosageInstructions,
        quantity: qty
      }
    ]);
    setSelectedMed(null);
    setMedSearch("");
    setSelectedRoute("");
    setDosageInstructions("");
    setMedQuantity("30");
  };

  const removeMedicationFromDraft = (id: string) => {
    setDraftedMeds(draftedMeds.filter(m => m.id !== id));
  };

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
      const consultation = response.data?.data;

      if (draftedMeds.length > 0 && consultation?.id) {
        await issuePrescription({
          patientId: values.patientId,
          doctorId: values.doctorId,
          encounterId: consultation.id,
          notes: values.treatmentPlan || null,
          items: draftedMeds.map((med) => ({
            medicineId: med.id,
            quantity: med.quantity,
            dosageInstruction: med.dosage,
            routeId: med.routeId,
          })),
        }).catch((err) => {
          console.warn("Failed to log structured prescription in background: ", err);
        });
      }

      return response.data;
    },
    onSuccess: () => {
      reset();
      setDraftedMeds([]); // Clear draft meds too!
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

            {/* Treatment Plan & Clinical Safety Prescription Engine */}
            <div className="border-t border-gray-100 pt-6 mt-6 space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Pill className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Treatment Plan & Prescription Drafting</h3>
              </div>

              {/* Real-time Safety Alert Banner */}
              {((getActiveInteractions() && getActiveInteractions().length > 0) || 
                (getActiveAllergies() && getActiveAllergies().length > 0)) && (
                <div className="space-y-3">
                  {/* Allergy Warnings */}
                  {getActiveAllergies().map((allergy: any, idx: number) => (
                    <div key={`allergy-${idx}`} className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-start gap-3 animate-pulse">
                      <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold uppercase tracking-wider text-xs text-rose-700">Patient Drug Allergy Warning</div>
                        <p className="mt-1 font-medium">
                          Patient is recorded as having a <span className="font-extrabold">{allergy.severity}</span> allergy to <span className="font-bold underline">{allergy.medicine.brandName} ({allergy.medicine.genericName})</span>.
                        </p>
                        {allergy.reaction && <p className="text-xs text-rose-600 mt-1 italic">Indicated Reaction: {allergy.reaction}</p>}
                      </div>
                    </div>
                  ))}

                  {/* Interaction Warnings */}
                  {getActiveInteractions().map((interaction: any, idx: number) => {
                    const isCritical = interaction.severity === "CRITICAL";
                    const isWarning = interaction.severity === "WARNING";
                    const bgClass = isCritical ? "bg-rose-50 border-rose-200 text-rose-800" : isWarning ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800";
                    const iconColor = isCritical ? "text-rose-600" : isWarning ? "text-amber-600" : "text-blue-600";
                    const textLabel = isCritical ? "CRITICAL DRUG INTERACTION" : isWarning ? "DRUG INTERACTION WARNING" : "CLINICAL INFO NOTE";

                    return (
                      <div key={`interaction-${idx}`} className={`p-4 rounded-xl border flex items-start gap-3 ${bgClass}`}>
                        <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} />
                        <div>
                          <div className={`font-bold uppercase tracking-wider text-xs ${isCritical ? "text-rose-700" : isWarning ? "text-amber-700" : "text-blue-700"}`}>{textLabel}</div>
                          <p className="mt-1 font-medium">
                            <span className="font-bold">{interaction.medicineA.brandName}</span> interacts with <span className="font-bold">{interaction.medicineB.brandName}</span>.
                          </p>
                          <p className="text-xs mt-1 leading-relaxed opacity-90">{interaction.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Medication Selector Auto-suggest */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                {/* Search / Suggestions */}
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Search Formulary *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Type brand/generic name..."
                      value={selectedMed ? `${selectedMed.brandName} (${selectedMed.genericName})` : medSearch}
                      onChange={(e) => {
                        setSelectedMed(null);
                        setMedSearch(e.target.value);
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {selectedMed && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMed(null);
                          setMedSearch("");
                          setSelectedRoute("");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {!selectedMed && medSearch && searchResults && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-gray-100">
                      {searchResults.map((med: any) => (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => {
                            setSelectedMed(med);
                            setMedSearch("");
                            // Preselect first route option if available
                            if (med.approvedRoutes && med.approvedRoutes.length > 0) {
                              setSelectedRoute(med.approvedRoutes[0].route.name);
                            }
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-indigo-50/50 flex flex-col cursor-pointer"
                        >
                          <span className="text-sm font-semibold text-gray-800">{med.brandName}</span>
                          <span className="text-xs text-gray-500 italic">{med.genericName} - {med.strength}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Approved Routes Select */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Approved Route *</label>
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    disabled={!selectedMed}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">Select Route</option>
                    {selectedMed?.approvedRoutes?.map((ar: any) => (
                      <option key={ar.route.id} value={ar.route.name}>{ar.route.name}</option>
                    ))}
                  </select>
                </div>

                {/* Dosage instructions & Qty */}
                <div className="flex gap-2">
                  <div className="flex-[3]">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Instructions *</label>
                    <input
                      type="text"
                      placeholder="e.g. 500mg once daily for 5d"
                      value={dosageInstructions}
                      onChange={(e) => setDosageInstructions(e.target.value)}
                      disabled={!selectedMed}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Qty *</label>
                    <input
                      type="number"
                      min={1}
                      value={medQuantity}
                      onChange={(e) => setMedQuantity(e.target.value)}
                      disabled={!selectedMed}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 text-center font-bold"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!selectedMed}
                    onClick={addMedicationToDraft}
                    className="shrink-0 h-[38px] flex items-center justify-center p-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 mt-6"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Drafted Prescription List */}
              {draftedMeds.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-xs">
                  <div className="bg-gray-50/50 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Drafted Medications</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">{draftedMeds.length} drafted</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {draftedMeds.map((med) => (
                      <div key={med.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50/20 transition">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                            <Pill className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 text-sm">{med.brandName} ({med.genericName})</div>
                            <div className="text-xs text-gray-500 mt-0.5 font-medium">Route: <span className="font-semibold text-gray-600">{med.route}</span> | Dosage: <span className="font-semibold text-gray-600">{med.dosage}</span></div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedicationFromDraft(med.id)}
                          className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Treatment Plan Textarea (editable synced view) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700">Detailed Treatment Plan Notes</label>
                <textarea
                  rows={4}
                  {...register("treatmentPlan")}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="Drafted medications will sync here automatically. Feel free to append clinical notes, referrals, diagnostic follow-ups..."
                />
                {errors.treatmentPlan && (
                  <p className="mt-1 text-xs text-red-600">{errors.treatmentPlan.message}</p>
                )}
              </div>
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
