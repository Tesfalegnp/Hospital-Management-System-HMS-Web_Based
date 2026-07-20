import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sliders,
  AlertTriangle,
  Info,
  Calendar,
  User,
  Activity,
  UserPlus,
  Loader2,
  X,
  ClipboardList
} from "lucide-react";
import { getWards, createWard, clearBedCleaning, admitPatient, getActiveAdmissions } from "../../services/api";
import Button from "../../components/ui/Button";

// Sandbox Mock Fallbacks
const MOCK_BRANCHES = [
  { id: "br1234567890123456789012345", name: "Main Medical Center" },
  { id: "br5678901234567890123456789", name: "Northside Clinic" }
];

const FALLBACK_WARDS = [
  {
    id: "wd_1",
    branchId: "br1234567890123456789012345",
    name: "General Ward (Male)",
    code: "W-GEN-M",
    dailyTariffCode: "T-WARD-GEN",
    beds: [
      { id: "bd_1", bedNumber: "Bed-101", status: "AVAILABLE" },
      { id: "bd_2", bedNumber: "Bed-102", status: "OCCUPIED" },
      { id: "bd_3", bedNumber: "Bed-103", status: "CLEANING" },
      { id: "bd_4", bedNumber: "Bed-104", status: "MAINTENANCE" }
    ]
  },
  {
    id: "wd_2",
    branchId: "br1234567890123456789012345",
    name: "Intensive Care Unit (ICU)",
    code: "W-ICU",
    dailyTariffCode: "T-WARD-ICU",
    beds: [
      { id: "bd_5", bedNumber: "Bed-ICU-1", status: "AVAILABLE" },
      { id: "bd_6", bedNumber: "Bed-ICU-2", status: "OCCUPIED" }
    ]
  }
];

const FALLBACK_ADMISSIONS = [
  {
    id: "adm_1",
    patientId: "pat_101",
    admittingDoctorId: "doc_201",
    bedId: "bd_2",
    status: "ADMITTED",
    admissionDate: "2026-07-18T10:00:00.000Z",
    patient: { id: "pat_101", firstName: "Jonathan", lastName: "Carter", user: { email: "j.carter@hospital.com" } },
    admittingDoctor: { firstName: "Robert", lastName: "Chen", specialization: "Internal Medicine" }
  },
  {
    id: "adm_2",
    patientId: "pat_102",
    admittingDoctorId: "doc_202",
    bedId: "bd_6",
    status: "ADMITTED",
    admissionDate: "2026-07-17T08:30:00.000Z",
    patient: { id: "pat_102", firstName: "Alice", lastName: "Smith", user: { email: "a.smith@hospital.com" } },
    admittingDoctor: { firstName: "Sarah", lastName: "Conley", specialization: "Anesthesiology & ICU" }
  }
];

const MOCK_PATIENTS = [
  { id: "pat_101", firstName: "Jonathan", lastName: "Carter", email: "j.carter@hospital.com" },
  { id: "pat_102", firstName: "Alice", lastName: "Smith", email: "a.smith@hospital.com" },
  { id: "pat1234567890123456789012345", firstName: "Mark", lastName: "Spencer", email: "m.spencer@gmail.com" },
  { id: "pat_new", firstName: "Eleanor", lastName: "Vance", email: "eleanor.v@outlook.com" }
];

const MOCK_DOCTORS = [
  { id: "doc1234567890123456789012345", firstName: "Robert", lastName: "Chen", specialization: "Internal Medicine" },
  { id: "doc_202", firstName: "Sarah", lastName: "Conley", specialization: "ICU Specialist" }
];

