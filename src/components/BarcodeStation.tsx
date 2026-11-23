import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Product, BatchItem, UserRole, TransactionType } from '../types/inventory';
import { Camera, QrCode, Volume2, VolumeX, CheckCircle, AlertTriangle, ArrowRight, RefreshCw, Printer, ShieldCheck } from 'lucide-react';
import { generateBarcodeBars, formatBarcodeString } from '../utils/barcode';
import { playBarcodeBeep, playLowStockAlertChime, playSuccessChime } from '../utils/audio';

interface BarcodeStationProps {
  products: Product[];
  batches: BatchItem[];
  currentRole: UserRole;
  selectedBarcode?: string;
  onUpdateProductStock: (productId: string, quantityChange: number, type: TransactionType, notes: string) => void;
  onClearSelectedBarcode?: () => void;
}

export const BarcodeStation: React.FC<BarcodeStationProps> = ({
  products,
  batches,
  currentRole,
  selectedBarcode,
  onUpdateProductStock,
  onClearSelectedBarcode,
}) => {
  const [scanMode, setScanMode] = useState<'POS_SALE' | 'STOCK_IN' | 'LOOKUP'>('POS_SALE');
  const [inputCode, setInputCode] = useState(selectedBarcode || '');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [scanResultFeedback, setScanResultFeedback] = useState<{
    type: 'success' | 'alert' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  // Scan activity log
  const [recentScans, setRecentScans] = useState<
    { id: string; time: string; barcode: string; name: string; mode: string; qty: number }[]
  >([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Sync incoming selectedBarcode prop
  useEffect(() => {
    if (selectedBarcode) {
      setInputCode(selectedBarcode);
      handleProcessScan(selectedBarcode);
      if (onClearSelectedBarcode) onClearSelectedBarcode();
    }
  }, [selectedBarcode]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);

      // Start detection loop if BarcodeDetector is supported
      if ('BarcodeDetector' in window) {
        // @ts-expect-error BarcodeDetector browser experimental API
        const detector = new window.BarcodeDetector({ formats: ['code_128', 'ean_13', 'upc_a'] });
        scanIntervalRef.current = window.setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const detected = await detector.detect(videoRef.current);
              if (detected && detected.length > 0) {
                const rawVal = detected[0].rawValue;
                handleProcessScan(rawVal);
              }
            } catch {
              // Frame scan skip
            }
          }
        }, 600);
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('Webcam access was not granted or is unavailable in this browser environment. You can use the instant optical scanner simulator below!');
      setCameraActive(false);
    }
  };

  const handleProcessScan = useCallback(
    (codeToScan: string) => {
      const trimmed = codeToScan.trim();
      if (!trimmed) return;

      const product = products.find((p) => p.barcode === trimmed || p.sku.toLowerCase() === trimmed.toLowerCase());

      if (!product) {
        if (audioEnabled) playLowStockAlertChime();
        setScanResultFeedback({
          type: 'error',
          message: `Unrecognized Barcode: ${trimmed}`,
          details: 'SKU not found in Master Products catalog (Referential Integrity Check).',
        });
        return;
      }

      setLastScannedProduct(product);

      if (scanMode === 'POS_SALE') {
        if (product.quantityOnHand <= 0) {
          if (audioEnabled) playLowStockAlertChime();
          setScanResultFeedback({
            type: 'error',
            message: `Out of Stock: ${product.name}`,
            details: `Cannot fulfill sale. Quantity on hand is 0. Check constraint chk_quantity_positive prevented negative balance.`,
          });
          return;
        }

        // Deduct 1 unit
        if (audioEnabled) playBarcodeBeep();
        onUpdateProductStock(product.id, -1, 'SALE', `Retail POS Scan: ${trimmed}`);

        const newBalance = product.quantityOnHand - 1;
        const hitLowStock = newBalance <= product.reorderPoint;

        if (hitLowStock && audioEnabled) {
          setTimeout(() => playLowStockAlertChime(), 150);
        }

        setScanResultFeedback({
          type: hitLowStock ? 'alert' : 'success',
          message: `POS Sale Recorded: ${product.name}`,
          details: hitLowStock
            ? `Stock dropped to ${newBalance} units (At/Below Reorder Point: ${product.reorderPoint}). Automated replenishment alert triggered!`
            : `1 unit deducted. Current balance: ${newBalance} units. Bin: ${product.binCode}.`,
        });

        setRecentScans((prev) => [
          {
            id: Math.random().toString(),
            time: new Date().toLocaleTimeString(),
            barcode: trimmed,
            name: product.name,
            mode: 'POS Sale (-1)',
            qty: -1,
          },
          ...prev.slice(0, 9),
        ]);
      } else if (scanMode === 'STOCK_IN') {
        // Inbound receipt +10 units
        if (audioEnabled) playSuccessChime();
        onUpdateProductStock(product.id, 10, 'RECEIPT', `Inbound Barcode Receiving: +10 units to ${product.binCode}`);

        setScanResultFeedback({
          type: 'success',
          message: `Inbound Receiving Completed: ${product.name}`,
          details: `+10 units credited to ${product.warehouseLocation} (${product.binCode}). New Balance: ${product.quantityOnHand + 10} units.`,
        });

        setRecentScans((prev) => [
          {
            id: Math.random().toString(),
            time: new Date().toLocaleTimeString(),
            barcode: trimmed,
            name: product.name,
            mode: 'Inbound (+10)',
            qty: 10,
          },
          ...prev.slice(0, 9),
        ]);
      } else {
        // Lookup mode
        if (audioEnabled) playBarcodeBeep();
        setScanResultFeedback({
          type: 'success',
          message: `Catalog Lookup: ${product.name}`,
          details: `SKU: ${product.sku} · Bin: ${product.binCode} · Balance: ${product.quantityOnHand} units · Price: $${product.sellingPrice.toFixed(2)}`,
        });
      }
    },
    [products, scanMode, audioEnabled, onUpdateProductStock]
  );

  const handleSubmitManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessScan(inputCode);
  };

  return (
    <div className="space-y-6">
      {/* View Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-cyan-400" />
            <span>Optical Barcode Scanning Station</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            High-speed optical laser decoding, live camera detection, and real-time inventory deductions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
              audioEnabled
                ? 'bg-slate-800 text-cyan-400 border-cyan-800/40'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Toggle synthesized POS laser scanner audio beep"
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Laser Beep {audioEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Mode Selector & Status Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => setScanMode('POS_SALE')}
          className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
            scanMode === 'POS_SALE'
              ? 'bg-cyan-950/30 border-cyan-500/50 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
            <span>Mode 1: POS Retail Checkout</span>
            <span className="text-[10px] font-mono bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/50">OUTBOUND</span>
          </div>
          <div className="text-xs text-slate-300 mt-1 font-medium">Automatic -1 Stock Deduction</div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Triggers sales transaction and automated low-level alert if balance &le; reorder point.
          </p>
        </button>

        <button
          onClick={() => setScanMode('STOCK_IN')}
          className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
            scanMode === 'STOCK_IN'
              ? 'bg-emerald-950/30 border-emerald-500/50 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span>Mode 2: Inbound Receiving</span>
            <span className="text-[10px] font-mono bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/50">INBOUND</span>
          </div>
          <div className="text-xs text-slate-300 mt-1 font-medium">Stock-In Receipt (+10 Units)</div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Simulates goods receipt intake into designated warehouse bin with transaction log.
          </p>
        </button>

        <button
          onClick={() => setScanMode('LOOKUP')}
          className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
            scanMode === 'LOOKUP'
              ? 'bg-purple-950/30 border-purple-500/50 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
            <span>Mode 3: SKU &amp; Bin Lookup</span>
            <span className="text-[10px] font-mono bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800/50">VERIFY</span>
          </div>
          <div className="text-xs text-slate-300 mt-1 font-medium">Read-Only Product Inspection</div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Inspects master data, safety stock, price, and active batch without modifying balance.
          </p>
        </button>
      </div>

      {/* Main Dual Grid: Scanner Camera / Simulator & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Scanner & Input (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Camera Scanning Port */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Live Camera Scanner
                </h2>
              </div>
              <button
                onClick={cameraActive ? stopCamera : startCamera}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  cameraActive
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {cameraActive ? 'Stop Camera' : 'Start Webcam Stream'}
              </button>
            </div>

            {cameraActive ? (
              <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-cyan-500/40 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Laser Alignment Reticle */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-3/4 h-1/2 border-2 border-cyan-400/60 rounded-md relative flex items-center justify-center">
                    {/* Animated horizontal laser beam */}
                    <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />
                    <span className="absolute -bottom-6 text-[10px] font-mono text-cyan-300 bg-black/70 px-2 py-0.5 rounded">
                      Align barcode within bounding box
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-950 border border-slate-800/80 rounded-lg text-center space-y-2">
                <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-xs text-slate-300 font-medium">Camera Inactive</div>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Click &ldquo;Start Webcam Stream&rdquo; to use your device camera, or use the interactive 1-click test barcodes below.
                </p>
                {cameraError && (
                  <div className="text-[11px] text-amber-400/90 bg-amber-950/20 p-2 rounded border border-amber-800/30 mt-2">
                    {cameraError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual Input Barcode Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Handheld Optical Gun &amp; Manual Input
            </h2>
            <form onSubmit={handleSubmitManualScan} className="flex gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter or paste barcode (e.g. 8901020304011)..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <QrCode className="w-4 h-4" />
                <span>Simulate Scan</span>
              </button>
            </form>
          </div>

          {/* 1-Click Fast Optical Test Barcodes */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                Quick Optical Barcode Presets (Click to Scan)
              </h2>
              <span className="text-[11px] text-slate-400">Clicking triggers authentic beep</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {products.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setInputCode(p.barcode);
                    handleProcessScan(p.barcode);
                  }}
                  className="p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 rounded-md text-left transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-medium text-slate-200 group-hover:text-cyan-300 truncate">
                      {p.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{p.barcode}</span>
                      <span>·</span>
                      <span className={p.quantityOnHand <= p.reorderPoint ? 'text-amber-400' : 'text-emerald-400'}>
                        {p.quantityOnHand} in stock
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 p-1 rounded bg-slate-900 border border-slate-800 group-hover:border-cyan-500/50">
                    <QrCode className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Scan Result Feedback & Transaction History (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Scan Result Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                Scanner Terminal Response
              </h2>
              <span className="text-[11px] font-mono text-cyan-400">DBMS Transaction Logged</span>
            </div>

            {scanResultFeedback ? (
              <div
                className={`p-3.5 rounded-lg border ${
                  scanResultFeedback.type === 'error'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : scanResultFeedback.type === 'alert'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {scanResultFeedback.type === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : scanResultFeedback.type === 'alert' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-xs font-bold">{scanResultFeedback.message}</div>
                    {scanResultFeedback.details && (
                      <div className="text-[11px] opacity-90 mt-1 leading-relaxed">
                        {scanResultFeedback.details}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                Ready for scan. Point laser or click a product above.
              </div>
            )}

            {/* If Last Scanned Product exists, show full optical sticker */}
            {lastScannedProduct && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex justify-between">
                  <span>Matched Master SKU</span>
                  <span className="text-cyan-400">{lastScannedProduct.binCode}</span>
                </div>
                <div className="text-xs font-bold text-white leading-tight">
                  {lastScannedProduct.name}
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">RETAIL</span>
                    ${lastScannedProduct.sellingPrice.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">BALANCE</span>
                    <strong className={lastScannedProduct.quantityOnHand <= lastScannedProduct.reorderPoint ? 'text-amber-400' : 'text-emerald-400'}>
                      {lastScannedProduct.quantityOnHand} units
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">REORDER AT</span>
                    {lastScannedProduct.reorderPoint} units
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Scanned Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Recent Scanner Activity
            </h2>

            {recentScans.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">
                No scans recorded in this session.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {recentScans.map((s) => (
                  <div
                    key={s.id}
                    className="p-2 bg-slate-950 border border-slate-800/80 rounded text-xs flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <div className="text-slate-200 font-medium truncate">{s.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {s.time} · {s.barcode}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                        s.qty < 0 ? 'bg-cyan-950/60 text-cyan-400' : 'bg-emerald-950/60 text-emerald-400'
                      }`}
                    >
                      {s.mode}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
