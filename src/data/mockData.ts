import type { Product, BatchItem, Supplier, WarehouseLocation, PurchaseOrder, InventoryTransaction, SqlQueryPreset } from '../types/inventory.ts';

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'SUP-001',
    name: 'Apex Beverages & Springs Ltd',
    code: 'APEX-BEV',
    category: 'Beverages',
    contactPerson: 'David Vance',
    email: 'orders@apexbeverages.com',
    phone: '+1 (555) 234-9081',
    leadTimeDays: 4,
    onTimeDeliveryRate: 96.2,
    qualityScore: 98,
    paymentTerms: 'Net 30',
    status: 'Active',
  },
  {
    id: 'SUP-002',
    name: 'Golden Grain Milling & Bakery',
    code: 'GOLD-GRAIN',
    category: 'Biscuits & Bakery',
    contactPerson: 'Sarah Chen',
    email: 'supply@goldengrain.org',
    phone: '+1 (555) 438-1120',
    leadTimeDays: 7,
    onTimeDeliveryRate: 88.5,
    qualityScore: 94,
    paymentTerms: 'Net 30',
    status: 'Delayed',
  },
  {
    id: 'SUP-003',
    name: 'Highland Pure Dairy Co-Op',
    code: 'HIGH-DAIRY',
    category: 'Dairy',
    contactPerson: 'Marcus Thorne',
    email: 'logistics@highlanddairy.co',
    phone: '+1 (555) 672-8819',
    leadTimeDays: 2,
    onTimeDeliveryRate: 98.4,
    qualityScore: 99,
    paymentTerms: 'Net 15',
    status: 'Active',
  },
  {
    id: 'SUP-004',
    name: 'SunSnack Agro Industries',
    code: 'SUN-SNACK',
    category: 'Snacks',
    contactPerson: 'Elena Rodriguez',
    email: 'orders@sunsnackagro.com',
    phone: '+1 (555) 890-4412',
    leadTimeDays: 5,
    onTimeDeliveryRate: 91.0,
    qualityScore: 92,
    paymentTerms: 'Net 30',
    status: 'Active',
  },
  {
    id: 'SUP-005',
    name: 'CleanShield Chemical Hygiene',
    code: 'CLEAN-SHIELD',
    category: 'Household',
    contactPerson: 'Arthur Pendelton',
    email: 'b2b@cleanshieldcorp.com',
    phone: '+1 (555) 321-7764',
    leadTimeDays: 6,
    onTimeDeliveryRate: 93.8,
    qualityScore: 96,
    paymentTerms: 'Net 45',
    status: 'Active',
  },
];

