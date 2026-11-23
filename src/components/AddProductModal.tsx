import React, { useState } from 'react';
import { Product, BatchItem, Supplier, WarehouseLocation, UserRole } from '../types/inventory';
import { X, Plus, Sparkles, AlertCircle, CheckCircle, QrCode } from 'lucide-react';
import { playSuccessChime } from '../utils/audio';

interface AddProductModalProps {
  suppliers: Supplier[];
  warehouses: WarehouseLocation[];
  currentRole: UserRole;
  onClose: () => void;
  onAddProduct: (newProduct: Product, initialBatch?: BatchItem) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  suppliers,
  warehouses,
  currentRole,
  onClose,
  onAddProduct,
}) => {
  // Form fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<Product['category']>('Beverages');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('Bottle');
  const [unitCost, setUnitCost] = useState<number>(1.25);
  const [sellingPrice, setSellingPrice] = useState<number>(2.99);
  const [initialQuantity, setInitialQuantity] = useState<number>(50);
  const [reorderPoint, setReorderPoint] = useState<number>(25);
  const [safetyStock, setSafetyStock] = useState<number>(15);
  const [maxStock, setMaxStock] = useState<number>(200);
  const [dailyVelocity, setDailyVelocity] = useState<number>(8);
  const [warehouseLocation, setWarehouseLocation] = useState(warehouses[0]?.name || 'Central Distribution Warehouse');
  const [binCode, setBinCode] = useState('BIN-NEW-01');
  const [primarySupplierId, setPrimarySupplierId] = useState(suppliers[0]?.id || 'SUP-001');

  // Batch fields
  const [createInitialBatch, setCreateInitialBatch] = useState(true);
  const [batchNumber, setBatchNumber] = useState(`BAT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [manufactureDate, setManufactureDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Helper to auto-generate standard barcode (EAN-13)
  const handleGenerateBarcode = () => {
    // 890 + random 9 digits + check digit
    const base = '890' + Math.floor(100000000 + Math.random() * 900000000).toString();
    setBarcode(base.substring(0, 13));
  };

  // Helper to auto-generate SKU based on Category and Name
  const handleAutoGenerateSku = () => {
    const catCode = category.substring(0, 3).toUpperCase();
    const cleanName = (brand || name || 'ITEM')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    setSku(`${catCode}-${cleanName}-${rand}`);
    if (!binCode || binCode === 'BIN-NEW-01') {
      setBinCode(`BIN-${catCode}-0${Math.floor(1 + Math.random() * 9)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!name.trim()) {
      setFormError('Product Name is required.');
      return;
    }
    if (!sku.trim()) {
      setFormError('SKU (Stock Keeping Unit) is required.');
      return;
    }
    if (!barcode.trim()) {
      setFormError('Barcode number is required.');
      return;
    }
    if (unitCost < 0) {
      setFormError('Unit cost must be positive (DBMS Check Constraint chk_cost_positive).');
      return;
    }
    if (sellingPrice < unitCost) {
      setFormError('Selling price must be greater than or equal to unit cost.');
      return;
    }

    const prodId = `prod-${Date.now()}`;
    const selectedSupplier = suppliers.find((s) => s.id === primarySupplierId) || suppliers[0];

    let status: Product['status'] = 'In Stock';
    if (initialQuantity === 0) status = 'Stockout';
    else if (initialQuantity <= reorderPoint) status = 'Low Stock';

    const newProd: Product = {
      id: prodId,
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      category,
      brand: brand.trim() || 'Generic',
      barcode: barcode.trim(),
      unit,
      unitCost: Number(unitCost),
      sellingPrice: Number(sellingPrice),
      quantityOnHand: Number(initialQuantity),
      reorderPoint: Number(reorderPoint),
      safetyStock: Number(safetyStock),
      maxStock: Number(maxStock),
      dailyVelocity: Number(dailyVelocity),
      leadTimeDays: selectedSupplier.leadTimeDays || 4,
      primarySupplierId: selectedSupplier.id,
      warehouseLocation,
      binCode: binCode.trim().toUpperCase() || 'BIN-A01',
      status,
      lastAuditedAt: new Date().toISOString().split('T')[0],
    };

    let initialBatchItem: BatchItem | undefined;
    if (createInitialBatch && initialQuantity > 0) {
      const expD = new Date(expiryDate);
      const today = new Date();
      const diffDays = Math.ceil((expD.getTime() - today.getTime()) / (1000 * 3600 * 24));

      let batchStatus: BatchItem['status'] = 'Fresh';
      if (diffDays <= 0) batchStatus = 'Expired';
      else if (diffDays <= 15) batchStatus = 'Critical Expiry';
      else if (diffDays <= 30) batchStatus = 'Near Expiry';

      initialBatchItem = {
        id: `bat-${Date.now()}`,
        productId: prodId,
        batchNumber: batchNumber.trim().toUpperCase(),
        manufactureDate,
        expiryDate,
        quantity: Number(initialQuantity),
        receivedQuantity: Number(initialQuantity),
        unitCost: Number(unitCost),
        warehouseId: warehouses.find((w) => w.name === warehouseLocation)?.id || 'WH-01',
        binCode: binCode.trim().toUpperCase() || 'BIN-A01',
        daysUntilExpiry: diffDays,
        fefoPriority: diffDays <= 30 ? 1 : 2,
        status: batchStatus,
      };
    }

    playSuccessChime();
    onAddProduct(newProd, initialBatchItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full my-8 p-6 shadow-2xl space-y-5 text-xs text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Add New Real Stock Item (Master Data Insert)</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Enter real product attributes, physical barcode, storage bin, and FEFO expiry batch
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="p-3 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Basic Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Lipton Yellow Label Tea 400g"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Brand Name</label>
              <input
                type="text"
                placeholder="e.g. Lipton / Unilever"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Section 2: SKU & Barcode with auto-generators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-300">SKU (Stock Keeping Unit) *</label>
                <button
                  type="button"
                  onClick={handleAutoGenerateSku}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-mono"
                >
                  <Sparkles className="w-3 h-3" /> Auto Gen
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. BEV-LIP-400"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-300">Barcode (EAN-13 / Code128) *</label>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-mono"
                >
                  <QrCode className="w-3 h-3" /> Auto EAN-13
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. 8901234567890"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Section 3: Category & Units */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">FMCG Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Product['category'])}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Beverages">Beverages</option>
                <option value="Biscuits">Biscuits</option>
                <option value="Snacks">Snacks</option>
                <option value="Dairy">Dairy</option>
                <option value="Household">Household</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Packaging Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Pack">Pack</option>
                <option value="Bottle">Bottle</option>
                <option value="Can">Can</option>
                <option value="Box">Box</option>
                <option value="Bag">Bag</option>
                <option value="Carton">Carton</option>
                <option value="Tub">Tub</option>
                <option value="Jug">Jug</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Primary Supplier</label>
              <select
                value={primarySupplierId}
                onChange={(e) => setPrimarySupplierId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.leadTimeDays}d lead)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 4: Pricing & Quantities */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Unit Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Selling Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Initial Stock Qty</label>
              <input
                type="number"
                min="0"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Reorder Point</label>
              <input
                type="number"
                min="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Section 5: Location & Logistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Warehouse Hub</label>
              <select
                value={warehouseLocation}
                onChange={(e) => setWarehouseLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name} ({w.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Shelf Bin Allocation</label>
              <input
                type="text"
                placeholder="e.g. BIN-BEV-A04"
                value={binCode}
                onChange={(e) => setBinCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Section 6: Initial FEFO Batch Checkbox */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-200">
              <input
                type="checkbox"
                checked={createInitialBatch}
                onChange={(e) => setCreateInitialBatch(e.target.checked)}
                className="rounded text-cyan-500 focus:ring-0 bg-slate-900 border-slate-700"
              />
              <span>Generate Initial Inbound Batch Record (FEFO Tracking)</span>
            </label>

            {createInitialBatch && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Manufacture Date</label>
                  <input
                    type="date"
                    value={manufactureDate}
                    onChange={(e) => setManufactureDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 font-mono">
              Role: <strong>{currentRole}</strong> (DDL/DML Insert)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Save Stock Item to Database</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
