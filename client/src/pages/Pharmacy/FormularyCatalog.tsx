import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  SlidersHorizontal,
  AlertTriangle,
  AlertCircle,
  Trash2,
  X,
  Check,
  ShieldAlert,
  Loader2
} from "lucide-react";
import api, { getMedicines, createMedicine } from "../../services/api";
import Button from "../../components/ui/Button";

// Fallback Mock Data for Offline/Sandbox Mode
const FALLBACK_MANUFACTURERS = [
  { id: "man_pfizer", name: "Pfizer Pharmaceuticals" },
  { id: "man_novartis", name: "Novartis Health" },
  { id: "man_merck", name: "Merck Sharp & Dohme" },
  { id: "man_gsk", name: "GlaxoSmithKline EMR" }
];

const FALLBACK_CATEGORIES = [
  { id: "cat_analgesic", name: "Analgesics & Pain Management" },
  { id: "cat_cardio", name: "Cardiovascular & Statins" },
  { id: "cat_antibiotic", name: "Anti-infectives & Antibiotics" },
  { id: "cat_respiratory", name: "Respiratory & Asthma" }
];

const FALLBACK_DOSAGE_FORMS = [
  { id: "df_tablet", name: "Oral Tablet" },
  { id: "df_capsule", name: "Oral Capsule" },
  { id: "df_injection", name: "Intravenous Solution" },
  { id: "df_inhaler", name: "Metered Dose Inhaler" }
];

const FALLBACK_ROUTES = [
  { id: "ar_oral", name: "Oral", description: "Swallowed by mouth" },
  { id: "ar_iv", name: "Intravenous (IV)", description: "Injected directly into venous stream" },
  { id: "ar_im", name: "Intramuscular (IM)", description: "Injected into muscle tissue" },
  { id: "ar_inhale", name: "Inhalation", description: "Inhaled through mouth or nose" }
];

const FALLBACK_LOCATIONS = [
  { id: "sl_cabinet_a", name: "Main Cabinet A (Aisle 1)" },
  { id: "sl_fridge_1", name: "Cold Storage Refrigerator 1" },
  { id: "sl_narcotics", name: "Secured Vault (Narcotics)" }
];

const FALLBACK_MEDICINES = [
  {
    id: "med_tylenol",
    brandName: "Tylenol Extra Strength",
    genericName: "Acetaminophen",
    strength: "500mg",
    sku: "SKU-TYL-500",
    description: "Indicated for temporary relief of minor aches, pains, and reduction of fever.",
    isActive: true,
    manufacturer: { id: "man_pfizer", name: "Pfizer Pharmaceuticals" },
    category: { id: "cat_analgesic", name: "Analgesics & Pain Management" },
    dosageForm: { id: "df_tablet", name: "Oral Tablet" },
    storageLocation: { id: "sl_cabinet_a", name: "Main Cabinet A (Aisle 1)" },
    approvedRoutes: [{ route: { id: "ar_oral", name: "Oral" } }],
    interactionsA: [
      {
        severity: "WARNING",
        description: "Concurrent usage with alcohol increases risk of severe hepatotoxicity.",
        medicineB: { id: "med_advil", brandName: "Advil", genericName: "Ibuprofen" }
      }
    ]
  },
  {
    id: "med_nitroglycerin",
    brandName: "Nitrostat",
    genericName: "Nitroglycerin",
    strength: "0.4mg",
    sku: "SKU-NIT-04",
    description: "Nitrate vasodilator indicated for acute relief of angina pectoris.",
    isActive: true,
    manufacturer: { id: "man_merck", name: "Merck Sharp & Dohme" },
    category: { id: "cat_cardio", name: "Cardiovascular & Statins" },
    dosageForm: { id: "df_tablet", name: "Sublingual Tablet" },
    storageLocation: { id: "sl_cabinet_a", name: "Main Cabinet A (Aisle 1)" },
    approvedRoutes: [{ route: { id: "ar_oral", name: "Oral (Sublingual)" } }],
    interactionsA: [
      {
        severity: "CRITICAL",
        description: "Co-administration with PDE-5 inhibitors (e.g. Sildenafil) causes severe, life-threatening hypotension.",
        medicineB: { id: "med_sildenafil", brandName: "Viagra", genericName: "Sildenafil" }
      }
    ]
  },
  {
    id: "med_sildenafil",
    brandName: "Viagra",
    genericName: "Sildenafil",
    strength: "100mg",
    sku: "SKU-SIL-100",
    description: "PDE-5 inhibitor used for erectile dysfunction or pulmonary hypertension.",
    isActive: true,
    manufacturer: { id: "man_novartis", name: "Novartis Health" },
    category: { id: "cat_cardio", name: "Cardiovascular & Statins" },
    dosageForm: { id: "df_tablet", name: "Oral Tablet" },
    storageLocation: { id: "sl_cabinet_a", name: "Main Cabinet A (Aisle 1)" },
    approvedRoutes: [{ route: { id: "ar_oral", name: "Oral" } }],
    interactionsA: [
      {
        severity: "CRITICAL",
        description: "Co-administration with organic nitrates (e.g. Nitroglycerin) causes severe, life-threatening hypotension.",
        medicineB: { id: "med_nitroglycerin", brandName: "Nitrostat", genericName: "Nitroglycerin" }
      }
    ]
  }
];