export const INITIAL_WAREHOUSES: WarehouseLocation[] = [
  {
    id: 'WH-01',
    name: 'Central Distribution Warehouse',
    type: 'Central Distribution',
    city: 'Chicago Logistics Park',
    capacityUnits: 500000,
    currentUnits: 342190,
    binCount: 1400,
  },
  {
    id: 'WH-02',
    name: 'Downtown Megastore Hub',
    type: 'Store Front',
    city: 'Metro Downtown',
    capacityUnits: 80000,
    currentUnits: 51200,
    binCount: 320,
  },
  {
    id: 'WH-03',
    name: 'Westside Fulfillment Hub',
    type: 'Regional Hub',
    city: 'West Suburbs',
    capacityUnits: 180000,
    currentUnits: 124500,
    binCount: 650,
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    sku: 'BEV-SPR-500',
    name: 'Sparkling Mineral Spring Water 500ml',
    category: 'Beverages',
    brand: 'PureAlpine',
    barcode: '8901020304011',
    unit: 'Bottle',
    unitCost: 0.65,
    sellingPrice: 1.85,
    quantityOnHand: 42, // Below reorder point (75) -> LOW STOCK
    reorderPoint: 75,
    safetyStock: 30,
    maxStock: 300,
    dailyVelocity: 14,
    leadTimeDays: 4,
    primarySupplierId: 'SUP-001',
    warehouseLocation: 'Central Distribution Warehouse',
    binCode: 'BIN-BEV-A04',
    status: 'Low Stock',
    lastAuditedAt: '2026-10-12',
  },
  {
    id: 'prod-002',
    sku: 'BEV-CBW-330',
    name: 'Nitro Cold Brew Dark Roast 330ml',
    category: 'Beverages',
    brand: 'BlackPeak Coffee',
    barcode: '8901020304028',
    unit: 'Can',
    unitCost: 1.20,
    sellingPrice: 3.49,
    quantityOnHand: 185,
    reorderPoint: 60,
    safetyStock: 25,
    maxStock: 250,
    dailyVelocity: 9,
    leadTimeDays: 4,
    primarySupplierId: 'SUP-001',
    warehouseLocation: 'Central Distribution Warehouse',
    binCode: 'BIN-BEV-A08',
    status: 'In Stock',
    lastAuditedAt: '2026-10-14',
  },
  {
    id: 'prod-003',
    sku: 'BIS-OAT-400',
    name: 'Golden Oats Digestive Cookies 400g',
    category: 'Biscuits',
    brand: 'GrainMakers',
    barcode: '8901020304035',
    unit: 'Pack',
    unitCost: 1.45,
    sellingPrice: 3.29,
    quantityOnHand: 18, // Below reorder point (65) -> LOW STOCK
    reorderPoint: 65,
    safetyStock: 20,
    maxStock: 220,
    dailyVelocity: 11,
    leadTimeDays: 7,
    primarySupplierId: 'SUP-002',
    warehouseLocation: 'Downtown Megastore Hub',
    binCode: 'BIN-BIS-B02',
    status: 'Low Stock',
    lastAuditedAt: '2026-10-10',
  },
  {
    id: 'prod-004',
    sku: 'BIS-BUT-250',
    name: 'Artisan Danish Butter Cookies 250g',
    category: 'Biscuits',
    brand: 'Copenhagen Delight',
    barcode: '8901020304042',
    unit: 'Tin',
    unitCost: 2.80,
    sellingPrice: 5.99,
    quantityOnHand: 94,
    reorderPoint: 40,
    safetyStock: 15,
    maxStock: 160,
    dailyVelocity: 5,
    leadTimeDays: 7,
    primarySupplierId: 'SUP-002',
    warehouseLocation: 'Westside Fulfillment Hub',
    binCode: 'BIN-BIS-B09',
    status: 'In Stock',
    lastAuditedAt: '2026-10-11',
  },
  {
    id: 'prod-005',
    sku: 'SNK-SEA-150',
    name: 'Himalayan Rock Salt Kettle Crisps 150g',
    category: 'Snacks',
    brand: 'CrunchCraft',
    barcode: '8901020304059',
    unit: 'Bag',
    unitCost: 0.95,
    sellingPrice: 2.75,
    quantityOnHand: 140,
    reorderPoint: 50,
    safetyStock: 25,
    maxStock: 300,
    dailyVelocity: 16,
    leadTimeDays: 5,
    primarySupplierId: 'SUP-004',
    warehouseLocation: 'Central Distribution Warehouse',
    binCode: 'BIN-SNK-C01',
    status: 'In Stock',
    lastAuditedAt: '2026-10-14',
  },
  {
    id: 'prod-006',
    sku: 'SNK-ALM-200',
    name: 'Smoked Paprika Roasted Almonds 200g',
    category: 'Snacks',
    brand: 'NutriHarvest',
    barcode: '8901020304066',
    unit: 'Pouch',
    unitCost: 2.10,
    sellingPrice: 4.99,
    quantityOnHand: 0, // Out of stock!
    reorderPoint: 35,
    safetyStock: 15,
    maxStock: 150,
    dailyVelocity: 7,
    leadTimeDays: 5,
    primarySupplierId: 'SUP-004',
    warehouseLocation: 'Downtown Megastore Hub',
    binCode: 'BIN-SNK-C07',
    status: 'Stockout',
    lastAuditedAt: '2026-10-15',
  },
  {
    id: 'prod-007',
    sku: 'DAI-MLK-100',
    name: 'Organic Whole Pasture Milk 1L',
    category: 'Dairy',
    brand: 'Highland Meadows',
    barcode: '8901020304073',
    unit: 'Carton',
    unitCost: 1.15,
    sellingPrice: 2.89,
    quantityOnHand: 32, // Low stock & near expiry
    reorderPoint: 60,
    safetyStock: 20,
    maxStock: 200,
    dailyVelocity: 22,
    leadTimeDays: 2,
    primarySupplierId: 'SUP-003',
    warehouseLocation: 'Downtown Megastore Hub',
    binCode: 'BIN-CHILL-D01',
    status: 'Low Stock',
    lastAuditedAt: '2026-10-15',
  },
  {
    id: 'prod-008',
    sku: 'DAI-YOG-500',
    name: 'Greek Strained Vanilla Yogurt 500g',
    category: 'Dairy',
    brand: 'Olympian',
    barcode: '8901020304080',
    unit: 'Tub',
    unitCost: 1.40,
    sellingPrice: 3.65,
    quantityOnHand: 78,
    reorderPoint: 45,
    safetyStock: 18,
    maxStock: 180,
    dailyVelocity: 12,
    leadTimeDays: 2,
    primarySupplierId: 'SUP-003',
    warehouseLocation: 'Downtown Megastore Hub',
    binCode: 'BIN-CHILL-D04',
    status: 'In Stock',
    lastAuditedAt: '2026-10-13',
  },
  {
    id: 'prod-009',
    sku: 'HOU-DIS-750',
    name: 'Citrus Anti-Bacterial Multi-Spray 750ml',
    category: 'Household',
    brand: 'CleanShield',
    barcode: '8901020304097',
    unit: 'Spray Bottle',
    unitCost: 1.65,
    sellingPrice: 4.25,
    quantityOnHand: 220,
    reorderPoint: 50,
    safetyStock: 20,
    maxStock: 250,
    dailyVelocity: 6,
    leadTimeDays: 6,
    primarySupplierId: 'SUP-005',
    warehouseLocation: 'Central Distribution Warehouse',
    binCode: 'BIN-HOU-E02',
    status: 'In Stock',
    lastAuditedAt: '2026-10-09',
  },
  {
    id: 'prod-010',
    sku: 'HOU-DET-200',
    name: 'Eco Concentrated Laundry Liquid 2L',
    category: 'Household',
    brand: 'CleanShield Eco',
    barcode: '8901020304103',
    unit: 'Jug',
    unitCost: 4.30,
    sellingPrice: 9.99,
    quantityOnHand: 34, // Low stock
    reorderPoint: 45,
    safetyStock: 15,
    maxStock: 180,
    dailyVelocity: 4,
    leadTimeDays: 6,
    primarySupplierId: 'SUP-005',
    warehouseLocation: 'Westside Fulfillment Hub',
    binCode: 'BIN-HOU-E09',
    status: 'Low Stock',
    lastAuditedAt: '2026-10-14',
  },
];

