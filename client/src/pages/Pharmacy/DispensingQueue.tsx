import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Pill,
  Search,
  Clock,
  User,
  ChevronRight,
  X,
  FileCheck,
  ShieldCheck,
  Loader2,
  ClipboardList
} from "lucide-react";
import {
  getPrescriptionQueue,
  getPrescriptionById,
  dispensePrescription,
  getBranchInventory
} from "../../services/api";
import Button from "../../components/ui/Button";

// Fallback Mock Data for Offline/Sandbox Testing
const MOCK_WITNESSES = [
  { id: "usr_doc_1", name: "Dr. Jonathan Carter (Doctor)", role: "DOCTOR" },
  { id: "usr_phar_2", name: "Pharm. Sarah Jenkins (Pharmacist)", role: "PHARMACIST" },
  { id: "usr_nur_3", name: "Nurse Robert Brown (Nurse)", role: "NURSE" }
];

const MOCK_INVENTORY_BATCHES: Record<string, any[]> = {
  "med_tylenol": [
    { id: "bat_tyl_101", batchNumber: "BAT-TYL-101", quantity: 150, expiryDate: "2027-12-31" },
    { id: "bat_tyl_102", batchNumber: "BAT-TYL-102", quantity: 80, expiryDate: "2028-06-30" }
  ],
  "med_nitroglycerin": [
    { id: "bat_nitro_202", batchNumber: "BAT-NIT-202", quantity: 18, expiryDate: "2026-08-15" }
  ],
  "med_sildenafil": [
    { id: "bat_sil_303", batchNumber: "BAT-SIL-303", quantity: 120, expiryDate: "2028-09-01" }
  ],
  "med_amoxil": [
    { id: "bat_amox_expired", batchNumber: "BAT-AMX-99", quantity: 45, expiryDate: "2026-03-01" }
  ]
};

const FALLBACK_QUEUE = [
  {
    id: "rx_001",
    status: "PENDING",
    notes: "Patient is experiencing severe chest pain. Needs immediate Nitrostat refills.",
    createdAt: "2026-07-18T14:45:00.000Z",
    patient: { id: "pat123", firstName: "Jonathan", lastName: "Carter", user: { email: "j.carter@hospital.com" } },
    doctor: { id: "doc123", user: { firstName: "Sarah", lastName: "Jenkins" } },
    items: [
      {
        id: "rxi_nit_01",
        quantity: 2,
        dispensedQuantity: 0,
        dosageInstruction: "Place 1 sublingual tablet under tongue every 5 minutes",
        medicine: { id: "med_nitroglycerin", brandName: "Nitrostat", genericName: "Nitroglycerin", strength: "0.4mg" },
        route: { name: "Sublingual" }
      }
    ]
  },
  {
    id: "rx_002",
    status: "PARTIALLY_DISPENSED",
    notes: "Prescribing acetaminophen for headaches.",
    createdAt: "2026-07-18T13:20:00.000Z",
    patient: { id: "pat456", firstName: "Alice", lastName: "Smith", user: { email: "a.smith@hospital.com" } },
    doctor: { id: "doc123", user: { firstName: "Sarah", lastName: "Jenkins" } },
    items: [
      {
        id: "rxi_tyl_02",
        quantity: 60,
        dispensedQuantity: 20,
        dosageInstruction: "Take 1 tablet every 6 hours as needed for headache",
        medicine: { id: "med_tylenol", brandName: "Tylenol Extra Strength", genericName: "Acetaminophen", strength: "500mg" },
        route: { name: "Oral" }
      }
    ]
  }
];

