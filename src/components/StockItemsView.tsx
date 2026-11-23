import React, { useState } from 'react';
import { Product, BatchItem, Supplier, WarehouseLocation, UserRole, TransactionType } from '../types/inventory';
import { Search, Filter, AlertTriangle, Plus, QrCode, ArrowDownRight, Layers, Clock, CheckCircle2, X, Upload, FileSpreadsheet, Sparkles } from 'lucide-react';
import { formatBarcodeString, generateBarcodeBars } from '../utils/barcode';
import { playBarcodeBeep, playSuccessChime } from '../utils/audio';
import { AddProductModal } from './AddProductModal';
import { CsvImportExportModal } from './CsvImportExportModal';
import { AddBatchModal } from './AddBatchModal';

interface StockItemsViewProps {
  products: Product[];
  batches: BatchItem[];
  suppliers: Supplier[];
  warehouses: WarehouseLocation[];
  currentRole: UserRole;
  initialFilter?: string;
  onUpdateProductStock: (productId: string, quantityChange: number, type: TransactionType, notes: string) => void;
  onAddProduct: (newProduct: Product, initialBatch?: BatchItem) => void;
  onBulkImportProducts: (newProducts: Product[]) => void;
  onAddBatch: (batch: BatchItem) => void;
  onBatchWriteOff: (batchId: string, quantity: number, notes: string) => void;
  onSelectBarcodeToScan: (barcode: string) => void;
}