export const INITIAL_BATCHES: BatchItem[] = [
  {
    id: 'bat-001',
    productId: 'prod-001',
    batchNumber: 'BAT-2026-SP101',
    manufactureDate: '2026-06-10',
    expiryDate: '2027-06-10',
    quantity: 42,
    receivedQuantity: 100,
    unitCost: 0.65,
    warehouseId: 'WH-01',
    binCode: 'BIN-BEV-A04',
    daysUntilExpiry: 238,
    fefoPriority: 3,
    status: 'Fresh',
  },
  {
    id: 'bat-002',
    productId: 'prod-002',
    batchNumber: 'BAT-2026-CB88',
    manufactureDate: '2026-07-01',
    expiryDate: '2027-01-15',
    quantity: 185,
    receivedQuantity: 200,
    unitCost: 1.20,
    warehouseId: 'WH-01',
    binCode: 'BIN-BEV-A08',
    daysUntilExpiry: 92,
    fefoPriority: 2,
    status: 'Fresh',
  },
  {
    id: 'bat-003',
    productId: 'prod-003',
    batchNumber: 'BAT-2026-OG42',
    manufactureDate: '2026-04-10',
    expiryDate: '2026-11-04', // 20 days left -> Critical FEFO!
    quantity: 18,
    receivedQuantity: 120,
    unitCost: 1.45,
    warehouseId: 'WH-02',
    binCode: 'BIN-BIS-B02',
    daysUntilExpiry: 20,
    fefoPriority: 1,
    status: 'Critical Expiry',
  },
  {
    id: 'bat-004',
    productId: 'prod-007',
    batchNumber: 'BAT-2026-MK09',
    manufactureDate: '2026-10-01',
    expiryDate: '2026-10-22', // 7 days left -> Near expiry!
    quantity: 32,
    receivedQuantity: 80,
    unitCost: 1.15,
    warehouseId: 'WH-02',
    binCode: 'BIN-CHILL-D01',
    daysUntilExpiry: 7,
    fefoPriority: 1,
    status: 'Critical Expiry',
  },
  {
    id: 'bat-005',
    productId: 'prod-008',
    batchNumber: 'BAT-2026-YG77',
    manufactureDate: '2026-09-25',
    expiryDate: '2026-11-15',
    quantity: 78,
    receivedQuantity: 90,
    unitCost: 1.40,
    warehouseId: 'WH-02',
    binCode: 'BIN-CHILL-D04',
    daysUntilExpiry: 31,
    fefoPriority: 2,
    status: 'Fresh',
  },
  {
    id: 'bat-006',
    productId: 'prod-005',
    batchNumber: 'BAT-2026-KC11',
    manufactureDate: '2026-08-01',
    expiryDate: '2027-04-15',
    quantity: 140,
    receivedQuantity: 200,
    unitCost: 0.95,
    warehouseId: 'WH-01',
    binCode: 'BIN-SNK-C01',
    daysUntilExpiry: 182,
    fefoPriority: 3,
    status: 'Fresh',
  },
  {
    id: 'bat-007',
    productId: 'prod-009',
    batchNumber: 'BAT-2026-CS50',
    manufactureDate: '2026-05-15',
    expiryDate: '2028-05-15',
    quantity: 220,
    receivedQuantity: 250,
    unitCost: 1.65,
    warehouseId: 'WH-01',
    binCode: 'BIN-HOU-E02',
    daysUntilExpiry: 578,
    fefoPriority: 4,
    status: 'Fresh',
  },
  {
    id: 'bat-008',
    productId: 'prod-010',
    batchNumber: 'BAT-2026-LD14',
    manufactureDate: '2026-06-20',
    expiryDate: '2028-06-20',
    quantity: 34,
    receivedQuantity: 100,
    unitCost: 4.30,
    warehouseId: 'WH-03',
    binCode: 'BIN-HOU-E09',
    daysUntilExpiry: 614,
    fefoPriority: 4,
    status: 'Fresh',
  },
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-2026-0891',
    supplierId: 'SUP-002',
    supplierName: 'Golden Grain Milling & Bakery',
    status: 'Delayed',
    createdAt: '2026-10-02',
    expectedDeliveryDate: '2026-10-10', // Past expected date -> DELAYED
    items: [
      {
        productId: 'prod-003',
        sku: 'BIS-OAT-400',
        productName: 'Golden Oats Digestive Cookies 400g',
        quantityRequested: 100,
        quantityReceived: 0,
        unitCost: 1.45,
        totalCost: 145.00,
      },
    ],
    totalAmount: 145.00,
    isDelayed: true,
    notes: 'Transport logistics dispatch delay reported by driver hub.',
  },
  {
    id: 'PO-2026-0892',
    supplierId: 'SUP-004',
    supplierName: 'SunSnack Agro Industries',
    status: 'In Transit',
    createdAt: '2026-10-11',
    expectedDeliveryDate: '2026-10-16',
    items: [
      {
        productId: 'prod-006',
        sku: 'SNK-ALM-200',
        productName: 'Smoked Paprika Roasted Almonds 200g',
        quantityRequested: 80,
        quantityReceived: 0,
        unitCost: 2.10,
        totalCost: 168.00,
      },
    ],
    totalAmount: 168.00,
    isDelayed: false,
    notes: 'Urgent replenishment for out-of-stock SKU.',
  },
  {
    id: 'PO-2026-0888',
    supplierId: 'SUP-003',
    supplierName: 'Highland Pure Dairy Co-Op',
    status: 'Delivered',
    createdAt: '2026-10-08',
    expectedDeliveryDate: '2026-10-10',
    actualDeliveryDate: '2026-10-10',
    items: [
      {
        productId: 'prod-007',
        sku: 'DAI-MLK-100',
        productName: 'Organic Whole Pasture Milk 1L',
        quantityRequested: 80,
        quantityReceived: 80,
        unitCost: 1.15,
        totalCost: 92.00,
      },
    ],
    totalAmount: 92.00,
    isDelayed: false,
    notes: 'Goods receipt verified and cold chain integrity checked.',
  },
];

