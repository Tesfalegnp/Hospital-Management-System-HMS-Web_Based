import axios from "axios";

// Base API instance targeting the backend service
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor to catch 401s and attempt silent token rotation
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid loops and catch unauthorized requests
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/auth/refresh"
    ) {
      originalRequest._retry = true;
      try {
        await api.post("/auth/refresh");
        return api(originalRequest);
      } catch (refreshError) {
        // Both tokens are invalid or expired; propagate failure
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

export const getMedicines = (params?: { search?: string; categoryId?: string; manufacturerId?: string; page?: number; limit?: number }) =>
  api.get("/pharmacy/medicines", { params }).then((res) => res.data);

export const getMedicineById = (id: string) =>
  api.get(`/pharmacy/medicines/${id}`).then((res) => res.data);

export const createMedicine = (data: any) =>
  api.post("/pharmacy/medicines", data).then((res) => res.data);

export const checkInteractions = (medicineIds: string[]) =>
  api.post("/pharmacy/clinical-safety/check-interactions", { medicineIds }).then((res) => res.data);

export const getPatientAllergies = (patientId: string) =>
  api.get(`/patients/${patientId}/allergies`).then((res) => res.data);

export const addPatientAllergy = (patientId: string, data: { medicineId: string; severity: "MILD" | "MODERATE" | "SEVERE"; reaction?: string | null }) =>
  api.post(`/patients/${patientId}/allergies`, data).then((res) => res.data);

export const checkPatientAllergies = (patientId: string, medicineIds: string[]) =>
  api.post(`/patients/${patientId}/allergies/check`, { medicineIds }).then((res) => res.data);

export const getBranchInventory = (params?: { branchId: string; search?: string; categoryId?: string; page?: number; limit?: number }) =>
  api.get("/pharmacy/inventory/stock", { params }).then((res) => res.data);

export const recordStockIntake = (data: {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  storageLocationId?: string | null;
  branchId: string;
}) => api.post("/pharmacy/inventory/intake", data).then((res) => res.data);

export const adjustStock = (data: { medicineBatchId: string; quantity: number; notes: string }) =>
  api.post("/pharmacy/inventory/adjust", data).then((res) => res.data);

export const transferStock = (data: {
  medicineBatchId: string;
  destinationBranchId: string;
  destinationStorageLocationId?: string | null;
  quantity: number;
}) => api.post("/pharmacy/inventory/transfer", data).then((res) => res.data);

export const getInventorySafetyReports = (branchId: string) =>
  api.get("/pharmacy/inventory/reports", { params: { branchId } }).then((res) => res.data);

export const getInventoryLedger = (params?: { branchId?: string; medicineBatchId?: string; type?: string; page?: number; limit?: number }) =>
  api.get("/pharmacy/inventory/ledger", { params }).then((res) => res.data);

export const getPrescriptionQueue = (params?: { status?: string; patientId?: string; page?: number; limit?: number }) =>
  api.get("/pharmacy/prescriptions", { params }).then((res) => res.data);

export const getPrescriptionById = (id: string) =>
  api.get(`/pharmacy/prescriptions/${id}`).then((res) => res.data);

export const issuePrescription = (data: {
  patientId: string;
  doctorId: string;
  encounterId?: string | null;
  notes?: string | null;
  items: {
    medicineId: string;
    quantity: number;
    dosageInstruction: string;
    routeId: string;
  }[];
}) => api.post("/pharmacy/prescriptions", data).then((res) => res.data);

export const dispensePrescription = (
  id: string,
  data: {
    items: { prescriptionItemId: string; medicineBatchId: string; quantityDispensed: number }[];
    witnessId?: string | null;
    notes?: string | null;
  }
) => api.post(`/pharmacy/prescriptions/${id}/dispense`, data).then((res) => res.data);

export const getTariffs = (params?: { branchId?: string; category?: string; page?: number; limit?: number }) =>
  api.get("/billing/tariffs", { params }).then((res) => res.data);

export const upsertTariff = (data: { branchId: string; category: string; name: string; code: string; price: number }) =>
  api.post("/billing/tariffs", data).then((res) => res.data);

export const getInvoicesQueue = (params?: { status?: string; patientId?: string; branchId?: string; page?: number; limit?: number }) =>
  api.get("/billing/invoices", { params }).then((res) => res.data);

export const getInvoiceById = (id: string) =>
  api.get(`/billing/invoices/${id}`).then((res) => res.data);

export const createInvoice = (data: {
  patientId: string;
  branchId: string;
  notes?: string | null;
  items: { name: string; quantity: number; unitPrice: number; consultationId?: string | null; labOrderId?: string | null; dispenseRecordId?: string | null }[];
}) => api.post("/billing/invoices", data).then((res) => res.data);

export const recordPayment = (
  invoiceId: string,
  data: { amount: number; method: string; referenceNumber?: string | null; notes?: string | null }
) => api.post(`/billing/invoices/${invoiceId}/payments`, data).then((res) => res.data);

export const getBillingLedger = (params?: { branchId?: string; cashierId?: string; page?: number; limit?: number }) =>
  api.get("/billing/payments", { params }).then((res) => res.data);

export const getBillingSafetyReports = (branchId: string) =>
  api.get("/billing/reports", { params: { branchId } }).then((res) => res.data);

export const getWards = (params?: { branchId?: string; page?: number; limit?: number }) =>
  api.get("/ipd/wards", { params }).then((res) => res.data);

export const createWard = (data: { branchId: string; name: string; code: string; dailyTariffCode: string }) =>
  api.post("/ipd/wards", data).then((res) => res.data);

export const createBed = (data: { wardId: string; bedNumber: string }) =>
  api.post("/ipd/beds", data).then((res) => res.data);

export const clearBedCleaning = (bedId: string) =>
  api.post(`/ipd/beds/${bedId}/clear`).then((res) => res.data);

export const admitPatient = (data: { patientId: string; admittingDoctorId: string; bedId: string }) =>
  api.post("/ipd/admissions", data).then((res) => res.data);

export const getActiveAdmissions = (params?: { wardId?: string; branchId?: string; page?: number; limit?: number }) =>
  api.get("/ipd/admissions", { params }).then((res) => res.data);

export const getAdmissionById = (id: string) =>
  api.get(`/ipd/admissions/${id}`).then((res) => res.data);

export const transferPatient = (id: string, data: { targetBedId: string }) =>
  api.post(`/ipd/admissions/${id}/transfer`, data).then((res) => res.data);

export const logInpatientVitals = (
  id: string,
  data: { temperature?: number | null; bloodPressure?: string | null; heartRate?: number | null; respiratoryRate?: number | null; oxygenSaturation?: number | null; notes?: string | null }
) => api.post(`/ipd/admissions/${id}/vitals`, data).then((res) => res.data);

export const dischargePatient = (id: string, data: { dischargeNotes?: string | null }) =>
  api.post(`/ipd/admissions/${id}/discharge`, data).then((res) => res.data);

export const getLabQueue = (params?: { branchId?: string; page?: number; limit?: number }) =>
  api.get("/labs/queue", { params }).then((res) => res.data);

export const collectLabSpecimen = (id: string) =>
  api.post(`/labs/collect-specimen/${id}`).then((res) => res.data);

export const enterLabResults = (id: string, data: { findings: string; value?: number; quantitativeData?: any }) =>
  api.post(`/labs/enter-results/${id}`, data).then((res) => res.data);

export const validateLabResults = (id: string) =>
  api.post(`/labs/validate-results/${id}`).then((res) => res.data);

export const cancelLabOrder = (id: string) =>
  api.post(`/labs/cancel/${id}`).then((res) => res.data);

export const getPatientLabHistory = (patientId: string) =>
  api.get(`/labs/patient/${patientId}`).then((res) => res.data);
