import {
  Item,
  ItemCreateInput,
  Warehouse,
  WarehouseCreateInput,
  StockInRecord,
  StockInCreateInput,
  StockOutRecord,
  StockOutCreateInput,
  CurrentStockItem,
  ItemTimelineResponse,
  Supplier,
  PurchaseOrder,
  DispatchRecord,
  ActivityLog,
  AnalyticsSummary,
  ReorderSuggestion,
} from '../types/inventory';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        errorDetail = errJson.detail;
      } else if (errJson && errJson.message) {
        errorDetail = errJson.message;
      }
    } catch {
      // not json
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

// Items
export async function getItems(params?: { search?: string; category?: string; is_active?: boolean }): Promise<Item[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.category) query.append('category', params.category);
  if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));

  const res = await fetch(`${API_BASE}/items?${query.toString()}`);
  return handleResponse<Item[]>(res);
}

export async function getItem(id: number): Promise<Item> {
  const res = await fetch(`${API_BASE}/items/${id}`);
  return handleResponse<Item>(res);
}

export async function createItem(data: ItemCreateInput): Promise<Item> {
  const res = await fetch(`${API_BASE}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Item>(res);
}

// Warehouses
export async function getWarehouses(params?: { search?: string; is_active?: boolean }): Promise<Warehouse[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));

  const res = await fetch(`${API_BASE}/warehouses?${query.toString()}`);
  return handleResponse<Warehouse[]>(res);
}

export async function getWarehouse(id: number): Promise<Warehouse> {
  const res = await fetch(`${API_BASE}/warehouses/${id}`);
  return handleResponse<Warehouse>(res);
}

export async function createWarehouse(data: WarehouseCreateInput): Promise<Warehouse> {
  const res = await fetch(`${API_BASE}/warehouses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Warehouse>(res);
}

// Current Stock
export async function getCurrentStock(params?: {
  category?: string;
  warehouse_id?: number;
  low_stock_only?: boolean;
}): Promise<CurrentStockItem[]> {
  const query = new URLSearchParams();
  if (params?.category && params.category !== 'All') query.append('category', params.category);
  if (params?.warehouse_id) query.append('warehouse_id', String(params.warehouse_id));
  if (params?.low_stock_only) query.append('low_stock_only', 'true');

  const res = await fetch(`${API_BASE}/stock/current?${query.toString()}`);
  return handleResponse<CurrentStockItem[]>(res);
}

export function getExportCsvUrl(): string {
  return `${API_BASE}/stock/current/export`;
}

// Stock In
export async function getStockInList(params?: {
  limit?: number;
  item_id?: number;
  warehouse_id?: number;
}): Promise<StockInRecord[]> {
  const query = new URLSearchParams();
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.item_id) query.append('item_id', String(params.item_id));
  if (params?.warehouse_id) query.append('warehouse_id', String(params.warehouse_id));

  const res = await fetch(`${API_BASE}/stock-in?${query.toString()}`);
  return handleResponse<StockInRecord[]>(res);
}

