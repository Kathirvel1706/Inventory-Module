import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());

// Helper to read and write database
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return {
      nextItemId: 1,
      nextWarehouseId: 1,
      nextStockInId: 1,
      nextStockOutId: 1,
      nextSupplierId: 1,
      nextPOId: 1,
      nextDispatchId: 1,
      nextLogId: 1,
      items: [],
      warehouses: [],
      stock_ins: [],
      stock_outs: [],
      suppliers: [],
      purchase_orders: [],
      dispatches: [],
      activity_logs: [],
    };
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function logActivity(db: any, module: string, action: string, description: string, entity_id: any, user: string = 'Inventory Storekeeper') {
  if (!db.activity_logs) db.activity_logs = [];
  const nextId = db.nextLogId || (db.activity_logs.length + 1);
  db.nextLogId = nextId + 1;
  db.activity_logs.unshift({
    id: nextId,
    timestamp: new Date().toISOString(),
    module,
    action,
    description,
    entity_id,
    user,
  });
}

function calculateStock(db: any, itemId: number, warehouseId: number): number {
  const totalIn = (db.stock_ins || [])
    .filter((s: any) => Number(s.item_id) === Number(itemId) && Number(s.warehouse_id) === Number(warehouseId))
    .reduce((sum: number, s: any) => sum + Number(s.qty), 0);

  const totalOut = (db.stock_outs || [])
    .filter((s: any) => Number(s.item_id) === Number(itemId) && Number(s.warehouse_id) === Number(warehouseId))
    .reduce((sum: number, s: any) => sum + Number(s.qty), 0);

  return totalIn - totalOut;
}

function getHealthStatus(qty: number, reorderLevel: number): 'Healthy' | 'Low' | 'Critical' | 'Out of Stock' {
  if (qty <= 0) return 'Out of Stock';
  if (qty < reorderLevel * 0.5) return 'Critical';
  if (qty < reorderLevel) return 'Low';
  return 'Healthy';
}

// -------------------------------------------------------------
// ITEMS API
// -------------------------------------------------------------
app.get('/api/items', (req: Request, res: Response) => {
  const db = readData();
  let list = db.items || [];
  const { search, category, is_active } = req.query;

  if (search) {
    const s = String(search).toLowerCase();
    list = list.filter((i: any) => i.code.toLowerCase().includes(s) || i.name.toLowerCase().includes(s));
  }
  if (category) {
    list = list.filter((i: any) => i.category.toLowerCase() === String(category).toLowerCase());
  }
  if (is_active !== undefined) {
    const activeBool = is_active === 'true';
    list = list.filter((i: any) => i.is_active === activeBool);
  }

  res.json(list);
});

app.get('/api/items/:id', (req: Request, res: Response) => {
  const db = readData();
  const id = Number(req.params.id);
  const item = (db.items || []).find((i: any) => i.id === id);
  if (!item) {
    return res.status(404).json({ detail: `Item with ID ${id} not found` });
  }
  res.json(item);
});

