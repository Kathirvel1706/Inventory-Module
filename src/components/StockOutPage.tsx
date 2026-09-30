import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldAlert,
  Search,
} from 'lucide-react';
import { getItems, getWarehouses, getStockOutList, createStockOut, getCurrentStock } from '../api/client';
import { StockOutCreateInput } from '../types/inventory';
import { StockImpactPreview } from './StockImpactPreview';

const DEPARTMENTS = [
  'Cutting Floor',
  'Sewing Floor - Line 1',
  'Sewing Floor - Line 2',
  'Sewing Floor - Line 3',
  'Sewing Floor - Line 4',
  'Sampling Department',
  'Finishing & Pressing',
  'Packing & Quality Inspection',
  'Washing & Dyeing Unit'
];

export function StockOutPage() {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [formData, setFormData] = useState<StockOutCreateInput>({
    item_id: 0,
    warehouse_id: 0,
    qty: 0,
    activity_date: todayStr,
    issued_to: 'Cutting Floor',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');

  // Queries
  const { data: items = [] } = useQuery({
    queryKey: ['items', '', '', 'active'],
    queryFn: () => getItems({ is_active: true }),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', '', 'active'],
    queryFn: () => getWarehouses({ is_active: true }),
  });

  const { data: currentStocks = [] } = useQuery({
    queryKey: ['currentStock'],
    queryFn: () => getCurrentStock(),
  });

  const { data: stockOutLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['stockOutList'],
    queryFn: () => getStockOutList({ limit: 100 }),
  });

  // Authoritative Available Quantity for selected (item_id, warehouse_id)
  const currentStockEntry = currentStocks.find(
    (s) => s.item_id === Number(formData.item_id) && s.warehouse_id === Number(formData.warehouse_id)
  );

  const selectedWarehouseObj = warehouses.find((w) => w.id === Number(formData.warehouse_id));
  const availableStock = currentStockEntry ? currentStockEntry.current_quantity : 0;
  const selectedItemObj = items.find((i) => i.id === Number(formData.item_id));
  const reorderLevel = currentStockEntry?.reorder_level || selectedItemObj?.reorder_level || 0;
  const isInsufficientStock = formData.item_id > 0 && formData.warehouse_id > 0 && Number(formData.qty) > availableStock;

  // Mutation
  const stockOutMutation = useMutation({
    mutationFn: createStockOut,
    onSuccess: (tx) => {
      queryClient.invalidateQueries({ queryKey: ['stockOutList'] });
      queryClient.invalidateQueries({ queryKey: ['currentStock'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setSuccessMessage(`Successfully issued ${tx.qty} ${selectedItemObj?.uom || 'units'} to ${tx.issued_to}!`);
      setFormData((prev) => ({
        ...prev,
        qty: 0,
      }));
      setFormErrors({});
      setServerError(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to process Stock Out');
    },
  });

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.item_id || formData.item_id <= 0) {
      errors.item_id = 'Please select a valid material/SKU';
    }
    if (!formData.warehouse_id || formData.warehouse_id <= 0) {
      errors.warehouse_id = 'Please select an issuing storage location';
    }
    const enteredQty = Number(formData.qty);
    if (isNaN(enteredQty) || enteredQty <= 0) {
      errors.qty = 'Quantity must be strictly greater than zero';
    } else if (enteredQty > availableStock) {
      errors.qty = `Insufficient Stock! Available: ${availableStock.toLocaleString()} ${selectedItemObj?.uom || 'units'}, Requested: ${enteredQty.toLocaleString()} ${selectedItemObj?.uom || 'units'}.`;
    }
    if (!formData.activity_date) {
      errors.activity_date = 'Activity date is required';
    }
    if (!formData.issued_to.trim()) {
      errors.issued_to = 'Issuing department is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleQtyChange = (val: string) => {
    const parsed = parseFloat(val) || 0;
    setFormData((prev) => ({ ...prev, qty: parsed }));
    if (formData.item_id > 0 && formData.warehouse_id > 0 && parsed > availableStock) {
      setFormErrors((prev) => ({
        ...prev,
        qty: `Insufficient Stock: Cannot issue ${parsed.toLocaleString()} units when only ${availableStock.toLocaleString()} units are available.`,
      }));
    } else {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.qty;
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;
    stockOutMutation.mutate({
      item_id: Number(formData.item_id),
      warehouse_id: Number(formData.warehouse_id),
      qty: Number(formData.qty),
      activity_date: formData.activity_date,
      issued_to: formData.issued_to.trim(),
    });
  };

  const filteredLogs = stockOutLogs.filter((tx) => {
    if (!historySearch.trim()) return true;
    const s = historySearch.toLowerCase();
    return (
      (tx.item_code && tx.item_code.toLowerCase().includes(s)) ||
      (tx.item_name && tx.item_name.toLowerCase().includes(s)) ||
      (tx.warehouse_name && tx.warehouse_name.toLowerCase().includes(s)) ||
      (tx.issued_to && tx.issued_to.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Toast Feedback */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 rounded-2xl shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Main Grid: Form on Left (5 cols), Ledger on Right (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Issue Form Card */}
        <div className="lg:col-span-5 bg-[#0c162c] border border-[#162646] p-6 rounded-2xl shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-[#162646]">
            <div className="w-10 h-10 rounded-xl bg-rose-950/80 text-rose-400 flex items-center justify-center font-bold border border-rose-800/40">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">Stock Out Issue Entry</h3>
              <p className="text-xs text-slate-400 mt-0.5">Dispatch materials to production departments</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {serverError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Select Item */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Select Material / SKU <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.item_id}
                onChange={(e) => setFormData({ ...formData, item_id: Number(e.target.value) })}
                className={`w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border rounded-xl text-white focus:outline-none focus:border-blue-500 cursor-pointer ${
                  formErrors.item_id ? 'border-rose-500' : 'border-[#162646]'
                }`}
              >
                <option value={0}>-- Select Material / SKU --</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    [{it.code}] {it.name} ({it.category} - {it.uom})
                  </option>
                ))}
              </select>
              {formErrors.item_id && <p className="text-[11px] text-rose-400 mt-1 font-medium">{formErrors.item_id}</p>}
            </div>

            {/* Select Warehouse */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Issuing Storage Location <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: Number(e.target.value) })}
                className={`w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border rounded-xl text-white focus:outline-none focus:border-blue-500 cursor-pointer ${
                  formErrors.warehouse_id ? 'border-rose-500' : 'border-[#162646]'
                }`}
              >
                <option value={0}>-- Select Source Storage --</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.location})
                  </option>
                ))}
              </select>
              {formErrors.warehouse_id && <p className="text-[11px] text-rose-400 mt-1 font-medium">{formErrors.warehouse_id}</p>}
            </div>

            {/* Quantity */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-400">
                  Issue Quantity {selectedItemObj ? `(${selectedItemObj.uom})` : ''} <span className="text-rose-400">*</span>
                </label>
                {formData.item_id > 0 && formData.warehouse_id > 0 && availableStock > 0 && (
                  <button
                    type="button"
                    onClick={() => handleQtyChange(String(availableStock))}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                  >
                    Max Available ({availableStock.toLocaleString()} {selectedItemObj?.uom})
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 150"
                value={formData.qty || ''}
                onChange={(e) => handleQtyChange(e.target.value)}
                className={`w-full px-3.5 py-2 text-xs font-mono font-bold bg-[#081224] border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${
                  formErrors.qty ? 'border-rose-500' : 'border-[#162646]'
                }`}
              />
              {formErrors.qty && <p className="text-[11px] text-rose-400 mt-1 font-medium">{formErrors.qty}</p>}
            </div>

            {/* Live Dynamic Stock Impact Preview */}
            <StockImpactPreview
              mode="out"
              currentStock={availableStock}
              deltaQty={Number(formData.qty) || 0}
              uom={selectedItemObj?.uom || 'units'}
              reorderLevel={reorderLevel}
              itemName={selectedItemObj?.name}
              itemCode={selectedItemObj?.code}
              warehouseName={selectedWarehouseObj?.name}
              isConfigured={formData.item_id > 0 && formData.warehouse_id > 0}
            />

            {/* Department / Issued To */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Issued To Department / Floor <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.issued_to}
                onChange={(e) => setFormData({ ...formData, issued_to: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {formErrors.issued_to && <p className="text-[11px] text-rose-400 mt-1 font-medium">{formErrors.issued_to}</p>}
            </div>

            {/* Activity Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Activity Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={formData.activity_date}
                onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={
                stockOutMutation.isPending || 
                !formData.item_id || 
                !formData.warehouse_id || 
                !formData.qty || 
                formData.qty <= 0 || 
                formData.qty > availableStock
              }
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white rounded-xl shadow-sm transition-all mt-2 cursor-pointer ${
                isInsufficientStock
                  ? 'bg-rose-600 hover:bg-rose-700 opacity-90 cursor-not-allowed'
                  : 'bg-[#2563eb] hover:bg-blue-600 disabled:opacity-50'
              }`}
            >
              {stockOutMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isInsufficientStock ? (
                <ShieldAlert className="w-4 h-4" />
              ) : (
                <ArrowUpRight className="w-4 h-4" />
              )}
              <span>
                {isInsufficientStock
                  ? 'Insufficient Stock — Submission Blocked'
                  : 'Record Stock Out Issue'}
              </span>
            </button>
          </form>
        </div>

        {/* Recent Transactions Table Card */}
        <div className="lg:col-span-7 bg-[#0c162c] rounded-2xl border border-[#162646] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#162646] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#081224]/80">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wide">Production Issues Ledger</h3>
            </div>

            {/* Quick history search */}
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0c162c] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#081224]/50 text-slate-400 font-medium border-b border-[#162646]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Item Code</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4 text-right">Issued Qty</th>
                  <th className="py-3 px-4">Issued To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#13223f]/50 text-slate-300">
                {logsLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading issue history...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No stock-out issues recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#101e38]/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {tx.activity_date}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-400">{tx.item_code}</span>
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{tx.item_name}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {tx.warehouse_name}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                        -{Number(tx.qty).toLocaleString()} {tx.item_uom}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#081224] border border-[#162646] text-[11px]">
                          {tx.issued_to}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
