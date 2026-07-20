import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Clock,
  Loader2,
  Printer,
  History,
  CheckCircle2,
  Receipt
} from "lucide-react";
import { getInvoicesQueue, getInvoiceById, recordPayment, getBillingLedger } from "../../services/api";
import Button from "../../components/ui/Button";

// Fallback Mock Data for Offline/Sandbox Testing
const MOCK_INVOICES = [
  {
    id: "inv_1",
    status: "PENDING",
    totalAmount: 47.50,
    paidAmount: 0.00,
    createdAt: "2026-07-18T15:10:00.000Z",
    patient: { firstName: "Jonathan", lastName: "Carter", id: "pat123", user: { email: "j.carter@hospital.com" } },
    items: [
      { id: "ivi_1", name: "General Consultation Fee", quantity: 1, unitPrice: 20.00, totalPrice: 20.00 },
      { id: "ivi_2", name: "Complete Blood Count (CBC) Test", quantity: 1, unitPrice: 15.00, totalPrice: 15.00 },
      { id: "ivi_3", name: "Amoxil Pediatric (Dispensed Stock)", quantity: 1, unitPrice: 12.50, totalPrice: 12.50 }
    ],
    payments: []
  },
  {
    id: "inv_2",
    status: "PARTIALLY_PAID",
    totalAmount: 30.00,
    paidAmount: 20.00,
    createdAt: "2026-07-18T14:00:00.000Z",
    patient: { firstName: "Alice", lastName: "Smith", id: "pat456", user: { email: "a.smith@hospital.com" } },
    items: [
      { id: "ivi_4", name: "Specialist Consultation Fee", quantity: 1, unitPrice: 30.00, totalPrice: 30.00 }
    ],
    payments: [
      { id: "pay_1", amount: 20.00, method: "CASH", referenceNumber: "REF-101", createdAt: "2026-07-18T14:15:00.000Z" }
    ]
  }
];

const FALLBACK_PAYMENTS = [
  {
    id: "pay_101",
    amount: 20.00,
    method: "CASH",
    referenceNumber: "CASH-9921",
    createdAt: "2026-07-18T14:15:00.000Z",
    cashier: { firstName: "Sarah", lastName: "Jenkins" },
    invoice: { id: "inv_2", totalAmount: 30.00, patient: { firstName: "Alice", lastName: "Smith" } }
  }
];