app.post('/api/items', (req: Request, res: Response) => {
  const db = readData();
  const { code, name, category, uom, unit_cost, reorder_level, is_active, gsm, composition, shade_lot } = req.body;

  if (!code || !name || !category || !uom) {
    return res.status(422).json({ detail: 'Code, name, category and UOM are required' });
  }
  if (Number(unit_cost) < 0 || Number(reorder_level) < 0) {
    return res.status(422).json({ detail: 'Unit cost and reorder level must be non-negative' });
  }

  const existing = (db.items || []).find((i: any) => i.code.toUpperCase() === String(code).trim().toUpperCase());
  if (existing) {
    return res.status(400).json({ detail: `Item with code '${code}' already exists.` });
  }

  const newItem = {
    id: db.nextItemId || ((db.items?.length || 0) + 1),
    code: String(code).trim().toUpperCase(),
    name: String(name).trim(),
    category: String(category).trim(),
    uom: String(uom).trim(),
    unit_cost: Number(unit_cost) || 0,
    reorder_level: Number(reorder_level) || 0,
    is_active: is_active !== false,
    gsm: gsm ? Number(gsm) : undefined,
    composition: composition ? String(composition).trim() : undefined,
    shade_lot: shade_lot ? String(shade_lot).trim() : undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.nextItemId = newItem.id + 1;
  db.items.push(newItem);
  logActivity(db, 'ITEM', 'CREATED', `Registered new SKU ${newItem.code} - ${newItem.name}`, newItem.id);
  writeData(db);

  res.status(201).json(newItem);
});

// -------------------------------------------------------------
// WAREHOUSES API
// -------------------------------------------------------------
app.get('/api/warehouses', (req: Request, res: Response) => {
  const db = readData();
  let list = db.warehouses || [];
  const { search, is_active } = req.query;

  if (search) {
    const s = String(search).toLowerCase();
    list = list.filter((w: any) => w.name.toLowerCase().includes(s) || w.location.toLowerCase().includes(s));
  }
  if (is_active !== undefined) {
    const activeBool = is_active === 'true';
    list = list.filter((w: any) => w.is_active === activeBool);
  }

  res.json(list);
});

app.get('/api/warehouses/:id', (req: Request, res: Response) => {
  const db = readData();
  const id = Number(req.params.id);
  const wh = (db.warehouses || []).find((w: any) => w.id === id);
  if (!wh) {
    return res.status(404).json({ detail: `Warehouse with ID ${id} not found` });
  }
  res.json(wh);
});

app.post('/api/warehouses', (req: Request, res: Response) => {
  const db = readData();
  const { name, location, capacity, is_active } = req.body;

  if (!name || !location) {
    return res.status(422).json({ detail: 'Warehouse name and location are required' });
  }

  const existing = (db.warehouses || []).find((w: any) => w.name.toLowerCase() === String(name).trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ detail: `Warehouse with name '${name}' already exists.` });
  }

  const newWh = {
    id: db.nextWarehouseId || ((db.warehouses?.length || 0) + 1),
    name: String(name).trim(),
    location: String(location).trim(),
    capacity: capacity ? Number(capacity) : 50000,
    is_active: is_active !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.nextWarehouseId = newWh.id + 1;
  db.warehouses.push(newWh);
  logActivity(db, 'WAREHOUSE', 'CREATED', `Added new storage facility ${newWh.name}`, newWh.id);
  writeData(db);

  res.status(201).json(newWh);
});

// -------------------------------------------------------------
// STOCK IN API
// -------------------------------------------------------------
app.get('/api/stock-in', (req: Request, res: Response) => {
  const db = readData();
  let list = db.stock_ins || [];
  const { limit, item_id, warehouse_id } = req.query;

  if (item_id) list = list.filter((s: any) => Number(s.item_id) === Number(item_id));
  if (warehouse_id) list = list.filter((s: any) => Number(s.warehouse_id) === Number(warehouse_id));

  list = [...list].reverse();
  if (limit) list = list.slice(0, Number(limit));

  res.json(list);
});

app.post('/api/stock-in', (req: Request, res: Response) => {
  const db = readData();
  const { item_id, warehouse_id, qty, activity_date, supplier_reference, unit_cost, user } = req.body;

  const item = (db.items || []).find((i: any) => i.id === Number(item_id));
  if (!item) return res.status(404).json({ detail: `Item with ID ${item_id} does not exist` });

  const wh = (db.warehouses || []).find((w: any) => w.id === Number(warehouse_id));
  if (!wh) return res.status(404).json({ detail: `Warehouse with ID ${warehouse_id} does not exist` });

  const numQty = Number(qty);
  if (isNaN(numQty) || numQty <= 0) {
    return res.status(422).json({ detail: 'Quantity must be strictly greater than 0' });
  }

  const numCost = Number(unit_cost) || 0;
  if (numCost < 0) {
    return res.status(422).json({ detail: 'Unit cost must be non-negative' });
  }

  const newStockIn = {
    id: db.nextStockInId || ((db.stock_ins?.length || 0) + 1),
    item_id: item.id,
    warehouse_id: wh.id,
    item_code: item.code,
    item_name: item.name,
    item_uom: item.uom,
    warehouse_name: wh.name,
    qty: numQty,
    activity_date: activity_date || new Date().toISOString().split('T')[0],
    supplier_reference: supplier_reference ? String(supplier_reference).trim() : null,
    unit_cost: numCost,
    user: user || 'R. Sharma (Dock Storekeeper)',
    created_at: new Date().toISOString(),
  };

  db.nextStockInId = newStockIn.id + 1;
  db.stock_ins.push(newStockIn);
  logActivity(
    db,
    'STOCK_IN',
    'RECEIVED',
    `Received inward +${numQty} ${item.uom} of ${item.code} into ${wh.name}`,
    newStockIn.id,
    newStockIn.user
  );
  writeData(db);

  res.status(201).json(newStockIn);
});

