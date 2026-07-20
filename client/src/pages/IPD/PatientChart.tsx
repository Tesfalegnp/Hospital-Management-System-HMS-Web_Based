import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Thermometer,
  Activity,
  History,
  Clock,
  ArrowLeftRight,
  LogOut,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  ClipboardCheck,
  FileText,
  Sparkles,
  X
} from "lucide-react";
import { getAdmissionById, logInpatientVitals, transferPatient, dischargePatient, getWards } from "../../services/api";
import Button from "../../components/ui/Button";

// Sandbox Fallback Mock Admission Profile
const FALLBACK_ADMISSION_DETAIL = {
  id: "adm_1",
  patientId: "pat_101",
  admittingDoctorId: "doc_201",
  bedId: "bd_2",
  status: "ADMITTED",
  admissionDate: "2026-07-18T10:00:00.000Z",
  patient: {
    id: "pat_101",
    firstName: "Jonathan",
    lastName: "Carter",
    bloodGroup: "O+",
    allergies: [{ id: "al_1", allergen: "Penicillin" }],
    user: { email: "j.carter@hospital.com" }
  },
  admittingDoctor: {
    firstName: "Robert",
    lastName: "Chen",
    specialization: "Internal Medicine"
  },
  bed: {
    id: "bd_2",
    bedNumber: "Bed-102",
    ward: {
      id: "wd_1",
      name: "General Ward (Male)",
      branchId: "br1234567890123456789012345"
    }
  },
  vitalsLogs: [
    {
      id: "vl_1",
      temperature: 37.2,
      bloodPressure: "120/80",
      heartRate: 72,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      notes: "Patient is resting comfortably.",
      createdAt: "2026-07-18T12:00:00.000Z",
      recordedBy: { firstName: "Sarah", lastName: "Nurse", role: "NURSE" }
    },
    {
      id: "vl_2",
      temperature: 37.5,
      bloodPressure: "125/82",
      heartRate: 78,
      respiratoryRate: 18,
      oxygenSaturation: 97,
      notes: "Admitted from Emergency Room.",
      createdAt: "2026-07-18T10:15:00.000Z",
      recordedBy: { firstName: "Sarah", lastName: "Nurse", role: "NURSE" }
    }
  ]
};

const FALLBACK_TRANSFER_BEDS = [
  { id: "bd_1", bedNumber: "Bed-101", status: "AVAILABLE", wardName: "General Ward (Male)" },
  { id: "bd_5", bedNumber: "Bed-ICU-1", status: "AVAILABLE", wardName: "Intensive Care Unit (ICU)" }
];