export const BedBoard: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedBranch, setSelectedBranch] = useState(MOCK_BRANCHES[0].id);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);

  // Selected bed status summary card drawer
  const [selectedBed, setSelectedBed] = useState<any>(null);

  // Modal forms trigger
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Intake Form states
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [targetBed, setTargetBed] = useState<any>(null);

  // Ward creation states
  const [newWardName, setNewWardName] = useState("");
  const [newWardCode, setNewWardCode] = useState("");
  const [newWardTariff, setNewWardTariff] = useState("");

  // Query Wards
  const { data: wardsResult, isLoading: isWardsLoading } = useQuery({
    queryKey: ["ipd-wards", selectedBranch],
    queryFn: () => getWards({ branchId: selectedBranch }).catch(() => ({
      data: FALLBACK_WARDS.filter(w => w.branchId === selectedBranch)
    })),
  });

  React.useEffect(() => {
    const res = wardsResult as any;
    if (res?.data?.length > 0 && !selectedWardId) {
      setSelectedWardId(res.data[0].id);
    }
  }, [wardsResult, selectedWardId]);

  const activeWard = (wardsResult as any)?.data?.find((w: any) => w.id === selectedWardId) || (wardsResult as any)?.data?.[0];

  // Query Admissions
  const { data: admissionsResult } = useQuery({
    queryKey: ["ipd-admissions", selectedBranch],
    queryFn: () => getActiveAdmissions({ branchId: selectedBranch }).catch(() => ({
      data: FALLBACK_ADMISSIONS
    }))
  });

  // Admit patient mutation
  const admitMutation = useMutation({
    mutationFn: (payload: any) => admitPatient(payload).catch((err) => {
      console.warn("Simulating offline patient admission:", err);
      // Simulate
      const wardIdx = FALLBACK_WARDS.findIndex(w => w.id === selectedWardId);
      if (wardIdx !== -1) {
        const bedIdx = FALLBACK_WARDS[wardIdx].beds.findIndex(b => b.id === payload.bedId);
        if (bedIdx !== -1) {
          FALLBACK_WARDS[wardIdx].beds[bedIdx].status = "OCCUPIED";
        }
      }
      const pat = MOCK_PATIENTS.find(p => p.id === payload.patientId);
      const doc = MOCK_DOCTORS.find(d => d.id === payload.admittingDoctorId);
      FALLBACK_ADMISSIONS.push({
        id: "adm_" + Date.now(),
        patientId: payload.patientId,
        admittingDoctorId: payload.admittingDoctorId,
        bedId: payload.bedId,
        status: "ADMITTED",
        admissionDate: new Date().toISOString(),
        patient: { id: payload.patientId, firstName: pat?.firstName || "Unknown", lastName: pat?.lastName || "Patient", user: { email: pat?.email || "" } },
        admittingDoctor: { firstName: doc?.firstName || "Robert", lastName: doc?.lastName || "Chen", specialization: doc?.specialization || "Medicine" }
      });
      return { success: true };
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ipd-wards"] });
      queryClient.invalidateQueries({ queryKey: ["ipd-admissions"] });
      setIsAdmitModalOpen(false);
      setSelectedBed(null);
      setPatientId("");
      setDoctorId("");
    }
  });

  // Clear cleaning bed mutation
  const clearCleaningMutation = useMutation({
    mutationFn: (bedId: string) => clearBedCleaning(bedId).catch((err) => {
      console.warn("Simulating offline bed cleaning clear:", err);
      // Simulate
      const wardIdx = FALLBACK_WARDS.findIndex(w => w.id === selectedWardId);
      if (wardIdx !== -1) {
        const bedIdx = FALLBACK_WARDS[wardIdx].beds.findIndex(b => b.id === bedId);
        if (bedIdx !== -1) {
          FALLBACK_WARDS[wardIdx].beds[bedIdx].status = "AVAILABLE";
        }
      }
      return { success: true };
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ipd-wards"] });
      setSelectedBed(null);
    }
  });

  // Create Ward mutation
  const createWardMutation = useMutation({
    mutationFn: (payload: any) => createWard(payload).catch((err) => {
      console.warn("Simulating offline ward creation:", err);
      FALLBACK_WARDS.push({
        id: "wd_" + Date.now(),
        branchId: selectedBranch,
        name: payload.name,
        code: payload.code,
        dailyTariffCode: payload.dailyTariffCode,
        beds: []
      });
      return { success: true };
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ipd-wards"] });
      setIsConfigModalOpen(false);
      setNewWardName("");
      setNewWardCode("");
      setNewWardTariff("");
    }
  });

  const handleBedClick = (bed: any) => {
    if (bed.status === "OCCUPIED") {
      const activeAdm = admissionsResult?.data?.find((a: any) => a.bedId === bed.id);
      setSelectedBed({ ...bed, admission: activeAdm });
    } else if (bed.status === "AVAILABLE") {
      setTargetBed(bed);
      setIsAdmitModalOpen(true);
    } else if (bed.status === "CLEANING") {
      setSelectedBed(bed);
    }
  };

  const handleAdmitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !doctorId || !targetBed) return;

    admitMutation.mutate({
      patientId,
      admittingDoctorId: doctorId,
      bedId: targetBed.id
    });
  };

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWardName || !newWardCode || !newWardTariff) return;

    createWardMutation.mutate({
      branchId: selectedBranch,
      name: newWardName,
      code: newWardCode,
      dailyTariffCode: newWardTariff
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header block */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            Inpatient Bed Board <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700">IPD Hub</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time visual map tracking hospital bed occupancy, patient clinical stays, and ward housekeeping clearance.
          </p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          {/* Branch selector */}
          <select
            value={selectedBranch}
            onChange={(e) => { setSelectedBranch(e.target.value); setSelectedWardId(null); }}
            className="border border-gray-200 rounded-lg py-2 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 font-semibold"
          >
            {MOCK_BRANCHES.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <Button variant="ghost" onClick={() => setIsConfigModalOpen(true)} className="flex items-center gap-1">
            <Sliders className="h-4 w-4" /> Configure Wards
          </Button>
        </div>
      </div>

      {/* 2. Ward Tabs */}
      {isWardsLoading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs">Querying ward structures...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex border-b border-gray-250 bg-white rounded-xl p-1.5 gap-2 shadow-2xs">
            {(wardsResult as any)?.data?.map((w: any) => (
              <button
                key={w.id}
                onClick={() => { setSelectedWardId(w.id); setSelectedBed(null); }}
                className={`py-2.5 px-5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  (selectedWardId === w.id || (!selectedWardId && activeWard?.id === w.id))
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ClipboardList className="h-4 w-4" /> {w.name} ({w.beds?.length || 0})
              </button>
            ))}
          </div>

          {/* 3. Bed Board Occupancy Grid */}
          {activeWard ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Bed Map Visual Grid (col-span-3) */}
              <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider">Bed Map Grid layout</h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {activeWard.beds?.map((bd: any) => (
                    <div
                      key={bd.id}
                      onClick={() => handleBedClick(bd)}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer text-center relative flex flex-col justify-between h-24 hover:scale-[1.02] shadow-2xs ${
                        bd.status === "AVAILABLE" ? "border-emerald-250 bg-emerald-50/15 hover:bg-emerald-50/30" :
                        bd.status === "OCCUPIED" ? "border-rose-250 bg-rose-50/15 hover:bg-rose-50/30" :
                        bd.status === "CLEANING" ? "border-amber-250 bg-amber-50/15 hover:bg-amber-50/30" :
                        "border-blue-250 bg-blue-50/15 hover:bg-blue-50/30"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-gray-900 text-sm">{bd.bedNumber}</span>
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          bd.status === "AVAILABLE" ? "bg-emerald-500" :
                          bd.status === "OCCUPIED" ? "bg-rose-500" :
                          bd.status === "CLEANING" ? "bg-amber-500" :
                          "bg-blue-500"
                        }`} />
                      </div>

                      <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 text-left mt-4">
                        {bd.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Side Detail box (col-span-1) */}
              <div className="lg:col-span-1">
                {!selectedBed ? (
                  <div className="bg-white rounded-2xl border border-gray-150 p-6 text-center text-gray-400 h-full flex flex-col items-center justify-center shadow-sm">
                    <Info className="h-8 w-8 text-gray-300 mb-2 mx-auto animate-pulse" />
                    <h4 className="font-bold text-gray-600">Bed Operations Details</h4>
                    <p className="text-xs text-gray-400 mt-1">Click any bed card in the map grid to manage patient chart pathways.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <h4 className="font-extrabold text-gray-900 text-lg">Bed Info: {selectedBed.bedNumber}</h4>
                      <button onClick={() => setSelectedBed(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Bed Status</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-block mt-1 ${
                          selectedBed.status === "AVAILABLE" ? "bg-emerald-50 text-emerald-700" :
                          selectedBed.status === "OCCUPIED" ? "bg-rose-50 text-rose-700" :
                          selectedBed.status === "CLEANING" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                        }`}>
                          {selectedBed.status}
                        </span>
                      </div>

                      {selectedBed.status === "OCCUPIED" && selectedBed.admission && (
                        <div className="space-y-3 pt-3 border-t border-gray-50">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Admitted Patient</span>
                            <span className="font-bold text-gray-900 text-sm flex items-center gap-1 mt-1">
                              <User className="h-4 w-4 text-gray-400" />
                              {selectedBed.admission.patient.firstName} {selectedBed.admission.patient.lastName}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Attending Physician</span>
                            <span className="font-medium text-gray-700 text-xs mt-1 block">
                              Dr. {selectedBed.admission.admittingDoctor.firstName} {selectedBed.admission.admittingDoctor.lastName} ({selectedBed.admission.admittingDoctor.specialization})
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Admitted Since</span>
                            <span className="text-xs text-gray-500 font-semibold mt-1 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(selectedBed.admission.admissionDate).toLocaleString()}
                            </span>
                          </div>

                          <Button
                            onClick={() => window.location.href = `/ipd/admissions/${selectedBed.admission.id}`}
                            className="w-full flex items-center justify-center gap-1.5 mt-2"
                          >
                            <Activity className="h-4 w-4" /> View Clinical Chart
                          </Button>
                        </div>
                      )}

                      {selectedBed.status === "CLEANING" && (
                        <div className="space-y-3 pt-3 border-t border-gray-50 text-center">
                          <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto" />
                          <p className="text-xs text-gray-500">This bed has been vacated and requires cleaning confirmation.</p>
                          <Button
                            onClick={() => clearCleaningMutation.mutate(selectedBed.id)}
                            disabled={clearCleaningMutation.isPending}
                            className="w-full mt-2"
                          >
                            {clearCleaningMutation.isPending ? "Confirming..." : "Clear & Mark Available"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <ClipboardList className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <h4 className="font-bold">No Wards Registered</h4>
              <p className="text-xs text-gray-400 mt-1">Configure active wards and beds to start patient admissions.</p>
            </div>
          )}
        </div>
      )}

      {/* 4. Admission intake form Modal */}
      {isAdmitModalOpen && targetBed && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-1.5">
                  <UserPlus className="h-5 w-5 text-indigo-600" /> Patient Intake Admission
                </h2>
                <p className="text-xs text-gray-500 mt-1">Admit outpatient to bed unit: <span className="font-bold text-gray-800">{targetBed.bedNumber}</span>.</p>
              </div>
              <button onClick={() => setIsAdmitModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdmitSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Select Patient Chart *</label>
                <select
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="">Choose Patient</option>
                  {MOCK_PATIENTS.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Attending Physician *</label>
                <select
                  required
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="">Choose Doctor</option>
                  {MOCK_DOCTORS.map(d => (
                    <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName} ({d.specialization})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 p-4">
                <Button type="button" variant="ghost" onClick={() => setIsAdmitModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={admitMutation.isPending}>
                  {admitMutation.isPending ? "Processing Admission..." : "Admit Patient"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Config Ward Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Configure Wards</h2>
                <p className="text-xs text-gray-500 mt-1">Register a new clinical ward block in clinic.</p>
              </div>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfigSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Ward Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Intensive Care Unit"
                  value={newWardName}
                  onChange={(e) => setNewWardName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. W-ICU"
                    value={newWardCode}
                    onChange={(e) => setNewWardCode(e.target.value.toUpperCase())}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Daily Tariff Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. T-WARD-ICU"
                    value={newWardTariff}
                    onChange={(e) => setNewWardTariff(e.target.value.toUpperCase())}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 p-4">
                <Button type="button" variant="ghost" onClick={() => setIsConfigModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createWardMutation.isPending}>
                  {createWardMutation.isPending ? "Creating Ward..." : "Create Ward"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedBoard;