// -------------------------------------------------------------
// STOCK OUT API (Negative Stock Prevention)
// -------------------------------------------------------------
app.get('/api/stock-out', (req: Request, res: Response) => {
  const db = readData();
  let list = db.stock_outs || [];
  const { limit, item_id, warehouse_id } = req.query;

  if (item_id) list = list.filter((s: any) => Number(s.item_id) === Number(item_id));
  if (warehouse_id) list = list.filter((s: any) => Number(s.warehouse_id) === Number(warehouse_id));

  list = [...list].reverse();
  if (limit) list = list.slice(0, Number(limit));

  res.json(list);
});

app.post('/api/stock-out', (req: Request, res: Response) => {
  const db = readData();
  const { item_id, warehouse_id, qty, activity_date, issued_to, user } = req.body;

  const item = (db.items || []).find((i: any) => i.id === Number(item_id));
  if (!item) return res.status(404).json({ detail: `Item with ID ${item_id} does not exist` });

  const wh = (db.warehouses || []).find((w: any) => w.id === Number(warehouse_id));
  if (!wh) return res.status(404).json({ detail: `Warehouse with ID ${warehouse_id} does not exist` });

  const numQty = Number(qty);
  if (isNaN(numQty) || numQty <= 0) {
    return res.status(422).json({ detail: 'Quantity must be strictly greater than 0' });
  }

  if (!issued_to || !String(issued_to).trim()) {
    return res.status(422).json({ detail: 'Issued-to department is required' });
  }

  // Calculate authoritative stock for this item & warehouse
  const availableQty = calculateStock(db, item.id, wh.id);

  if (numQty > availableQty) {
    const availStr = Number.isInteger(availableQty) ? String(availableQty) : String(Number(availableQty.toFixed(2)));
    const reqStr = Number.isInteger(numQty) ? String(numQty) : String(Number(numQty.toFixed(2)));
    return res.status(400).json({
      detail: `Insufficient stock. Available quantity: ${availStr}. Requested quantity: ${reqStr}.`
    });
  }

  const newStockOut = {
    id: db.nextStockOutId || ((db.stock_outs?.length || 0) + 1),
    item_id: item.id,
    warehouse_id: wh.id,
    item_code: item.code,
    item_name: item.name,
    item_uom: item.uom,
    warehouse_name: wh.name,
    qty: numQty,
    activity_date: activity_date || new Date().toISOString().split('T')[0],
    issued_to: String(issued_to).trim(),
    user: user || 'K. Kumar (Dispatch Officer)',
    created_at: new Date().toISOString(),
  };

  db.nextStockOutId = newStockOut.id + 1;
  db.stock_outs.push(newStockOut);
  logActivity(
    db,
    'STOCK_OUT',
    'ISSUED',
    `Issued -${numQty} ${item.uom} of ${item.code} from ${wh.name} to ${newStockOut.issued_to}`,
    newStockOut.id,
    newStockOut.user
  );
  writeData(db);

  res.status(201).json(newStockOut);
});