export const INITIAL_TRANSACTIONS: InventoryTransaction[] = [
  {
    id: 'TXN-09281',
    timestamp: '2026-10-15 09:14:22',
    productId: 'prod-001',
    sku: 'BEV-SPR-500',
    productName: 'Sparkling Mineral Spring Water 500ml',
    batchNumber: 'BAT-2026-SP101',
    type: 'SALE',
    quantityChange: -3,
    balanceAfter: 42,
    unitCost: 0.65,
    totalValue: 5.55,
    referenceId: 'POS-REC-4890',
    performedBy: 'Maria Gomez',
    role: 'Store POS Operator',
    location: 'Downtown Megastore Hub',
    notes: 'Retail checkout scanned via barcode 8901020304011',
  },
  {
    id: 'TXN-09280',
    timestamp: '2026-10-15 08:45:10',
    productId: 'prod-007',
    sku: 'DAI-MLK-100',
    productName: 'Organic Whole Pasture Milk 1L',
    batchNumber: 'BAT-2026-MK09',
    type: 'SALE',
    quantityChange: -4,
    balanceAfter: 32,
    unitCost: 1.15,
    totalValue: 11.56,
    referenceId: 'POS-REC-4889',
    performedBy: 'Maria Gomez',
    role: 'Store POS Operator',
    location: 'Downtown Megastore Hub',
    notes: 'Retail scan - FEFO rule prioritized earliest expiry batch',
  },
  {
    id: 'TXN-09279',
    timestamp: '2026-10-14 16:30:00',
    productId: 'prod-006',
    sku: 'SNK-ALM-200',
    productName: 'Smoked Paprika Roasted Almonds 200g',
    type: 'SALE',
    quantityChange: -12,
    balanceAfter: 0,
    unitCost: 2.10,
    totalValue: 59.88,
    referenceId: 'POS-REC-4871',
    performedBy: 'Kevin Stone',
    role: 'Store POS Operator',
    location: 'Downtown Megastore Hub',
    notes: 'Bulk snack purchase resulted in stockout trigger',
  },
  {
    id: 'TXN-09278',
    timestamp: '2026-10-13 11:20:00',
    productId: 'prod-002',
    sku: 'BEV-CBW-330',
    productName: 'Nitro Cold Brew Dark Roast 330ml',
    batchNumber: 'BAT-2026-CB88',
    type: 'RECEIPT',
    quantityChange: 100,
    balanceAfter: 195,
    unitCost: 1.20,
    totalValue: 120.00,
    referenceId: 'PO-2026-0880',
    performedBy: 'Tariq Al-Mansoor',
    role: 'Warehouse Supervisor',
    location: 'Central Distribution Warehouse',
    notes: 'Inbound shipment verified against PO packing slip',
  },
  {
    id: 'TXN-09277',
    timestamp: '2026-10-12 14:05:00',
    productId: 'prod-003',
    sku: 'BIS-OAT-400',
    productName: 'Golden Oats Digestive Cookies 400g',
    batchNumber: 'BAT-2026-OG42',
    type: 'EXPIRY_WRITEOFF',
    quantityChange: -5,
    balanceAfter: 18,
    unitCost: 1.45,
    totalValue: 7.25,
    referenceId: 'WASTE-2026-031',
    performedBy: 'Elena Rostova',
    role: 'Inventory Manager',
    location: 'Downtown Megastore Hub',
    notes: 'FEFO inspection quarantine - damaged packaging write-off',
  },
  {
    id: 'TXN-09276',
    timestamp: '2026-10-11 10:00:00',
    productId: 'prod-005',
    sku: 'SNK-SEA-150',
    productName: 'Himalayan Rock Salt Kettle Crisps 150g',
    type: 'TRANSFER_IN',
    quantityChange: 50,
    balanceAfter: 140,
    unitCost: 0.95,
    totalValue: 47.50,
    referenceId: 'TRF-2026-004',
    performedBy: 'Tariq Al-Mansoor',
    role: 'Warehouse Supervisor',
    location: 'Central Distribution Warehouse',
    notes: 'Inter-warehouse rebalancing from Hub West',
  },
];

