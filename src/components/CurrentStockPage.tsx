import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Boxes, 
  AlertTriangle, 
  Download, 
  Search, 
  PackageCheck, 
  ArrowRight,
  Info,
  X,
  Layers,
  ArrowDownLeft,
  Warehouse as WarehouseIcon,
  History,
  Sparkles,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { getCurrentStock, getWarehouses, getExportCsvUrl } from '../api/client';
import { CurrentStockItem, InventoryHealthStatus } from '../types/inventory';
import { HealthStatusBadge } from './HealthStatusBadge';

const CATEGORIES = ['All', 'Fabric', 'Yarn', 'Trim', 'Accessory', 'Packaging'];
const HEALTH_STATUS_OPTIONS: Array<'All' | InventoryHealthStatus> = [
  'All',
  'Healthy',
  'Low',
  'Critical',
  'Out of Stock'
];

export function CurrentStockPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [globalSearch, setGlobalSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>('All');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false);
  const [activeHealthStatus, setActiveHealthStatus] = useState<string>('All');

  // Queries
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => getWarehouses(),
  });

  const { data: stockItems = [], isLoading, isError, error } = useQuery({
    queryKey: ['currentStock', selectedWarehouseId, showLowStockOnly],
    queryFn: () => getCurrentStock({
      warehouse_id: selectedWarehouseId ? Number(selectedWarehouseId) : undefined,
      low_stock_only: showLowStockOnly,
    }),
  });

  // Health counts across all loaded stock positions
  const healthCounts = useMemo(() => {
    return {
      All: stockItems.length,
      Healthy: stockItems.filter(i => i.health_status === 'Healthy').length,
      Low: stockItems.filter(i => i.health_status === 'Low').length,
      Critical: stockItems.filter(i => i.health_status === 'Critical').length,
      'Out of Stock': stockItems.filter(i => i.health_status === 'Out of Stock').length,
    };
  }, [stockItems]);

  // Client-side search and filters
  const filteredStock = useMemo(() => {
    let list = stockItems;

    if (activeCategory && activeCategory !== 'All') {
      list = list.filter(item => item.category.toLowerCase() === activeCategory.toLowerCase());
    }

    if (activeHealthStatus !== 'All') {
      list = list.filter(item => item.health_status === activeHealthStatus);
    }

    if (!globalSearch.trim()) return list;
    const term = globalSearch.toLowerCase().trim();
    return list.filter((item) => 
      item.item_code.toLowerCase().includes(term) ||
      item.item_name.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term) ||
      item.warehouse_name.toLowerCase().includes(term) ||
      (item.health_status && item.health_status.toLowerCase().includes(term)) ||
      (item.shade_lot && item.shade_lot.toLowerCase().includes(term)) ||
      (item.composition && item.composition.toLowerCase().includes(term))
    );
  }, [stockItems, activeCategory, activeHealthStatus, globalSearch]);

  const totalPositions = filteredStock.length;
  const totalQuantity = useMemo(() => {
    return filteredStock.reduce((sum, item) => sum + item.current_quantity, 0);
  }, [filteredStock]);

  const totalValuation = useMemo(() => {
    return filteredStock.reduce((sum, item) => sum + (item.total_valuation || (item.current_quantity * item.unit_cost)), 0);
  }, [filteredStock]);

  const lowStockItems = useMemo(() => {
    return stockItems.filter((item) => item.is_low_stock || item.health_status === 'Critical' || item.health_status === 'Out of Stock');
  }, [stockItems]);

  // Count items per category for filter badge counters
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: stockItems.length };
    CATEGORIES.slice(1).forEach((cat) => {
      counts[cat] = stockItems.filter((item) => item.category.toLowerCase() === cat.toLowerCase()).length;
    });
    return counts;
  }, [stockItems]);

  const handleExportCsv = () => {
    window.location.href = getExportCsvUrl();
  };

  const getCategoryDotClass = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'fabric':
        return 'bg-blue-500';
      case 'yarn':
        return 'bg-amber-500';
      case 'trim':
        return 'bg-purple-500';
      case 'accessory':
        return 'bg-emerald-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner: Core ERP Inventory Formula & Metrics */}
      <div className="bg-[#0c162c] border border-[#162646] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-blue-400">
              <Boxes className="w-4 h-4 text-blue-400" />
              <span>Authoritative Inventory Ledger</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Live Item × Warehouse Matrix</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Current Stock & Inventory Health
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-[#081224] px-3.5 py-1.5 rounded-xl border border-[#162646] w-fit">
              <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span>Current Stock = SUM(Stock In) − SUM(Stock Out)</span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
            <div className="bg-[#081224] p-4 rounded-xl border border-[#162646] text-center min-w-[110px]">
              <div className="text-xl font-mono font-bold text-white leading-tight">
                {totalPositions}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1">SKU Positions</div>
            </div>

            <div className="bg-[#081224] p-4 rounded-xl border border-[#162646] text-center min-w-[110px]">
              <div className="text-xl font-mono font-bold text-white leading-tight">
                {totalQuantity.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1">Physical Units</div>
            </div>

            <div className="bg-[#081224] p-4 rounded-xl border border-[#162646] text-center min-w-[120px]">
              <div className="text-xl font-mono font-bold text-emerald-400 leading-tight">
                ₹{Math.round(totalValuation).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1">Total Valuation</div>
            </div>

            <div className={`p-4 rounded-xl border text-center min-w-[110px] ${
              lowStockItems.length > 0 
                ? 'bg-rose-950/60 border-rose-800/70 text-rose-300' 
                : 'bg-emerald-950/60 border-emerald-800/70 text-emerald-300'
            }`}>
              <div className="text-xl font-mono font-bold leading-tight">
                {lowStockItems.length}
              </div>
              <div className="text-[11px] font-medium mt-1">
                {lowStockItems.length > 0 ? 'Replenish Required' : 'All Stock Safe'}
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Health Status Distribution Strip */}
        <div className="mt-6 pt-4 border-t border-[#162646] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-300">
            <span>Inventory Health Status:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveHealthStatus('Healthy')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                activeHealthStatus === 'Healthy'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'bg-[#081224] text-slate-300 hover:bg-[#101e38] border border-[#162646]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Healthy</span>
              <span className="font-mono font-bold tabular-nums">({healthCounts.Healthy})</span>
            </button>

            <button
              onClick={() => setActiveHealthStatus('Low')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                activeHealthStatus === 'Low'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'bg-[#081224] text-slate-300 hover:bg-[#101e38] border border-[#162646]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Low</span>
              <span className="font-mono font-bold tabular-nums">({healthCounts.Low})</span>
            </button>

            <button
              onClick={() => setActiveHealthStatus('Critical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                activeHealthStatus === 'Critical'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50 shadow-sm'
                  : 'bg-[#081224] text-slate-300 hover:bg-[#101e38] border border-[#162646]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Critical</span>
              <span className="font-mono font-bold tabular-nums">({healthCounts.Critical})</span>
            </button>

            <button
              onClick={() => setActiveHealthStatus('Out of Stock')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                activeHealthStatus === 'Out of Stock'
                  ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                  : 'bg-[#081224] text-slate-300 hover:bg-[#101e38] border border-[#162646]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>Out of Stock</span>
              <span className="font-mono font-bold tabular-nums">({healthCounts['Out of Stock']})</span>
            </button>

            {activeHealthStatus !== 'All' && (
              <button
                onClick={() => setActiveHealthStatus('All')}
                className="text-[11px] text-blue-400 hover:text-blue-300 underline ml-1 cursor-pointer"
              >
                Reset filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SMART REORDER ADVISORY & REPLENISHMENT SECTION */}
      {lowStockItems.length > 0 && (
        <div className="bg-[#0c162c] border border-amber-900/40 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Smart Reorder Recommendations ({lowStockItems.length} Materials Below Safety Buffer)</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically calculated replenishment quantities using current stock, reorder level, and consumption velocity.
              </p>
            </div>

            <button
              onClick={() => onNavigate('/stock-in')}
              className="bg-[#2563eb] hover:bg-blue-600 text-white text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Record Stock In Receipt</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {lowStockItems.map((item) => (
              <div
                key={`smart-reorder-${item.item_id}-${item.warehouse_id}`}
                className="bg-[#081224] p-4 rounded-xl border border-[#162646] hover:border-amber-500/50 flex flex-col justify-between gap-3 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-blue-400">{item.item_code}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#101e38] text-slate-300 border border-[#162646]">
                        {item.category}
                      </span>
                    </div>
                    <HealthStatusBadge status={item.health_status} size="sm" />
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug line-clamp-1">{item.item_name}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                    <WarehouseIcon className="w-3 h-3 text-slate-500" />
                    <span>{item.warehouse_name}</span>
                  </div>

                  {/* PROMINENT REORDER SUGGESTION CALLOUT */}
                  <div className="mt-3 bg-amber-950/40 border border-amber-800/50 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Recommended Replenishment</span>
                    </div>
                    <div className="text-sm font-mono font-bold text-amber-300 mt-0.5">
                      {item.reorder_suggestion_text || `Reorder Suggested — ${(item.suggested_reorder_qty || 0).toLocaleString()} units`}
                    </div>
                  </div>

                  {/* 4-METRICS BREAKDOWN GRID */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#162646] text-xs">
                    <div className="bg-[#0c162c] p-2 rounded-lg border border-[#162646]">
                      <div className="text-[10px] text-slate-400 font-medium">Current Stock</div>
                      <div className={`font-mono font-bold text-xs ${
                        item.health_status === 'Out of Stock' ? 'text-slate-400' :
                        item.health_status === 'Critical' ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {item.current_quantity.toLocaleString()} {item.uom}
                      </div>
                    </div>

                    <div className="bg-[#0c162c] p-2 rounded-lg border border-[#162646]">
                      <div className="text-[10px] text-slate-400 font-medium">Reorder Level</div>
                      <div className="font-mono font-bold text-slate-300 text-xs">
                        {item.reorder_level.toLocaleString()} {item.uom}
                      </div>
                    </div>

                    <div className="bg-[#0c162c] p-2 rounded-lg border border-[#162646]">
                      <div className="text-[10px] text-slate-400 font-medium">Recent Consumption</div>
                      <div className="font-mono font-bold text-slate-300 text-xs">
                        {(item.recent_consumption || 0).toLocaleString()} {item.uom}
                      </div>
                    </div>

                    <div className="bg-[#0c162c] p-2 rounded-lg border border-[#162646]">
                      <div className="text-[10px] text-slate-400 font-medium">Avg Consumption</div>
                      <div className="font-mono font-bold text-blue-400 text-xs">
                        ~{(item.recent_average_consumption || 0).toLocaleString()} {item.uom}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#162646] text-xs">
                  <button
                    onClick={() => onNavigate(`/stock/movements?item_id=${item.item_id}&warehouse_id=${item.warehouse_id}`)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <History className="w-3 h-3 text-slate-500" />
                    <span>View Timeline</span>
                  </button>

                  <button
                    onClick={() => onNavigate('/stock-in')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <span>Replenish Now</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH & FILTER CONTROLS */}
      <div className="bg-[#0c162c] border border-[#162646] p-5 rounded-2xl shadow-sm space-y-4">
        {/* Global Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by code, item name, category, warehouse, health status, or specs..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 text-xs bg-[#081224] border border-[#162646] rounded-xl focus:outline-none focus:border-blue-500 transition-all font-medium placeholder:text-slate-500 text-white"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-14 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-md cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-mono bg-[#142343] px-2 py-0.5 rounded font-medium">
            {filteredStock.length} found
          </span>
        </div>

        {/* Health Status Tabs & Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-[#162646]">
          {/* Health Status Filter Segment */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1 uppercase tracking-wider">
              Health:
            </span>
            {HEALTH_STATUS_OPTIONS.map((status) => {
              const count = healthCounts[status as keyof typeof healthCounts] ?? 0;
              const isActive = activeHealthStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => setActiveHealthStatus(status)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#2563eb] text-white shadow-sm'
                      : 'bg-[#081224] text-slate-400 hover:text-white border border-[#162646]'
                  }`}
                >
                  <span>
                    {status === 'All' ? 'All Health' : 
                     status === 'Healthy' ? '🟢 Healthy' :
                     status === 'Low' ? '🟡 Low' :
                     status === 'Critical' ? '🔴 Critical' : '⚫ Out of Stock'}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold tabular-nums ${
                    isActive ? 'bg-blue-800 text-white' : 'bg-[#142343] text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Secondary Controls: Warehouse & Low Stock Toggle & Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Warehouse Filter Dropdown */}
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">All Storage Locations ({warehouses.length})</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            {/* Low Stock Toggle */}
            <label className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border cursor-pointer select-none transition-all ${
              showLowStockOnly 
                ? 'bg-rose-950/60 border-rose-800/80 text-rose-300' 
                : 'bg-[#081224] border-[#162646] text-slate-300 hover:border-slate-600'
            }`}>
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="rounded text-rose-500 focus:ring-0 h-3.5 w-3.5 accent-rose-500"
              />
              <span>Low Stock Buffer ({lowStockItems.length})</span>
            </label>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-[#081224] border border-[#162646] hover:border-slate-500 rounded-xl transition-all cursor-pointer"
              title="Download Current Stock table as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Category Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#162646]">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1 uppercase tracking-wider">
            Category:
          </span>
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat] ?? 0;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(prev => prev === cat ? null : cat)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1d4ed8] text-white shadow-sm'
                    : 'bg-[#081224] text-slate-400 hover:text-white border border-[#162646]'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold tabular-nums ${
                  isActive ? 'bg-blue-900 text-white' : 'bg-[#142343] text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CURRENT STOCK DATA TABLE */}
      <div className="bg-[#0c162c] border border-[#162646] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#081224]/80 border-b border-[#162646] text-slate-400 font-medium">
                <th className="py-3 px-4">Item Code</th>
                <th className="py-3 px-4">Item Name / Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Warehouse Location</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Reorder Level</th>
                <th className="py-3 px-4 text-center">Health Status</th>
                <th className="py-3 px-4 text-left">Smart Reorder Advisory</th>
                <th className="py-3 px-4 text-right">Valuation</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#13223f]/50 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-medium">Reconciling live stock ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-rose-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="w-6 h-6" />
                      <span className="text-xs font-medium">Failed to calculate stock balances. {(error as any)?.message}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Boxes className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-300 text-sm">
                        {!activeCategory ? 'No category selected' : 'No stock entries found'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {!activeCategory 
                          ? 'Select a category above (or click All) to display corresponding stock data.'
                          : 'Try adjusting your filters or record an inward Stock In receipt.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStock.map((item) => (
                  <tr 
                    key={`${item.item_id}-${item.warehouse_id}`}
                    className="hover:bg-[#101e38]/50 transition-colors"
                  >
                    {/* Item Code */}
                    <td className="py-3 px-4 font-mono font-bold text-blue-400 text-xs">
                      {item.item_code}
                    </td>

                    {/* Item Name */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-white text-xs leading-snug">{item.item_name}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        {item.gsm ? <span>{item.gsm} GSM</span> : null}
                        {item.gsm && item.composition ? <span>·</span> : null}
                        {item.composition ? <span>{item.composition}</span> : null}
                        {(item.gsm || item.composition) && item.shade_lot ? <span>·</span> : null}
                        {item.shade_lot ? <span className="font-mono text-slate-400">Lot: {item.shade_lot}</span> : null}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                        <span className={`w-2 h-2 rounded-full ${getCategoryDotClass(item.category)}`}></span>
                        <span>{item.category}</span>
                      </div>
                    </td>

                    {/* Warehouse */}
                    <td className="py-3 px-4 text-xs text-slate-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <WarehouseIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.warehouse_name}</span>
                      </div>
                    </td>

                    {/* Current Stock */}
                    <td className={`py-3 px-4 text-right font-mono font-bold text-xs ${
                      item.health_status === 'Out of Stock' ? 'text-slate-400' :
                      item.health_status === 'Critical' ? 'text-rose-400' :
                      item.health_status === 'Low' ? 'text-amber-400' : 'text-white'
                    }`}>
                      {item.current_quantity.toLocaleString()} <span className="text-[11px] font-normal text-slate-400">{item.uom}</span>
                    </td>

                    {/* Reorder Level */}
                    <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-slate-400">
                      {item.reorder_level.toLocaleString()} <span className="text-[10px] font-normal">{item.uom}</span>
                    </td>

                    {/* Inventory Health Status */}
                    <td className="py-3 px-4 text-center">
                      <HealthStatusBadge status={item.health_status} size="sm" />
                    </td>

                    {/* Smart Reorder Advisory */}
                    <td className="py-3 px-4">
                      {item.health_status !== 'Healthy' || item.is_low_stock ? (
                        <div className="flex flex-col items-start gap-1">
                          <span 
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950/60 text-amber-400 border border-amber-800/40 shadow-xs whitespace-nowrap"
                            title={`Current: ${item.current_quantity} ${item.uom} | Reorder Level: ${item.reorder_level} ${item.uom} | Recent Cons: ${item.recent_consumption || 0} ${item.uom} | Avg Cons: ~${item.recent_average_consumption || 0} ${item.uom}`}
                          >
                            <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            <span>{item.reorder_suggestion_text || `Reorder Suggested — ${(item.suggested_reorder_qty || 0).toLocaleString()} units`}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Recent Cons: {(item.recent_consumption || 0).toLocaleString()} {item.uom} · Avg: ~{(item.recent_average_consumption || 0).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Stock Buffer Optimal</span>
                        </span>
                      )}
                    </td>

                    {/* Valuation */}
                    <td className="py-3 px-4 text-right font-mono text-xs font-medium text-slate-300">
                      ₹{Math.round(item.total_valuation || (item.current_quantity * item.unit_cost)).toLocaleString('en-IN')}
                    </td>

                    {/* Actions: Stock In & View Timeline */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(item.health_status !== 'Healthy' || item.is_low_stock) && (
                          <button
                            onClick={() => onNavigate('/stock-in')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-400 bg-amber-950/60 hover:bg-amber-900/60 rounded-lg border border-amber-800/40 transition-colors cursor-pointer"
                            title="Record Stock In receipt to replenish SKU"
                          >
                            <ArrowDownLeft className="w-3 h-3 text-amber-400" />
                            <span>Replenish</span>
                          </button>
                        )}

                        <button
                          onClick={() => onNavigate(`/stock/movements?item_id=${item.item_id}&warehouse_id=${item.warehouse_id}`)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-400 bg-blue-950/60 hover:bg-blue-900/60 rounded-lg border border-blue-800/40 transition-colors cursor-pointer"
                          title={`View chronological stock movement timeline for ${item.item_code} in ${item.warehouse_name}`}
                        >
                          <History className="w-3 h-3 text-blue-400" />
                          <span>Timeline</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