// -------------------------------------------------------------
// CURRENT STOCK & CSV EXPORT
// -------------------------------------------------------------
function buildCurrentStockList(db: any) {
  // Collect all unique (item_id, warehouse_id) pairs
  const pairsSet = new Set<string>();
  (db.stock_ins || []).forEach((s: any) => pairsSet.add(`${s.item_id}:${s.warehouse_id}`));
  (db.stock_outs || []).forEach((s: any) => pairsSet.add(`${s.item_id}:${s.warehouse_id}`));

  const itemsMap = new Map<number, any>((db.items || []).map((i: any) => [i.id, i]));
  const whMap = new Map<number, any>((db.warehouses || []).map((w: any) => [w.id, w]));

  // Ensure every registered item is represented in stock view
  const defaultWarehouseId = (db.warehouses || [])[0]?.id || 1;
  (db.items || []).forEach((item: any) => {
    let hasMovement = false;
    pairsSet.forEach((pairKey) => {
      if (pairKey.startsWith(`${item.id}:`)) {
        hasMovement = true;
      }
    });
    if (!hasMovement) {
      pairsSet.add(`${item.id}:${defaultWarehouseId}`);
    }
  });

  const result: any[] = [];

  pairsSet.forEach((pairKey) => {
    const [itemIdStr, whIdStr] = pairKey.split(':');
    const itemId = Number(itemIdStr);
    const whId = Number(whIdStr);

    const item = itemsMap.get(itemId);
    const wh = whMap.get(whId);
    if (!item || !wh) return;

    const currentQty = calculateStock(db, itemId, whId);
    const reorder = Number(item.reorder_level) || 0;
    const isLow = currentQty < reorder;
    const health = getHealthStatus(currentQty, reorder);
    const unitCost = Number(item.unit_cost) || 0;

    // Calculate consumption statistics
    const itemStockOuts = (db.stock_outs || []).filter(
      (s: any) => Number(s.item_id) === itemId && Number(s.warehouse_id) === whId
    );
    const recentConsumption = itemStockOuts.reduce((sum: number, s: any) => sum + Number(s.qty), 0);
    const avgConsumption = itemStockOuts.length > 0 ? Math.round(recentConsumption / itemStockOuts.length) : Math.round(reorder * 0.4);
    const suggestedReorder = Math.max(0, Math.ceil(reorder * 1.5 - currentQty));

    result.push({
      item_id: item.id,
      item_code: item.code,
      item_name: item.name,
      category: item.category,
      warehouse_id: wh.id,
      warehouse_name: wh.name,
      uom: item.uom,
      current_quantity: Math.round(currentQty * 100) / 100,
      reorder_level: reorder,
      is_low_stock: isLow,
      health_status: health,
      unit_cost: unitCost,
      total_valuation: Math.round(Math.max(0, currentQty) * unitCost * 100) / 100,
      gsm: item.gsm,
      composition: item.composition,
      shade_lot: item.shade_lot,
      recent_consumption: recentConsumption,
      recent_average_consumption: avgConsumption,
      suggested_reorder_qty: suggestedReorder,
      reorder_suggestion_text: isLow ? `Reorder Suggested — ${suggestedReorder.toLocaleString()} ${item.uom}` : undefined,
    });
  });

  result.sort((a, b) => a.item_code.localeCompare(b.item_code) || a.warehouse_name.localeCompare(b.warehouse_name));
  return result;
}

app.get('/api/stock/current', (req: Request, res: Response) => {
  const db = readData();
  let list = buildCurrentStockList(db);
  const { category, warehouse_id, low_stock_only } = req.query;

  if (category && category !== 'All') {
    list = list.filter((s) => s.category.toLowerCase() === String(category).toLowerCase());
  }
  if (warehouse_id) {
    list = list.filter((s) => s.warehouse_id === Number(warehouse_id));
  }
  if (low_stock_only === 'true') {
    list = list.filter((s) => s.is_low_stock);
  }

  res.json(list);
});

