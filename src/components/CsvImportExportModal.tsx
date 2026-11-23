import React, { useState } from 'react';
import { Product } from '../types/inventory';
import { X, Upload, Download, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { playSuccessChime } from '../utils/audio';

interface CsvImportExportModalProps {
  products: Product[];
  onClose: () => void;
  onImportProducts: (newProducts: Product[]) => void;
}

export const CsvImportExportModal: React.FC<CsvImportExportModalProps> = ({
  products,
  onClose,
  onImportProducts,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<Partial<Product>[]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const sampleCsvHeader = 'sku,name,category,brand,barcode,unit,unitCost,sellingPrice,quantityOnHand,reorderPoint,safetyStock,warehouseLocation,binCode';
  const sampleCsvData = `${sampleCsvHeader}
BEV-MAN-500,Tropical Mango Juice 500ml,Beverages,SunSplash,8905544332211,Bottle,0.85,2.49,60,30,15,Central Distribution Warehouse,BIN-BEV-M01
SNK-POT-100,Salted Gourmet Potato Chips 100g,Snacks,CrispPro,8905544332228,Bag,0.70,1.99,110,40,20,Downtown Megastore Hub,BIN-SNK-P02
DAI-CHE-200,Mild Mozzarella Shreds 200g,Dairy,Highland Meadows,8905544332235,Pack,1.80,4.50,45,25,10,Downtown Megastore Hub,BIN-CHILL-C01`;

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleCsvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'fmcg_inventory_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCurrentStock = () => {
    const rows = products.map((p) => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      `"${p.brand.replace(/"/g, '""')}"`,
      p.barcode,
      p.unit,
      p.unitCost,
      p.sellingPrice,
      p.quantityOnHand,
      p.reorderPoint,
      p.safetyStock,
      `"${p.warehouseLocation}"`,
      p.binCode,
    ].join(','));

    const fullCsv = [sampleCsvHeader, ...rows].join('\n');
    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fmcg_products_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCsvString(text);
    };
    reader.readAsText(file);
  };

  const parseCsvString = (content: string) => {
    setErrorStatus(null);
    setImportStatus(null);
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

    if (lines.length < 2) {
      setErrorStatus('CSV content must contain a header row and at least one data row.');
      setParsedRows([]);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows: Partial<Product>[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Regex parsing for CSV lines with potential quoted commas
      const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
      const values = matches.map((v) => v.trim().replace(/^"|"$/g, ''));

      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });

      if (rowObj.sku || rowObj.name) {
        rows.push({
          id: `prod-${Date.now()}-${i}`,
          sku: rowObj.sku || `SKU-${Date.now()}-${i}`,
          name: rowObj.name || 'Imported Product',
          category: (rowObj.category as Product['category']) || 'Beverages',
          brand: rowObj.brand || 'Generic',
          barcode: rowObj.barcode || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          unit: rowObj.unit || 'Pack',
          unitCost: parseFloat(rowObj.unitCost) || 1.0,
          sellingPrice: parseFloat(rowObj.sellingPrice) || 2.5,
          quantityOnHand: parseInt(rowObj.quantityOnHand) || 0,
          reorderPoint: parseInt(rowObj.reorderPoint) || 30,
          safetyStock: parseInt(rowObj.safetyStock) || 15,
          maxStock: 250,
          dailyVelocity: 5,
          leadTimeDays: 4,
          primarySupplierId: 'SUP-001',
          warehouseLocation: rowObj.warehouseLocation || 'Central Distribution Warehouse',
          binCode: rowObj.binCode || 'BIN-GEN-01',
          status: (parseInt(rowObj.quantityOnHand) || 0) <= (parseInt(rowObj.reorderPoint) || 30) ? 'Low Stock' : 'In Stock',
          lastAuditedAt: new Date().toISOString().split('T')[0],
        });
      }
    }

    setParsedRows(rows);
  };

  const handleCommitImport = () => {
    if (parsedRows.length === 0) {
      setErrorStatus('No valid rows found to import.');
      return;
    }

    onImportProducts(parsedRows as Product[]);
    playSuccessChime();
    setImportStatus(`Successfully committed ${parsedRows.length} real stock items to the database.`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full my-8 p-6 shadow-2xl space-y-5 text-xs text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Bulk Stock Import &amp; Export (CSV Integration Layer)</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Upload spreadsheets, paste CSV records, or export current catalog data
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeTab === 'import' ? 'bg-slate-800 text-cyan-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Import Real Stock CSV
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeTab === 'export' ? 'bg-slate-800 text-cyan-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Export Catalog CSV
          </button>
        </div>

        {activeTab === 'import' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-950 rounded border border-slate-800">
              <div className="text-[11px] text-slate-300">
                Need the standard structure? Download our pre-formatted spreadsheet template:
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 rounded flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            {/* File drag/drop or choose */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Upload File (.csv)
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800"
              />
            </div>

            {/* Or Paste CSV */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-300">Or Paste CSV Data Directly:</label>
                <button
                  type="button"
                  onClick={() => {
                    setCsvText(sampleCsvData);
                    parseCsvString(sampleCsvData);
                  }}
                  className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                >
                  Load Sample Data
                </button>
              </div>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  parseCsvString(e.target.value);
                }}
                placeholder="sku,name,category,brand,barcode,unit,unitCost,sellingPrice,quantityOnHand,reorderPoint..."
                className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 font-mono text-[11px] text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {errorStatus && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorStatus}</span>
              </div>
            )}

            {importStatus && (
              <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {/* Parsed Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300">
                    Parsed Records Ready to Commit ({parsedRows.length} items):
                  </span>
                </div>
                <div className="border border-slate-800 rounded bg-slate-950 max-h-40 overflow-y-auto">
                  <table className="w-full text-left text-[11px] border-collapse font-mono">
                    <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="p-1.5">SKU</th>
                        <th className="p-1.5 font-sans">Product Name</th>
                        <th className="p-1.5">Barcode</th>
                        <th className="p-1.5 text-right">Qty</th>
                        <th className="p-1.5 text-right">Cost</th>
                        <th className="p-1.5 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {parsedRows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-900/40">
                          <td className="p-1.5 text-cyan-400">{r.sku}</td>
                          <td className="p-1.5 font-sans truncate max-w-[150px]">{r.name}</td>
                          <td className="p-1.5">{r.barcode}</td>
                          <td className="p-1.5 text-right text-emerald-400">{r.quantityOnHand}</td>
                          <td className="p-1.5 text-right">${r.unitCost?.toFixed(2)}</td>
                          <td className="p-1.5 text-right">${r.sellingPrice?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedRows.length === 0}
                onClick={handleCommitImport}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 rounded transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Import {parsedRows.length} Items to Database</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-4">
            <p className="text-slate-300 leading-relaxed">
              Export your full active database containing all <strong>{products.length}</strong> master SKUs, current on-hand units, shelf bin assignments, and pricing into a clean CSV spreadsheet.
            </p>

            <div className="p-4 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Full Inventory Snapshot</div>
                <div className="text-[11px] text-slate-400">Total {products.length} records · Ready for Excel / ERP</div>
              </div>
              <button
                type="button"
                onClick={handleExportCurrentStock}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV File</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
