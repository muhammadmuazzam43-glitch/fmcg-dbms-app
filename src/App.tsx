import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import {
  Product,
  BatchItem,
  Supplier,
  WarehouseLocation,
  PurchaseOrder,
  InventoryTransaction,
  UserRole,
  TransactionType,
} from './types/inventory';
import {
  INITIAL_PRODUCTS,
  INITIAL_BATCHES,
  INITIAL_SUPPLIERS,
  INITIAL_WAREHOUSES,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_TRANSACTIONS,
} from './data/mockData';
import { Header } from './components/Header';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { AssistantChat } from './components/AssistantChat';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';
import { playSuccessChime } from './utils/audio';

// Lazy-load non-initial tabs for high performance and fast initial load
const StockItemsView = lazy(() =>
  import('./components/StockItemsView').then((m) => ({ default: m.StockItemsView }))
);
const BarcodeStation = lazy(() =>
  import('./components/BarcodeStation').then((m) => ({ default: m.BarcodeStation }))
);
const ReplenishmentWorkflow = lazy(() =>
  import('./components/ReplenishmentWorkflow').then((m) => ({ default: m.ReplenishmentWorkflow }))
);
const DbmsStudio = lazy(() =>
  import('./components/DbmsStudio').then((m) => ({ default: m.DbmsStudio }))
);
const AuditRbacView = lazy(() =>
  import('./components/AuditRbacView').then((m) => ({ default: m.AuditRbacView }))
);

