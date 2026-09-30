import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Truck, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Printer, 
  MapPin, 
  Calendar, 
  Package, 
  ArrowUpRight,
  FileText,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { getDispatches, createDispatch, updateDispatchStatus, getWarehouses, getCurrentStock } from '../api/client';
import { DispatchRecord, DispatchLineItem } from '../types/inventory';

const CARRIERS = [
  'Maersk Sealand Ocean Line',
  'MSC Mediterranean Shipping',
  'CMA CGM Global Logistics',
  'DHL Global Forwarding (Air)',
  'FedEx International Freight',
  'Internal Plant Shuttle Truck'
];

export function DispatchPage() {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split('T')[0];

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingGatePass, setViewingGatePass] = useState<DispatchRecord | null>(null);

  // Form State
  const [buyerName, setBuyerName] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [warehouseId, setWarehouseId] = useState<number>(1);
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [destination, setDestination] = useState('');
  const [dispatchDate, setDispatchDate] = useState(todayStr);
  const [remarks, setRemarks] = useState('');
  const [lineItems, setLineItems] = useState<DispatchLineItem[]>([
    { item_id: 0, item_code: '', item_name: '', uom: '', qty: 0 }
  ]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Queries
  const { data: dispatches = [], isLoading } = useQuery({
    queryKey: ['dispatches'],
    queryFn: () => getDispatches(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => getWarehouses({ is_active: true }),
  });

  const { data: currentStocks = [] } = useQuery({
    queryKey: ['currentStock'],
    queryFn: () => getCurrentStock(),
  });

  // Filter available items in selected warehouse with stock > 0
  const availableItemsInWarehouse = currentStocks.filter(
    (s) => s.warehouse_id === warehouseId && s.current_quantity > 0
  );

  // Mutations
  const createDispatchMutation = useMutation({
    mutationFn: createDispatch,
    onSuccess: (newDsp) => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['currentStock'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setIsModalOpen(false);
      resetForm();
      setSuccessMessage(`Consignment ${newDsp.dispatch_no} dispatched successfully! Gate Pass: ${newDsp.gate_pass_no}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to dispatch shipment');
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: DispatchRecord['status'] }) => 
      updateDispatchStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    }
  });

  const resetForm = () => {
    setBuyerName('');
    setOrderRef('');
    setDestination('');
    setRemarks('');
    setLineItems([{ item_id: 0, item_code: '', item_name: '', uom: '', qty: 0 }]);
    setServerError(null);
  };

  const handleLineItemChange = (index: number, field: keyof DispatchLineItem, value: any) => {
    const updated = [...lineItems];
    if (field === 'item_id') {
      const selected = availableItemsInWarehouse.find(i => i.item_id === Number(value));
      updated[index] = {
        ...updated[index],
        item_id: Number(value),
        item_code: selected?.item_code || '',
        item_name: selected?.item_name || '',
        uom: selected?.uom || '',
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { item_id: 0, item_code: '', item_name: '', uom: '', qty: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!buyerName.trim()) {
      setServerError('Buyer name is required');
      return;
    }
    if (!orderRef.trim()) {
      setServerError('Order reference is required');
      return;
    }
    if (!destination.trim()) {
      setServerError('Destination port / location is required');
      return;
    }

    const validLines = lineItems.filter(l => l.item_id > 0 && l.qty > 0);
    if (validLines.length === 0) {
      setServerError('Please select at least one material with quantity > 0');
      return;
    }

    createDispatchMutation.mutate({
      buyer_name: buyerName.trim(),
      order_ref: orderRef.trim(),
      warehouse_id: warehouseId,
      carrier,
      destination: destination.trim(),
      dispatch_date: dispatchDate,
      items: validLines,
      remarks: remarks.trim() || undefined
    });
  };

  const filteredDispatches = dispatches.filter((dsp) => {
    if (selectedStatus && dsp.status !== selectedStatus) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      dsp.dispatch_no.toLowerCase().includes(s) ||
      dsp.buyer_name.toLowerCase().includes(s) ||
      dsp.order_ref.toLowerCase().includes(s) ||
      dsp.gate_pass_no.toLowerCase().includes(s) ||
      dsp.carrier.toLowerCase().includes(s)
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
              placeholder="Search dispatch no, buyer, order ref, gate pass..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Shipping Statuses</option>
            <option value="Prepared">Prepared</option>
            <option value="Dispatched">Dispatched</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-600 rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Export Dispatch</span>
        </button>
      </div>

      {/* Dispatches List */}
      <div className="bg-[#0c162c] border border-[#162646] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#081224]/80 border-b border-[#162646] text-slate-400 font-medium">
                <th className="py-3 px-4">Dispatch No</th>
                <th className="py-3 px-4">Buyer / Consignee</th>
                <th className="py-3 px-4">Order / Style Ref</th>
                <th className="py-3 px-4">Carrier & Tracking</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#13223f]/50 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Loading shipping dispatches...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Truck className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-300">No export dispatches recorded</p>
                      <p className="text-xs text-slate-500">Create a new dispatch consignment to ship finished goods or fabric transfers.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((dsp) => (
                  <tr key={dsp.id} className="hover:bg-[#101e38]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-blue-400">{dsp.dispatch_no}</span>
                      <div className="text-[11px] font-mono text-slate-400">{dsp.gate_pass_no}</div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-white">
                      {dsp.buyer_name}
                      <div className="text-[11px] text-slate-400 font-normal">
                        Shipped from: {dsp.warehouse_name}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      {dsp.order_ref}
                      <div className="text-[11px] text-slate-400 font-sans">
                        {dsp.items.length} line item(s)
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-medium text-slate-300">{dsp.carrier}</div>
                      <div className="font-mono text-slate-400 text-[11px]">{dsp.tracking_number}</div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>{dsp.destination}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{dsp.dispatch_date}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={dsp.status}
                        onChange={(e) => statusMutation.mutate({ id: dsp.id, status: e.target.value as any })}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border focus:outline-none cursor-pointer ${
                          dsp.status === 'Delivered' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' :
                          dsp.status === 'In Transit' ? 'bg-blue-950/60 text-blue-400 border-blue-800/40' :
                          dsp.status === 'Dispatched' ? 'bg-purple-950/60 text-purple-400 border-purple-800/40' :
                          'bg-amber-950/60 text-amber-400 border-amber-800/40'
                        }`}
                      >
                        <option value="Prepared">Prepared</option>
                        <option value="Dispatched">Dispatched</option>
                        <option value="In Transit">In Transit</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setViewingGatePass(dsp)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-300 bg-[#081224] hover:bg-[#142343] border border-[#162646] rounded-xl transition-colors cursor-pointer"
                      >
                        <Printer className="w-3 h-3 text-slate-400" />
                        <span>Gate Pass</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dispatch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#0c162c] rounded-2xl max-w-2xl w-full shadow-2xl border border-[#162646] overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#162646] bg-[#081224]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#142343] text-blue-400 flex items-center justify-center font-bold">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">New Export Dispatch & Gate Pass</h3>
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
                    Buyer / Consignee <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. H&M Global Sourcing, Stockholm"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Order / Style Ref <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. STYLE-9921 / ORDER-554"
                    value={orderRef}
                    onChange={(e) => setOrderRef(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Dispatch Warehouse <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Carrier / Line
                  </label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {CARRIERS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Dispatch Date
                  </label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Destination Port / Hub <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rotterdam Port, Netherlands or Unit 2 Hub"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Line Items Table */}
              <div className="pt-2 border-t border-[#162646] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Consignment Materials (Deducted from Warehouse)
                  </span>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    + Add Material
                  </button>
                </div>

                {lineItems.map((line, idx) => {
                  const selectedStock = availableItemsInWarehouse.find(i => i.item_id === line.item_id);
                  const maxQty = selectedStock ? selectedStock.current_quantity : 0;

                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-[#081224] rounded-xl border border-[#162646]">
                      <select
                        value={line.item_id}
                        onChange={(e) => handleLineItemChange(idx, 'item_id', e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-[#0c162c] border border-[#162646] rounded-lg text-white focus:outline-none"
                      >
                        <option value={0}>-- Select Material --</option>
                        {availableItemsInWarehouse.map((item) => (
                          <option key={item.item_id} value={item.item_id}>
                            [{item.item_code}] {item.item_name} (Avail: {item.current_quantity} {item.uom})
                          </option>
                        ))}
                      </select>

                      <div className="w-28">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={maxQty}
                          placeholder={`Qty (${line.uom || 'units'})`}
                          value={line.qty || ''}
                          onChange={(e) => handleLineItemChange(idx, 'qty', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 text-xs bg-[#0c162c] border border-[#162646] rounded-lg text-white focus:outline-none font-mono"
                        />
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
                  );
                })}
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
                  disabled={createDispatchMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-600 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {createDispatchMutation.isPending && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Authorize & Dispatch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Gate Pass Modal */}
      {viewingGatePass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0c162c] rounded-2xl max-w-lg w-full shadow-2xl border border-[#162646] overflow-hidden">
            <div className="p-6 border-b border-[#162646] bg-[#081224] text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">MATERIAL DISPATCH GATE PASS</h3>
                <p className="text-xs text-slate-400">TEX-EXPORT ENTERPRISE ERP</p>
              </div>
              <button onClick={() => setViewingGatePass(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-[#162646]">
                <div>
                  <span className="text-slate-400 block">Gate Pass No:</span>
                  <span className="font-mono font-bold text-white text-sm">{viewingGatePass.gate_pass_no}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Dispatch Ref:</span>
                  <span className="font-mono font-bold text-blue-400 text-sm">{viewingGatePass.dispatch_no}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-[#162646]">
                <div>
                  <span className="text-slate-400 block">Buyer / Consignee:</span>
                  <span className="font-semibold text-white">{viewingGatePass.buyer_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Order Ref:</span>
                  <span className="font-mono font-medium">{viewingGatePass.order_ref}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-[#162646]">
                <div>
                  <span className="text-slate-400 block">Shipping Carrier:</span>
                  <span>{viewingGatePass.carrier}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Tracking / B/L No:</span>
                  <span className="font-mono">{viewingGatePass.tracking_number}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Dispatched Materials:</span>
                <table className="w-full text-left border border-[#162646] rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-[#081224] text-[11px] text-slate-400 border-b border-[#162646]">
                      <th className="p-2">Item Code</th>
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#162646]">
                    {viewingGatePass.items.map((it, i) => (
                      <tr key={i}>
                        <td className="p-2 font-mono font-bold text-blue-400">{it.item_code}</td>
                        <td className="p-2">{it.item_name}</td>
                        <td className="p-2 text-right font-mono font-bold">{it.qty} {it.uom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 flex justify-between text-[11px] text-slate-500">
                <div>Authorized Storekeeper: ______________</div>
                <div>Gate Security Officer: ______________</div>
              </div>
            </div>

            <div className="px-6 py-3 bg-[#081224] border-t border-[#162646] flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#2563eb] rounded-xl hover:bg-blue-600 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Gate Pass</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