export async function createStockIn(data: StockInCreateInput): Promise<StockInRecord> {
  const res = await fetch(`${API_BASE}/stock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<StockInRecord>(res);
}

// Stock Out
export async function getStockOutList(params?: {
  limit?: number;
  item_id?: number;
  warehouse_id?: number;
}): Promise<StockOutRecord[]> {
  const query = new URLSearchParams();
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.item_id) query.append('item_id', String(params.item_id));
  if (params?.warehouse_id) query.append('warehouse_id', String(params.warehouse_id));

  const res = await fetch(`${API_BASE}/stock-out?${query.toString()}`);
  return handleResponse<StockOutRecord[]>(res);
}

export async function createStockOut(data: StockOutCreateInput): Promise<StockOutRecord> {
  const res = await fetch(`${API_BASE}/stock-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<StockOutRecord>(res);
}

// Item Timeline
export async function getItemTimeline(itemId: number, warehouseId?: number): Promise<ItemTimelineResponse> {
  const query = new URLSearchParams();
  if (warehouseId) query.append('warehouse_id', String(warehouseId));

  const res = await fetch(`${API_BASE}/stock/movements/${itemId}?${query.toString()}`);
  return handleResponse<ItemTimelineResponse>(res);
}

// Suppliers
export async function getSuppliers(search?: string): Promise<Supplier[]> {
  const query = new URLSearchParams();
  if (search) query.append('search', search);

  const res = await fetch(`${API_BASE}/suppliers?${query.toString()}`);
  return handleResponse<Supplier[]>(res);
}

export async function createSupplier(data: Omit<Supplier, 'id' | 'created_at'>): Promise<Supplier> {
  const res = await fetch(`${API_BASE}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Supplier>(res);
}

export async function deleteSupplier(id: number): Promise<{ message: string; supplier?: Supplier }> {
  const res = await fetch(`${API_BASE}/suppliers/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<{ message: string; supplier?: Supplier }>(res);
}

// Purchase Orders
export async function getPurchaseOrders(search?: string): Promise<PurchaseOrder[]> {
  const query = new URLSearchParams();
  if (search) query.append('search', search);

  const res = await fetch(`${API_BASE}/purchase-orders?${query.toString()}`);
  return handleResponse<PurchaseOrder[]>(res);
}

export async function createPurchaseOrder(data: {
  supplier_id: number;
  warehouse_id: number;
  order_date: string;
  expected_date: string;
  items: Array<{
    item_id: number;
    item_code: string;
    item_name: string;
    uom: string;
    order_qty: number;
    unit_cost: number;
  }>;
  notes?: string;
}): Promise<PurchaseOrder> {
  const res = await fetch(`${API_BASE}/purchase-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<PurchaseOrder>(res);
}

export async function receivePurchaseOrder(poId: number): Promise<PurchaseOrder> {
  const res = await fetch(`${API_BASE}/purchase-orders/${poId}/receive`, {
    method: 'POST',
  });
  return handleResponse<PurchaseOrder>(res);
}

export async function autoGenerateReorderPO(): Promise<{ message: string; po?: PurchaseOrder }> {
  const res = await fetch(`${API_BASE}/purchase-orders/auto-reorder`, {
    method: 'POST',
  });
  return handleResponse<{ message: string; po?: PurchaseOrder }>(res);
}

// Dispatches
export async function getDispatches(search?: string): Promise<DispatchRecord[]> {
  const query = new URLSearchParams();
  if (search) query.append('search', search);

  const res = await fetch(`${API_BASE}/dispatches?${query.toString()}`);
  return handleResponse<DispatchRecord[]>(res);
}

export async function createDispatch(data: {
  buyer_name: string;
  order_ref: string;
  warehouse_id: number;
  carrier: string;
  destination: string;
  dispatch_date: string;
  items: Array<{
    item_id: number;
    item_code: string;
    item_name: string;
    uom: string;
    qty: number;
  }>;
  remarks?: string;
}): Promise<DispatchRecord> {
  const res = await fetch(`${API_BASE}/dispatches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<DispatchRecord>(res);
}

export async function updateDispatchStatus(id: number, status: DispatchRecord['status']): Promise<DispatchRecord> {
  const res = await fetch(`${API_BASE}/dispatches/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse<DispatchRecord>(res);
}

// Activity Logs
export async function getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
  const res = await fetch(`${API_BASE}/activity-logs?limit=${limit}`);
  return handleResponse<ActivityLog[]>(res);
}

// Analytics
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await fetch(`${API_BASE}/analytics`);
  return handleResponse<AnalyticsSummary>(res);
}

// Reorder Suggestions
export async function getReorderSuggestions(): Promise<ReorderSuggestion[]> {
  const res = await fetch(`${API_BASE}/reorder-suggestions`);
  return handleResponse<ReorderSuggestion[]>(res);
}
