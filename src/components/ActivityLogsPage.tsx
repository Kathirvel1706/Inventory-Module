import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, 
  Search, 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Truck, 
  ShoppingBag, 
  Package, 
  Building2, 
  ShieldCheck,
  Layers
} from 'lucide-react';
import { getActivityLogs } from '../api/client';
import { ActivityLog } from '../types/inventory';

export function ActivityLogsPage() {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activityLogs'],
    queryFn: () => getActivityLogs(150),
    refetchInterval: 10000,
  });

  const filteredLogs = logs.filter((log) => {
    if (moduleFilter && log.module !== moduleFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      log.description.toLowerCase().includes(s) ||
      log.action.toLowerCase().includes(s) ||
      log.user.toLowerCase().includes(s) ||
      String(log.entity_id).toLowerCase().includes(s)
    );
  });

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'RECEIVED':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40';
      case 'ISSUED':
        return 'bg-rose-950/60 text-rose-400 border-rose-800/40';
      case 'DISPATCHED':
        return 'bg-blue-950/60 text-blue-400 border-blue-800/40';
      case 'CREATED':
        return 'bg-purple-950/60 text-purple-400 border-purple-800/40';
      case 'STATUS_CHANGE':
        return 'bg-amber-950/60 text-amber-400 border-amber-800/40';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-700/60';
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'STOCK_IN':
        return <ArrowDownLeft className="w-4 h-4 text-emerald-400" />;
      case 'STOCK_OUT':
        return <ArrowUpRight className="w-4 h-4 text-rose-400" />;
      case 'DISPATCH':
        return <Truck className="w-4 h-4 text-blue-400" />;
      case 'PURCHASE':
        return <ShoppingBag className="w-4 h-4 text-purple-400" />;
      case 'ITEM':
        return <Package className="w-4 h-4 text-slate-400" />;
      case 'WAREHOUSE':
        return <Building2 className="w-4 h-4 text-slate-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0c162c] p-5 rounded-2xl border border-[#162646] shadow-sm">
        <div className="relative min-w-[280px] flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search activity description, user, action or reference ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="">All Functional Modules</option>
          <option value="STOCK_IN">Stock In Receipts</option>
          <option value="STOCK_OUT">Stock Out Issues</option>
          <option value="DISPATCH">Shipping Dispatches</option>
          <option value="PURCHASE">Purchase Orders</option>
          <option value="ITEM">Item Master</option>
          <option value="WAREHOUSE">Warehouse Master</option>
        </select>
      </div>

      {/* Activity Logs Timeline */}
      <div className="bg-[#0c162c] border border-[#162646] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#162646] flex items-center justify-between bg-[#081224]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wide">Enterprise Audit Trail</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">{filteredLogs.length} audit records</span>
        </div>

        <div className="divide-y divide-[#13223f]/50">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-xs">Loading audit logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-300">No activity logs recorded</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-[#101e38]/50 transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#081224] border border-[#162646] flex items-center justify-center flex-shrink-0">
                    {getModuleIcon(log.module)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-xs font-semibold text-white truncate">
                        {log.description}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-medium text-slate-300">{log.user}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-slate-400">Ref: #{log.entity_id}</span>
                      <span aria-hidden="true">·</span>
                      <span>Module: {log.module}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400 font-mono flex-shrink-0">
                  <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                  <div className="text-[11px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
