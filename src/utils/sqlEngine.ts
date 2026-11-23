import type { Product, BatchItem, Supplier, PurchaseOrder, InventoryTransaction } from '../types/inventory.ts';

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  plan?: {
    nodeType: string;
    relationName?: string;
    indexName?: string;
    totalCost: number;
    actualRows: number;
    actualTimeMs: number;
    filterCondition?: string;
  }[];
}

export function executeSimulationQuery(
  sql: string,
  data: {
    products: Product[];
    batches: BatchItem[];
    suppliers: Supplier[];
    purchaseOrders: PurchaseOrder[];
    transactions: InventoryTransaction[];
  }
): QueryResult {
  const start = performance.now();
  const normalized = sql.toLowerCase().trim();

  // Low stock query (Preset 1 / Slide 8 query)
  if (normalized.includes('deficit_to_reorder_point') || (normalized.includes('reorder_point') && normalized.includes('poi.quantity_requested'))) {
    const rows = data.products
      .filter((p) => p.quantityOnHand <= p.reorderPoint)
      .map((p) => {
        const supplier = data.suppliers.find((s) => s.id === p.primarySupplierId);
        // Find pending POs
        const incoming = data.purchaseOrders
          .filter((po) => po.status === 'Sent' || po.status === 'In Transit')
          .flatMap((po) => po.items)
          .filter((item) => item.productId === p.id)
          .reduce((sum, item) => sum + (item.quantityRequested - item.quantityReceived), 0);

        const deficit = p.reorderPoint - p.quantityOnHand;

        return {
          sku: p.sku,
          product_name: p.name,
          category: p.category,
          quantity_on_hand: p.quantityOnHand,
          reorder_point: p.reorderPoint,
          safety_stock: p.safetyStock,
          incoming_po_quantity: incoming,
          deficit_to_reorder_point: deficit,
          supplier_name: supplier?.name || 'Apex Wholesale',
          lead_time_days: supplier?.leadTimeDays ?? p.leadTimeDays,
        };
      })
      .filter((r) => r.incoming_po_quantity < r.deficit_to_reorder_point)
      .sort((a, b) => b.deficit_to_reorder_point - a.deficit_to_reorder_point);

    const execTime = Number((performance.now() - start + 4.2).toFixed(2));
    return {
      columns: ['sku', 'product_name', 'category', 'quantity_on_hand', 'reorder_point', 'safety_stock', 'incoming_po_quantity', 'deficit_to_reorder_point', 'supplier_name', 'lead_time_days'],
      rows,
      rowCount: rows.length,
      executionTimeMs: execTime,
      plan: [
        { nodeType: 'Sort (ORDER BY deficit_to_reorder_point DESC)', totalCost: 48.3, actualRows: rows.length, actualTimeMs: execTime },
        { nodeType: 'HashAggregate (GROUP BY p.id, p.sku, s.name)', totalCost: 42.1, actualRows: rows.length, actualTimeMs: execTime * 0.8 },
        { nodeType: 'Hash Left Join (po ON poi.po_id = po.id)', totalCost: 31.5, actualRows: 14, actualTimeMs: execTime * 0.6 },
        { nodeType: 'Index Scan using idx_products_sku on products p', indexName: 'idx_products_sku', totalCost: 12.4, actualRows: rows.length, actualTimeMs: execTime * 0.3, filterCondition: '(quantity_on_hand <= reorder_point)' },
      ],
    };
  }

  // FEFO Batch Expiry Query (Preset 2)
  if (normalized.includes('days_remaining') || normalized.includes('fefo') || normalized.includes('from batches')) {
    const rows = data.batches
      .slice()
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
      .map((b) => {
        const prod = data.products.find((p) => p.id === b.productId);
        let riskTier = 'LOW: Fresh';
        if (b.daysUntilExpiry <= 0) riskTier = 'CRITICAL: EXPIRED';
        else if (b.daysUntilExpiry <= 30) riskTier = 'HIGH: Near Expiry (<30d)';
        else if (b.daysUntilExpiry <= 90) riskTier = 'MEDIUM: Monitored';

        return {
          batch_number: b.batchNumber,
          sku: prod?.sku || 'UNKNOWN',
          product_name: prod?.name || 'Unassigned SKU',
          category: prod?.category || 'General',
          quantity: b.quantity,
          expiry_date: b.expiryDate,
          days_remaining: b.daysUntilExpiry,
          tied_capital_usd: Number((b.quantity * b.unitCost).toFixed(2)),
          risk_tier: riskTier,
        };
      });

    const execTime = Number((performance.now() - start + 2.8).toFixed(2));
    return {
      columns: ['batch_number', 'sku', 'product_name', 'category', 'quantity', 'expiry_date', 'days_remaining', 'tied_capital_usd', 'risk_tier'],
      rows,
      rowCount: rows.length,
      executionTimeMs: execTime,
      plan: [
        { nodeType: 'Index Scan using idx_batches_expiry on batches b', indexName: 'idx_batches_expiry', totalCost: 18.2, actualRows: rows.length, actualTimeMs: execTime * 0.4 },
        { nodeType: 'Hash Join on (b.product_id = p.id)', totalCost: 26.5, actualRows: rows.length, actualTimeMs: execTime * 0.9 },
      ],
    };
  }

  // Supplier Matrix Query (Preset 3)
  if (normalized.includes('contractual_lead_time') || (normalized.includes('suppliers') && normalized.includes('otdr_pct'))) {
    const rows = data.suppliers.map((s) => {
      const orders = data.purchaseOrders.filter((po) => po.supplierId === s.id);
      const delayed = orders.filter((po) => po.isDelayed).length;
      return {
        supplier_name: s.name,
        code: s.code,
        contractual_lead_time: s.leadTimeDays,
        total_orders: orders.length,
        delayed_orders: delayed,
        recorded_otdr_pct: s.onTimeDeliveryRate,
        quality_score: s.qualityScore,
        supplier_status: s.status,
      };
    });

    const execTime = Number((performance.now() - start + 1.9).toFixed(2));
    return {
      columns: ['supplier_name', 'code', 'contractual_lead_time', 'total_orders', 'delayed_orders', 'recorded_otdr_pct', 'quality_score', 'supplier_status'],
      rows,
      rowCount: rows.length,
      executionTimeMs: execTime,
      plan: [
        { nodeType: 'Sort (ORDER BY recorded_otdr_pct ASC)', totalCost: 15.6, actualRows: rows.length, actualTimeMs: execTime },
        { nodeType: 'HashAggregate (GROUP BY s.id)', totalCost: 12.0, actualRows: rows.length, actualTimeMs: execTime * 0.6 },
      ],
    };
  }

  // Category Aggregation Query (Preset 4)
  if (normalized.includes('potential_gross_margin_usd') || (normalized.includes('category') && normalized.includes('total_inventory_value_usd'))) {
    const cats = ['Beverages', 'Biscuits', 'Snacks', 'Dairy', 'Household'] as const;
    const rows = cats.map((cat) => {
      const items = data.products.filter((p) => p.category === cat);
      const totalUnits = items.reduce((acc, i) => acc + i.quantityOnHand, 0);
      const totalCostVal = items.reduce((acc, i) => acc + i.quantityOnHand * i.unitCost, 0);
      const totalSellVal = items.reduce((acc, i) => acc + i.quantityOnHand * i.sellingPrice, 0);
      const avgVelocity = items.length > 0 ? items.reduce((acc, i) => acc + i.dailyVelocity, 0) / items.length : 0;

      return {
        category: cat,
        total_skus: items.length,
        total_units_in_stock: totalUnits,
        total_inventory_value_usd: Number(totalCostVal.toFixed(2)),
        avg_daily_sales_velocity: Number(avgVelocity.toFixed(2)),
        potential_gross_margin_usd: Number((totalSellVal - totalCostVal).toFixed(2)),
      };
    }).sort((a, b) => b.total_inventory_value_usd - a.total_inventory_value_usd);

    const execTime = Number((performance.now() - start + 3.1).toFixed(2));
    return {
      columns: ['category', 'total_skus', 'total_units_in_stock', 'total_inventory_value_usd', 'avg_daily_sales_velocity', 'potential_gross_margin_usd'],
      rows,
      rowCount: rows.length,
      executionTimeMs: execTime,
      plan: [
        { nodeType: 'Sort (ORDER BY total_inventory_value_usd DESC)', totalCost: 22.4, actualRows: 5, actualTimeMs: execTime },
        { nodeType: 'HashAggregate (GROUP BY category)', totalCost: 18.1, actualRows: 5, actualTimeMs: execTime * 0.7 },
        { nodeType: 'Seq Scan on products', totalCost: 10.0, actualRows: data.products.length, actualTimeMs: execTime * 0.3 },
      ],
    };
  }

  // 3NF Reconciliation Query (Preset 5)
  if (normalized.includes('reconciliation_variance') || normalized.includes('3nf')) {
    const rows = data.products.map((p) => {
      const batchSum = data.batches.filter((b) => b.productId === p.id).reduce((s, b) => s + b.quantity, 0);
      const variance = p.quantityOnHand - batchSum;
      return {
        sku: p.sku,
        master_stock_balance: p.quantityOnHand,
        aggregated_batch_sum: batchSum,
        reconciliation_variance: variance,
        integrity_status: variance === 0 ? 'BALANCED (3NF Compliant)' : 'DISCREPANCY (Audit Required)',
      };
    });

    const execTime = Number((performance.now() - start + 2.5).toFixed(2));
    return {
      columns: ['sku', 'master_stock_balance', 'aggregated_batch_sum', 'reconciliation_variance', 'integrity_status'],
      rows,
      rowCount: rows.length,
      executionTimeMs: execTime,
      plan: [
        { nodeType: 'Hash Aggregate on products and batches', totalCost: 28.5, actualRows: rows.length, actualTimeMs: execTime },
        { nodeType: 'Index Scan on idx_batches_product_id', totalCost: 14.2, actualRows: data.batches.length, actualTimeMs: execTime * 0.4 },
      ],
    };
  }

  // Fallback: general query on products table
  const rows = data.products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    barcode: p.barcode,
    quantity_on_hand: p.quantityOnHand,
    reorder_point: p.reorderPoint,
    status: p.status,
    selling_price: p.sellingPrice,
  }));

  const execTime = Number((performance.now() - start + 1.5).toFixed(2));
  return {
    columns: ['sku', 'name', 'category', 'barcode', 'quantity_on_hand', 'reorder_point', 'status', 'selling_price'],
    rows,
    rowCount: rows.length,
    executionTimeMs: execTime,
    plan: [
      { nodeType: 'Seq Scan on products', totalCost: 10.25, actualRows: rows.length, actualTimeMs: execTime },
    ],
  };
}
