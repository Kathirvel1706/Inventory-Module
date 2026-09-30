import React, { useState } from 'react';
import { 
  Boxes, 
  Warehouse as WarehouseIcon, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Package, 
  RefreshCw,
  AlertTriangle,
  Building2,
  ChevronRight,
  ShieldCheck,
  History,
  LayoutDashboard,
  BarChart3,
  ChevronDown,
  ShoppingBag,
  Users,
  Settings,
  Zap,
  ArrowLeftRight,
  Home,
  CheckCircle2,
  Truck
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentStock } from '../api/client';

interface LayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export function Layout({ currentPath, onNavigate, children }: LayoutProps) {
  const [modulesOpen, setModulesOpen] = useState(true);

  // Query current stock for live low-stock alerts badge
  const { data: stockData } = useQuery({
    queryKey: ['currentStock'],
    queryFn: () => getCurrentStock(),
    refetchInterval: 15000,
  });

  const lowStockCount = stockData?.filter(s => s.is_low_stock).length || 0;

  // Primary top navigation items matching the reference image
  const primaryNavItems = [
    {
      id: '/dashboard',
      label: 'Inventory Dashboard',
      icon: Home,
    },
    {
      id: '/stock/current',
      label: 'Current Stock',
      icon: Boxes,
      badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
    },
    {
      id: '/stock-in',
      label: 'Stock In',
      icon: ArrowDownLeft,
    },
    {
      id: '/stock-out',
      label: 'Stock Out',
      icon: ArrowUpRight,
    },
    {
      id: '/stock/movements',
      label: 'Stock Movement',
      icon: ArrowLeftRight,
    },
    {
      id: '/reorders',
      label: 'Reorder Management',
      icon: AlertTriangle,
    },
    {
      id: '/analytics',
      label: 'Reports & Analytics',
      icon: BarChart3,
    },
  ];

  // Secondary Modules & Operations group matching the reference image
  const operationsNavItems = [
    {
      id: '/dispatches',
      label: 'Dispatches & Gate Pass',
      icon: Truck,
    },
    {
      id: '/suppliers',
      label: 'Suppliers',
      icon: Users,
    },
    {
      id: '/purchase-orders',
      label: 'Purchase Orders',
      icon: ShoppingBag,
    },
    {
      id: '/masters/warehouses',
      label: 'Warehouses',
      icon: WarehouseIcon,
    },
    {
      id: '/masters/items',
      label: 'Items / Products',
      icon: Package,
    },
  ];

  const renderNavButton = (item: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }) => {
    const Icon = item.icon;
    const isActive = 
      currentPath === item.id || 
      (item.id === '/dashboard' && (currentPath === '/dashboard' || currentPath === '/')) ||
      (item.id === '/stock/current' && currentPath === '/stock/current') ||
      (item.id === '/stock/movements' && (currentPath === '/stock/movements' || currentPath === '/movements'));

    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        className={`w-full group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
          isActive
            ? 'bg-[#1d4ed8] text-white shadow-sm font-semibold'
            : 'text-slate-400 hover:bg-[#0e1b36] hover:text-slate-200'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`w-4 h-4 flex-shrink-0 transition-transform ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#070d19] text-slate-100 font-sans antialiased overflow-hidden selection:bg-blue-600/30 selection:text-blue-200">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#060b17] text-slate-300 flex flex-col flex-shrink-0 border-r border-[#131f37] select-none z-20">
          {/* Brand Header */}
          <div className="h-16 px-5 border-b border-[#131f37] flex items-center gap-3 bg-[#060b17]">
            {/* Hexagon isometric 3D logo icon */}
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 border border-blue-400/30">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 font-bold text-sm tracking-wide text-white">
                <span>INVENTORY</span>
                <span className="text-[#38bdf8]">PRO</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate tracking-tight">Smart Stock. Better Business.</p>
            </div>
          </div>

          {/* Navigation List */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {primaryNavItems.map(renderNavButton)}

            {/* Modules & Operations Collapsible Group */}
            <div className="pt-4 pb-1">
              <button
                onClick={() => setModulesOpen(!modulesOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <span>Modules & Operations</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${modulesOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {modulesOpen && (
              <div className="space-y-1">
                {operationsNavItems.map(renderNavButton)}
              </div>
            )}
          </nav>

          {/* Sidebar Bottom Promo Card */}
          <div className="p-3 m-3 rounded-xl bg-[#0c162c] border border-[#162646] text-slate-400 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2 text-blue-500/70">
              <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 16l4-6 4 3 6-8" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="21" cy="5" r="2"/>
              </svg>
            </div>
            <p className="text-[11px] font-medium text-slate-300 leading-snug">
              Efficient Inventory
            </p>
            <p className="text-[10px] text-slate-400 leading-snug">
              for a Smarter Tomorrow
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#070d19]">
          {/* Content Body */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#070d19]">
            {children}
          </main>
        </div>
      </div>

      {/* App-wide Dark ERP Footer Bar */}
      <footer className="h-8 bg-[#060b17] border-t border-[#131f37] px-6 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0 z-20">
        <div>Inventory Pro v1.0.0</div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Zap className="w-3 h-3 text-blue-400" />
          <span>Built for a smarter supply chain</span>
        </div>
      </footer>
    </div>
  );
}
