export type UserRole =
  | 'Super Admin'
  | 'Inventory Manager'
  | 'Procurement Officer'
  | 'Warehouse Supervisor'
  | 'Store POS Operator'
  | 'Supply Chain Analyst';

export interface Product {
  id: string; // UUID / SKU
  sku: string;
  name: string;
  category: 'Beverages' | 'Biscuits' | 'Snacks' | 'Dairy' | 'Household';
  brand: string;
  barcode: string; // EAN-13 or Code-128
  unit: string; // 'Pack', 'Bottle', 'Box', 'Can'
  unitCost: number; // Cost Price
  sellingPrice: number; // Retail Price
  quantityOnHand: number;
  reorderPoint: number; // Threshold triggering alert
  safetyStock: number;
  maxStock: number;
  dailyVelocity: number; // Avg units sold per day
  leadTimeDays: number; // Supplier delivery time in days
  primarySupplierId: string;
  warehouseLocation: string; // e.g., 'Central Warehouse' | 'Downtown Store'
  binCode: string; // e.g., 'BIN-A03-12'
  status: 'In Stock' | 'Low Stock' | 'Stockout' | 'Excess';
  lastAuditedAt: string;
}

export interface BatchItem {
  id: string; // PK: batch_id
  productId: string;
  batchNumber: string; // e.g., 'BAT-2026-B102'
  manufactureDate: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  warehouseId: string;
  binCode: string;
  daysUntilExpiry: number;
  fefoPriority: number; // 1 = consume first (FEFO)
  status: 'Fresh' | 'Near Expiry' | 'Critical Expiry' | 'Expired';
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  category: string;
  contactPerson: string;
  email: string;
  phone: string;
  leadTimeDays: number;
  onTimeDeliveryRate: number; // Percentage, e.g., 94.5%
  qualityScore: number; // 0 - 100
  paymentTerms: string; // 'Net 30', 'Net 15'
  status: 'Active' | 'Under Review' | 'Delayed';
}

export interface WarehouseLocation {
  id: string;
  name: string;
  type: 'Central Distribution' | 'Store Front' | 'Regional Hub';
  city: string;
  capacityUnits: number;
  currentUnits: number;
  binCount: number;
}

export type TransactionType =
  | 'RECEIPT' // Inbound from Supplier
  | 'SALE' // Outbound from POS / Customer
  | 'TRANSFER_IN' // Inter-facility move
  | 'TRANSFER_OUT' // Inter-facility move
  | 'EXPIRY_WRITEOFF' // FEFO waste
  | 'STOCK_ADJUSTMENT' // Cycle count audit (+ or -)
  | 'RETURN'; // Customer / Supplier return

export interface InventoryTransaction {
  id: string; // UUID
  timestamp: string;
  productId: string;
  sku: string;
  productName: string;
  batchNumber?: string;
  type: TransactionType;
  quantityChange: number; // positive or negative
  balanceAfter: number;
  unitCost: number;
  totalValue: number;
  referenceId: string; // PO-xxx, SALE-xxx, ADJ-xxx
  performedBy: string;
  role: UserRole;
  location: string;
  notes: string;
}

export interface PurchaseOrderItem {
  productId: string;
  sku: string;
  productName: string;
  quantityRequested: number;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string; // e.g. PO-2026-0891
  supplierId: string;
  supplierName: string;
  status: 'Draft' | 'Approved' | 'Sent' | 'In Transit' | 'Delivered' | 'Delayed' | 'Cancelled';
  createdAt: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  isDelayed: boolean;
  notes: string;
}

export interface StockAlert {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  type: 'STOCKOUT' | 'LOW_STOCK' | 'EXPIRY_RISK' | 'SUPPLIER_DELAY' | 'EXCESS_STOCK';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  currentValue: number;
  thresholdValue: number;
  recommendedOrderQty: number;
  supplierId: string;
  supplierName: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'EXECUTE_QUERY' | 'TRANSACTION_COMMIT' | 'TRANSACTION_ROLLBACK';
  entity: string;
  recordKey: string;
  details: string;
  ipAddress: string;
}

export interface SqlQueryPreset {
  id: string;
  title: string;
  description: string;
  difficulty: 'Basic' | 'Intermediate' | 'Advanced (DBMS Assessment)';
  sql: string;
  category: 'Alerts' | 'FEFO Expiry' | 'Supply Chain' | 'Aggregation' | 'Integrity & Constraints';
}
