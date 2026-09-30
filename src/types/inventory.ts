export type InventoryHealthStatus = 'Healthy' | 'Low' | 'Critical' | 'Out of Stock';

export interface Item {
  id: number;
  code: string;
  name: string;
  category: string;
  uom: string;
  unit_cost: number;
  reorder_level: number;
  is_active: boolean;
  gsm?: number;
  composition?: string;
  shade_lot?: string;
  created_at: string;
  updated_at?: string;
}

export interface ItemCreateInput {
  code: string;
  name: string;
  category: string;
  uom: string;
  unit_cost: number;
  reorder_level: number;
  is_active: boolean;
  gsm?: number;
  composition?: string;
  shade_lot?: string;
}

export interface Warehouse {
  id: number;
  name: string;
  location: string;
  capacity?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface WarehouseCreateInput {
  name: string;
  location: string;
  capacity?: number;
  is_active?: boolean;
}

export interface StockInRecord {
  id: number;
  item_id: number;
  warehouse_id: number;
  item_code?: string;
  item_name?: string;
  item_uom?: string;
  warehouse_name?: string;
  qty: number;
  activity_date: string;
  supplier_reference?: string;
  unit_cost: number;
  po_number?: string;
  user?: string;
  created_at: string;
}

export interface StockInCreateInput {
  item_id: number;
  warehouse_id: number;
  qty: number;
  activity_date: string;
  supplier_reference?: string;
  unit_cost: number;
  user?: string;
}

export interface StockOutRecord {
  id: number;
  item_id: number;
  warehouse_id: number;
  item_code?: string;
  item_name?: string;
  item_uom?: string;
  warehouse_name?: string;
  qty: number;
  activity_date: string;
  issued_to: string;
  user?: string;
  created_at: string;
}

export interface StockOutCreateInput {
  item_id: number;
  warehouse_id: number;
  qty: number;
  activity_date: string;
  issued_to: string;
  user?: string;
}

export interface CurrentStockItem {
  item_id: number;
  item_code: string;
  item_name: string;
  category: string;
  warehouse_id: number;
  warehouse_name: string;
  uom: string;
  current_quantity: number;
  reorder_level: number;
  is_low_stock: boolean;
  health_status: InventoryHealthStatus;
  unit_cost: number;
  total_valuation?: number;
  gsm?: number;
  composition?: string;
  shade_lot?: string;
  recent_consumption?: number;
  recent_average_consumption?: number;
  suggested_reorder_qty?: number;
  reorder_suggestion_text?: string;
}

export interface StockMovementItem {
  id: number | string;
  transaction_type: 'STOCK_IN' | 'STOCK_OUT';
  activity_date: string;
  warehouse_name: string;
  warehouse_id?: number;
  reference: string;
  user: string;
  unit_cost?: number;
  qty: number;
  uom: string;
  running_balance: number;
}

export interface ItemTimelineResponse {
  item: Item;
  movements: StockMovementItem[];
  current_balance: number;
  total_in: number;
  total_out: number;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  materials_supplied: string;
  payment_terms: string;
  lead_time_days: number;
  rating: number;
  is_active: boolean;
  created_at: string;
}

export interface POLineItem {
  item_id: number;
  item_code: string;
  item_name: string;
  uom: string;
  order_qty: number;
  unit_cost: number;
  received_qty: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  warehouse_id: number;
  warehouse_name: string;
  order_date: string;
  expected_date: string;
  status: 'Sent' | 'Partially Received' | 'Completed';
  payment_status: 'Unpaid' | 'Partial' | 'Paid';
  items: POLineItem[];
  total_amount: number;
  notes?: string;
  created_at: string;
}

export interface DispatchLineItem {
  item_id: number;
  item_code: string;
  item_name: string;
  uom: string;
  qty: number;
}

export interface DispatchRecord {
  id: number;
  dispatch_no: string;
  buyer_name: string;
  order_ref: string;
  warehouse_id: number;
  warehouse_name: string;
  carrier: string;
  tracking_number: string;
  dispatch_date: string;
  destination: string;
  gate_pass_no: string;
  status: 'Prepared' | 'Dispatched' | 'In Transit' | 'Delivered';
  items: DispatchLineItem[];
  remarks?: string;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  timestamp: string;
  module: string;
  action: string;
  description: string;
  entity_id: string | number;
  user: string;
}

export interface WarehouseBreakdown {
  warehouse_id: number;
  warehouse_name: string;
  location: string;
  total_units: number;
  capacity: number;
  valuation: number;
  utilization_percentage: number;
}

export interface CategoryBreakdown {
  category: string;
  sku_count: number;
  valuation: number;
}

export interface TopMovingItem {
  code: string;
  name: string;
  uom: string;
  issued_qty: number;
  tx_count: number;
}

export interface AnalyticsSummary {
  total_inventory_valuation: number;
  total_receipts_units: number;
  total_issues_units: number;
  total_active_skus: number;
  warehouse_breakdown: WarehouseBreakdown[];
  category_breakdown: CategoryBreakdown[];
  top_moving_items: TopMovingItem[];
}

export interface ReorderSuggestion {
  id: number;
  item_id: number;
  name: string;
  warehouse: string;
  warehouse_id: number;
  currentStock: number;
  reorderLevel: number;
  suggestedQty: number;
}
