import React, { useState } from 'react';
import { Product, BatchItem, WarehouseLocation } from '../types/inventory';
import { X, Plus, CheckCircle, Calendar, Package } from 'lucide-react';
import { playSuccessChime } from '../utils/audio';

interface AddBatchModalProps {
  products: Product[];
  warehouses: WarehouseLocation[];
  onClose: () => void;
  onAddBatch: (batch: BatchItem) => void;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({
  products,
  warehouses,
  onClose,
  onAddBatch,
}) => {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [batchNumber, setBatchNumber] = useState(`BAT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [manufactureDate, setManufactureDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });
  const [quantity, setQuantity] = useState(50);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || 'WH-01');
  const [binCode, setBinCode] = useState('BIN-BATCH-01');

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || quantity <= 0) return;

    const expD = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expD.getTime() - today.getTime()) / (1000 * 3600 * 24));

    let status: BatchItem['status'] = 'Fresh';
    if (diffDays <= 0) status = 'Expired';
    else if (diffDays <= 15) status = 'Critical Expiry';
    else if (diffDays <= 30) status = 'Near Expiry';

    const newBatch: BatchItem = {
      id: `bat-${Date.now()}`,
      productId: selectedProduct.id,
      batchNumber: batchNumber.trim().toUpperCase(),
      manufactureDate,
      expiryDate,
      quantity: Number(quantity),
      receivedQuantity: Number(quantity),
      unitCost: selectedProduct.unitCost,
      warehouseId,
      binCode: binCode.trim().toUpperCase() || selectedProduct.binCode,
      daysUntilExpiry: diffDays,
      fefoPriority: diffDays <= 30 ? 1 : diffDays <= 90 ? 2 : 3,
      status,
    };

    playSuccessChime();
    onAddBatch(newBatch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs text-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" />
              <span>Add New Batch (FEFO Shelf-Life Tracking)</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Assign physical batch lot number and expiration date for First-Expired-First-Out prioritization
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Select Target Product SKU</label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const found = products.find((p) => p.id === e.target.value);
                if (found) setBinCode(found.binCode);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} (Current: {p.quantityOnHand} units)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Batch / Lot Number</label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Batch Quantity (Units)</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Manufacture Date</label>
              <input
                type="date"
                required
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Expiry Date</label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Warehouse Facility</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Assigned Bin Code</label>
              <input
                type="text"
                value={binCode}
                onChange={(e) => setBinCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
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
              <span>Create FEFO Batch Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