export const SQL_QUERY_PRESETS: SqlQueryPreset[] = [
  {
    id: 'sql-01',
    title: 'Low Stock & Uncovered PO Deficit',
    description: 'Finds all products where quantity_on_hand <= reorder_point while incoming PO quantities are zero or insufficient (Slide 8 Example).',
    difficulty: 'Advanced (DBMS Assessment)',
    category: 'Alerts',
    sql: `SELECT 
    p.sku,
    p.name AS product_name,
    p.category,
    p.quantity_on_hand,
    p.reorder_point,
    p.safety_stock,
    COALESCE(SUM(poi.quantity_requested - poi.quantity_received), 0) AS incoming_po_quantity,
    (p.reorder_point - p.quantity_on_hand) AS deficit_to_reorder_point,
    s.name AS supplier_name,
    s.lead_time_days
FROM products p
JOIN suppliers s ON p.primary_supplier_id = s.id
LEFT JOIN purchase_order_items poi ON p.id = poi.product_id
LEFT JOIN purchase_orders po ON poi.purchase_order_id = po.id AND po.status IN ('Sent', 'In Transit')
WHERE p.quantity_on_hand <= p.reorder_point
GROUP BY p.id, p.sku, p.name, p.category, p.quantity_on_hand, p.reorder_point, p.safety_stock, s.name, s.lead_time_days
HAVING COALESCE(SUM(poi.quantity_requested - poi.quantity_received), 0) < (p.reorder_point - p.quantity_on_hand)
ORDER BY deficit_to_reorder_point DESC;`,
  },
  {
    id: 'sql-02',
    title: 'FEFO Batch Priority & Expiry Risk Analysis',
    description: 'Queries batch inventory sorted by earliest expiry date (FEFO principle) and calculates remaining shelf-life days and tied capital.',
    difficulty: 'Intermediate',
    category: 'FEFO Expiry',
    sql: `SELECT 
    b.batch_number,
    p.sku,
    p.name AS product_name,
    p.category,
    b.quantity,
    b.expiry_date,
    (b.expiry_date - CURRENT_DATE) AS days_remaining,
    ROUND(b.quantity * b.unit_cost, 2) AS tied_capital_usd,
    CASE 
        WHEN (b.expiry_date - CURRENT_DATE) <= 0 THEN 'CRITICAL: EXPIRED'
        WHEN (b.expiry_date - CURRENT_DATE) <= 30 THEN 'HIGH: Near Expiry (<30d)'
        WHEN (b.expiry_date - CURRENT_DATE) <= 90 THEN 'MEDIUM: Monitored'
        ELSE 'LOW: Fresh'
    END AS risk_tier
FROM batches b
JOIN products p ON b.product_id = p.id
WHERE b.quantity > 0
ORDER BY b.expiry_date ASC, b.quantity DESC;`,
  },
  {
    id: 'sql-03',
    title: 'Supplier Delay & Delivery Compliance Matrix',
    description: 'Aggregates purchase order transit times, evaluates supplier lead-time compliance, and flags SLA violations.',
    difficulty: 'Intermediate',
    category: 'Supply Chain',
    sql: `SELECT 
    s.name AS supplier_name,
    s.code,
    s.lead_time_days AS contractual_lead_time,
    COUNT(po.id) AS total_orders,
    COUNT(CASE WHEN po.is_delayed = TRUE THEN 1 END) AS delayed_orders,
    ROUND(AVG(s.on_time_delivery_rate), 1) AS recorded_otdr_pct,
    s.quality_score,
    s.status AS supplier_status
FROM suppliers s
LEFT JOIN purchase_orders po ON s.id = po.supplier_id
GROUP BY s.id, s.name, s.code, s.lead_time_days, s.quality_score, s.status
ORDER BY recorded_otdr_pct ASC;`,
  },
  {
    id: 'sql-04',
    title: 'Stock Valuation & Turnover by Category',
    description: 'Executes relational aggregation to calculate total stock units, inventory valuation at cost, and daily sales velocity by FMCG category.',
    difficulty: 'Basic',
    category: 'Aggregation',
    sql: `SELECT 
    category,
    COUNT(id) AS total_skus,
    SUM(quantity_on_hand) AS total_units_in_stock,
    ROUND(SUM(quantity_on_hand * unit_cost), 2) AS total_inventory_value_usd,
    ROUND(AVG(daily_velocity), 2) AS avg_daily_sales_velocity,
    ROUND(SUM(quantity_on_hand * selling_price) - SUM(quantity_on_hand * unit_cost), 2) AS potential_gross_margin_usd
FROM products
GROUP BY category
ORDER BY total_inventory_value_usd DESC;`,
  },
  {
    id: 'sql-05',
    title: '3NF Integrity Check & Constraint Enforcement',
    description: 'Validates database check constraints (chk_quantity_positive, chk_reorder_positive) and referential integrity between master products and batches.',
    difficulty: 'Advanced (DBMS Assessment)',
    category: 'Integrity & Constraints',
    sql: `SELECT 
    p.sku,
    p.quantity_on_hand AS master_stock_balance,
    COALESCE(SUM(b.quantity), 0) AS aggregated_batch_sum,
    (p.quantity_on_hand - COALESCE(SUM(b.quantity), 0)) AS reconciliation_variance,
    CASE 
        WHEN (p.quantity_on_hand - COALESCE(SUM(b.quantity), 0)) = 0 THEN 'BALANCED (3NF Compliant)'
        ELSE 'RECONCILIATION DISCREPANCY'
    END AS integrity_status
FROM products p
LEFT JOIN batches b ON p.id = b.product_id
GROUP BY p.id, p.sku, p.quantity_on_hand
ORDER BY reconciliation_variance DESC;`,
  },
];

