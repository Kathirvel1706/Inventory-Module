import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  ArrowDownLeft, 
  Calendar, 
  Building2, 
  Clock, 
  ChevronRight,
  DollarSign
} from 'lucide-react';
import { getPurchaseOrders, createPurchaseOrder, receivePurchaseOrder, autoGenerateReorderPO, getSuppliers, getWarehouses, getItems } from '../api/client';
import { PurchaseOrder, POLineItem } from '../types/inventory';

export function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split('T')[0];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Form State
  const [supplierId, setSupplierId] = useState<number>(1);
  const [warehouseId, setWarehouseId] = useState<number>(1);
  const [orderDate, setOrderDate] = useState(todayStr);
  const [expectedDate, setExpectedDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<POLineItem[]>([
    { item_id: 0, item_code: '', item_name: '', uom: '', order_qty: 100, unit_cost: 0, received_qty: 0 }
  ]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Queries
  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => getPurchaseOrders(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => getSuppliers(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => getWarehouses({ is_active: true }),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items', '', '', 'active'],
    queryFn: () => getItems({ is_active: true }),
  });

  // Mutations
  const createPOMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: (newPO) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setIsModalOpen(false);
      resetForm();
      setSuccessMessage(`Purchase Order ${newPO.po_number} created successfully for $${newPO.total_amount.toLocaleString()}!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to create PO');
    }
  });

  // 1-Click Receive PO Mutation
  const receiveMutation = useMutation({
    mutationFn: (poId: number) => receivePurchaseOrder(poId),
    onSuccess: (updatedPO) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['currentStock'] });
      queryClient.invalidateQueries({ queryKey: ['stockInList'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setSuccessMessage(`PO ${updatedPO.po_number} successfully received into ${updatedPO.warehouse_name}! Stock In recorded.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      alert(`Error receiving PO: ${err.message}`);
    }
  });

  // Auto-Generate Reorder PO Mutation
  const autoReorderMutation = useMutation({
    mutationFn: () => autoGenerateReorderPO(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['currentStock'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setSuccessMessage(data.po 
        ? `Replenishment PO ${data.po.po_number} automatically drafted for ${data.po.items.length} low-stock SKUs!`
        : data.message || 'Stock levels checked.'
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      alert(`Replenishment failed: ${err.message}`);
    }
  });

  const resetForm = () => {
    setNotes('');
    setLineItems([{ item_id: 0, item_code: '', item_name: '', uom: '', order_qty: 100, unit_cost: 0, received_qty: 0 }]);
    setServerError(null);
  };

  const handleLineItemChange = (index: number, field: keyof POLineItem, value: any) => {
    const updated = [...lineItems];
    if (field === 'item_id') {
      const selected = items.find(i => i.id === Number(value));
      updated[index] = {
        ...updated[index],
        item_id: Number(value),
        item_code: selected?.code || '',
        item_name: selected?.name || '',
        uom: selected?.uom || '',
        unit_cost: selected ? Number(selected.unit_cost) : 0,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { item_id: 0, item_code: '', item_name: '', uom: '', order_qty: 100, unit_cost: 0, received_qty: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validLines = lineItems.filter(l => l.item_id > 0 && l.order_qty > 0);
    if (validLines.length === 0) {
      setServerError('Please select at least one item with quantity > 0');
      return;
    }

    createPOMutation.mutate({
      supplier_id: supplierId,
      warehouse_id: warehouseId,
      order_date: orderDate,
      expected_date: expectedDate,
      items: validLines,
      notes: notes.trim() || undefined
    });
  };

  const filteredPOs = purchaseOrders.filter((po) => {
    if (statusFilter && po.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      po.po_number.toLowerCase().includes(s) ||
      po.supplier_name.toLowerCase().includes(s) ||
      po.warehouse_name.toLowerCase().includes(s)
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

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0c162c] p-5 rounded-2xl border border-[#162646] shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[260px] flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search PO number, textile supplier, warehouse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All PO Statuses</option>
            <option value="Sent">Sent / Pending</option>
            <option value="Partially Received">Partially Received</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-[#0c162c] border border-[#162646] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#081224]/80 border-b border-[#162646] text-slate-400 font-medium">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Receiving Warehouse</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Expected Date</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#13223f]/50 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Loading purchase orders...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShoppingBag className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-300">No purchase orders found</p>
                      <p className="text-xs text-slate-500">Create a purchase order or run auto-generate for low-stock items.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-[#101e38]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                      {po.po_number}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-white">
                      {po.supplier_name}
                      <div className="text-[11px] text-slate-400 font-normal">
                        {po.items.length} line item(s)
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                      {po.warehouse_name}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {po.order_date}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {po.expected_date}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      ₹{Math.round(po.total_amount).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        po.status === 'Completed' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' :
                        po.status === 'Partially Received' ? 'bg-blue-950/60 text-blue-400 border-blue-800/40' :
                        'bg-amber-950/60 text-amber-400 border-amber-800/40'
                      }`}>
                        {po.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      {po.status !== 'Completed' && (
                        <button
                          onClick={() => receiveMutation.mutate(po.id)}
                          disabled={receiveMutation.isPending}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                          title="1-Click Auto-Receive items directly into Stock In and update inventory"
                        >
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>Auto-Receive</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedPO(po)}
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#0c162c] rounded-2xl max-w-2xl w-full shadow-2xl border border-[#162646] overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#162646] bg-[#081224]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#142343] text-blue-400 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Create Procurement Purchase Order</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {serverError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800/80 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{serverError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Textile Supplier <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.code}] {s.name} ({s.materials_supplied})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Receiving Warehouse <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Order Date
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Expected Delivery Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Items Line Table */}
              <div className="pt-2 border-t border-[#162646] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Order Materials
                  </span>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    + Add Material Line
                  </button>
                </div>

                {lineItems.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-[#081224] rounded-xl border border-[#162646]">
                    <select
                      value={line.item_id}
                      onChange={(e) => handleLineItemChange(idx, 'item_id', e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-[#0c162c] border border-[#162646] rounded-lg text-white focus:outline-none"
                    >
                      <option value={0}>-- Select Material --</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          [{it.code}] {it.name} ({it.category} - {it.uom})
                        </option>
                      ))}
                    </select>

                    <div className="w-24">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        placeholder="Qty"
                        value={line.order_qty || ''}
                        onChange={(e) => handleLineItemChange(idx, 'order_qty', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 text-xs bg-[#0c162c] border border-[#162646] rounded-lg text-white focus:outline-none font-mono"
                      />
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Cost (₹)"
                        value={line.unit_cost || ''}
                        onChange={(e) => handleLineItemChange(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 text-xs bg-[#0c162c] border border-[#162646] rounded-lg text-white focus:outline-none font-mono"
                      />
                    </div>

                    <div className="w-24 text-right font-mono text-xs font-bold text-white pr-1">
                      ₹{(line.order_qty * line.unit_cost).toFixed(2)}
                    </div>

                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Procurement Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Export order SS26 fabric replenishment, batch lab dip approved"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#162646]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPOMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-600 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {createPOMutation.isPending && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Submit Purchase Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Details Modal */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0c162c] rounded-2xl max-w-lg w-full shadow-2xl border border-[#162646] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#162646] bg-[#081224]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">PO Details: {selectedPO.po_number}</h3>
              </div>
              <button onClick={() => setSelectedPO(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-4 pb-2 border-b border-[#162646]">
                <div>
                  <span className="text-slate-400 block">Supplier:</span>
                  <span className="font-semibold text-white text-sm">{selectedPO.supplier_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Status:</span>
                  <span className="font-bold text-blue-400">{selectedPO.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-2 border-b border-[#162646]">
                <div>
                  <span className="text-slate-400 block">Warehouse:</span>
                  <span>{selectedPO.warehouse_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Expected Arrival:</span>
                  <span className="font-mono">{selectedPO.expected_date}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Ordered Line Items:</span>
                <table className="w-full text-left border border-[#162646] rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-[#081224] text-[11px] text-slate-400 border-b border-[#162646]">
                      <th className="p-2">Material</th>
                      <th className="p-2 text-right">Ordered</th>
                      <th className="p-2 text-right">Received</th>
                      <th className="p-2 text-right">Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#162646]">
                    {selectedPO.items.map((it, i) => (
                      <tr key={i}>
                        <td className="p-2 font-mono font-bold text-blue-400">
                          {it.item_code}
                          <div className="font-sans font-normal text-slate-400 text-[11px]">{it.item_name}</div>
                        </td>
                        <td className="p-2 text-right font-mono font-semibold">{it.order_qty} {it.uom}</td>
                        <td className="p-2 text-right font-mono font-semibold text-emerald-400">{it.received_qty} {it.uom}</td>
                        <td className="p-2 text-right font-mono">₹{it.unit_cost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedPO.notes && (
                <div className="p-3 bg-[#081224] rounded-xl border border-[#162646] text-slate-300">
                  <span className="font-semibold text-white">Notes:</span> {selectedPO.notes}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-[#081224] border-t border-[#162646] flex justify-end gap-2">
              <button
                onClick={() => setSelectedPO(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-300 bg-[#0c162c] border border-[#162646] rounded-xl hover:border-slate-500 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