const STORAGE_KEY_PRODUCTS = 'fmcg_db_products_v1';
const STORAGE_KEY_BATCHES = 'fmcg_db_batches_v1';
const STORAGE_KEY_POS = 'fmcg_db_pos_v1';
const STORAGE_KEY_TXNS = 'fmcg_db_txns_v1';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [stockInitialFilter, setStockInitialFilter] = useState<string | undefined>(undefined);
  const [currentRole, setCurrentRole] = useState<UserRole>('Super Admin');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isMountedRef = useRef(false);

  // Master relational state with localStorage persistence
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRODUCTS);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [batches, setBatches] = useState<BatchItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BATCHES);
      return saved ? JSON.parse(saved) : INITIAL_BATCHES;
    } catch {
      return INITIAL_BATCHES;
    }
  });

  const [suppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [warehouses] = useState<WarehouseLocation[]>(INITIAL_WAREHOUSES);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POS);
      return saved ? JSON.parse(saved) : INITIAL_PURCHASE_ORDERS;
    } catch {
      return INITIAL_PURCHASE_ORDERS;
    }
  });

  const [transactions, setTransactions] = useState<InventoryTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TXNS);
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  // Sync state to localStorage only when updated after initial mount
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
      localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(batches));
      localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(purchaseOrders));
      localStorage.setItem(STORAGE_KEY_TXNS, JSON.stringify(transactions));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [products, batches, purchaseOrders, transactions]);

  // Barcode station communication
  const [selectedBarcodeForScanner, setSelectedBarcodeForScanner] = useState<string | undefined>(undefined);

  // Handler: Update product stock balance with strict ACID check and immutable transaction logging
  const handleUpdateProductStock = (
    productId: string,
    quantityChange: number,
    type: TransactionType,
    notes: string
  ) => {
    setProducts((prevProducts) => {
      return prevProducts.map((p) => {
        if (p.id !== productId) return p;

        const newBalance = Math.max(0, p.quantityOnHand + quantityChange);
        let newStatus: Product['status'] = 'In Stock';
        if (newBalance === 0) {
          newStatus = 'Stockout';
        } else if (newBalance <= p.reorderPoint) {
          newStatus = 'Low Stock';
        }

        // Create transaction record
        const newTxn: InventoryTransaction = {
          id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          productId: p.id,
          sku: p.sku,
          productName: p.name,
          type,
          quantityChange,
          balanceAfter: newBalance,
          unitCost: p.unitCost,
          totalValue: Math.abs(quantityChange) * (type === 'SALE' ? p.sellingPrice : p.unitCost),
          referenceId: `${type.substring(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
          performedBy: currentRole === 'Store POS Operator' ? 'Maria Gomez' : 'System Operator',
          role: currentRole,
          location: p.warehouseLocation,
          notes,
        };

        setTransactions((prevTxns) => [newTxn, ...prevTxns]);

        return {
          ...p,
          quantityOnHand: newBalance,
          status: newStatus,
          lastAuditedAt: new Date().toISOString().split('T')[0],
        };
      });
    });
  };

  // Handler: Add a real individual product entered by the user
  const handleAddProduct = (newProduct: Product, initialBatch?: BatchItem) => {
    setProducts((prev) => [newProduct, ...prev]);

    if (initialBatch) {
      setBatches((prev) => [initialBatch, ...prev]);
    }

    // Log Opening Stock Transaction
    const openingTxn: InventoryTransaction = {
      id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      productId: newProduct.id,
      sku: newProduct.sku,
      productName: newProduct.name,
      batchNumber: initialBatch?.batchNumber,
      type: 'RECEIPT',
      quantityChange: newProduct.quantityOnHand,
      balanceAfter: newProduct.quantityOnHand,
      unitCost: newProduct.unitCost,
      totalValue: newProduct.quantityOnHand * newProduct.unitCost,
      referenceId: `OPEN-${Math.floor(1000 + Math.random() * 9000)}`,
      performedBy: 'System Admin',
      role: currentRole,
      location: newProduct.warehouseLocation,
      notes: `Master Data creation: Initial stock registered for ${newProduct.sku}`,
    };

    setTransactions((prev) => [openingTxn, ...prev]);
  };

  // Handler: Bulk Import from CSV
  const handleBulkImportProducts = (importedProducts: Product[]) => {
    const existingSkus = new Set(products.map((p) => p.sku.toUpperCase()));
    const nonDuplicates = importedProducts.filter((p) => !existingSkus.has(p.sku.toUpperCase()));

    setProducts((prev) => [...nonDuplicates, ...prev]);

    const bulkTxn: InventoryTransaction = {
      id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      productId: 'BULK-CSV',
      sku: 'MULTIPLE-SKUS',
      productName: `Bulk CSV Import (${nonDuplicates.length} items)`,
      type: 'RECEIPT',
      quantityChange: nonDuplicates.reduce((s, p) => s + p.quantityOnHand, 0),
      balanceAfter: products.reduce((s, p) => s + p.quantityOnHand, 0) + nonDuplicates.reduce((s, p) => s + p.quantityOnHand, 0),
      unitCost: 0,
      totalValue: nonDuplicates.reduce((s, p) => s + p.quantityOnHand * p.unitCost, 0),
      referenceId: `CSV-IMP-${Math.floor(1000 + Math.random() * 9000)}`,
      performedBy: 'Integration Engine',
      role: currentRole,
      location: 'Multi-Location',
      notes: `Imported ${nonDuplicates.length} real product records via CSV integration`,
    };

    setTransactions((prev) => [bulkTxn, ...prev]);
  };

  // Handler: Add a new physical batch lot (FEFO)
  const handleAddBatch = (newBatch: BatchItem) => {
    setBatches((prev) => [newBatch, ...prev]);

    handleUpdateProductStock(
      newBatch.productId,
      newBatch.quantity,
      'RECEIPT',
      `Inbound Batch Lot ${newBatch.batchNumber} created (Expiry: ${newBatch.expiryDate})`
    );
  };

  // Handler: FEFO Batch Quarantine / Write-Off
  const handleBatchWriteOff = (batchId: string, quantity: number, notes: string) => {
    const targetBatch = batches.find((b) => b.id === batchId);
    if (!targetBatch) return;

    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, quantity: Math.max(0, b.quantity - quantity) } : b))
    );

    handleUpdateProductStock(targetBatch.productId, -quantity, 'EXPIRY_WRITEOFF', notes);
  };

  // Handler: Create Purchase Order
  const handleCreatePurchaseOrder = (newPO: PurchaseOrder) => {
    setPurchaseOrders((prev) => [newPO, ...prev]);
  };

  // Handler: Update Purchase Order status (and perform Goods Receipt if Delivered)
  const handleUpdatePurchaseOrderStatus = (poId: string, newStatus: PurchaseOrder['status']) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id !== poId) return po;

        if (newStatus === 'Delivered' && po.status !== 'Delivered') {
          po.items.forEach((item) => {
            handleUpdateProductStock(
              item.productId,
              item.quantityRequested,
              'RECEIPT',
              `Goods Receipt verified for ${po.id} from ${po.supplierName}`
            );
          });
        }

        return {
          ...po,
          status: newStatus,
          actualDeliveryDate: newStatus === 'Delivered' ? new Date().toISOString().split('T')[0] : po.actualDeliveryDate,
          isDelayed: false,
        };
      })
    );
  };

  // Handler: In-App Reset to default demo data (no window.confirm, safe for iframe)
  const executeResetDemoData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_PRODUCTS);
      localStorage.removeItem(STORAGE_KEY_BATCHES);
      localStorage.removeItem(STORAGE_KEY_POS);
      localStorage.removeItem(STORAGE_KEY_TXNS);
    } catch {
      // ignore
    }
    setProducts(INITIAL_PRODUCTS);
    setBatches(INITIAL_BATCHES);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setTransactions(INITIAL_TRANSACTIONS);
    setShowResetConfirm(false);
    playSuccessChime();
  };

  const handleNavigateTab = (tab: string, filter?: string) => {
    setCurrentTab(tab);
    if (filter) setStockInitialFilter(filter);
  };

  const handleSelectBarcodeToScan = (barcode: string) => {
    setSelectedBarcodeForScanner(barcode);
    setCurrentTab('barcode');
  };

  const lowStockCount = products.filter((p) => p.quantityOnHand <= p.reorderPoint).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Universal Top Bar */}
      <Header
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setStockInitialFilter(undefined);
        }}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        lowStockCount={lowStockCount}
        onOpenQuickScan={() => setCurrentTab('barcode')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <ExecutiveDashboard
            products={products}
            batches={batches}
            purchaseOrders={purchaseOrders}
            transactions={transactions}
            onNavigateTab={handleNavigateTab}
            onOpenQuickScan={() => setCurrentTab('barcode')}
          />
        )}

        {currentTab === 'stock' && (
          <Suspense fallback={<div className="py-16 text-center text-xs text-slate-400">Loading Stock Catalog...</div>}>
            <StockItemsView
              products={products}
              batches={batches}
              suppliers={suppliers}
              warehouses={warehouses}
              currentRole={currentRole}
              initialFilter={stockInitialFilter}
              onUpdateProductStock={handleUpdateProductStock}
              onAddProduct={handleAddProduct}
              onBulkImportProducts={handleBulkImportProducts}
              onAddBatch={handleAddBatch}
              onBatchWriteOff={handleBatchWriteOff}
              onSelectBarcodeToScan={handleSelectBarcodeToScan}
            />
          </Suspense>
        )}

        {currentTab === 'barcode' && (
          <Suspense fallback={<div className="py-16 text-center text-xs text-slate-400">Loading Barcode Scanner...</div>}>
            <BarcodeStation
              products={products}
              batches={batches}
              currentRole={currentRole}
              selectedBarcode={selectedBarcodeForScanner}
              onUpdateProductStock={handleUpdateProductStock}
              onClearSelectedBarcode={() => setSelectedBarcodeForScanner(undefined)}
            />
          </Suspense>
        )}

        {currentTab === 'replenish' && (
          <Suspense fallback={<div className="py-16 text-center text-xs text-slate-400">Loading Replenishment Engine...</div>}>
            <ReplenishmentWorkflow
              products={products}
              suppliers={suppliers}
              purchaseOrders={purchaseOrders}
              currentRole={currentRole}
              onCreatePurchaseOrder={handleCreatePurchaseOrder}
              onUpdatePurchaseOrderStatus={handleUpdatePurchaseOrderStatus}
            />
          </Suspense>
        )}

        {currentTab === 'dbms' && (
          <Suspense fallback={<div className="py-16 text-center text-xs text-slate-400">Loading DBMS Studio...</div>}>
            <DbmsStudio
              products={products}
              batches={batches}
              suppliers={suppliers}
              purchaseOrders={purchaseOrders}
              transactions={transactions}
            />
          </Suspense>
        )}

        {currentTab === 'rbac' && (
          <Suspense fallback={<div className="py-16 text-center text-xs text-slate-400">Loading Audit & Security...</div>}>
            <AuditRbacView
              transactions={transactions}
              currentRole={currentRole}
              setCurrentRole={setCurrentRole}
            />
          </Suspense>
        )}
      </main>

      {/* In-App Confirmation Modal for Resetting Demo Data */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Reset Demo Database?</span>
              </div>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to restore the default initial demo products, batches, and purchase orders? Any custom entered records will be wiped.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeResetDemoData}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Floating FMCG Inventory AI Assistant */}
      <AssistantChat
        products={products}
        batches={batches}
        suppliers={suppliers}
        purchaseOrders={purchaseOrders}
        transactions={transactions}
        currentRole={currentRole}
        onNavigateTab={handleNavigateTab}
      />

      {/* Clean Enterprise Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>FMCG Inventory Intelligence &middot; Smart Inventory &amp; Supply Chain Management</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-emerald-400">LocalStorage: Persistent</span>
            <span>&middot;</span>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset all tables to initial demo dataset"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Demo Data</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