export const DBMS_SCHEMA_DDL = `-- =========================================================================
-- FMCG INVENTORY INTELLIGENCE - PRODUCTION POSTGRESQL RELATIONAL SCHEMA
-- Relational Design Principles: 3NF, PK/FK, UNIQUE, NOT NULL, CHECK, ACID
-- =========================================================================

-- 1. EXTENSIONS & DOMAINS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. MASTER DATA ENTITIES
CREATE TABLE suppliers (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    contact_person VARCHAR(128),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    lead_time_days INT NOT NULL CHECK (lead_time_days >= 0),
    on_time_delivery_rate NUMERIC(5,2) DEFAULT 100.00 CHECK (on_time_delivery_rate BETWEEN 0 AND 100),
    quality_score INT DEFAULT 100 CHECK (quality_score BETWEEN 0 AND 100),
    payment_terms VARCHAR(32) DEFAULT 'Net 30',
    status VARCHAR(32) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE warehouses (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    city VARCHAR(128) NOT NULL,
    capacity_units INT NOT NULL CHECK (capacity_units > 0),
    bin_count INT NOT NULL DEFAULT 100
);

CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(64) NOT NULL UNIQUE,
    barcode VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    brand VARCHAR(128) NOT NULL,
    unit VARCHAR(32) NOT NULL DEFAULT 'Pack',
    unit_cost NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
    selling_price NUMERIC(10,2) NOT NULL CHECK (selling_price >= unit_cost),
    quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0), -- Constraint: chk_qty_positive
    reorder_point INT NOT NULL DEFAULT 50 CHECK (reorder_point >= 0),
    safety_stock INT NOT NULL DEFAULT 20 CHECK (safety_stock >= 0),
    max_stock INT NOT NULL DEFAULT 500 CHECK (max_stock >= reorder_point),
    daily_velocity NUMERIC(8,2) DEFAULT 0.00,
    lead_time_days INT NOT NULL DEFAULT 3,
    primary_supplier_id VARCHAR(36) REFERENCES suppliers(id) ON UPDATE CASCADE,
    warehouse_id VARCHAR(36) REFERENCES warehouses(id) ON UPDATE CASCADE,
    bin_code VARCHAR(32),
    status VARCHAR(32) DEFAULT 'In Stock',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. INVENTORY & BATCH TRACKING (FEFO)
CREATE TABLE batches (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_number VARCHAR(64) NOT NULL,
    manufacture_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INT NOT NULL CHECK (quantity >= 0),
    received_quantity INT NOT NULL CHECK (received_quantity >= quantity),
    unit_cost NUMERIC(10,2) NOT NULL,
    warehouse_id VARCHAR(36) REFERENCES warehouses(id),
    bin_code VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_expiry_future CHECK (expiry_date >= manufacture_date),
    CONSTRAINT uq_product_batch UNIQUE (product_id, batch_number)
);

-- 4. INVENTORY TRANSACTIONS (IMMUTABLE AUDIT LOG)
CREATE TABLE inventory_transactions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id),
    batch_id VARCHAR(36) REFERENCES batches(id),
    transaction_type VARCHAR(32) NOT NULL CHECK (
        transaction_type IN ('RECEIPT', 'SALE', 'TRANSFER_IN', 'TRANSFER_OUT', 'EXPIRY_WRITEOFF', 'STOCK_ADJUSTMENT', 'RETURN')
    ),
    quantity_change INT NOT NULL,
    balance_after INT NOT NULL CHECK (balance_after >= 0),
    unit_cost NUMERIC(10,2) NOT NULL,
    total_value NUMERIC(12,2) NOT NULL,
    reference_id VARCHAR(64) NOT NULL,
    performed_by VARCHAR(128) NOT NULL,
    user_role VARCHAR(64) NOT NULL,
    notes TEXT
);

-- 5. PROCUREMENT & SUPPLIER ORDERS
CREATE TABLE purchase_orders (
    id VARCHAR(36) PRIMARY KEY,
    supplier_id VARCHAR(36) NOT NULL REFERENCES suppliers(id),
    status VARCHAR(32) NOT NULL DEFAULT 'Draft',
    created_at DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE NOT NULL,
    actual_delivery_date DATE,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_delayed BOOLEAN DEFAULT FALSE,
    notes TEXT
);

CREATE TABLE purchase_order_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id VARCHAR(36) NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id),
    quantity_requested INT NOT NULL CHECK (quantity_requested > 0),
    quantity_received INT NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
    unit_cost NUMERIC(10,2) NOT NULL
);

-- 6. INDEXES FOR HIGH-THROUGHPUT RETRIEVAL
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_batches_expiry ON batches(expiry_date ASC);
CREATE INDEX idx_transactions_product ON inventory_transactions(product_id, timestamp DESC);
CREATE INDEX idx_po_status ON purchase_orders(status);

-- 7. DATABASE TRIGGER: DEDUCT STOCK ON POS SALE
CREATE OR REPLACE FUNCTION trg_deduct_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- Check negative stock constraint
    IF (SELECT quantity_on_hand FROM products WHERE id = NEW.product_id) < ABS(NEW.quantity_change) THEN
        RAISE EXCEPTION 'CHECK CONSTRAINT VIOLATION: Insufficient quantity on hand for SKU %', NEW.product_id;
    END IF;

    UPDATE products 
    SET quantity_on_hand = quantity_on_hand + NEW.quantity_change,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_inventory_change
AFTER INSERT ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION trg_deduct_stock_on_sale();
`;