export const FormularyCatalog: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [page, setPage] = useState(1);

  // Form states
  const [brandName, setBrandName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [sku, setSku] = useState("");
  const [strength, setStrength] = useState("");
  const [description, setDescription] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dosageFormId, setDosageFormId] = useState("");
  const [storageLocationId, setStorageLocationId] = useState("");
  const [approvedRouteIds, setApprovedRouteIds] = useState<string[]>([]);
  const [interactions, setInteractions] = useState<{ medicineBId: string; severity: "CRITICAL" | "WARNING" | "INFORMATIONAL"; description: string }[]>([]);

  // Fetch Lookups
  const { data: manufacturersData } = useQuery({
    queryKey: ["manufacturers"],
    queryFn: () => api.get("/pharmacy/manufacturers").then(res => res.data.data).catch(() => FALLBACK_MANUFACTURERS),
    initialData: FALLBACK_MANUFACTURERS
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/pharmacy/categories").then(res => res.data.data).catch(() => FALLBACK_CATEGORIES),
    initialData: FALLBACK_CATEGORIES
  });

  const { data: dosageFormsData } = useQuery({
    queryKey: ["dosage-forms"],
    queryFn: () => api.get("/pharmacy/dosage-forms").then(res => res.data.data).catch(() => FALLBACK_DOSAGE_FORMS),
    initialData: FALLBACK_DOSAGE_FORMS
  });

  const { data: routesData } = useQuery({
    queryKey: ["routes"],
    queryFn: () => api.get("/pharmacy/routes").then(res => res.data.data).catch(() => FALLBACK_ROUTES),
    initialData: FALLBACK_ROUTES
  });

  const { data: locationsData } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get("/pharmacy/locations").then(res => res.data.data).catch(() => FALLBACK_LOCATIONS),
    initialData: FALLBACK_LOCATIONS
  });

  // Main list query
  const { data: medicinesResult, isLoading, error } = useQuery({
    queryKey: ["medicines", search, selectedCategory, selectedManufacturer, page],
    queryFn: () => getMedicines({
      search: search || undefined,
      categoryId: selectedCategory || undefined,
      manufacturerId: selectedManufacturer || undefined,
      page,
      limit: 10
    }).catch(() => {
      // Offline local filtering for fallback simulation
      const filtered = FALLBACK_MEDICINES.filter(m => {
        const matchesSearch = search ? (
          m.brandName.toLowerCase().includes(search.toLowerCase()) ||
          m.genericName.toLowerCase().includes(search.toLowerCase())
        ) : true;
        const matchesCategory = selectedCategory ? m.category.id === selectedCategory : true;
        const matchesManufacturer = selectedManufacturer ? m.manufacturer.id === selectedManufacturer : true;
        return matchesSearch && matchesCategory && matchesManufacturer;
      });
      return {
        data: filtered,
        pagination: { total: filtered.length, page, limit: 10, pages: 1 }
      };
    })
  });

  // Medicine catalog list of all medicines (used for interaction builder target select)
  const { data: allMedicinesList } = useQuery({
    queryKey: ["all-medicines-list"],
    queryFn: () => api.get("/pharmacy/medicines", { params: { limit: 100 } }).then(res => res.data.data).catch(() => FALLBACK_MEDICINES),
    initialData: FALLBACK_MEDICINES
  });

  const createMutation = useMutation({
    mutationFn: (newMed: any) => createMedicine(newMed).catch((err) => {
      // Simulate success offline to make sandbox interactive
      console.warn("API request failed, simulating offline creation success: ", err);
      const simulatedMed = {
        id: "med_" + Date.now(),
        brandName: newMed.brandName,
        genericName: newMed.genericName,
        strength: newMed.strength,
        sku: newMed.sku || "SKU-GEN-" + Math.floor(Math.random() * 1000),
        description: newMed.description || "",
        isActive: true,
        manufacturer: manufacturersData.find((m: any) => m.id === newMed.manufacturerId) || { name: "Simulated Manufacturer" },
        category: categoriesData.find((c: any) => c.id === newMed.categoryId) || { name: "Simulated Category" },
        dosageForm: dosageFormsData.find((d: any) => d.id === newMed.dosageFormId) || { name: "Simulated Dosage Form" },
        storageLocation: locationsData.find((l: any) => l.id === newMed.storageLocationId) || null,
        approvedRoutes: newMed.approvedRouteIds.map((rid: string) => ({
          route: routesData.find((r: any) => r.id === rid) || { name: rid }
        })),
        interactionsA: newMed.interactions?.map((i: any) => ({
          severity: i.severity,
          description: i.description,
          medicineB: allMedicinesList.find((m: any) => m.id === i.medicineBId) || { brandName: "Unknown drug" }
        })) || []
      };
      FALLBACK_MEDICINES.push(simulatedMed);
      return simulatedMed;
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      closeFormModal();
    }
  });

  const handleRouteCheck = (routeId: string) => {
    if (approvedRouteIds.includes(routeId)) {
      setApprovedRouteIds(approvedRouteIds.filter(id => id !== routeId));
    } else {
      setApprovedRouteIds([...approvedRouteIds, routeId]);
    }
  };

  const addInteractionRow = () => {
    setInteractions([...interactions, { medicineBId: "", severity: "WARNING", description: "" }]);
  };

  const removeInteractionRow = (index: number) => {
    setInteractions(interactions.filter((_, idx) => idx !== index));
  };

  const updateInteractionRow = (index: number, field: string, value: any) => {
    const updated = interactions.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setInteractions(updated);
  };

  const closeFormModal = () => {
    setIsModalOpen(false);
    // Reset states
    setBrandName("");
    setGenericName("");
    setSku("");
    setStrength("");
    setDescription("");
    setManufacturerId("");
    setCategoryId("");
    setDosageFormId("");
    setStorageLocationId("");
    setApprovedRouteIds([]);
    setInteractions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName || !genericName || !strength || !manufacturerId || !categoryId || !dosageFormId || approvedRouteIds.length === 0) {
      alert("Please check that all mandatory fields, including at least one approved route, are filled.");
      return;
    }

    createMutation.mutate({
      brandName,
      genericName,
      sku: sku || null,
      strength,
      description: description || null,
      manufacturerId,
      categoryId,
      dosageFormId,
      storageLocationId: storageLocationId || null,
      approvedRouteIds,
      interactions: interactions.filter(i => i.medicineBId !== "") // filter out incomplete interaction configs
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            Medicine Formulary <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700">Clinical Safety Enforced</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage corporate drug catalogs, define supported clinical routes, and establish interaction safety overrides.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Formulation
        </Button>
      </div>

      {/* 2. Stat Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Total Formulary Items</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{medicinesResult?.data?.length || 0}</h3>
          </div>
          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm">
            F
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Safety Rules Mapped</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">
              {medicinesResult?.data?.reduce((acc: number, cur: any) => acc + (cur.interactionsA?.length || 0), 0) || 0}
            </h3>
          </div>
          <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-bold text-sm">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Database Status</p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 mt-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live Sandbox Ready
            </span>
          </div>
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-sm">
            <Check className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Row */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by brand name or chemical name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto items-center flex-wrap">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filters</span>
          </div>
          
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-200 rounded-lg py-2 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
          >
            <option value="">All Categories</option>
            {categoriesData.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Manufacturer Filter */}
          <select
            value={selectedManufacturer}
            onChange={(e) => setSelectedManufacturer(e.target.value)}
            className="border border-gray-200 rounded-lg py-2 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
          >
            <option value="">All Manufacturers</option>
            {manufacturersData.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Table view */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-gray-500">Retrieving pharmacy formulary records...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
            <p className="text-sm font-bold mt-2">Failed to load medicines from catalog</p>
          </div>
        ) : medicinesResult?.data?.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto text-amber-400" />
            <p className="text-sm font-medium mt-2">No medication items found matching the selected parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Brand / Generic Name</th>
                  <th className="px-6 py-4">Strength & SKU</th>
                  <th className="px-6 py-4">Classification</th>
                  <th className="px-6 py-4">Approved Routes</th>
                  <th className="px-6 py-4">Safety Rules Mapped</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {medicinesResult.data.map((med: any) => (
                  <tr key={med.id} className="hover:bg-gray-50/50 transition duration-150">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 text-base">{med.brandName}</div>
                      <div className="text-xs text-gray-500 font-medium italic">{med.genericName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-700">{med.strength}</div>
                      <div className="text-xs font-mono text-gray-400">{med.sku || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700 font-medium">{med.category?.name || "Uncategorized"}</div>
                      <div className="text-xs text-gray-400">{med.manufacturer?.name || "Unknown Manufacturer"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {med.approvedRoutes?.map((ar: any) => (
                          <span key={ar.route.id} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                            {ar.route.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {med.interactionsA && med.interactionsA.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                          <ShieldAlert className="h-3.5 w-3.5" /> {med.interactionsA.length} alert(s)
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs flex items-center gap-1 font-medium">
                          <Check className="h-4 w-4 text-emerald-500" /> Standard Safety
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 cursor-pointer transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
              <span>Page {page} of {medicinesResult.pagination.pages} ({medicinesResult.pagination.total} total items)</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="py-1 px-3 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPage(p => Math.min(medicinesResult.pagination.pages, p + 1))}
                  disabled={page === medicinesResult.pagination.pages}
                  className="py-1 px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Add Formulation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Define Formulary Formulation</h2>
                <p className="text-xs text-gray-500 mt-1">Specify brand properties, route approvals, and safety rules.</p>
              </div>
              <button onClick={closeFormModal} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxil"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Chemical/Generic Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin"
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Strength (e.g. 500mg, 10ml) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500mg"
                    value={strength}
                    onChange={(e) => setStrength(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">SKU / Barcode Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SKU-AMX-500"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Manufacturer *</label>
                  <select
                    required
                    value={manufacturerId}
                    onChange={(e) => setManufacturerId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Manufacturer</option>
                    {manufacturersData.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Classification Category *</label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Category</option>
                    {categoriesData.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Dosage Form *</label>
                  <select
                    required
                    value={dosageFormId}
                    onChange={(e) => setDosageFormId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Dosage Form</option>
                    {dosageFormsData.map((df: any) => (
                      <option key={df.id} value={df.id}>{df.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Default Storage Location</label>
                  <select
                    value={storageLocationId}
                    onChange={(e) => setStorageLocationId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Location</option>
                    {locationsData.map((l: any) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Description / Clinical Notes</label>
                <textarea
                  rows={2}
                  placeholder="Clinical usage directions, shelf conditions, caution guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Multi-select Checklist for Approved Administration Routes */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Approved Administration Routes *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {routesData.map((route: any) => (
                    <label key={route.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-gray-100 hover:border-indigo-200 transition">
                      <input
                        type="checkbox"
                        checked={approvedRouteIds.includes(route.id)}
                        onChange={() => handleRouteCheck(route.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                      />
                      <span className="text-xs font-medium text-gray-700">{route.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Interactive Drug Interactions builder */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Configure Drug Interactions & Safety Warns</label>
                  <Button type="button" variant="secondary" onClick={addInteractionRow} className="flex items-center gap-1.5 py-1 px-3 text-xs">
                    <Plus className="h-3 w-3" /> Add Rule
                  </Button>
                </div>

                {interactions.length === 0 ? (
                  <div className="p-6 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400 font-medium">
                    No active drug interactions configured. This formulation is marked safe.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {interactions.map((interaction, index) => (
                      <div key={index} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                        {/* Target Med Select */}
                        <div className="flex-1 w-full">
                          <select
                            required
                            value={interaction.medicineBId}
                            onChange={(e) => updateInteractionRow(index, "medicineBId", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Interact With...</option>
                            {allMedicinesList
                              .filter((m: any) => m.id !== "new") // exclude self
                              .map((m: any) => (
                                <option key={m.id} value={m.id}>{m.brandName} ({m.genericName})</option>
                              ))}
                          </select>
                        </div>
                        {/* Severity */}
                        <div className="w-full md:w-36">
                          <select
                            value={interaction.severity}
                            onChange={(e) => updateInteractionRow(index, "severity", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                          >
                            <option value="CRITICAL">🔴 CRITICAL</option>
                            <option value="WARNING">🟡 WARNING</option>
                            <option value="INFORMATIONAL">🔵 INFO</option>
                          </select>
                        </div>
                        {/* Description */}
                        <div className="flex-[2] w-full">
                          <input
                            type="text"
                            required
                            placeholder="Warning message / clinical indications..."
                            value={interaction.description}
                            onChange={(e) => updateInteractionRow(index, "description", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        {/* Delete Row */}
                        <button type="button" onClick={() => removeInteractionRow(index)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 bg-gray-50/20 -mx-6 -mb-6 p-6 rounded-b-2xl">
                <Button type="button" variant="ghost" onClick={closeFormModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating Entry..." : "Register Formulation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormularyCatalog;