export const DispensingQueue: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedBranch] = useState("br1234567890123456789012345"); // Main clinic branch
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE"); // ACTIVE = PENDING or PARTIALLY_DISPENSED

  // Selection state for dispensing drawer
  const [activePrescriptionId, setActivePrescriptionId] = useState<string | null>(null);
  
  // Allocations mapping: prescriptionItemId -> { medicineBatchId, quantityDispensed }
  const [allocations, setAllocations] = useState<Record<string, { medicineBatchId: string; quantityDispensed: number }>>({});
  const [witnessId, setWitnessId] = useState<string>("");
  const [dispenseNotes, setDispenseNotes] = useState<string>("");

  // Fetch queue
  const { data: queueResult, isLoading: isQueueLoading } = useQuery({
    queryKey: ["prescriptions-queue", statusFilter, search],
    queryFn: () => getPrescriptionQueue({
      status: statusFilter === "ACTIVE" ? undefined : (statusFilter as any),
    }).then((res) => {
      // If we filtered ACTIVE, client-side restrict to non-fully dispensed
      if (statusFilter === "ACTIVE") {
        return {
          data: res.data.filter((rx: any) => rx.status === "PENDING" || rx.status === "PARTIALLY_DISPENSED")
        };
      }
      return res;
    }).catch(() => {
      // Offline fallback
      let list = FALLBACK_QUEUE;
      if (statusFilter === "ACTIVE") {
        list = FALLBACK_QUEUE.filter(rx => rx.status === "PENDING" || rx.status === "PARTIALLY_DISPENSED");
      } else if (statusFilter) {
        list = FALLBACK_QUEUE.filter(rx => rx.status === statusFilter);
      }
      if (search) {
        list = list.filter(rx =>
          rx.patient.firstName.toLowerCase().includes(search.toLowerCase()) ||
          rx.patient.lastName.toLowerCase().includes(search.toLowerCase())
        );
      }
      return { data: list };
    })
  });

  // Fetch details of active prescription
  const { data: activePrescription, isLoading: isDetailLoading } = useQuery({
    queryKey: ["prescription-detail", activePrescriptionId],
    queryFn: () => {
      if (!activePrescriptionId) return null;
      return getPrescriptionById(activePrescriptionId).catch(() => {
        return FALLBACK_QUEUE.find(q => q.id === activePrescriptionId) || null;
      });
    },
    enabled: !!activePrescriptionId
  });

  // Fetch inventory batches at main branch to populate selection boxes
  const { data: inventoryResult } = useQuery({
    queryKey: ["inventory-batches-lookups", selectedBranch],
    queryFn: () => getBranchInventory({ branchId: selectedBranch, limit: 100 }).catch(() => ({
      data: Object.values(MOCK_INVENTORY_BATCHES).flat()
    }))
  });

  const getBatchesForMedicine = (medicineId: string) => {
    if (inventoryResult?.data) {
      return inventoryResult.data.filter((b: any) => b.medicineId === medicineId && b.quantity > 0);
    }
    return MOCK_INVENTORY_BATCHES[medicineId] || [];
  };

  // Dispensing mutation
  const dispenseMutation = useMutation({
    mutationFn: (payload: any) => dispensePrescription(activePrescriptionId!, payload).catch((err) => {
      console.warn("Offline fallback simulating dispense transaction:", err);
      // Update fallback queue state locally
      const rx = FALLBACK_QUEUE.find(q => q.id === activePrescriptionId);
      if (rx) {
        payload.items.forEach((pi: any) => {
          const item = rx.items.find(i => i.id === pi.prescriptionItemId);
          if (item) {
            item.dispensedQuantity += pi.quantityDispensed;
          }
        });
        
        let allDone = true;
        let anyDone = false;
        rx.items.forEach(i => {
          if (i.dispensedQuantity < i.quantity) allDone = false;
          if (i.dispensedQuantity > 0) anyDone = true;
        });

        rx.status = allDone ? "DISPENSED" : anyDone ? "PARTIALLY_DISPENSED" : "PENDING";
      }
      return { success: true };
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions-queue"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-batches-lookups"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-reports"] });
      closeDrawer();
    }
  });

  const closeDrawer = () => {
    setActivePrescriptionId(null);
    setAllocations({});
    setWitnessId("");
    setDispenseNotes("");
  };

  const handleAllocationChange = (prescriptionItemId: string, field: string, value: any) => {
    setAllocations((prev) => ({
      ...prev,
      [prescriptionItemId]: {
        ...prev[prescriptionItemId],
        [field]: value
      }
    }));
  };

  const handleDispenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePrescription) return;

    // Build payload items array
    const dispenseItemsPayload: any[] = [];
    let containsControlled = false;

    for (const item of activePrescription.items) {
      const alloc = allocations[item.id];
      if (!alloc || !alloc.medicineBatchId || !alloc.quantityDispensed) {
        // Skip items with no allocation
        continue;
      }
      
      // Basic check: sildenafil/nitrostat could represent controlled substance alerts for mockup
      if (item.medicine.id === "med_sildenafil" || item.medicine.id === "med_nitroglycerin") {
        containsControlled = true;
      }

      dispenseItemsPayload.push({
        prescriptionItemId: item.id,
        medicineBatchId: alloc.medicineBatchId,
        quantityDispensed: Number(alloc.quantityDispensed)
      });
    }

    if (dispenseItemsPayload.length === 0) {
      alert("Please allocate at least one medication unit to dispense.");
      return;
    }

    // Verify dual-signer co-signer witness ID if controlled
    if (containsControlled && !witnessId) {
      alert("Safety Check failed: Dispensing a controlled substance requires a co-signing clinical witness.");
      return;
    }

    dispenseMutation.mutate({
      items: dispenseItemsPayload,
      witnessId: witnessId || null,
      notes: dispenseNotes || null
    });
  };

  return (
    <div className="relative min-h-screen">
      <div className="space-y-6 max-w-6xl">
        {/* 1. Header Row */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            Dispensing Queue <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700">CPOE Worklist</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Fulfill patient prescriptions, manage partial dispenses, and co-sign controlled drug transfers.
          </p>
        </div>

        {/* 2. Search & Filters Panel */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search prescriptions by patient name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg py-2 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 font-semibold"
            >
              <option value="ACTIVE">Active (Pending / Partial)</option>
              <option value="PENDING">Pending Only</option>
              <option value="PARTIALLY_DISPENSED">Partially Dispensed</option>
              <option value="DISPENSED">Fully Dispensed</option>
            </select>
          </div>
        </div>

        {/* 3. Main Queue Cards List */}
        {isQueueLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-gray-500">Retrieving prescription lists...</p>
          </div>
        ) : queueResult?.data?.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
            <ClipboardList className="h-8 w-8 mx-auto text-gray-300" />
            <p className="text-sm font-medium mt-2">No prescriptions in this queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {queueResult?.data?.map((rx: any) => {
              const dateStr = new Date(rx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div
                  key={rx.id}
                  onClick={() => setActivePrescriptionId(rx.id)}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md hover:border-indigo-150 transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                          {rx.patient.firstName[0]}{rx.patient.lastName[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-base">{rx.patient.firstName} {rx.patient.lastName}</h4>
                          <span className="text-[10px] text-gray-400 font-mono">Chart: #{rx.patient.id.slice(-8)}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        rx.status === "PENDING" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                        rx.status === "PARTIALLY_DISPENSED" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {rx.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 text-gray-600 font-medium">
                      <div><span className="text-gray-400">Physician:</span> Dr. {rx.doctor.user.firstName} {rx.doctor.user.lastName}</div>
                      {rx.notes && (
                        <div className="italic text-gray-400 max-w-sm truncate">
                          "{rx.notes}"
                        </div>
                      )}
                    </div>

                    {/* Prescribed Items summary */}
                    <div className="border-t border-gray-50 pt-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Prescribed Items</p>
                      <div className="flex flex-wrap gap-1.5">
                        {rx.items.map((item: any) => (
                          <span key={item.id} className="px-2 py-1 rounded-md bg-gray-50 border border-gray-150 text-xs font-semibold text-gray-700 inline-flex items-center gap-1.5">
                            <Pill className="h-3 w-3 text-indigo-500" /> {item.medicine.brandName} ({item.quantity - item.dispensedQuantity} remaining)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-50 pt-3 mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-gray-400" /> {dateStr}</span>
                    <span className="text-indigo-600 flex items-center gap-0.5 hover:translate-x-0.5 transition">Dispense Medication <ChevronRight className="h-3 w-3" /></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Allocation Details Drawer */}
      {activePrescriptionId && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in border-l border-gray-100">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">Dispense Allocation</h3>
                <p className="text-xs text-gray-500 mt-1">Assign medication batches and quantities to fulfill prescription.</p>
              </div>
              <button onClick={closeDrawer} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            {isDetailLoading || !activePrescription ? (
              <div className="p-12 flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                <p className="text-sm font-medium text-gray-500">Retrieving prescription profile...</p>
              </div>
            ) : (
              <form onSubmit={handleDispenseSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto">
                <div className="p-6 space-y-6 overflow-y-auto">
                  {/* Patient Banner */}
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-indigo-950 text-base">
                        {activePrescription.patient.firstName} {activePrescription.patient.lastName}
                      </h4>
                      <p className="text-xs text-indigo-600 font-medium">
                        Physician: Dr. {activePrescription.doctor.user.firstName} {activePrescription.doctor.user.lastName}
                      </p>
                    </div>
                  </div>

                  {/* Items List for Batch Selection */}
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Allocate Inventory Batches</p>
                    
                    {activePrescription.items.map((item: any) => {
                      const remaining = item.quantity - item.dispensedQuantity;
                      const batches = getBatchesForMedicine(item.medicine.id);
                      
                      const selectedAlloc = allocations[item.id] || { medicineBatchId: "", quantityDispensed: "" };

                      return (
                        <div key={item.id} className="p-4 rounded-xl border border-gray-150 bg-white space-y-3 shadow-2xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-bold text-gray-900 text-sm">{item.medicine.brandName}</h5>
                              <p className="text-xs text-gray-400 font-medium italic">{item.medicine.genericName} - {item.medicine.strength}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-gray-500">Remaining Balance</span>
                              <div className="text-sm font-black text-indigo-600">{remaining} units</div>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 font-medium italic border-l-2 border-gray-200 pl-2">
                            Instruction: "{item.dosageInstruction}" ({item.route.name})
                          </div>

                          {/* Allocation selectors */}
                          <div className="grid grid-cols-3 gap-3 pt-2">
                            <div className="col-span-2">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Batch *</label>
                              <select
                                required={remaining > 0}
                                value={selectedAlloc.medicineBatchId}
                                onChange={(e) => handleAllocationChange(item.id, "medicineBatchId", e.target.value)}
                                className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-gray-700"
                              >
                                <option value="">Choose Batch (Expiry / Stock)</option>
                                {batches.map((b: any) => (
                                  <option key={b.id} value={b.id}>
                                    {b.batchNumber} (Exp: {new Date(b.expiryDate).toLocaleDateString()} | Count: {b.quantity})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Dispense Count *</label>
                              <input
                                type="number"
                                required={remaining > 0}
                                min={1}
                                max={remaining}
                                placeholder="Qty"
                                value={selectedAlloc.quantityDispensed || ""}
                                onChange={(e) => handleAllocationChange(item.id, "quantityDispensed", e.target.value)}
                                className="w-full border border-gray-200 rounded-lg p-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dual-Signer Verification (if sildenafil/nitrostat items exist to trigger mockup controlled rules) */}
                  <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 space-y-3">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                      <ShieldCheck className="h-4 w-4 text-rose-600" /> Clinical Co-Signing Validation
                    </div>
                    <p className="text-xs text-gray-500">
                      Dispensing controlled substances (e.g. Nitroglycerin sublingual, Narcotic analgesics) requires a dual-signature co-signing clinician.
                    </p>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Witness Co-Signer *</label>
                      <select
                        value={witnessId}
                        onChange={(e) => setWitnessId(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold text-gray-700"
                      >
                        <option value="">Select Clinical Witness (Doctor, Pharmacist, Nurse)</option>
                        {MOCK_WITNESSES.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dispensing notes */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dispensing Transaction Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Add any dispensing notes (e.g. partial fulfillment reason)..."
                      value={dispenseNotes}
                      onChange={(e) => setDispenseNotes(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                  <Button type="button" variant="ghost" onClick={closeDrawer}>Cancel</Button>
                  <Button type="submit" disabled={dispenseMutation.isPending} className="flex items-center gap-2">
                    {dispenseMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Executing Fulfill...
                      </>
                    ) : (
                      <>
                        <FileCheck className="h-4 w-4" /> Complete Dispensing
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DispensingQueue;