app.get('/api/stock/current/export', (req: Request, res: Response) => {
  const db = readData();
  const list = buildCurrentStockList(db);

  const headers = ['Code', 'Item Name', 'Category', 'Warehouse', 'UOM', 'Current Qty', 'Reorder Level'];
  const rows = list.map((item) => [
    `"${item.item_code}"`,
    `"${item.item_name.replace(/"/g, '""')}"`,
    `"${item.category}"`,
    `"${item.warehouse_name.replace(/"/g, '""')}"`,
    `"${item.uom}"`,
    item.current_quantity,
    item.reorder_level,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="current_stock.csv"');
  res.send(csv);
});

// -------------------------------------------------------------
// STOCK MOVEMENTS TIMELINE
// -------------------------------------------------------------
app.get('/api/stock/movements/:itemId', (req: Request, res: Response) => {
  const db = readData();
  const itemId = Number(req.params.itemId);
  const warehouseId = req.query.warehouse_id ? Number(req.query.warehouse_id) : undefined;

  const item = (db.items || []).find((i: any) => i.id === itemId);
  if (!item) return res.status(404).json({ detail: `Item with ID ${itemId} not found` });

  let inMovements = (db.stock_ins || [])
    .filter((s: any) => Number(s.item_id) === itemId && (!warehouseId || Number(s.warehouse_id) === warehouseId))
    .map((s: any) => ({
      id: `in-${s.id}`,
      transaction_type: 'STOCK_IN' as const,
      activity_date: s.activity_date,
      warehouse_name: s.warehouse_name,
      warehouse_id: s.warehouse_id,
      reference: s.supplier_reference || 'Inward Goods Receipt',
      user: s.user || 'Storekeeper',
      unit_cost: Number(s.unit_cost) || 0,
      qty: Number(s.qty),
      uom: s.item_uom || item.uom,
      timestamp: new Date(s.created_at || s.activity_date).getTime(),
    }));

  let outMovements = (db.stock_outs || [])
    .filter((s: any) => Number(s.item_id) === itemId && (!warehouseId || Number(s.warehouse_id) === warehouseId))
    .map((s: any) => ({
      id: `out-${s.id}`,
      transaction_type: 'STOCK_OUT' as const,
      activity_date: s.activity_date,
      warehouse_name: s.warehouse_name,
      warehouse_id: s.warehouse_id,
      reference: s.issued_to || 'Production Issue',
      user: s.user || 'Dispatch Officer',
      qty: Number(s.qty),
      uom: s.item_uom || item.uom,
      timestamp: new Date(s.created_at || s.activity_date).getTime(),
    }));

  const allMovements = [...inMovements, ...outMovements].sort((a, b) => a.timestamp - b.timestamp);

  // Calculate progressive running balance
  let running = 0;
  let totalIn = 0;
  let totalOut = 0;

  const withBalances = allMovements.map((m) => {
    if (m.transaction_type === 'STOCK_IN') {
      running += m.qty;
      totalIn += m.qty;
    } else {
      running -= m.qty;
      totalOut += m.qty;
    }
    return {
      ...m,
      running_balance: Math.round(running * 100) / 100,
    };
  });

  res.json({
    item,
    movements: withBalances,
    current_balance: Math.round(running * 100) / 100,
    total_in: totalIn,
    total_out: totalOut,
  });
});

// -------------------------------------------------------------
// SUPPLIERS API
// -------------------------------------------------------------
app.get('/api/suppliers', (req: Request, res: Response) => {
  const db = readData();
  let list = db.suppliers || [];
  const { search } = req.query;

  if (search) {
    const s = String(search).toLowerCase();
    list = list.filter((v: any) => v.name.toLowerCase().includes(s) || v.code.toLowerCase().includes(s) || v.materials_supplied.toLowerCase().includes(s));
  }

  res.json(list);
});

app.post('/api/suppliers', (req: Request, res: Response) => {
  const db = readData();
  const { code, name, contact_person, email, phone, country, materials_supplied, payment_terms, lead_time_days, rating } = req.body;

  const newSupplier = {
    id: db.nextSupplierId || ((db.suppliers?.length || 0) + 1),
    code: String(code).trim().toUpperCase(),
    name: String(name).trim(),
    contact_person: String(contact_person).trim(),
    email: String(email).trim(),
    phone: String(phone).trim(),
    country: country || 'India',
    materials_supplied: String(materials_supplied).trim(),
    payment_terms: payment_terms || 'Net 30 Days',
    lead_time_days: Number(lead_time_days) || 7,
    rating: Number(rating) || 5.0,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  db.nextSupplierId = newSupplier.id + 1;
  db.suppliers.push(newSupplier);
  logActivity(db, 'SUPPLIER', 'CREATED', `Enrolled supplier ${newSupplier.name} (${newSupplier.code})`, newSupplier.id);
  writeData(db);

  res.status(201).json(newSupplier);
});

app.delete('/api/suppliers/:id', (req: Request, res: Response) => {
  const db = readData();
  const id = Number(req.params.id);
  const index = (db.suppliers || []).findIndex((s: any) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ detail: `Supplier with ID ${id} not found` });
  }
  const removed = db.suppliers.splice(index, 1)[0];
  logActivity(db, 'SUPPLIER', 'DELETED', `Removed supplier ${removed.name} (${removed.code})`, removed.id);
  writeData(db);
  res.json({ message: `Supplier ${removed.name} removed successfully`, supplier: removed });
});

// -------------------------------------------------------------
// PURCHASE ORDERS API
// -------------------------------------------------------------
app.get('/api/purchase-orders', (req: Request, res: Response) => {
  const db = readData();
  let list = db.purchase_orders || [];
  const { search } = req.query;

  if (search) {
    const s = String(search).toLowerCase();
    list = list.filter((p: any) => p.po_number.toLowerCase().includes(s) || p.supplier_name.toLowerCase().includes(s));
  }

  res.json([...list].reverse());
});

app.post('/api/purchase-orders', (req: Request, res: Response) => {
  const db = readData();
  const { supplier_id, warehouse_id, order_date, expected_date, items, notes } = req.body;

  const supplier = (db.suppliers || []).find((s: any) => s.id === Number(supplier_id));
  const warehouse = (db.warehouses || []).find((w: any) => w.id === Number(warehouse_id));

  const totalAmount = (items || []).reduce((sum: number, it: any) => sum + (Number(it.order_qty) * Number(it.unit_cost)), 0);
  const nextId = db.nextPOId || ((db.purchase_orders?.length || 0) + 1);
  const poNumber = `PO-TX-2026-${String(nextId).padStart(3, '0')}`;

  const newPO = {
    id: nextId,
    po_number: poNumber,
    supplier_id: supplier?.id || supplier_id,
    supplier_name: supplier?.name || 'Selected Supplier',
    warehouse_id: warehouse?.id || warehouse_id,
    warehouse_name: warehouse?.name || 'Main Warehouse',
    order_date: order_date || new Date().toISOString().split('T')[0],
    expected_date: expected_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'Sent' as const,
    payment_status: 'Unpaid' as const,
    items: (items || []).map((it: any) => ({
      item_id: it.item_id,
      item_code: it.item_code,
      item_name: it.item_name,
      uom: it.uom,
      order_qty: Number(it.order_qty),
      unit_cost: Number(it.unit_cost),
      received_qty: 0,
    })),
    total_amount: totalAmount,
    notes: notes || undefined,
    created_at: new Date().toISOString(),
  };

  db.nextPOId = nextId + 1;
  db.purchase_orders.push(newPO);
  logActivity(db, 'PURCHASE', 'CREATED', `Generated Purchase Order ${newPO.po_number} for ${newPO.supplier_name} ($${totalAmount})`, newPO.id);
  writeData(db);

  res.status(201).json(newPO);
});

// Auto-receive items from PO directly into Stock In
app.post('/api/purchase-orders/:id/receive', (req: Request, res: Response) => {
  const db = readData();
  const id = Number(req.params.id);
  const po = (db.purchase_orders || []).find((p: any) => p.id === id);
  if (!po) return res.status(404).json({ detail: `Purchase Order ${id} not found` });

  const wh = (db.warehouses || []).find((w: any) => w.id === po.warehouse_id) || db.warehouses[0];
  const today = new Date().toISOString().split('T')[0];

  po.items.forEach((line: any) => {
    const qtyToReceive = line.order_qty - line.received_qty;
    if (qtyToReceive > 0) {
      const newStockInId = db.nextStockInId || (db.stock_ins.length + 1);
      db.nextStockInId = newStockInId + 1;

      db.stock_ins.push({
        id: newStockInId,
        item_id: line.item_id,
        warehouse_id: wh.id,
        item_code: line.item_code,
        item_name: line.item_name,
        item_uom: line.uom,
        warehouse_name: wh.name,
        qty: qtyToReceive,
        activity_date: today,
        supplier_reference: `${po.supplier_name} (${po.po_number})`,
        unit_cost: line.unit_cost,
        po_number: po.po_number,
        created_at: new Date().toISOString(),
      });

      line.received_qty = line.order_qty;
    }
  });

  po.status = 'Completed';
  logActivity(db, 'PURCHASE', 'RECEIVED', `Auto-received items for PO ${po.po_number} into ${wh.name}`, po.id);
  writeData(db);

  res.json(po);
});

// Auto-generate Reorder PO for all low stock items
app.post('/api/purchase-orders/auto-reorder', (req: Request, res: Response) => {
  const db = readData();
  const currentStocks = buildCurrentStockList(db);
  const lowStocks = currentStocks.filter((s) => s.is_low_stock);

  if (lowStocks.length === 0) {
    return res.json({ message: 'All items are currently at safe stock levels! No replenishment needed.' });
  }

  const supplier = db.suppliers?.[0] || { id: 1, name: 'Vardhman Textiles Ltd' };
  const warehouse = db.warehouses?.[0] || { id: 1, name: 'Fabric Warehouse - Ground Floor' };

  const poItems = lowStocks.map((item) => {
    const qtyNeeded = Math.ceil(Math.max(item.reorder_level * 1.5, item.reorder_level - item.current_quantity + 100));
    return {
      item_id: item.item_id,
      item_code: item.item_code,
      item_name: item.item_name,
      uom: item.uom,
      order_qty: qtyNeeded,
      unit_cost: item.unit_cost,
      received_qty: 0,
    };
  });

  const totalAmount = poItems.reduce((sum, it) => sum + it.order_qty * it.unit_cost, 0);
  const nextId = db.nextPOId || ((db.purchase_orders?.length || 0) + 1);
  const poNumber = `PO-TX-2026-${String(nextId).padStart(3, '0')}`;

  const newPO = {
    id: nextId,
    po_number: poNumber,
    supplier_id: supplier.id,
    supplier_name: supplier.name,
    warehouse_id: warehouse.id,
    warehouse_name: warehouse.name,
    order_date: new Date().toISOString().split('T')[0],
    expected_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'Sent' as const,
    payment_status: 'Unpaid' as const,
    items: poItems,
    total_amount: totalAmount,
    notes: `Automated replenishment PO generated for ${lowStocks.length} SKUs below reorder threshold.`,
    created_at: new Date().toISOString(),
  };

  db.nextPOId = nextId + 1;
  db.purchase_orders.push(newPO);
  logActivity(db, 'PURCHASE', 'CREATED', `Generated Purchase Order ${newPO.po_number} for ${newPO.supplier_name} ($${totalAmount})`, newPO.id);
  writeData(db);

  res.status(201).json({ message: 'Auto-reorder PO created successfully', po: newPO });
});

// -------------------------------------------------------------
// DISPATCHES API
// -------------------------------------------------------------
app.get('/api/dispatches', (req: Request, res: Response) => {
  const db = readData();
  let list = db.dispatches || [];
  const { search } = req.query;

  if (search) {
    const s = String(search).toLowerCase();
    list = list.filter((d: any) => d.dispatch_no.toLowerCase().includes(s) || d.buyer_name.toLowerCase().includes(s));
  }

  res.json([...list].reverse());
});

app.post('/api/dispatches', (req: Request, res: Response) => {
  const db = readData();
  const { buyer_name, order_ref, warehouse_id, carrier, destination, dispatch_date, items, remarks } = req.body;

  const warehouse = (db.warehouses || []).find((w: any) => w.id === Number(warehouse_id));
  const nextId = db.nextDispatchId || ((db.dispatches?.length || 0) + 1);
  const dispatchNo = `DSP-2026-${String(nextId).padStart(3, '0')}`;
  const gatePassNo = `GP-2026-${Math.floor(100 + Math.random() * 900)}`;

  // Check stock availability for each dispatch line item first
  for (const line of items || []) {
    const avail = calculateStock(db, line.item_id, warehouse_id);
    if (Number(line.qty) > avail) {
      return res.status(400).json({
        detail: `Insufficient stock for '${line.item_name || line.item_code}'. Available: ${avail}, Requested: ${line.qty}`
      });
    }
  }

  // Deduct items from warehouse via stock_out
  const today = dispatch_date || new Date().toISOString().split('T')[0];
  items.forEach((line: any) => {
    const nextStockOutId = db.nextStockOutId || (db.stock_outs.length + 1);
    db.nextStockOutId = nextStockOutId + 1;

    db.stock_outs.push({
      id: nextStockOutId,
      item_id: line.item_id,
      warehouse_id: warehouse_id,
      item_code: line.item_code,
      item_name: line.item_name,
      item_uom: line.uom,
      warehouse_name: warehouse?.name || 'Warehouse',
      qty: Number(line.qty),
      activity_date: today,
      issued_to: `Export Dispatch: ${buyer_name} (${order_ref})`,
      created_at: new Date().toISOString(),
    });
  });

  const newDispatch = {
    id: nextId,
    dispatch_no: dispatchNo,
    buyer_name,
    order_ref,
    warehouse_id,
    warehouse_name: warehouse?.name || 'Warehouse',
    carrier: carrier || 'Ocean Line Logistics',
    tracking_number: `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
    dispatch_date: today,
    destination,
    gate_pass_no: gatePassNo,
    status: 'Dispatched' as const,
    items,
    remarks,
    created_at: new Date().toISOString(),
  };

  db.nextDispatchId = nextId + 1;
  db.dispatches.push(newDispatch);
  logActivity(db, 'DISPATCH', 'DISPATCHED', `Export consignment ${dispatchNo} dispatched to ${buyer_name}`, newDispatch.id);
  writeData(db);

  res.status(201).json(newDispatch);
});

app.patch('/api/dispatches/:id/status', (req: Request, res: Response) => {
  const db = readData();
  const id = Number(req.params.id);
  const dsp = (db.dispatches || []).find((d: any) => d.id === id);
  if (!dsp) return res.status(404).json({ detail: `Dispatch ${id} not found` });

  const { status } = req.body;
  dsp.status = status;
  logActivity(db, 'DISPATCH', 'STATUS_CHANGE', `Shipment ${dsp.dispatch_no} status updated to ${status}`, dsp.id);
  writeData(db);

  res.json(dsp);
});

// -------------------------------------------------------------
// ACTIVITY LOGS API
// -------------------------------------------------------------
app.get('/api/activity-logs', (req: Request, res: Response) => {
  const db = readData();
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const logs = (db.activity_logs || []).slice(0, limit);
  res.json(logs);
});

// -------------------------------------------------------------
// ANALYTICS & REORDER SUGGESTIONS API
// -------------------------------------------------------------
app.get('/api/analytics', (req: Request, res: Response) => {
  const db = readData();
  const stocks = buildCurrentStockList(db);

  const totalValuation = stocks.reduce((sum, s) => sum + s.total_valuation, 0);
  const totalReceipts = (db.stock_ins || []).reduce((sum: number, s: any) => sum + Number(s.qty), 0);
  const totalIssues = (db.stock_outs || []).reduce((sum: number, s: any) => sum + Number(s.qty), 0);
  const totalActiveSkus = (db.items || []).filter((i: any) => i.is_active).length;

  // Warehouse breakdown
  const whMap = new Map();
  (db.warehouses || []).forEach((w: any) => {
    whMap.set(w.id, {
      warehouse_id: w.id,
      warehouse_name: w.name,
      location: w.location,
      total_units: 0,
      capacity: w.capacity || 50000,
      valuation: 0,
      utilization_percentage: 0,
    });
  });

  stocks.forEach((s) => {
    if (whMap.has(s.warehouse_id)) {
      const cur = whMap.get(s.warehouse_id);
      cur.total_units += Math.max(0, s.current_quantity);
      cur.valuation += s.total_valuation;
    }
  });

  const warehouseBreakdown = Array.from(whMap.values()).map((w: any) => ({
    ...w,
    utilization_percentage: Math.min(100, Math.round((w.total_units / (w.capacity || 50000)) * 100)),
  }));

  // Category breakdown
  const catMap = new Map();
  stocks.forEach((s) => {
    if (!catMap.has(s.category)) {
      catMap.set(s.category, { category: s.category, sku_count: 0, valuation: 0 });
    }
    const cat = catMap.get(s.category);
    cat.sku_count += 1;
    cat.valuation += s.total_valuation;
  });
  const categoryBreakdown = Array.from(catMap.values());

  // Top moving items
  const issueCounts = new Map<string, { code: string; name: string; uom: string; issued_qty: number; tx_count: number }>();
  (db.stock_outs || []).forEach((s: any) => {
    const key = s.item_code || `item-${s.item_id}`;
    if (!issueCounts.has(key)) {
      issueCounts.set(key, {
        code: s.item_code || '',
        name: s.item_name || '',
        uom: s.item_uom || 'units',
        issued_qty: 0,
        tx_count: 0,
      });
    }
    const itemStat = issueCounts.get(key)!;
    itemStat.issued_qty += Number(s.qty);
    itemStat.tx_count += 1;
  });

  const topMoving = Array.from(issueCounts.values())
    .sort((a, b) => b.issued_qty - a.issued_qty)
    .slice(0, 5);

  res.json({
    total_inventory_valuation: totalValuation,
    total_receipts_units: totalReceipts,
    total_issues_units: totalIssues,
    total_active_skus: totalActiveSkus,
    warehouse_breakdown: warehouseBreakdown,
    category_breakdown: categoryBreakdown,
    top_moving_items: topMoving,
  });
});

app.get('/api/reorder-suggestions', (req: Request, res: Response) => {
  const db = readData();
  const stocks = buildCurrentStockList(db);
  const lowStocks = stocks.filter((s) => s.is_low_stock);

  const suggestions = lowStocks.map((s, idx) => ({
    id: idx + 1,
    item_id: s.item_id,
    name: s.item_name,
    warehouse: s.warehouse_name,
    warehouse_id: s.warehouse_id,
    currentStock: s.current_quantity,
    reorderLevel: s.reorder_level,
    suggestedQty: s.suggested_reorder_qty || Math.ceil(s.reorder_level * 1.5 - s.current_quantity),
  }));

  res.json(suggestions);
});

// -------------------------------------------------------------
// VITE INTEGRATION FOR FULL-STACK SPA (SUPPORTS CTRL+F5 REFRESH)
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.get('*', async (req: Request, res: Response, next: NextFunction) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  const listenPort = PORT;
  const server = app.listen(listenPort, '0.0.0.0', () => {
    console.log(`Inventory ERP server running at http://localhost:${listenPort}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = listenPort + 1;
      console.warn(`Port ${listenPort} is in use. Falling back to http://localhost:${fallbackPort}`);
      app.listen(fallbackPort, '0.0.0.0', () => {
        console.log(`Inventory ERP server running at http://localhost:${fallbackPort}`);
      });
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
