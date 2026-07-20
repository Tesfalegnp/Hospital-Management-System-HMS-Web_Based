import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  AlertTriangle,
  AlertCircle,
  X,
  Loader2,
  ArrowRightLeft,
  ArrowDownUp,
  History,
  Boxes
} from "lucide-react";
import {
  getBranchInventory,
  recordStockIntake,
  adjustStock,
  transferStock,
  getInventoryLedger,
  getInventorySafetyReports
} from "../../services/api";
import Button from "../../components/ui/Button";

// Fallback Mock Data for Offline/Sandbox Mode
const MOCK_BRANCHES = [
  { id: "br1234567890123456789012345", name: "Main Medical Center" },
  { id: "br5678901234567890123456789", name: "Northside Clinic" }
];

const MOCK_LOCATIONS = [
  { id: "sl_cabinet_a", name: "Main Cabinet A (Aisle 1)" },
  { id: "sl_fridge_1", name: "Cold Storage Refrigerator 1" },
  { id: "sl_narcotics", name: "Secured Vault (Narcotics)" }
];

const MOCK_FORMULARY = [
  { id: "med_tylenol", brandName: "Tylenol Extra Strength", genericName: "Acetaminophen", strength: "500mg" },
  { id: "med_nitroglycerin", brandName: "Nitrostat", genericName: "Nitroglycerin", strength: "0.4mg" },
  { id: "med_sildenafil", brandName: "Viagra", genericName: "Sildenafil", strength: "100mg" },
  { id: "med_amoxil", brandName: "Amoxil Pediatric", genericName: "Amoxicillin", strength: "250mg" }
];

const FALLBACK_BATCHES = [
  {
    id: "bat_tyl_101",
    batchNumber: "BAT-TYL-101",
    expiryDate: "2027-12-31T00:00:00.000Z",
    quantity: 150,
    reorderLevel: 20,
    purchasePrice: 1.50,
    sellingPrice: 3.00,
    storageLocation: { id: "sl_cabinet_a", name: "Main Cabinet A (Aisle 1)" },
    medicine: { id: "med_tylenol", brandName: "Tylenol Extra Strength", genericName: "Acetaminophen", strength: "500mg" }
  },
  {
    id: "bat_nitro_202",
    batchNumber: "BAT-NIT-202",
    expiryDate: "2026-08-15T00:00:00.000Z", // near expiry
    quantity: 18, // below reorder (20)
    reorderLevel: 25,
    purchasePrice: 5.00,
    sellingPrice: 12.00,
    storageLocation: { id: "sl_fridge_1", name: "Cold Storage Refrigerator 1" },
    medicine: { id: "med_nitroglycerin", brandName: "Nitrostat", genericName: "Nitroglycerin", strength: "0.4mg" }
  },
  {
    id: "bat_amox_expired",
    batchNumber: "BAT-AMX-99",
    expiryDate: "2026-03-01T00:00:00.000Z", // already expired
    quantity: 45,
    reorderLevel: 10,
    purchasePrice: 2.20,
    sellingPrice: 5.50,
    storageLocation: { id: "sl_cabinet_a", name: "Main Cabinet A (Aisle 1)" },
    medicine: { id: "med_amoxil", brandName: "Amoxil Pediatric", genericName: "Amoxicillin", strength: "250mg" }
  }
];

const FALLBACK_LEDGER = [
  {
    id: "tx_1",
    type: "STOCK_INTAKE",
    quantity: 150,
    notes: "Intake delivery logged. Cost: 1.50, Sell: 3.00",
    createdAt: "2026-07-15T10:00:00.000Z",
    user: { firstName: "Sarah", lastName: "Jenkins" },
    medicineBatch: { batchNumber: "BAT-TYL-101", medicine: { brandName: "Tylenol Extra Strength" } }
  },
  {
    id: "tx_2",
    type: "STOCK_ADJUSTMENT",
    quantity: -5,
    notes: "Disposed of 5 damaged/ruptured packets during count audit.",
    createdAt: "2026-07-16T14:30:00.000Z",
    user: { firstName: "Sarah", lastName: "Jenkins" },
    medicineBatch: { batchNumber: "BAT-NIT-202", medicine: { brandName: "Nitrostat" } }
  }
];