export const StockItemsView: React.FC<StockItemsViewProps> = ({
  products,
  batches,
  suppliers,
  warehouses,
  currentRole,
  initialFilter,
  onUpdateProductStock,
  onAddProduct,
  onBulkImportProducts,
  onAddBatch,
  onBatchWriteOff,
  onSelectBarcodeToScan,
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'fefo_batches'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter === 'low' ? 'Low Stock' : initialFilter === 'stockout' ? 'Stockout' : 'All');

  // Modal open states
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);

  // Stock Adjustment modal states
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('Physical Cycle Count Audit Discrepancy');
  const [barcodePreviewProduct, setBarcodePreviewProduct] = useState<Product | null>(null);

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);

    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Low Stock' && p.quantityOnHand > 0 && p.quantityOnHand <= p.reorderPoint) ||
      (statusFilter === 'Stockout' && p.quantityOnHand === 0) ||
      (statusFilter === 'In Stock' && p.quantityOnHand > p.reorderPoint);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Filtered Batches for FEFO
  const filteredBatches = batches.slice().sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const handleApplyAdjustment = () => {
    if (!adjustingProduct || adjustmentDelta === 0) return;
    onUpdateProductStock(
      adjustingProduct.id,
      adjustmentDelta,
      'STOCK_ADJUSTMENT',
      adjustmentReason
    );
    playSuccessChime();
    setAdjustingProduct(null);
    setAdjustmentDelta(0);
  };

  const handleQuickPosDeduct = (p: Product) => {
    if (p.quantityOnHand <= 0) return;
    playBarcodeBeep();
    onUpdateProductStock(p.id, -1, 'SALE', `POS Quick Barcode Deduction: ${p.barcode}`);
  };

  return (
    <div className="space-y-6">
      {/* View Header & Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Stock Inventory &amp; FEFO Expiry Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-location SKU balances, custom product creation, batch tracking, and CSV data import
          </p>
        </div>

        {/* Action Buttons: Add Real Data & CSV */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'products' ? (
            <>
              <button
                onClick={() => setIsCsvModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                title="Import real data from CSV or Excel file"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV Import / Export</span>
              </button>

              <button
                onClick={() => setIsAddProductOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                title="Enter a new real stock item with barcode and bin"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Real Product</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsAddBatchOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md shadow-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Batch</span>
            </button>
          )}

          {/* Segmented View Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg ml-1">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SKUs ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('fefo_batches')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'fefo_batches'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              FEFO Batches ({batches.length})
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filter Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by SKU, product name, or 13-digit barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter products by category"
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Categories</option>
              <option value="Beverages">Beverages</option>
              <option value="Biscuits">Biscuits</option>
              <option value="Snacks">Snacks</option>
              <option value="Dairy">Dairy</option>
              <option value="Household">Household</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter products by stock status"
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Statuses</option>
              <option value="In Stock">In Stock (&gt; Reorder)</option>
              <option value="Low Stock">Low Stock (&le; Reorder)</option>
              <option value="Stockout">Stockout (0 units)</option>
            </select>
          </div>
        </div>
      </div>

      {/* View 1: Products High-Density Table */}
      {activeTab === 'products' && (
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-2.5 px-3">SKU &amp; Barcode</th>
                  <th className="py-2.5 px-3">Product Name &amp; Brand</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Warehouse &amp; Bin</th>
                  <th className="py-2.5 px-3 text-right">Units on Hand</th>
                  <th className="py-2.5 px-3 text-right">Reorder Point</th>
                  <th className="py-2.5 px-3 text-right">Cost / Sell</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 space-y-3">
                      <div>No stock items match your search criteria.</div>
                      <button
                        onClick={() => setIsAddProductOpen(true)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded cursor-pointer"
                      >
                        + Add First Real Stock Item
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isLow = p.quantityOnHand > 0 && p.quantityOnHand <= p.reorderPoint;
                    const isZero = p.quantityOnHand === 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* SKU & Barcode */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-mono font-semibold text-slate-200">{p.sku}</div>
                          <button
                            onClick={() => setBarcodePreviewProduct(p)}
                            className="text-[11px] font-mono text-cyan-400/90 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                            title="Click to view & scan printable barcode"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>{p.barcode}</span>
                          </button>
                        </td>

                        {/* Product Name */}
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-white">{p.name}</div>
                          <div className="text-[11px] text-slate-400">{p.brand} · {p.unit}</div>
                        </td>

                        {/* Category */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="text-slate-300">{p.category}</span>
                        </td>

                        {/* Location */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="text-slate-300 truncate max-w-[150px]">{p.warehouseLocation}</div>
                          <div className="font-mono text-[11px] text-cyan-400">{p.binCode}</div>
                        </td>

                        {/* Units on Hand */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums">
                          <span className={`text-sm font-bold ${
                            isZero ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {p.quantityOnHand}
                          </span>
                          <span className="text-[11px] text-slate-500 ml-1">units</span>
                        </td>

                        {/* Reorder Point */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums text-slate-300">
                          <div>{p.reorderPoint}</div>
                          <div className="text-[10px] text-slate-500">Safety: {p.safetyStock}</div>
                        </td>

                        {/* Pricing */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums text-slate-300">
                          <div>${p.sellingPrice.toFixed(2)}</div>
                          <div className="text-[10px] text-slate-500">Cost: ${p.unitCost.toFixed(2)}</div>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isZero ? (
                            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              <span>Stockout</span>
                            </span>
                          ) : isLow ? (
                            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span>Low Stock</span>
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>In Stock</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Fast POS Sell 1 unit */}
                            <button
                              onClick={() => handleQuickPosDeduct(p)}
                              disabled={p.quantityOnHand <= 0}
                              className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 rounded border border-slate-700 cursor-pointer"
                              title="POS Sell -1 unit"
                            >
                              -1 Sale
                            </button>

                            {/* Cycle Count Audit Adjust */}
                            <button
                              onClick={() => {
                                setAdjustingProduct(p);
                                setAdjustmentDelta(0);
                              }}
                              className="px-2 py-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 rounded border border-cyan-800/40 cursor-pointer"
                              title="Audit Adjust Stock"
                            >
                              Audit Adjust
                            </button>

                            {/* Test Scanner trigger */}
                            <button
                              onClick={() => onSelectBarcodeToScan(p.barcode)}
                              className="p-1 text-slate-400 hover:text-cyan-400 rounded hover:bg-slate-800 cursor-pointer"
                              title="Send barcode to Scanner Station"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: FEFO Batch Expiry View (Slide 5) */}
      {activeTab === 'fefo_batches' && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-slate-300">
                <strong>FEFO (First Expired, First Out) Rule:</strong> Batches with earliest expiration dates are prioritized for picking and POS sales first.
              </span>
            </div>
            <button
              onClick={() => setIsAddBatchOpen(true)}
              className="px-3 py-1 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded cursor-pointer whitespace-nowrap"
            >
              + Add Batch
            </button>
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Batch Number</th>
                    <th className="py-2.5 px-3">Product SKU</th>
                    <th className="py-2.5 px-3">Manufacture Date</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3 text-right">Days Remaining</th>
                    <th className="py-2.5 px-3 text-right">Batch Quantity</th>
                    <th className="py-2.5 px-3 text-right">Tied Capital</th>
                    <th className="py-2.5 px-3">FEFO Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredBatches.map((b) => {
                    const prod = products.find((p) => p.id === b.productId);
                    const isCritical = b.daysUntilExpiry <= 30;
                    const isExpired = b.daysUntilExpiry <= 0;

                    return (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">
                          {b.batchNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono text-cyan-400">{prod?.sku}</div>
                          <div className="text-slate-300 truncate max-w-[200px]">{prod?.name}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {b.manufactureDate}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">
                          {b.expiryDate}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          <span className={`font-bold ${
                            isExpired ? 'text-rose-400' : isCritical ? 'text-orange-400' : 'text-slate-300'
                          }`}>
                            {b.daysUntilExpiry} days
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-200 font-semibold">
                          {b.quantity} / {b.receivedQuantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                          ${(b.quantity * b.unitCost).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isExpired ? (
                            <span className="text-rose-400 font-semibold">EXPIRED</span>
                          ) : isCritical ? (
                            <span className="text-orange-400 font-semibold">Near Expiry (&le;30d)</span>
                          ) : (
                            <span className="text-emerald-400">Fresh / Nominal</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              onBatchWriteOff(b.id, b.quantity, 'FEFO Expiry write-off quarantine');
                            }}
                            className="px-2 py-1 text-[11px] text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 rounded border border-rose-800/40 cursor-pointer"
                          >
                            Quarantine / Waste
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cycle Count Audit Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">
                Cycle Count Stock Adjustment
              </h3>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <div className="font-semibold text-slate-200">{adjustingProduct.name}</div>
                <div className="font-mono text-slate-400 mt-1">
                  SKU: {adjustingProduct.sku} · Barcode: {adjustingProduct.barcode}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400">Current Balance:</span>
                  <span className="font-mono font-bold text-white">{adjustingProduct.quantityOnHand} units</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Quantity Change (+ to add, - to subtract)
                </label>
                <input
                  type="number"
                  value={adjustmentDelta}
                  onChange={(e) => setAdjustmentDelta(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  Projected New Balance: <strong className="font-mono text-cyan-400">{Math.max(0, adjustingProduct.quantityOnHand + adjustmentDelta)}</strong> units
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Audit Reason (Logged to DBMS Transaction Table)
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Physical Cycle Count Audit Discrepancy">Physical Cycle Count Audit Discrepancy</option>
                  <option value="Damaged Stock in Warehouse Bin">Damaged Stock in Warehouse Bin</option>
                  <option value="Inbound Supplier Pack Quantity Discrepancy">Inbound Supplier Pack Quantity Discrepancy</option>
                  <option value="Store Shelf Misplacement Recovery">Store Shelf Misplacement Recovery</option>
                </select>
              </div>

              <div className="p-2.5 bg-cyan-950/30 border border-cyan-800/40 rounded text-[11px] text-cyan-300">
                Logged under user role <strong>{currentRole}</strong> with ACID check constraint enforcement (<code className="font-mono">balance &ge; 0</code>).
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setAdjustingProduct(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyAdjustment}
                disabled={adjustmentDelta === 0}
                className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 rounded cursor-pointer"
              >
                Commit Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Sticker Preview Modal */}
      {barcodePreviewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-sm w-full p-5 space-y-4 shadow-xl text-center">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-left">
              <h3 className="text-sm font-bold text-white">Barcode Label Sticker</h3>
              <button
                onClick={() => setBarcodePreviewProduct(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Label Card */}
            <div className="p-4 bg-white text-slate-900 rounded border border-slate-300 shadow-sm space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {barcodePreviewProduct.brand} · FMCG
              </div>
              <div className="text-sm font-bold leading-tight">
                {barcodePreviewProduct.name}
              </div>
              <div className="text-xs text-slate-600 font-mono">
                SKU: {barcodePreviewProduct.sku}
              </div>

              {/* Render Barcode SVG */}
              <div className="py-2 flex flex-col items-center justify-center">
                <svg width="220" height="70" className="w-full h-16">
                  {generateBarcodeBars(barcodePreviewProduct.barcode).map((bar, idx) => (
                    <rect
                      key={idx}
                      x={bar.x * 1.1}
                      y="0"
                      width={bar.width * 1.1}
                      height="50"
                      fill="#000000"
                    />
                  ))}
                  <text
                    x="110"
                    y="65"
                    textAnchor="middle"
                    fontFamily="monospace"
                    fontSize="11"
                    fontWeight="bold"
                    fill="#111827"
                  >
                    {formatBarcodeString(barcodePreviewProduct.barcode)}
                  </text>
                </svg>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200">
                <span>BIN: {barcodePreviewProduct.binCode}</span>
                <span>PRICE: ${barcodePreviewProduct.sellingPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  onSelectBarcodeToScan(barcodePreviewProduct.barcode);
                  setBarcodePreviewProduct(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded cursor-pointer flex items-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Simulate Scanner Read</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Real Product Modal */}
      {isAddProductOpen && (
        <AddProductModal
          suppliers={suppliers}
          warehouses={warehouses}
          currentRole={currentRole}
          onClose={() => setIsAddProductOpen(false)}
          onAddProduct={onAddProduct}
        />
      )}

      {/* Bulk CSV Import/Export Modal */}
      {isCsvModalOpen && (
        <CsvImportExportModal
          products={products}
          onClose={() => setIsCsvModalOpen(false)}
          onImportProducts={onBulkImportProducts}
        />
      )}

      {/* Add Batch Modal */}
      {isAddBatchOpen && (
        <AddBatchModal
          products={products}
          warehouses={warehouses}
          onClose={() => setIsAddBatchOpen(false)}
          onAddBatch={onAddBatch}
        />
      )}
    </div>
  );
};