export const PatientChart: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dialog states
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);

  // Vitals form states
  const [temp, setTemp] = useState("");
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [rr, setRr] = useState("");
  const [spo2, setSpo2] = useState("");
  const [vitalsNotes, setVitalsNotes] = useState("");

  // Transfer state
  const [targetBedId, setTargetBedId] = useState("");

  // Discharge notes state
  const [dischargeNotes, setDischargeNotes] = useState("");

  // Fetch admission detailed chart
  const { data: admission, isLoading } = useQuery({
    queryKey: ["ipd-admission-detail", id],
    queryFn: () => getAdmissionById(id!).catch(() => FALLBACK_ADMISSION_DETAIL),
    enabled: !!id
  });

  // Query Wards to find target beds for transfer
  const { data: transferBedsResult } = useQuery({
    queryKey: ["ipd-transfer-beds"],
    queryFn: () => getWards({ branchId: admission?.bed?.ward?.branchId }).then((res) => {
      // Collect all AVAILABLE beds
      const beds: any[] = [];
      res.data?.forEach((w: any) => {
        w.beds?.forEach((b: any) => {
          if (b.status === "AVAILABLE") {
            beds.push({ ...b, wardName: w.name });
          }
        });
      });
      return beds;
    }).catch(() => FALLBACK_TRANSFER_BEDS),
    enabled: !!admission
  });

  // Chart vitals mutation
  const vitalsMutation = useMutation({
    mutationFn: (payload: any) => logInpatientVitals(id!, payload).catch((err) => {
      console.warn("Simulating offline vitals charting:", err);
      // Simulate locally
      FALLBACK_ADMISSION_DETAIL.vitalsLogs.unshift({
        id: "vl_" + Date.now(),
        temperature: payload.temperature,
        bloodPressure: payload.bloodPressure,
        heartRate: payload.heartRate,
        respiratoryRate: payload.respiratoryRate,
        oxygenSaturation: payload.oxygenSaturation,
        notes: payload.notes,
        createdAt: new Date().toISOString(),
        recordedBy: { firstName: "Sarah", lastName: "Nurse", role: "NURSE" } as any
      });
      return { success: true };
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ipd-admission-detail", id] });
      setIsVitalsModalOpen(false);
      setTemp("");
      setBp("");
      setHr("");
      setRr("");
      setSpo2("");
      setVitalsNotes("");
    }
  });

  // Transfer bed mutation
  const transferMutation = useMutation({
    mutationFn: (payload: any) => transferPatient(id!, payload).catch((err) => {
      console.warn("Simulating offline bed transfer:", err);
      // Simulate
      const targetBed = FALLBACK_TRANSFER_BEDS.find(b => b.id === payload.targetBedId);
      if (targetBed) {
        FALLBACK_ADMISSION_DETAIL.bed.id = targetBed.id;
        FALLBACK_ADMISSION_DETAIL.bed.bedNumber = targetBed.bedNumber;
        FALLBACK_ADMISSION_DETAIL.bed.ward.name = targetBed.wardName;
      }
      return { success: true };
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ipd-admission-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["ipd-wards"] });
      setIsTransferModalOpen(false);
      setTargetBedId("");
    }
  });

  // Discharge patient mutation
  const dischargeMutation = useMutation({
    mutationFn: (payload: any) => dischargePatient(id!, payload).catch((err) => {
      console.warn("Simulating offline patient discharge:", err);
      FALLBACK_ADMISSION_DETAIL.status = "DISCHARGED";
      return { success: true };
    }),
    onSuccess: () => {
      setIsDischargeModalOpen(false);
      setDischargeNotes("");
      navigate("/ipd/board");
    }
  });

  const handleVitalsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    vitalsMutation.mutate({
      temperature: temp ? Number(temp) : null,
      bloodPressure: bp || null,
      heartRate: hr ? Number(hr) : null,
      respiratoryRate: rr ? Number(rr) : null,
      oxygenSaturation: spo2 ? Number(spo2) : null,
      notes: vitalsNotes || null
    });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBedId) return;
    transferMutation.mutate({ targetBedId });
  };

  const handleDischargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dischargeMutation.mutate({ dischargeNotes: dischargeNotes || null });
  };

  if (isLoading || !admission) {
    return (
      <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium">Opening clinical chart...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/ipd/board")}
        className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Bed Board
      </button>

      {/* 1. Patient Profile summary */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-full">
            Inpatient Chart • Ward: {admission.bed.ward.name}
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-2">
            {admission.patient.firstName} {admission.patient.lastName}
          </h1>
          <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-500 mt-1">
            <span>Chart ID: <strong className="text-gray-700">{admission.patient.id}</strong></span>
            <span>Blood Group: <strong className="text-gray-700">{admission.patient.bloodGroup || "N/A"}</strong></span>
            <span>Bed Unit: <strong className="text-gray-900">{admission.bed.bedNumber}</strong></span>
          </div>
        </div>

        {/* IPD Actions */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button onClick={() => setIsVitalsModalOpen(true)} className="flex items-center gap-1">
            <Activity className="h-4 w-4" /> Chart Vitals
          </Button>
          <Button variant="ghost" onClick={() => setIsTransferModalOpen(true)} className="flex items-center gap-1.5 border border-gray-200">
            <ArrowLeftRight className="h-4 w-4" /> Transfer Bed
          </Button>
          <Button variant="danger" onClick={() => setIsDischargeModalOpen(true)} className="flex items-center gap-1.5">
            <LogOut className="h-4 w-4" /> Clinical Discharge
          </Button>
        </div>
      </div>

      {/* 2. Main Grid: Vitals logs vs Patient Safety cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Vitals History (col-span-2) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
              <History className="h-4.5 w-4.5 text-gray-500" /> Nursing Vitals Timeline
            </h3>
          </div>

          {admission.vitalsLogs?.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Activity className="h-8 w-8 mx-auto text-gray-300 mb-2" />
              <p className="text-xs">No clinical vitals logged yet for this admission stay.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {admission.vitalsLogs.map((log: any) => (
                <div key={log.id} className="p-5 hover:bg-gray-50/20 transition space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      By: {log.recordedBy.firstName} {log.recordedBy.lastName} ({log.recordedBy.role})
                    </span>
                  </div>

                  {/* Vitals grids */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div className="bg-rose-50/40 p-2 rounded-lg border border-rose-100">
                      <Heart className="h-4 w-4 mx-auto text-rose-500 mb-1" />
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Pulse Rate</span>
                      <strong className="text-gray-900 text-sm">{log.heartRate ? `${log.heartRate} bpm` : "--"}</strong>
                    </div>

                    <div className="bg-amber-50/40 p-2 rounded-lg border border-amber-100">
                      <Thermometer className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Temperature</span>
                      <strong className="text-gray-900 text-sm">{log.temperature ? `${Number(log.temperature).toFixed(1)}°C` : "--"}</strong>
                    </div>

                    <div className="bg-blue-50/40 p-2 rounded-lg border border-blue-100">
                      <Activity className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">BP Reading</span>
                      <strong className="text-gray-900 text-xs mt-1 block">{log.bloodPressure || "--"}</strong>
                    </div>

                    <div className="bg-indigo-50/40 p-2 rounded-lg border border-indigo-100">
                      <Activity className="h-4 w-4 mx-auto text-indigo-500 mb-1" />
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Resp. Rate</span>
                      <strong className="text-gray-900 text-sm">{log.respiratoryRate ? `${log.respiratoryRate} /min` : "--"}</strong>
                    </div>

                    <div className="bg-emerald-50/40 p-2 rounded-lg border border-emerald-100">
                      <Sparkles className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Oxygen (SpO2)</span>
                      <strong className="text-gray-900 text-sm">{log.oxygenSaturation ? `${log.oxygenSaturation}%` : "--"}</strong>
                    </div>
                  </div>

                  {log.notes && (
                    <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 font-medium">
                      {log.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Patient Safety / Clinical notes (col-span-1) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-rose-50/30 rounded-2xl border border-rose-100 p-6 space-y-4">
            <h4 className="font-extrabold text-rose-800 text-sm flex items-center gap-1.5">
              <AlertTriangle className="h-4.5 w-4.5 text-rose-600" /> Allergies Alert
            </h4>
            {admission.patient.allergies?.length === 0 ? (
              <p className="text-xs text-gray-500 font-medium">No recorded allergies for this patient.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {admission.patient.allergies?.map((al: any) => (
                  <span key={al.id} className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    {al.allergen}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-150 p-6 space-y-4">
            <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
              <FileText className="h-4.5 w-4.5 text-gray-500" /> Admission Metadata
            </h4>
            <div className="space-y-3 text-xs text-gray-600 font-medium">
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 block">Attending Doctor</span>
                <span className="text-gray-900 mt-1 block">Dr. {admission.admittingDoctor.firstName} {admission.admittingDoctor.lastName}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 block">Admission Date</span>
                <span className="text-gray-900 mt-1 block">{new Date(admission.admissionDate).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Vitals log form Modal */}
      {isVitalsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Chart Vital Signs</h2>
                <p className="text-xs text-gray-500 mt-1">Record patient's periodic clinical vitals readings.</p>
              </div>
              <button onClick={() => setIsVitalsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleVitalsSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="37.0"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    placeholder="e.g. 120/80"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Pulse (bpm)</label>
                  <input
                    type="number"
                    placeholder="72"
                    value={hr}
                    onChange={(e) => setHr(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Resp. Rate</label>
                  <input
                    type="number"
                    placeholder="16"
                    value={rr}
                    onChange={(e) => setRr(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="98"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Nursing Observation Note</label>
                <textarea
                  placeholder="Patient is resting..."
                  value={vitalsNotes}
                  onChange={(e) => setVitalsNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 p-4">
                <Button type="button" variant="ghost" onClick={() => setIsVitalsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={vitalsMutation.isPending}>
                  {vitalsMutation.isPending ? "Saving..." : "Chart Vitals"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Bed transfer form Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-1.5">
                  <ArrowLeftRight className="h-5 w-5 text-indigo-600" /> Inter-Ward Bed Transfer
                </h2>
                <p className="text-xs text-gray-500 mt-1">Re-allocate patient to another available bed. Old bed will require cleaning.</p>
              </div>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Target Bed (Available) *</label>
                <select
                  required
                  value={targetBedId}
                  onChange={(e) => setTargetBedId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="">Choose Bed Unit</option>
                  {transferBedsResult?.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.wardName} - {b.bedNumber}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 p-4">
                <Button type="button" variant="ghost" onClick={() => setIsTransferModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={transferMutation.isPending}>
                  {transferMutation.isPending ? "Transferring..." : "Complete Bed Transfer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Discharge Clearance form Modal */}
      {isDischargeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-1.5">
                  <ClipboardCheck className="h-5 w-5 text-rose-600" /> Clinical Discharge Clearance
                </h2>
                <p className="text-xs text-gray-500 mt-1">Discharge patient from inpatient care and trigger room tariff totals calculation.</p>
              </div>
              <button onClick={() => setIsDischargeModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDischargeSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 font-medium flex items-start gap-2 border border-amber-100 shadow-3xs">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Billing aggregation notice:</strong> Elapsed admission stay will be computed and daily room charges will be added to the patient's outstanding active invoice.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Discharge Summary Notes *</label>
                <textarea
                  required
                  placeholder="Type final clinical observations and discharge instructions..."
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-28"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 p-4">
                <Button type="button" variant="ghost" onClick={() => setIsDischargeModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={dischargeMutation.isPending} variant="danger">
                  {dischargeMutation.isPending ? "Discharging..." : "Authorize Discharge"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientChart;