export const InventoryStock: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"stock" | "ledger">("stock");
  const [selectedBranch, setSelectedBranch] = useState(MOCK_BRANCHES[0].id);

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Modals visibility
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Modal forms context states
  const [activeBatch, setActiveBatch] = useState<any>(null);

  // Intake Form
  const [medicineId, setMedicineId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [storageLocationId, setStorageLocationId] = useState("");

  // Adjustment Form
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  // Transfer Form
  const [destBranchId, setDestBranchId] = useState("");
  const [destLocationId, setDestLocationId] = useState("");
  const [transferQty, setTransferQty] = useState("");

  // Fetch Inventory List
  const { data: inventoryResult, isLoading: isInventoryLoading } = useQuery({
    queryKey: ["inventory-list", selectedBranch, search, page],
    queryFn: () => getBranchInventory({
      branchId: selectedBranch,
      search: search || undefined,
      page,
      limit: 10
    }).catch(() => {
      // Offline local filtering mockup
      const filtered = FALLBACK_BATCHES.filter(b =>
        search ? (
          b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
          b.medicine.brandName.toLowerCase().includes(search.toLowerCase()) ||
          b.medicine.genericName.toLowerCase().includes(search.toLowerCase())
        ) : true
      );
      return {
        data: filtered,
        pagination: { total: filtered.length, page, limit: 10, pages: 1 }
      };
    })
  });

  // Fetch Safety warning report metrics
  const { data: safetyReports } = useQuery({
    queryKey: ["inventory-reports", selectedBranch],
    queryFn: () => getInventorySafetyReports(selectedBranch).catch(() => {
      // Offline fallback counts calculations
      const now = new Date();
      const warningLimit = new Date();
      warningLimit.setDate(now.getDate() + 90);

      const expired = FALLBACK_BATCHES.filter(b => new Date(b.expiryDate) <= now);
      const near = FALLBACK_BATCHES.filter(b => {
        const exp = new Date(b.expiryDate);
        return exp > now && exp <= warningLimit;
      });
      const low = FALLBACK_BATCHES.filter(b => b.quantity <= b.reorderLevel);

      return {
        data: {
          expiredCount: expired.length,
          nearExpiryCount: near.length,
          lowStockCount: low.length
        }
      };
    })
  });

  // Fetch Ledger Transactions history
  const { data: ledgerResult, isLoading: isLedgerLoading } = useQuery({
    queryKey: ["inventory-ledger", selectedBranch, page],
    queryFn: () => getInventoryLedger({
      branchId: selectedBranch,
      page,
      limit: 10
    }).catch(() => ({
      data: FALLBACK_LEDGER,
      pagination: { total: FALLBACK_LEDGER.length, page, limit: 10, pages: 1 }
    })),
    enabled: activeTab === "ledger"
  });

  // Intake mutation
  const intakeMutation = useMutation({
    mutationFn: (payload: any) => recordStockIntake(payload).catch((err) => {
      console.warn("Offline fallback simulating intake creation:", err);
      const med = MOCK_FORMULARY.find(m => m.id === payload.medicineId) || MOCK_FORMULARY[0];
      const newBatch = {
        id: "bat_" + Date.now(),
        batchNumber: payload.batchNumber,
        expiryDate: new Date(payload.expiryDate).toISOString(),
        quantity: payload.quantity,
        reorderLevel: 20,
        purchasePrice: payload.purchasePrice,
        sellingPrice: payload.sellingPrice,
        storageLocation: MOCK_LOCATIONS.find(l => l.id === payload.storageLocationId) || { id: "unassigned", name: "Unassigned Cabinet" },
        medicine: { ...med }
      };
      FALLBACK_BATCHES.push(newBatch);

      // Log transaction log too
      FALLBACK_LEDGER.unshift({
        id: "tx_" + Date.now(),
        type: "STOCK_INTAKE",
        quantity: payload.quantity,
        notes: `Intake delivery logged. Cost: ${payload.purchasePrice}, Sell: ${payload.sellingPrice}`,
        createdAt: new Date().toISOString(),
        user: { firstName: "Sarah", lastName: "Jenkins" },
        medicineBatch: { batchNumber: payload.batchNumber, medicine: { brandName: med.brandName } }
      });
      return newBatch;
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-reports"] });
      closeIntakeModal();
    }
  });

  // Adjustment mutation
  const adjustMutation = useMutation({
    mutationFn: (payload: any) => adjustStock(payload).catch((err) => {
      console.warn("Offline fallback adjustment simulation:", err);
      const batch = FALLBACK_BATCHES.find(b => b.id === payload.medicineBatchId);
      if (batch) {
        batch.quantity += payload.quantity;
        FALLBACK_LEDGER.unshift({
          id: "tx_" + Date.now(),
          type: "STOCK_ADJUSTMENT",
          quantity: payload.quantity,
          notes: payload.notes,
          createdAt: new Date().toISOString(),
          user: { firstName: "Sarah", lastName: "Jenkins" },
          medicineBatch: { batchNumber: batch.batchNumber, medicine: { brandName: batch.medicine.brandName } }
        });
      }
      return batch;
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-reports"] });
      closeAdjustModal();
    }
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: (payload: any) => transferStock(payload).catch((err) => {
      console.warn("Offline fallback transfer simulation:", err);
      const batch = FALLBACK_BATCHES.find(b => b.id === payload.medicineBatchId);
      if (batch) {
        batch.quantity -= payload.quantity;
        FALLBACK_LEDGER.unshift({
          id: "tx_" + Date.now(),
          type: "STOCK_TRANSFER",
          quantity: -payload.quantity,
          notes: `Transferred to branch: ${payload.destinationBranchId}`,
          createdAt: new Date().toISOString(),
          user: { firstName: "Sarah", lastName: "Jenkins" },
          medicineBatch: { batchNumber: batch.batchNumber, medicine: { brandName: batch.medicine.brandName } }
        });
      }
      return batch;
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-reports"] });
      closeTransferModal();
    }
  });

  const handleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineId || !batchNumber || !expiryDate || !quantity || !purchasePrice || !sellingPrice) {
      alert("Please fill in all mandatory fields.");
      return;
    }
    intakeMutation.mutate({
      medicineId,
      batchNumber,
      expiryDate: new Date(expiryDate).toISOString(),
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      storageLocationId: storageLocationId || null,
      branchId: selectedBranch
    });
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustQty || !adjustNotes) return;
    adjustMutation.mutate({
      medicineBatchId: activeBatch.id,
      quantity: Number(adjustQty),
      notes: adjustNotes
    });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destBranchId || !transferQty) return;
    transferMutation.mutate({
      medicineBatchId: activeBatch.id,
      destinationBranchId: destBranchId,
      destinationStorageLocationId: destLocationId || null,
      quantity: Number(transferQty)
    });
  };

  const closeIntakeModal = () => {
    setIsIntakeOpen(false);
    setMedicineId("");
    setBatchNumber("");
    setExpiryDate("");
    setQuantity("");
    setPurchasePrice("");
    setSellingPrice("");
    setStorageLocationId("");
  };

  const closeAdjustModal = () => {
    setIsAdjustOpen(false);
    setActiveBatch(null);
    setAdjustQty("");
    setAdjustNotes("");
  };

  const closeTransferModal = () => {
    setIsTransferOpen(false);
    setActiveBatch(null);
    setDestBranchId("");
    setDestLocationId("");
    setTransferQty("");
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            Stock Inventory <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700">Cost & Batch Tracking</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Auditing medication intake, tracking batch expiries, managing adjustments, and logging branch transfers.
          </p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          {/* Branch Selector */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="border border-gray-200 rounded-lg py-2 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 font-semibold"
          >
            {MOCK_BRANCHES.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <Button onClick={() => setIsIntakeOpen(true)} className="flex items-center gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Stock Intake
          </Button>
        </div>
      </div>

      {/* 2. Safety Metric Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Expired Batches</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">
              {safetyReports?.data?.expiredCount ?? 0}
            </h3>
          </div>
          <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-bold">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Near-Expiry (90d)</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              {safetyReports?.data?.nearExpiryCount ?? 0}
            </h3>
          </div>
          <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Low Stock items</p>
            <h3 className="text-2xl font-black text-orange-600 mt-1">
              {safetyReports?.data?.lowStockCount ?? 0}
            </h3>
          </div>
          <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-bold">
            <Boxes className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => { setActiveTab("stock"); setPage(1); }}
          className={`pb-3 px-6 text-sm font-semibold border-b-2 transition ${
            activeTab === "stock" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Active Stock Batches
        </button>
        <button
          onClick={() => { setActiveTab("ledger"); setPage(1); }}
          className={`pb-3 px-6 text-sm font-semibold border-b-2 transition ${
            activeTab === "ledger" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Transaction Ledger History
        </button>
      </div>

      {/* 3. Main Views Grid */}
      {activeTab === "stock" ? (
        <div className="space-y-6">
          {/* Search Row */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search batches by batch number or medication name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Batches Table Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {isInventoryLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                <p className="text-sm font-medium text-gray-500">Querying branch stock lists...</p>
              </div>
            ) : inventoryResult?.data?.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <AlertTriangle className="h-8 w-8 mx-auto text-amber-400" />
                <p className="text-sm font-medium mt-2">No stock batches found in this branch.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Medication & Batch No.</th>
                      <th className="px-6 py-4">Quantity In Stock</th>
                      <th className="px-6 py-4">Expiry Date</th>
                      <th className="px-6 py-4">Cost (Purchase / Sell)</th>
                      <th className="px-6 py-4">Cabinet / Storage</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventoryResult?.data?.map((batch: any) => {
                      const isExpired = new Date(batch.expiryDate) <= new Date();
                      const isLow = batch.quantity <= batch.reorderLevel;

                      return (
                        <tr key={batch.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900 text-base">{batch.medicine.brandName}</div>
                            <div className="text-xs font-mono text-indigo-600 font-semibold">{batch.batchNumber}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-base font-bold ${isLow ? "text-orange-600" : "text-gray-800"}`}>
                                {batch.quantity} units
                              </span>
                              {isLow && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">
                                  Low Stock
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className={`font-semibold ${isExpired ? "text-red-600" : "text-gray-700"}`}>
                                {new Date(batch.expiryDate).toLocaleDateString()}
                              </span>
                              {isExpired && (
                                <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide mt-0.5">Expired</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-700">
                            <div>Cost: ${Number(batch.purchasePrice).toFixed(2)}</div>
                            <div className="text-xs text-gray-400">Sell: ${Number(batch.sellingPrice).toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-500 font-medium">
                            {batch.storageLocation?.name || "No location set"}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <Button
                              variant="ghost"
                              onClick={() => { setActiveBatch(batch); setIsAdjustOpen(true); }}
                              className="py-1 px-2.5 text-xs inline-flex items-center gap-1 hover:text-indigo-600"
                            >
                              <ArrowDownUp className="h-3.5 w-3.5" /> Adjust
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => { setActiveBatch(batch); setIsTransferOpen(true); }}
                              className="py-1 px-2.5 text-xs inline-flex items-center gap-1 hover:text-indigo-600"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Ledger History View */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLedgerLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-medium text-gray-500">Compiling transaction audits...</p>
            </div>
          ) : ledgerResult?.data?.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <History className="h-8 w-8 mx-auto text-gray-300" />
              <p className="text-sm font-medium mt-2">No transactions recorded in the audit logs ledger.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Transaction Date</th>
                    <th className="px-6 py-4">Medication & Batch</th>
                    <th className="px-6 py-4">Action Type</th>
                    <th className="px-6 py-4">Quantity Change</th>
                    <th className="px-6 py-4">Logged By</th>
                    <th className="px-6 py-4">Reason Details / Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ledgerResult?.data?.map((tx: any) => {
                    const isAddition = tx.quantity > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4 font-semibold text-gray-600">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{tx.medicineBatch.medicine.brandName}</div>
                          <div className="text-xs font-mono text-gray-400">{tx.medicineBatch.batchNumber}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            tx.type === "STOCK_INTAKE" ? "bg-emerald-50 text-emerald-700" :
                            tx.type === "STOCK_DISPENSE" ? "bg-indigo-50 text-indigo-700" :
                            tx.type === "STOCK_TRANSFER" ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            {tx.type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-black">
                          <span className={isAddition ? "text-emerald-600" : "text-rose-600"}>
                            {isAddition ? `+${tx.quantity}` : tx.quantity} units
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">
                          {tx.user?.firstName} {tx.user?.lastName}
                        </td>
                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={tx.notes}>
                          {tx.notes || "Standard Transaction Log"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. Intake Modal Form */}
      {isIntakeOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Record Stock Intake Delivery</h2>
                <p className="text-xs text-gray-500 mt-1">Register incoming formulations batch quantities and costs.</p>
              </div>
              <button onClick={closeIntakeModal} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleIntakeSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Select Formulation *</label>
                <select
                  required
                  value={medicineId}
                  onChange={(e) => setMedicineId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose Medication Formulation</option>
                  {MOCK_FORMULARY.map(m => (
                    <option key={m.id} value={m.id}>{m.brandName} ({m.genericName}) - {m.strength}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Batch Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BAT-2026-X"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="100"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Cost Price *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min={0.01}
                    placeholder="1.50"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Selling Price *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min={0.01}
                    placeholder="3.00"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Storage Location Cabinet</label>
                <select
                  value={storageLocationId}
                  onChange={(e) => setStorageLocationId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned Location</option>
                  {MOCK_LOCATIONS.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 p-4">
                <Button type="button" variant="ghost" onClick={closeIntakeModal}>Cancel</Button>
                <Button type="submit" disabled={intakeMutation.isPending}>
                  {intakeMutation.isPending ? "Logging intake..." : "Record Intake"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Adjustment Modal Form */}
      {isAdjustOpen && activeBatch && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Manual Stock Adjustment</h2>
                <p className="text-xs text-gray-500 mt-1">Reconciliation of stock anomalies for auditing logs.</p>
              </div>
              <button onClick={closeAdjustModal} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-150 text-xs space-y-1 text-gray-600">
                <div><span className="font-bold">Drug:</span> {activeBatch.medicine.brandName} ({activeBatch.medicine.genericName})</div>
                <div><span className="font-bold">Batch:</span> {activeBatch.batchNumber}</div>
                <div><span className="font-bold">Current Stock:</span> {activeBatch.quantity} units</div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Adjustment Quantity *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. -5 (damage) or +10 (surplus)"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-gray-400 mt-1 font-medium">Use negative values to deduct stock, and positive values to add surplus.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Adjustment Reason / Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Ruptured packets during transport, count audit reconciliation discrepancy correction..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 p-4">
                <Button type="button" variant="ghost" onClick={closeAdjustModal}>Cancel</Button>
                <Button type="submit" disabled={adjustMutation.isPending}>
                  {adjustMutation.isPending ? "Adjusting..." : "Record Adjustment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Transfer Modal Form */}
      {isTransferOpen && activeBatch && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Inter-Branch Stock Transfer</h2>
                <p className="text-xs text-gray-500 mt-1">Deduct stock locally to dispatch to another clinic branch.</p>
              </div>
              <button onClick={closeTransferModal} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-150 text-xs space-y-1 text-gray-600">
                <div><span className="font-bold">Drug:</span> {activeBatch.medicine.brandName}</div>
                <div><span className="font-bold">Batch Number:</span> {activeBatch.batchNumber}</div>
                <div><span className="font-bold">Available stock:</span> {activeBatch.quantity} units</div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Destination Branch *</label>
                <select
                  required
                  value={destBranchId}
                  onChange={(e) => setDestBranchId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Clinic/Branch</option>
                  {MOCK_BRANCHES
                    .filter(b => b.id !== selectedBranch)
                    .map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Destination Storage Location</label>
                <select
                  value={destLocationId}
                  onChange={(e) => setDestLocationId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned Location</option>
                  {MOCK_LOCATIONS.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Quantity to Transfer *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={activeBatch.quantity}
                  placeholder="e.g. 50"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 p-4">
                <Button type="button" variant="ghost" onClick={closeTransferModal}>Cancel</Button>
                <Button type="submit" disabled={transferMutation.isPending}>
                  {transferMutation.isPending ? "Transferring..." : "Complete Transfer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryStock;