export const CashierPortal: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pending" | "ledger">("pending");
  const [search, setSearch] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Payment Form States
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Receipt visual trigger
  const [showReceipt, setShowReceipt] = useState(false);

  // Fetch pending Invoices list
  const { data: invoicesResult, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ["cashier-invoices", search],
    queryFn: () => getInvoicesQueue({ status: "PENDING" }).then((res) => {
      // Fetch both pending and partially paid
      return getInvoicesQueue({ status: "PARTIALLY_PAID" }).then((resPartial) => {
        return {
          data: [...res.data, ...resPartial.data]
        };
      });
    }).catch(() => {
      // Offline fallback
      let list = MOCK_INVOICES.filter(i => i.status === "PENDING" || i.status === "PARTIALLY_PAID");
      if (search) {
        list = list.filter(i =>
          i.patient.firstName.toLowerCase().includes(search.toLowerCase()) ||
          i.patient.lastName.toLowerCase().includes(search.toLowerCase())
        );
      }
      return { data: list };
    })
  });

  // Fetch active selected Invoice detailed profile
  const { data: activeInvoice, isLoading: isDetailLoading } = useQuery({
    queryKey: ["cashier-invoice-detail", selectedInvoiceId],
    queryFn: () => {
      if (!selectedInvoiceId) return null;
      return getInvoiceById(selectedInvoiceId).catch(() => {
        return MOCK_INVOICES.find(i => i.id === selectedInvoiceId) || null;
      });
    },
    enabled: !!selectedInvoiceId
  });

  // Fetch Payment collection Ledger
  const { data: ledgerResult, isLoading: isLedgerLoading } = useQuery({
    queryKey: ["cashier-ledger"],
    queryFn: () => getBillingLedger().catch(() => ({
      data: FALLBACK_PAYMENTS
    })),
    enabled: activeTab === "ledger"
  });

  // Payment capture mutation
  const paymentMutation = useMutation({
    mutationFn: (payload: any) => recordPayment(selectedInvoiceId!, payload).catch((err) => {
      console.warn("Offline fallback simulating payment capture:", err);
      const inv = MOCK_INVOICES.find(i => i.id === selectedInvoiceId);
      if (inv) {
        inv.paidAmount += payload.amount;
        inv.status = inv.paidAmount >= inv.totalAmount ? "PAID" : "PARTIALLY_PAID";
        
        const newPay = {
          id: "pay_" + Date.now(),
          amount: payload.amount,
          method: payload.method,
          referenceNumber: payload.referenceNumber || null,
          createdAt: new Date().toISOString()
        };
        inv.payments.push(newPay as any);

        FALLBACK_PAYMENTS.unshift({
          id: newPay.id,
          amount: payload.amount,
          method: payload.method,
          referenceNumber: payload.referenceNumber,
          createdAt: newPay.createdAt,
          cashier: { firstName: "Sarah", lastName: "Jenkins" },
          invoice: { id: inv.id, totalAmount: inv.totalAmount, patient: { firstName: inv.patient.firstName, lastName: inv.patient.lastName } }
        });
      }
      return { success: true };
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-invoice-detail"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-ledger"] });
      setPaymentAmount("");
      setReferenceNumber("");
      setPaymentNotes("");
      setShowReceipt(true);
    }
  });

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice || !paymentAmount) return;

    paymentMutation.mutate({
      amount: Number(paymentAmount),
      method: paymentMethod,
      referenceNumber: referenceNumber || null,
      notes: paymentNotes || null
    });
  };

  const closeReceiptModal = () => {
    setShowReceipt(false);
    setSelectedInvoiceId(null);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* 1. Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            Cashier Billing Portal <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700">POS Console</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Collect patient payments, issue receipts, and track clinical invoicing ledger histories.
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => setActiveTab("pending")}
            className={`py-2 px-4 text-xs font-semibold transition ${
              activeTab === "pending" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Pending Invoices Queue
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-2 px-4 text-xs font-semibold transition ${
              activeTab === "ledger" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Payment Collections Log
          </button>
        </div>
      </div>

      {activeTab === "pending" ? (
        /* 2. Outstanding Invoices Panel layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Outpatient list (col-span-1) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search outstanding bills..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              {isInvoicesLoading ? (
                <div className="p-8 text-center text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                  <p className="text-xs mt-2">Loading bills worklist...</p>
                </div>
              ) : invoicesResult?.data?.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-150">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto" />
                  <p className="text-xs mt-2">All invoice bills are currently cleared!</p>
                </div>
              ) : (
                invoicesResult?.data?.map((inv: any) => {
                  const outstanding = inv.totalAmount - inv.paidAmount;
                  return (
                    <div
                      key={inv.id}
                      onClick={() => { setSelectedInvoiceId(inv.id); setShowReceipt(false); }}
                      className={`p-4 bg-white rounded-xl border transition cursor-pointer shadow-2xs hover:shadow-sm ${
                        selectedInvoiceId === inv.id ? "border-indigo-600 bg-indigo-50/10" : "border-gray-150"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-950 text-sm">{inv.patient.firstName} {inv.patient.lastName}</h4>
                          <span className="text-[9px] text-gray-400 font-mono">Invoice: #{inv.id}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          inv.status === "PENDING" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-50">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {new Date(inv.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-sm font-black text-rose-600">
                          ${outstanding.toFixed(2)} due
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Selected Invoice details (col-span-2) */}
          <div className="lg:col-span-2">
            {!selectedInvoiceId ? (
              <div className="bg-white rounded-2xl border border-gray-150 p-12 text-center text-gray-400 shadow-sm">
                <Receipt className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <h4 className="font-bold text-gray-600">No Patient Invoice Selected</h4>
                <p className="text-xs text-gray-400 mt-1">Select an active bill from the left worklist queue to collect payment.</p>
              </div>
            ) : isDetailLoading || !activeInvoice ? (
              <div className="bg-white rounded-2xl border border-gray-150 p-12 text-center text-gray-400 shadow-sm flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-7 w-7 text-indigo-600 animate-spin" />
                <p className="text-xs">Fetching itemized bill breakdown...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Itemized Charge breakdown */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-lg">Invoice Summary</h3>
                      <p className="text-xs text-gray-500 font-medium">Patient: {activeInvoice.patient.firstName} {activeInvoice.patient.lastName}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-400">ID: {activeInvoice.id}</span>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Itemized Table */}
                    <div className="divide-y divide-gray-100">
                      {activeInvoice.items.map((item: any) => (
                        <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                            <div className="text-gray-400 font-medium">{item.quantity} unit(s) @ ${Number(item.unitPrice).toFixed(2)}</div>
                          </div>
                          <span className="font-black text-gray-800 text-sm">${Number(item.totalPrice).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Financial summary calculations */}
                    <div className="pt-4 border-t border-gray-100 space-y-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                      <div className="flex justify-between items-center">
                        <span>Invoice Total</span>
                        <span className="text-gray-900 text-base font-extrabold">${Number(activeInvoice.totalAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-600">
                        <span>Total Paid</span>
                        <span>-${Number(activeInvoice.paidAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-600 border-t border-gray-50 pt-2 text-sm font-black">
                        <span>Remaining Balance Due</span>
                        <span className="text-lg">${(Number(activeInvoice.totalAmount) - Number(activeInvoice.paidAmount)).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Collection widget form (Only if balance remains) */}
                {Number(activeInvoice.totalAmount) - Number(activeInvoice.paidAmount) > 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <h4 className="text-base font-extrabold text-gray-900">Record Payment Collection</h4>
                    
                    <form onSubmit={handlePaymentSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Payment Method *</label>
                        <select
                          required
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 font-semibold"
                        >
                          <option value="CASH">Cash Payment</option>
                          <option value="CARD">Debit/Credit Card swipe</option>
                          <option value="MOBILE_MONEY">Mobile Money Transfer (M-Pesa)</option>
                          <option value="INSURANCE">Insurance Claim Copay</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Collection Amount *</label>
                          <input
                            type="number"
                            required
                            step="0.01"
                            max={(Number(activeInvoice.totalAmount) - Number(activeInvoice.paidAmount)).toFixed(2)}
                            placeholder="0.00"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-black text-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Reference Code / ID</label>
                          <input
                            type="text"
                            placeholder="e.g. MP-981"
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Collection Note</label>
                        <input
                          type="text"
                          placeholder="Optional notes..."
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="md:col-span-2 flex justify-end">
                        <Button type="submit" disabled={paymentMutation.isPending} className="flex items-center gap-2">
                          {paymentMutation.isPending ? "Recording Payment..." : "Record Payment Collection"}
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 text-center text-emerald-800 font-semibold flex flex-col items-center justify-center gap-2 shadow-xs">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <span>This invoice is fully cleared. Outpatient balance is $0.00.</span>
                    <Button variant="ghost" onClick={() => setShowReceipt(true)} className="mt-2 text-emerald-700 flex items-center gap-1.5 hover:bg-emerald-100/50">
                      <Printer className="h-4 w-4" /> Re-print Receipt
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 3. Payment Collections audit ledger history log */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLedgerLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-medium text-gray-500">Compiling transaction logs...</p>
            </div>
          ) : ledgerResult?.data?.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <History className="h-8 w-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium">No payment collections logged today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Transaction Date</th>
                    <th className="px-6 py-4">Patient Profile</th>
                    <th className="px-6 py-4">Payment Method</th>
                    <th className="px-6 py-4">Reference Code</th>
                    <th className="px-6 py-4">Cashier</th>
                    <th className="px-6 py-4 text-right">Amount Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ledgerResult?.data?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-semibold text-gray-600">
                        {new Date(p.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{p.invoice.patient.firstName} {p.invoice.patient.lastName}</div>
                        <span className="text-[10px] text-gray-400 font-mono">Invoice: #{p.invoice.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          p.method === "CASH" ? "bg-emerald-50 text-emerald-700" :
                          p.method === "CARD" ? "bg-indigo-50 text-indigo-700" : "bg-blue-50 text-blue-700"
                        }`}>
                          {p.method.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-600 font-mono">{p.referenceNumber || "N/A"}</td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {p.cashier?.firstName} {p.cashier?.lastName}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-gray-800 text-base">
                        ${Number(p.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. Receipt Modal Component */}
      {showReceipt && activeInvoice && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 flex flex-col justify-between">
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="text-center border-b border-dashed border-gray-200 pb-4">
                <Receipt className="h-10 w-10 mx-auto text-indigo-600 mb-1" />
                <h3 className="font-extrabold text-gray-900 text-lg">Hospital Cashier Receipt</h3>
                <p className="text-[10px] text-gray-400 font-mono">Date: {new Date().toLocaleString()}</p>
              </div>

              {/* Patient block */}
              <div className="text-xs space-y-1 text-gray-600 font-medium">
                <div><span className="font-bold">Patient:</span> {activeInvoice.patient.firstName} {activeInvoice.patient.lastName}</div>
                <div><span className="font-bold">Chart ID:</span> {activeInvoice.patient.id}</div>
                <div><span className="font-bold">Cashier User:</span> Sarah Jenkins</div>
              </div>

              {/* Items */}
              <div className="border-t border-dashed border-gray-200 py-3 space-y-2">
                {activeInvoice.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">{item.name} (x{item.quantity})</span>
                    <span className="font-bold text-gray-800">${Number(item.totalPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Total calculations */}
              <div className="border-t border-dashed border-gray-200 pt-3 text-xs font-bold text-right text-gray-600 space-y-1">
                <div className="flex justify-between items-center">
                  <span>Grand Total</span>
                  <span className="text-gray-900 text-sm font-extrabold">${Number(activeInvoice.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-600">
                  <span>Amount Paid</span>
                  <span>-${Number(activeInvoice.paidAmount).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] font-bold text-emerald-700 bg-emerald-50 py-2.5 rounded-lg border border-emerald-100 uppercase tracking-wider">
                Transaction Completed • Cleared
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end gap-2 shrink-0">
              <Button variant="ghost" onClick={closeReceiptModal}>Close</Button>
              <Button onClick={() => window.print()} className="flex items-center gap-1.5">
                <Printer className="h-4 w-4" /> Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierPortal;
