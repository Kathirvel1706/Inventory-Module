import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  AlertTriangle, 
  Sparkles, 
  ArrowDownLeft, 
  ShoppingBag, 
  Search, 
  CheckCircle2, 
  ShieldAlert, 
  Layers,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { getCurrentStock, autoGenerateReorderPO } from '../api/client';
import { CurrentStockItem } from '../types/inventory';
import { HealthStatusBadge } from './HealthStatusBadge';

export function StockAlertsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<'all' | 'low' | 'healthy'>('low');
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const { data: stockItems = [], isLoading } = useQuery({
    queryKey: ['currentStock'],
    queryFn: () => getCurrentStock(),
  });

  const reorderMutation = useMutation({
    mutationFn: () => autoGenerateReorderPO(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['currentStock'] });
      setNotification(data.po 
        ? `Purchase Order ${data.po.po_number} automatically drafted for ${data.po.items.length} materials!`
        : data.message || 'All stock levels healthy!'
      );
      setTimeout(() => setNotification(null), 5000);
    }
  });

  const lowStockList = stockItems.filter(i => i.is_low_stock);
  const outOfStockList = stockItems.filter(i => i.current_quantity <= 0);

  const filteredItems = stockItems.filter((item) => {
    if (filterType === 'low' && !item.is_low_stock) return false;
    if (filterType === 'healthy' && item.is_low_stock) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      item.item_code.toLowerCase().includes(s) ||
      item.item_name.toLowerCase().includes(s) ||
      item.category.toLowerCase().includes(s) ||
      item.warehouse_name.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Toast Feedback */}
      {notification && (
        <div className="flex items-center gap-3 p-4 bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 rounded-2xl shadow-sm">
          <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{notification}</span>
        </div>
      )}

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0c162c] p-5 rounded-2xl border border-[#162646] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Stock Positions</div>
            <div className="text-2xl font-mono font-bold text-white mt-1">{stockItems.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#142343] flex items-center justify-center text-blue-400 font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0c162c] p-5 rounded-2xl border border-rose-800/40 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-rose-400 font-semibold uppercase tracking-wider">Low Stock Warnings</div>
            <div className="text-2xl font-mono font-bold text-rose-400 mt-1">{lowStockList.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-950/80 text-rose-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0c162c] p-5 rounded-2xl border border-emerald-800/40 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Healthy Stock Level</div>
            <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">{stockItems.length - lowStockList.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0c162c] p-5 rounded-2xl border border-[#162646] shadow-sm">
        <div className="relative min-w-[280px] flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search material code, name, warehouse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#081224] rounded-xl border border-[#162646]">
          <button
            onClick={() => setFilterType('low')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'low' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Low Stock Alerts ({lowStockList.length})
          </button>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'all' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Items ({stockItems.length})
          </button>
          <button
            onClick={() => setFilterType('healthy')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterType === 'healthy' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Healthy Only
          </button>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-[#0c162c] border border-[#162646] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#081224]/80 border-b border-[#162646] text-slate-400 font-medium">
                <th className="py-3 px-4">Material SKU</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Reorder Threshold</th>
                <th className="py-3 px-4 text-right">Safety Deficit</th>
                <th className="py-3 px-4 text-right">Suggested Order</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#13223f]/50 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Monitoring reorder thresholds...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-300">All materials at safe buffer levels</p>
                    <p className="text-xs text-slate-500">No items below reorder threshold in this view.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const deficit = Math.max(0, item.reorder_level - item.current_quantity);
                  const suggestedOrder = Math.ceil(Math.max(item.reorder_level * 1.5, item.reorder_level - item.current_quantity + 100));

                  return (
                    <tr 
                      key={`${item.item_id}-${item.warehouse_id}`}
                      className={`hover:bg-[#101e38]/50 transition-colors ${item.is_low_stock ? 'bg-rose-950/20' : ''}`}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-400">{item.item_code}</span>
                        <div className="font-medium text-white text-xs">{item.item_name}</div>
                        <div className="text-[11px] text-slate-400">{item.category}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                        {item.warehouse_name}
                      </td>

                      <td className={`py-3.5 px-4 text-right font-mono font-bold text-xs ${
                        item.is_low_stock ? 'text-rose-400' : 'text-white'
                      }`}>
                        {item.current_quantity.toLocaleString()} {item.uom}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-400">
                        {item.reorder_level.toLocaleString()} {item.uom}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs">
                        {deficit > 0 ? (
                          <span className="text-rose-400">-{deficit.toLocaleString()} {item.uom}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs">
                        {item.is_low_stock || item.health_status !== 'Healthy' ? (
                          <span className="text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded font-mono">
                            {item.reorder_suggestion_text || `+${(item.suggested_reorder_qty || suggestedOrder).toLocaleString()} ${item.uom}`}
                          </span>
                        ) : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <HealthStatusBadge status={item.health_status} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        {item.is_low_stock && (
                          <button
                            onClick={() => onNavigate('/stock-in')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>Stock In</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
