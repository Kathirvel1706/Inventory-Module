import React from 'react';
import { 
  Minus, 
  Plus, 
  AlertOctagon, 
  ShieldCheck, 
  AlertTriangle, 
  Package, 
  Warehouse as WarehouseIcon,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export interface StockImpactPreviewProps {
  mode: 'in' | 'out';
  currentStock: number;
  deltaQty: number;
  uom?: string;
  reorderLevel?: number;
  itemName?: string;
  itemCode?: string;
  warehouseName?: string;
  isConfigured: boolean;
}

export function StockImpactPreview({
  mode,
  currentStock,
  deltaQty,
  uom = 'units',
  reorderLevel = 0,
  itemName,
  itemCode,
  warehouseName,
  isConfigured,
}: StockImpactPreviewProps) {
  // If user hasn't selected both item and warehouse yet
  if (!isConfigured) {
    return (
      <div className="rounded-2xl border border-dashed border-[#162646] bg-[#081224]/50 p-4 text-center transition-all">
        <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
          <Package className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-slate-300">Stock Impact Preview</span>
        </div>
        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
          Select a material / SKU and storage location above to dynamically preview real-time stock balance changes before submission.
        </p>
      </div>
    );
  }

  const safeQty = Math.max(0, isNaN(deltaQty) ? 0 : deltaQty);
  const isStockOut = mode === 'out';

  // Math
  const remaining = currentStock - safeQty;
  const newBalance = currentStock + safeQty;
  const isInsufficient = isStockOut && safeQty > currentStock;
  const deficit = isInsufficient ? safeQty - currentStock : 0;

  // Health assessment for Stock Out
  const isDepleted = isStockOut && !isInsufficient && safeQty > 0 && remaining === 0;
  const isBelowReorder = isStockOut && !isInsufficient && safeQty > 0 && reorderLevel > 0 && remaining < reorderLevel && remaining > 0;
  const wasAboveNowBelow = isBelowReorder && currentStock >= reorderLevel;

  // Health assessment for Stock In
  const wasBelowNowHealthy = !isStockOut && safeQty > 0 && reorderLevel > 0 && currentStock < reorderLevel && newBalance >= reorderLevel;

  // Visual percentage calculation for impact bar
  let barCurrentPercent = 0;
  let barDeltaPercent = 0;
  if (isStockOut) {
    if (currentStock > 0) {
      if (isInsufficient) {
        barCurrentPercent = Math.min(100, Math.round((currentStock / safeQty) * 100));
        barDeltaPercent = 100 - barCurrentPercent;
      } else {
        const remainingPercent = Math.round((remaining / currentStock) * 100);
        barCurrentPercent = remainingPercent;
        barDeltaPercent = 100 - remainingPercent;
      }
    }
  } else {
    const total = newBalance > 0 ? newBalance : 1;
    barCurrentPercent = Math.round((currentStock / total) * 100);
    barDeltaPercent = 100 - barCurrentPercent;
  }

  return (
    <div 
      className={`rounded-2xl border p-4 transition-all duration-200 shadow-sm ${
        isInsufficient 
          ? 'bg-[#0c162c] border-rose-800/80 ring-1 ring-rose-500/20' 
          : isBelowReorder 
            ? 'bg-[#0c162c] border-amber-800/60' 
            : 'bg-[#0c162c] border-[#162646]'
      }`}
    >
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#162646]">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
            isStockOut ? 'bg-rose-950/80 text-rose-400 border border-rose-800/50' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
          }`}>
            {isStockOut ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>{isStockOut ? 'Stock Out Impact Preview' : 'Stock In Impact Preview'}</span>
              <span className="text-[10px] font-normal text-slate-400 normal-case">
                (Live Calculation)
              </span>
            </h4>
          </div>
        </div>

        {/* Location & Item breadcrumb badge */}
        {(itemCode || warehouseName) && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-[#081224] px-2.5 py-1 rounded-xl border border-[#162646]">
            <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium truncate max-w-[160px]">{warehouseName || 'Warehouse'}</span>
          </div>
        )}
      </div>

      {/* 3-Step ERP Metric Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-stretch">
        {/* Step 1: Current Stock */}
        <div className="bg-[#081224] rounded-xl p-3 border border-[#162646] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Current Stock
            </span>
            <span className="text-[10px] px-1.5 py-0.5 font-medium bg-[#142343] text-slate-300 rounded-md">
              Base
            </span>
          </div>
          <div className="my-1">
            <div className="text-base font-bold font-mono text-white tracking-tight">
              {currentStock.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">{uom}</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Available at source</span>
            {reorderLevel > 0 && (
              <span className="text-slate-400">Min: {reorderLevel}</span>
            )}
          </div>
        </div>

        {/* Step 2: Issuing or Adding */}
        <div className={`rounded-xl p-3 border flex flex-col justify-between transition-colors ${
          isInsufficient 
            ? 'bg-rose-950/40 border-rose-800/60' 
            : safeQty > 0 
              ? isStockOut 
                ? 'bg-rose-950/30 border-rose-800/50' 
                : 'bg-emerald-950/30 border-emerald-800/50' 
              : 'bg-[#081224] border-[#162646]'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] uppercase font-bold tracking-wider ${
              isStockOut ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {isStockOut ? 'Issuing' : 'Adding'}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 font-bold rounded-md flex items-center gap-0.5 ${
              isStockOut ? 'bg-rose-950 text-rose-300 border border-rose-800/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
            }`}>
              {isStockOut ? <Minus className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
              {isStockOut ? 'Deduction' : 'Receipt'}
            </span>
          </div>
          <div className="my-1">
            <div className={`text-base font-bold font-mono tracking-tight ${
              isInsufficient 
                ? 'text-rose-400' 
                : isStockOut 
                  ? 'text-rose-400' 
                  : 'text-emerald-400'
            }`}>
              {isStockOut ? '-' : '+'}{safeQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">{uom}</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Transaction quantity</span>
            <span className="font-mono text-slate-300">{safeQty > 0 ? `${safeQty} ${uom}` : 'Enter quantity'}</span>
          </div>
        </div>

        {/* Step 3: Remaining or New Balance */}
        <div className={`rounded-xl p-3 border flex flex-col justify-between transition-colors ${
          isInsufficient 
            ? 'bg-rose-950/50 border-rose-800' 
            : isDepleted
              ? 'bg-slate-900 border-slate-700'
              : isBelowReorder 
                ? 'bg-amber-950/40 border-amber-800/60' 
                : 'bg-emerald-950/30 border-emerald-800/50'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] uppercase font-bold tracking-wider ${
              isInsufficient 
                ? 'text-rose-400' 
                : isBelowReorder 
                  ? 'text-amber-400' 
                  : isStockOut 
                    ? 'text-slate-300' 
                    : 'text-emerald-400'
            }`}>
              {isStockOut ? 'Remaining' : 'New Balance'}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 font-bold rounded-md ${
              isInsufficient
                ? 'bg-rose-600 text-white'
                : isDepleted
                  ? 'bg-slate-700 text-slate-200'
                  : isBelowReorder
                    ? 'bg-amber-600 text-white'
                    : 'bg-emerald-600 text-white'
            }`}>
              {isInsufficient ? 'Insufficient' : isDepleted ? '0 Balance' : isBelowReorder ? 'Low' : 'Healthy'}
            </span>
          </div>

          <div className="my-1">
            {isInsufficient ? (
              <div className="text-base font-bold font-mono text-rose-400 tracking-tight flex items-baseline gap-1">
                <span>-{deficit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span className="text-xs font-normal text-rose-300 font-sans">({uom} deficit)</span>
              </div>
            ) : (
              <div className="text-base font-bold font-mono text-white tracking-tight">
                {(isStockOut ? remaining : newBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">{uom}</span>
              </div>
            )}
          </div>

          <div className="text-[10px] flex items-center justify-between">
            <span className="text-slate-400">
              {isStockOut ? 'Post-issue balance' : 'Updated inventory'}
            </span>
            {isInsufficient ? (
              <span className="text-rose-400 font-semibold">Exceeds stock!</span>
            ) : (
              <span className="font-medium text-slate-300">
                {isStockOut 
                  ? `${currentStock > 0 ? Math.round((Math.max(0, remaining) / currentStock) * 100) : 0}% left`
                  : `+${currentStock > 0 ? Math.round((safeQty / currentStock) * 100) : 100}% gain`
                }
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visual Stock Allocation Bar */}
      {currentStock > 0 && safeQty > 0 && (
        <div className="mt-3 pt-2.5 border-t border-[#162646]">
          <div className="flex items-center justify-between text-[11px] mb-1.5 text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Stock Allocation Breakdown
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {isStockOut 
                ? `${safeQty} issuing / ${currentStock} total`
                : `${currentStock} base + ${safeQty} new = ${newBalance}`
              }
            </span>
          </div>

          <div className="w-full h-2.5 bg-[#081224] border border-[#162646] rounded-full overflow-hidden flex">
            {isStockOut ? (
              isInsufficient ? (
                <>
                  <div 
                    style={{ width: `${barCurrentPercent}%` }} 
                    className="h-full bg-slate-500 transition-all duration-300"
                    title={`Available: ${currentStock} ${uom}`}
                  />
                  <div 
                    style={{ width: `${barDeltaPercent}%` }} 
                    className="h-full bg-rose-500 animate-pulse transition-all duration-300"
                    title={`Shortage / Deficit: ${deficit} ${uom}`}
                  />
                </>
              ) : (
                <>
                  <div 
                    style={{ width: `${barCurrentPercent}%` }} 
                    className={`h-full transition-all duration-300 ${
                      remaining < reorderLevel ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    title={`Remaining: ${remaining} ${uom}`}
                  />
                  <div 
                    style={{ width: `${barDeltaPercent}%` }} 
                    className="h-full bg-blue-500 transition-all duration-300"
                    title={`Deduction: ${safeQty} ${uom}`}
                  />
                </>
              )
            ) : (
              <>
                <div 
                  style={{ width: `${barCurrentPercent}%` }} 
                  className="h-full bg-slate-600 transition-all duration-300"
                  title={`Current Base: ${currentStock} ${uom}`}
                />
                <div 
                  style={{ width: `${barDeltaPercent}%` }} 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  title={`Adding: ${safeQty} ${uom}`}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Critical Insufficient Stock Alert Banner */}
      {isInsufficient && (
        <div className="mt-3 p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 flex items-start gap-2.5 shadow-sm">
          <AlertOctagon className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <div className="font-bold text-rose-200 flex items-center gap-1.5">
              <span>Insufficient Stock</span>
              <span className="text-[10px] font-normal bg-rose-900/80 text-rose-200 px-1.5 py-0.5 rounded font-mono">
                Deficit: {deficit.toLocaleString()} {uom}
              </span>
            </div>
            <p className="text-[11px] text-rose-300 leading-relaxed">
              Requested to issue <strong className="font-mono text-white">{safeQty.toLocaleString()} {uom}</strong>, but only <strong className="font-mono text-white">{currentStock.toLocaleString()} {uom}</strong> is available in {warehouseName || 'the selected warehouse'}.
            </p>
            <p className="text-[10px] text-rose-400 font-medium pt-0.5">
              Submission is blocked. Please reduce the issue quantity or perform a Stock In receipt first.
            </p>
          </div>
        </div>
      )}

      {/* Warning for Depletion (Out of Stock) */}
      {isDepleted && (
        <div className="mt-3 p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-[11px]">
            <strong className="text-white">Zero Balance Warning:</strong> This transaction will completely deplete all {currentStock} {uom} in {warehouseName || 'this warehouse'}, setting the balance to <strong className="text-white">0</strong> (Out of Stock).
          </span>
        </div>
      )}

      {/* Warning for Reorder Threshold Crossing */}
      {wasAboveNowBelow && (
        <div className="mt-3 p-2.5 bg-amber-950/60 border border-amber-800/80 rounded-xl text-amber-300 flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-[11px]">
            <strong className="text-white">Reorder Alert:</strong> Remaining balance ({remaining.toLocaleString()} {uom}) will drop below the safety reorder level ({reorderLevel.toLocaleString()} {uom}). Replenishment will be recommended.
          </span>
        </div>
      )}

      {/* Success Notification for Stock In Replenishment */}
      {wasBelowNowHealthy && (
        <div className="mt-3 p-2.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 flex items-center gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-[11px]">
            <strong className="text-white">Safety Restored:</strong> This receipt will elevate current stock ({currentStock} {uom}) above the reorder point ({reorderLevel} {uom}) to a healthy balance of {newBalance} {uom}!
          </span>
        </div>
      )}
    </div>
  );
}
