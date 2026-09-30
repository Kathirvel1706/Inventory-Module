import React from 'react';
import { InventoryHealthStatus } from '../types/inventory';
import { CheckCircle2, AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react';

interface HealthBadgeProps {
  status: InventoryHealthStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIconSymbol?: boolean;
  showLucideIcon?: boolean;
  className?: string;
}

export function HealthStatusBadge({
  status,
  size = 'md',
  showIconSymbol = true,
  showLucideIcon = false,
  className = ''
}: HealthBadgeProps) {
  const normStatus = (status || '').toLowerCase().trim();

  if (normStatus === 'out of stock' || normStatus === 'out_of_stock') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md font-semibold tracking-tight bg-slate-900/90 text-slate-300 border border-slate-700/60 ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
        } ${className}`}
        title="Out of Stock — Current stock is 0"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        {showLucideIcon && <AlertOctagon className="w-3 h-3 text-slate-400" />}
        <span>Out of Stock</span>
      </span>
    );
  }

  if (normStatus === 'critical') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md font-semibold tracking-tight bg-rose-950/70 text-rose-400 border border-rose-800/50 ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
        } ${className}`}
        title="Critical — Very low stock and immediate replenishment is required"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
        {showLucideIcon && <AlertTriangle className="w-3 h-3 text-rose-400" />}
        <span>Critical</span>
      </span>
    );
  }

  if (normStatus === 'low') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md font-semibold tracking-tight bg-amber-950/70 text-amber-400 border border-amber-800/50 ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
        } ${className}`}
        title="Low — Current stock is below or near the reorder level"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        {showLucideIcon && <AlertCircle className="w-3 h-3 text-amber-400" />}
        <span>Low</span>
      </span>
    );
  }

  // Healthy default
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold tracking-tight bg-emerald-950/70 text-emerald-400 border border-emerald-800/50 ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
      } ${className}`}
      title="Healthy — Stock is comfortably above the reorder level"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
      {showLucideIcon && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
      <span>Healthy</span>
    </span>
  );
}

export function getHealthDescription(status: InventoryHealthStatus | string): string {
  const norm = (status || '').toLowerCase().trim();
  if (norm === 'out of stock' || norm === 'out_of_stock') {
    return 'Current stock is 0';
  }
  if (norm === 'critical') {
    return 'Very low stock and immediate replenishment is required';
  }
  if (norm === 'low') {
    return 'Current stock is below or near the reorder level';
  }
  return 'Stock is comfortably above the reorder level';
}
