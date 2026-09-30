import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  Warehouse as WarehouseIcon, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Download,
  Boxes,
  PieChart,
  ShieldCheck
} from 'lucide-react';
import { getAnalyticsSummary, getExportCsvUrl } from '../api/client';

export function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analyticsSummary'],
    queryFn: () => getAnalyticsSummary(),
  });

  if (isLoading || !analytics) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-medium text-slate-400">Calculating inventory analytics & valuation models...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-[#0c162c] text-white rounded-2xl p-6 shadow-sm border border-[#162646] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span>Executive Business Intelligence</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mb-1">
            Warehouse Analytics & Valuation Reports
          </h1>
          <p className="text-xs text-slate-400">
            Storage capacity utilization, turnover velocity, and capital allocation across plant storage locations.
          </p>
        </div>

        <button
          onClick={() => window.location.href = getExportCsvUrl()}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-600 rounded-xl shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Valuation Report</span>
        </button>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0c162c] p-5 rounded-2xl border border-[#162646] shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Plant Valuation</div>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            ₹{Math.round(analytics.total_inventory_valuation).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-medium">100% reconciled against physical ledger</div>
        </div>

        <div className="bg-[#0c162c] p-5 rounded-2xl border border-[#162646] shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Physical Volume</div>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            {analytics.total_receipts_units.toLocaleString()} units
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-medium">Cumulative inward materials</div>
        </div>

        <div className="bg-[#0c162c] p-5 rounded-2xl border border-[#162646] shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Production Issues Volume</div>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            {analytics.total_issues_units.toLocaleString()} units
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-medium">Issued to cutting & sewing lines</div>
        </div>

        <div className="bg-[#0c162c] p-5 rounded-2xl border border-[#162646] shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Warehouses</div>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            {analytics.warehouse_breakdown.length} Zones
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-medium">Across main factory floors</div>
        </div>
      </div>

      {/* Warehouse Utilization Analytics Card */}
      <div className="bg-[#0c162c] p-6 rounded-2xl border border-[#162646] shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#162646]">
          <div className="flex items-center gap-2">
            <WarehouseIcon className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Storage Facility Capacity & Utilization</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Capacity vs Stored Inventory</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {analytics.warehouse_breakdown.map((wh) => (
            <div key={wh.warehouse_id} className="p-4 bg-[#081224] border border-[#162646] rounded-xl space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-sm">{wh.warehouse_name}</h3>
                  <p className="text-xs text-slate-400">{wh.location}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                  wh.utilization_percentage > 85 ? 'bg-rose-950/60 text-rose-400 border-rose-800/40' :
                  wh.utilization_percentage > 60 ? 'bg-amber-950/60 text-amber-400 border-amber-800/40' :
                  'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                }`}>
                  {wh.utilization_percentage}% Used
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-[#142343] rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    wh.utilization_percentage > 85 ? 'bg-rose-500' :
                    wh.utilization_percentage > 60 ? 'bg-amber-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${Math.max(5, wh.utilization_percentage)}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                <div className="bg-[#0c162c] p-2 rounded-lg border border-[#162646]">
                  <div className="text-[10px] text-slate-500">Total Units</div>
                  <div className="font-mono font-bold text-slate-200">{wh.total_units.toLocaleString()}</div>
                </div>
                <div className="bg-[#0c162c] p-2 rounded-lg border border-[#162646]">
                  <div className="text-[10px] text-slate-500">Max Capacity</div>
                  <div className="font-mono font-bold text-slate-200">{wh.capacity.toLocaleString()}</div>
                </div>
                <div className="bg-[#0c162c] p-2 rounded-lg border border-[#162646]">
                  <div className="text-[10px] text-slate-500">Valuation</div>
                  <div className="font-mono font-bold text-white">₹{Math.round(wh.valuation).toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown & Material Velocity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-[#0c162c] p-6 rounded-2xl border border-[#162646] shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#162646]">
            <Layers className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Capital Allocation by Material Category</h2>
          </div>

          <div className="space-y-3">
            {analytics.category_breakdown.map((cat) => {
              const pct = analytics.total_inventory_valuation > 0 
                ? Math.round((cat.valuation / analytics.total_inventory_valuation) * 100) 
                : 0;

              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>{cat.category} ({cat.sku_count} SKUs)</span>
                    <span className="font-mono">₹{Math.round(cat.valuation).toLocaleString('en-IN')} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-[#081224] rounded-full h-2 overflow-hidden border border-[#162646]">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.max(3, pct)}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Moving Items */}
        <div className="bg-[#0c162c] p-6 rounded-2xl border border-[#162646] shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#162646]">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Top Moving Production Materials</h2>
          </div>

          <div className="space-y-3">
            {analytics.top_moving_items.map((item, idx) => (
              <div key={item.code} className="flex items-center justify-between p-3 bg-[#081224] border border-[#162646] rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#142343] text-blue-400 flex items-center justify-center text-xs font-mono font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-mono font-bold text-xs text-blue-400">{item.code}</span>
                    <div className="text-xs font-medium text-white">{item.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-xs text-rose-400">
                    -{item.issued_qty.toLocaleString()} {item.uom}
                  </div>
                  <div className="text-[10px] text-slate-500">{item.tx_count} issue transactions</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
