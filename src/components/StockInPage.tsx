import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowDownLeft, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search,
} from 'lucide-react';
import { getItems, getWarehouses, getStockInList, createStockIn, getCurrentStock } from '../api/client';
import { StockInCreateInput } from '../types/inventory';
import { StockImpactPreview } from './StockImpactPreview';

export function StockInPage() {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [formData, setFormData] = useState<StockInCreateInput>({
    item_id: 0,
    warehouse_id: 0,
    qty: 0,
    activity_date: todayStr,
    supplier_reference: '',
    unit_cost: 0,
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

  const { data: stockInLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['stockInList'],
    queryFn: () => getStockInList({ limit: 100 }),
  });

  const selectedItemObj = items.find((i) => i.id === Number(formData.item_id));
  const selectedWarehouseObj = warehouses.find((w) => w.id === Number(formData.warehouse_id));
  const currentStockEntry = currentStocks.find(
    (s) => s.item_id === Number(formData.item_id) && s.warehouse_id === Number(formData.warehouse_id)
  );
  const currentStockQty = currentStockEntry ? currentStockEntry.current_quantity : 0;
  const reorderLevel = currentStockEntry?.reorder_level || selectedItemObj?.reorder_level || 0;

  const handleItemChange = (itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    setFormData((prev) => ({
      ...prev,
      item_id: itemId,
      unit_cost: item ? Number(item.unit_cost) : prev.unit_cost,
    }));
  };

  const stockInMutation = useMutation({
    mutationFn: createStockIn,
    onSuccess: (tx) => {
      queryClient.invalidateQueries({ queryKey: ['stockInList'] });
      queryClient.invalidateQueries({ queryKey: ['currentStock'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setSuccessMessage(`Successfully received ${tx.qty} ${selectedItemObj?.uom || 'units'} into ${tx.warehouse_name || 'warehouse'}!`);
      setFormData((prev) => ({
        ...prev,
        qty: 0,
        supplier_reference: '',
      }));
      setFormErrors({});
      setServerError(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to record Stock In receipt');
    },
  });

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.item_id || formData.item_id <= 0) {
      errors.item_id = 'Please select a valid material/SKU';
    }
    if (!formData.warehouse_id || formData.warehouse_id <= 0) {
      errors.warehouse_id = 'Please select a receiving storage location';
    }
    if (isNaN(Number(formData.qty)) || Number(formData.qty) <= 0) {
      errors.qty = 'Quantity must be strictly greater than zero';
    }
    if (!formData.activity_date) {
      errors.activity_date = 'Activity date is required';
    }
    if (isNaN(Number(formData.unit_cost)) || Number(formData.unit_cost) < 0) {
      errors.unit_cost = 'Unit cost must be non-negative';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;
    stockInMutation.mutate({
      ...formData,
      item_id: Number(formData.item_id),
      warehouse_id: Number(formData.warehouse_id),
      qty: Number(formData.qty),
      unit_cost: Number(formData.unit_cost),
    });
  };

  const filteredLogs = stockInLogs.filter((tx) => {
    if (!historySearch.trim()) return true;
    const s = historySearch.toLowerCase();
    return (
      (tx.item_code && tx.item_code.toLowerCase().includes(s)) ||
      (tx.item_name && tx.item_name.toLowerCase().includes(s)) ||
      (tx.warehouse_name && tx.warehouse_name.toLowerCase().includes(s)) ||
      (tx.supplier_reference && tx.supplier_reference.toLowerCase().includes(s))
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
        {/* Entry Form Card */}
        <div className="lg:col-span-5 bg-[#0c162c] border border-[#162646] p-6 rounded-2xl shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-[#162646]">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center font-bold border border-emerald-800/40">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">Inward Stock In Entry</h3>
              <p className="text-xs text-slate-400 mt-0.5">Record incoming raw materials & trims</p>
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
                onChange={(e) => handleItemChange(Number(e.target.value))}
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
                Receiving Storage Location <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: Number(e.target.value) })}
                className={`w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border rounded-xl text-white focus:outline-none focus:border-blue-500 cursor-pointer ${
                  formErrors.warehouse_id ? 'border-rose-500' : 'border-[#162646]'
                }`}
              >
                <option value={0}>-- Select Receiving Storage --</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.location})
                  </option>
                ))}
              </select>
              {formErrors.warehouse_id && <p className="text-[11px] text-rose-400 mt-1 font-medium">{formErrors.warehouse_id}</p>}
            </div>

            {/* Quantity and Unit Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Received Qty {selectedItemObj ? `(${selectedItemObj.uom})` : ''} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 500"
                  value={formData.qty || ''}
                  onChange={(e) => setFormData({ ...formData, qty: parseFloat(e.target.value) || 0 })}
                  className={`w-full px-3.5 py-2 text-xs font-mono font-bold bg-[#081224] border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${
                    formErrors.qty ? 'border-rose-500' : 'border-[#162646]'
                  }`}
                />
                {formErrors.qty && <p className="text-[11px] text-rose-400 mt-1 font-medium">{formErrors.qty}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Unit Cost (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 185.00"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                  className={`w-full px-3.5 py-2 text-xs font-mono font-bold bg-[#081224] border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${
                    formErrors.unit_cost ? 'border-rose-500' : 'border-[#162646]'
                  }`}
                />
                {formErrors.unit_cost && <p className="text-[11px] text-rose-400 mt-1 font-medium">{formErrors.unit_cost}</p>}
              </div>
            </div>

            {/* Live Dynamic Stock Impact Preview */}
            <StockImpactPreview
              mode="in"
              currentStock={currentStockQty}
              deltaQty={Number(formData.qty) || 0}
              uom={selectedItemObj?.uom || 'units'}
              reorderLevel={reorderLevel}
              itemName={selectedItemObj?.name}
              itemCode={selectedItemObj?.code}
              warehouseName={selectedWarehouseObj?.name}
              isConfigured={formData.item_id > 0 && formData.warehouse_id > 0}
            />

            {/* Total Value Preview */}
            {formData.qty > 0 && formData.unit_cost > 0 && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-medium">Receipt Line Valuation:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  ₹{(formData.qty * formData.unit_cost).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Activity Date and Supplier Ref */}
            <div className="grid grid-cols-2 gap-3">
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

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Supplier / PO Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vardhman PO-9812"
                  value={formData.supplier_reference}
                  onChange={(e) => setFormData({ ...formData, supplier_reference: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={stockInMutation.isPending || !formData.item_id || !formData.warehouse_id || !formData.qty || formData.qty <= 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {stockInMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Record Stock In Receipt</span>
            </button>
          </form>
        </div>

        {/* Recent Transactions Table Card */}
        <div className="lg:col-span-7 bg-[#0c162c] rounded-2xl border border-[#162646] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#162646] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#081224]/80">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wide">Inward Receipts Ledger</h3>
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
                  <th className="py-3 px-4 text-right">Received Qty</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4">Supplier PO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#13223f]/50 text-slate-300">
                {logsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading receipt history...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No stock-in receipts recorded yet.
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
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        +{Number(tx.qty).toLocaleString()} {tx.item_uom}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">
                        ₹{Number(tx.unit_cost).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-[120px]">
                        {tx.supplier_reference || '—'}
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
