import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  History, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Warehouse as WarehouseIcon, 
  Calendar, 
  User, 
  Package, 
  AlertTriangle, 
  Clock, 
  ArrowUpDown, 
  Table as TableIcon, 
  GitCommit, 
  Tag, 
  Info 
} from 'lucide-react';
import { getItems, getWarehouses, getItemTimeline } from '../api/client';
import { Item, StockMovementItem } from '../types/inventory';

interface Props {
  initialItemId?: number;
  initialWarehouseId?: number;
  onNavigate?: (path: string) => void;
}

export function StockMovementTimelinePage({ initialItemId, initialWarehouseId, onNavigate }: Props) {
  // Query all active items for item selector
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['items', '', '', 'active'],
    queryFn: () => getItems(),
  });

  // Query warehouses for warehouse filter
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => getWarehouses(),
  });

  // Selected item ID: fallback to initialItemId or first item in list
  const [selectedItemId, setSelectedItemId] = useState<number>(() => {
    if (initialItemId) return initialItemId;
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get('item_id');
    return fromUrl ? parseInt(fromUrl, 10) : 0;
  });

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(() => {
    if (initialWarehouseId) return initialWarehouseId;
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get('warehouse_id');
    return fromUrl ? parseInt(fromUrl, 10) : 0;
  });

  // View mode: 'timeline' or 'ledger'
  const [viewMode, setViewMode] = useState<'timeline' | 'ledger'>('timeline');

  // Sort order: 'asc' (chronological, oldest first) or 'desc' (reverse chronological, newest first)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Search filter inside movements
  const [movementSearch, setMovementSearch] = useState('');

  // Auto-select first item when items query loads and no item selected
  useEffect(() => {
    if ((!selectedItemId || selectedItemId === 0) && items.length > 0) {
      setSelectedItemId(items[0].id);
    }
  }, [items, selectedItemId]);

  // Sync with prop updates
  useEffect(() => {
    if (initialItemId && initialItemId > 0) {
      setSelectedItemId(initialItemId);
    }
  }, [initialItemId]);

  useEffect(() => {
    if (initialWarehouseId !== undefined) {
      setSelectedWarehouseId(initialWarehouseId);
    }
  }, [initialWarehouseId]);

  // Query timeline data for selected item
  const { data: timelineData, isLoading: timelineLoading, isError, error } = useQuery({
    queryKey: ['itemTimeline', selectedItemId, selectedWarehouseId],
    queryFn: () => getItemTimeline(selectedItemId, selectedWarehouseId > 0 ? selectedWarehouseId : undefined),
    enabled: selectedItemId > 0,
  });

  const item = timelineData?.item;
  const rawMovements = timelineData?.movements || [];

  // Filtered and sorted movements
  const displayedMovements = useMemo(() => {
    let list = [...rawMovements];

    if (movementSearch.trim()) {
      const s = movementSearch.toLowerCase().trim();
      list = list.filter((m) => 
        (m.reference && m.reference.toLowerCase().includes(s)) ||
        (m.warehouse_name && m.warehouse_name.toLowerCase().includes(s)) ||
        (m.user && m.user.toLowerCase().includes(s)) ||
        (m.activity_date && m.activity_date.toLowerCase().includes(s))
      );
    }

    if (sortOrder === 'desc') {
      list.reverse();
    }

    return list;
  }, [rawMovements, movementSearch, sortOrder]);

  const selectedItemObj = items.find((i) => i.id === selectedItemId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner: Core Ledger Header & Aggregate Metrics */}
      <div className="bg-[#0c162c] border border-[#162646] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-blue-400">
              <History className="w-4 h-4 text-blue-400" />
              <span>Full Audit Trail</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Chronological Inventory Flow</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Stock Movement Timeline & Audit Ledger
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-[#081224] px-3.5 py-1.5 rounded-xl border border-[#162646] w-fit">
              <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span>Running Balance = Prior Balance + Stock In − Stock Out</span>
            </div>
          </div>

          {/* Quick Metrics */}
          {item && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
              <div className="bg-[#081224] p-4 rounded-xl border border-[#162646] text-center min-w-[110px]">
                <div className="text-xl font-mono font-bold text-white leading-tight">
                  {rawMovements.length}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">Total Events</div>
              </div>

              <div className="bg-[#081224] p-4 rounded-xl border border-[#162646] text-center min-w-[110px]">
                <div className="text-xl font-mono font-bold text-emerald-400 leading-tight">
                  +{timelineData?.total_in.toLocaleString()} {item.uom}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">Total Inward</div>
              </div>

              <div className="bg-[#081224] p-4 rounded-xl border border-[#162646] text-center min-w-[110px]">
                <div className="text-xl font-mono font-bold text-rose-400 leading-tight">
                  -{timelineData?.total_out.toLocaleString()} {item.uom}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">Total Outward</div>
              </div>

              <div className={`p-4 rounded-xl border text-center min-w-[120px] ${
                (timelineData?.current_balance ?? 0) < item.reorder_level
                  ? 'bg-rose-950/60 border-rose-800/70 text-rose-300'
                  : 'bg-blue-950/60 border-blue-800/70 text-blue-300'
              }`}>
                <div className="text-xl font-mono font-bold leading-tight">
                  {timelineData?.current_balance.toLocaleString()} {item.uom}
                </div>
                <div className="text-[11px] font-medium mt-1">
                  {(timelineData?.current_balance ?? 0) < item.reorder_level ? 'Low Stock Warning' : 'Current Balance'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FILTER & SELECTOR CONTROLS */}
      <div className="bg-[#0c162c] border border-[#162646] p-5 rounded-2xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Item Selector Dropdown (5 cols) */}
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-400" />
              <span>Select Material / SKU to Track:</span>
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  [{it.code}] {it.name} ({it.category} · {it.uom})
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Filter (3 cols) */}
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Warehouse Scope:</span>
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={0}>All Plant Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search within transactions (4 cols) */}
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter Timeline Events:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search reference, date, user, warehouse..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* View Mode & Chronological Direction Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#162646] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Display View:</span>
            <div className="flex items-center bg-[#081224] p-1 rounded-xl border border-[#162646]">
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'timeline' 
                    ? 'bg-[#2563eb] text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>Visual Timeline</span>
              </button>
              <button
                onClick={() => setViewMode('ledger')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'ledger' 
                    ? 'bg-[#2563eb] text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Ledger Table</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Order:</span>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#081224] hover:border-slate-500 border border-[#162646] rounded-xl text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              title="Toggle sorting direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {sortOrder === 'asc' ? 'Oldest First (Chronological)' : 'Newest First (Reverse)'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* SELECTED ITEM SPECIFICATION CARD */}
      {selectedItemObj && (
        <div className="bg-[#0c162c] border border-[#162646] p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#142343] border border-[#162646] text-blue-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-blue-400">{selectedItemObj.code}</span>
                <span className="text-slate-600">·</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#101e38] text-slate-300 border border-[#162646]">
                  {selectedItemObj.category}
                </span>
                {selectedItemObj.is_active ? (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700/60">
                    Inactive
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white mt-1">{selectedItemObj.name}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                <span>Unit: <strong className="text-slate-300">{selectedItemObj.uom}</strong></span>
                <span>·</span>
                <span>Standard Cost: <strong className="text-slate-300 font-mono">₹{Number(selectedItemObj.unit_cost).toFixed(2)}</strong></span>
                <span>·</span>
                <span>Safety Reorder Level: <strong className="text-slate-300 font-mono">{Number(selectedItemObj.reorder_level).toLocaleString()} {selectedItemObj.uom}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => onNavigate ? onNavigate('/stock-in') : null}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Record Stock In</span>
            </button>
            <button
              onClick={() => onNavigate ? onNavigate('/stock-out') : null}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#2563eb] hover:bg-blue-600 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Record Stock Out</span>
            </button>
          </div>
        </div>
      )}

      {/* TIMELINE CONTENT */}
      {timelineLoading ? (
        <div className="bg-[#0c162c] border border-[#162646] p-16 rounded-2xl text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium text-slate-400">Calculating running balances and constructing timeline...</p>
        </div>
      ) : isError ? (
        <div className="bg-[#0c162c] border border-rose-800/40 p-12 rounded-2xl text-center text-rose-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
          <p className="font-bold text-sm">Failed to load stock movements</p>
          <p className="text-xs text-slate-400 mt-1">{(error as any)?.message}</p>
        </div>
      ) : displayedMovements.length === 0 ? (
        <div className="bg-[#0c162c] border border-[#162646] p-16 rounded-2xl text-center text-slate-400">
          <History className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <h3 className="font-bold text-white text-sm">No Stock Movements Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {movementSearch 
              ? 'No transactions matched your search keyword. Try clearing the filter.' 
              : 'This material does not have any recorded Stock In or Stock Out transactions yet.'}
          </p>
        </div>
      ) : viewMode === 'timeline' ? (
        /* ================================================================ */
        /* MODE 1: VISUAL TIMELINE VIEW                                    */
        /* ================================================================ */
        <div className="relative pl-6 md:pl-10 space-y-6 before:absolute before:left-3.5 md:before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#162646]">
          {displayedMovements.map((move) => {
            const isStockIn = move.transaction_type === 'STOCK_IN';

            return (
              <div key={move.id} className="relative group">
                {/* Timeline node icon */}
                <div className={`absolute -left-6 md:-left-10 top-1.5 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 transition-transform group-hover:scale-110 ${
                  isStockIn
                    ? 'bg-emerald-600 border-[#070d19] text-white shadow-sm'
                    : 'bg-rose-600 border-[#070d19] text-white shadow-sm'
                }`}>
                  {isStockIn ? (
                    <ArrowDownLeft className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
                  )}
                </div>

                {/* Event Card */}
                <div className={`bg-[#0c162c] rounded-2xl border p-5 md:p-6 transition-all hover:border-slate-500 ${
                  isStockIn ? 'border-emerald-800/40' : 'border-[#162646]'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Left: Transaction details */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Transaction Type Badge */}
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          isStockIn 
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' 
                            : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                        }`}>
                          {isStockIn ? 'STOCK IN (Inward Receipt)' : 'STOCK OUT (Production Issue)'}
                        </span>

                        <span className="text-slate-600">·</span>

                        {/* Date */}
                        <span className="flex items-center gap-1 text-xs font-mono font-bold text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {move.activity_date}
                        </span>

                        <span className="text-slate-600">·</span>

                        {/* Warehouse Location */}
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                          <WarehouseIcon className="w-3.5 h-3.5 text-slate-500" />
                          {move.warehouse_name}
                        </span>
                      </div>

                      {/* Reference details */}
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>Reference: {move.reference}</span>
                      </div>

                      {/* Metadata: User & Unit Cost */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          Recorded by: <strong className="text-slate-300">{move.user}</strong>
                        </span>

                        {move.unit_cost !== undefined && move.unit_cost > 0 && (
                          <span className="font-mono text-slate-400">
                            Unit Cost: ₹{Number(move.unit_cost).toFixed(2)}
                          </span>
                        )}

                        <span className="text-slate-500 font-mono text-[11px]">
                          Tx Ref: #{move.id}
                        </span>
                      </div>
                    </div>

                    {/* Right: Quantity Change & Running Balance Card */}
                    <div className="flex flex-row sm:flex-col items-end justify-between sm:justify-start gap-3 bg-[#081224] p-4 rounded-xl border border-[#162646] min-w-[210px] text-right flex-shrink-0">
                      {/* Movement Qty */}
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Transaction Quantity
                        </div>
                        <div className={`text-lg font-mono font-bold leading-tight mt-0.5 ${
                          isStockIn ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {isStockIn ? `+${move.qty.toLocaleString()}` : `-${move.qty.toLocaleString()}`} {move.uom}
                        </div>
                      </div>

                      {/* Running Balance After Transaction */}
                      <div className="pt-2 sm:border-t sm:border-[#162646] w-full">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-blue-400" />
                          <span>Running Balance</span>
                        </div>
                        <div className="text-base font-mono font-bold text-white mt-0.5">
                          {move.running_balance.toLocaleString()} {move.uom}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================================================================ */
        /* MODE 2: HIGH-DENSITY AUDIT LEDGER TABLE VIEW                    */
        /* ================================================================ */
        <div className="bg-[#0c162c] border border-[#162646] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#081224]/80 border-b border-[#162646] text-slate-400 font-medium">
                  <th className="py-3 px-4">Transaction Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Warehouse Location</th>
                  <th className="py-3 px-4">Reference / Department</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4 text-right">Inward (+)</th>
                  <th className="py-3 px-4 text-right">Outward (-)</th>
                  <th className="py-3 px-4 text-right font-bold bg-[#142343]/60">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#13223f]/50 text-slate-300">
                {displayedMovements.map((move) => {
                  const isStockIn = move.transaction_type === 'STOCK_IN';

                  return (
                    <tr key={move.id} className="hover:bg-[#101e38]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {move.activity_date}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          isStockIn 
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' 
                            : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                        }`}>
                          {isStockIn ? 'STOCK IN' : 'STOCK OUT'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {move.warehouse_name}
                      </td>

                      <td className="py-3 px-4 text-slate-300 font-medium">
                        {move.reference}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {move.user}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {isStockIn ? `+${move.qty.toLocaleString()} ${move.uom}` : '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                        {!isStockIn ? `-${move.qty.toLocaleString()} ${move.uom}` : '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-white bg-[#142343]/30 text-xs">
                        {move.running_balance.toLocaleString()} {move.uom}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
