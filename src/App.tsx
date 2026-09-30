import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { CurrentStockPage } from './components/CurrentStockPage';
import { StockInPage } from './components/StockInPage';
import { StockOutPage } from './components/StockOutPage';
import { ItemMasterPage } from './components/ItemMasterPage';
import { WarehouseMasterPage } from './components/WarehouseMasterPage';
import { StockMovementTimelinePage } from './components/StockMovementTimelinePage';
import { DashboardPage } from './components/DashboardPage';
import { SuppliersPage } from './components/SuppliersPage';
import { PurchaseOrdersPage } from './components/PurchaseOrdersPage';
import { DispatchPage } from './components/DispatchPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { StockAlertsPage } from './components/StockAlertsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10,
      retry: 1,
    },
  },
});

const VALID_PATHS = [
  '/',
  '/dashboard',
  '/stock/current',
  '/stock/movements',
  '/movements',
  '/stock-in',
  '/stock-out',
  '/dispatches',
  '/masters/items',
  '/masters/warehouses',
  '/suppliers',
  '/purchase-orders',
  '/analytics',
  '/reorders',
  '/stock/alerts'
];

function getInitialPath(): string {
  const path = window.location.pathname;
  if (VALID_PATHS.some(p => path === p || path.startsWith(p + '?') || (p !== '/' && path.startsWith(p)))) {
    return path;
  }
  return '/dashboard';
}

function parseUrlParams(searchStr: string) {
  const params = new URLSearchParams(searchStr);
  return {
    itemId: params.get('item_id') ? parseInt(params.get('item_id')!, 10) : undefined,
    warehouseId: params.get('warehouse_id') ? parseInt(params.get('warehouse_id')!, 10) : undefined,
  };
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(getInitialPath);
  const [routeParams, setRouteParams] = useState(() => parseUrlParams(window.location.search));

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getInitialPath());
      setRouteParams(parseUrlParams(window.location.search));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (pathWithQuery: string) => {
    const [path, search] = pathWithQuery.split('?');
    setCurrentPath(path);
    setRouteParams(parseUrlParams(search ? `?${search}` : ''));
    window.history.pushState({}, '', pathWithQuery);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Layout currentPath={currentPath.split('?')[0]} onNavigate={handleNavigate}>
        {(currentPath === '/' || currentPath === '/dashboard') && (
          <DashboardPage onNavigate={handleNavigate} />
        )}
        {currentPath === '/stock/current' && (
          <CurrentStockPage onNavigate={handleNavigate} />
        )}
        {(currentPath === '/stock/movements' || currentPath === '/movements') && (
          <StockMovementTimelinePage 
            initialItemId={routeParams.itemId} 
            initialWarehouseId={routeParams.warehouseId} 
            onNavigate={handleNavigate} 
          />
        )}
        {currentPath === '/stock-in' && <StockInPage />}
        {currentPath === '/stock-out' && <StockOutPage />}
        {currentPath === '/dispatches' && <DispatchPage />}
        {currentPath === '/masters/items' && <ItemMasterPage onNavigate={handleNavigate} />}
        {currentPath === '/masters/warehouses' && <WarehouseMasterPage />}
        {currentPath === '/suppliers' && <SuppliersPage />}
        {currentPath === '/purchase-orders' && <PurchaseOrdersPage />}
        {currentPath === '/analytics' && <AnalyticsPage />}
        {(currentPath === '/reorders' || currentPath === '/stock/alerts') && <StockAlertsPage onNavigate={handleNavigate} />}
      </Layout>
    </QueryClientProvider>
  );
}
