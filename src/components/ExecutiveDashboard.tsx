import React from 'react';
import { Product, BatchItem, PurchaseOrder, InventoryTransaction } from '../types/inventory';
import { AlertTriangle, TrendingDown, ArrowUpRight, DollarSign, Box, ShieldAlert, Clock, RefreshCw, BarChart3, Database } from 'lucide-react';

interface ExecutiveDashboardProps {
  products: Product[];
  batches: BatchItem[];
  purchaseOrders: PurchaseOrder[];
  transactions: InventoryTransaction[];
  onNavigateTab: (tab: string, filter?: string) => void;
  onOpenQuickScan: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  products,
  batches,
  purchaseOrders,
  transactions,
  onNavigateTab,
  onOpenQuickScan,
}) => {
  // Compute live metrics
  const totalSkus = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.quantityOnHand, 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + p.quantityOnHand * p.unitCost, 0);
  const lowStockItems = products.filter((p) => p.quantityOnHand > 0 && p.quantityOnHand <= p.reorderPoint);
  const stockoutItems = products.filter((p) => p.quantityOnHand === 0);
  const nearExpiryBatches = batches.filter((b) => b.daysUntilExpiry <= 30 && b.daysUntilExpiry > 0);
  const expiredBatches = batches.filter((b) => b.daysUntilExpiry <= 0);
  const pendingPOs = purchaseOrders.filter((po) => po.status === 'Sent' || po.status === 'In Transit' || po.status === 'Delayed');
  const delayedPOs = purchaseOrders.filter((po) => po.isDelayed);

  // Category analysis
  const categories = ['Beverages', 'Biscuits', 'Snacks', 'Dairy', 'Household'] as const;
  const categoryStats = categories.map((cat) => {
    const items = products.filter((p) => p.category === cat);
    const stockUnits = items.reduce((acc, p) => acc + p.quantityOnHand, 0);
    const monthlySalesEst = Math.round(items.reduce((acc, p) => acc + p.dailyVelocity * 30, 0));
    return {
      name: cat,
      stockUnits,
      monthlySalesEst,
      skusCount: items.length,
    };
  });

  const maxCategoryVal = Math.max(...categoryStats.map((c) => Math.max(c.stockUnits, c.monthlySalesEst)), 500);

  // Weekly trend demo data (Mon - Sun)
  const weeklyTrends = [
    { day: 'Mon', sales: 420, movement: 380 },
    { day: 'Tue', sales: 490, movement: 450 },
    { day: 'Wed', sales: 530, movement: 510 },
    { day: 'Thu', sales: 480, movement: 560 },
    { day: 'Fri', sales: 620, movement: 640 },
    { day: 'Sat', sales: 740, movement: 710 },
    { day: 'Sun', sales: 680, movement: 620 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Subtitle banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Smart Inventory & Supply Chain Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Production-style DBMS project transformed into an enterprise SaaS foundation · PostgreSQL 3NF Schema & SQL Intelligence
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('dbms')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open DBMS Studio</span>
          </button>
          <button
            onClick={onOpenQuickScan}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <Box className="w-3.5 h-3.5" />
            <span>Fast POS / Barcode Scan</span>
          </button>
        </div>
      </div>

      {/* Traceable Stock Equation Banner (Slide 5) */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg text-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-cyan-400 font-semibold uppercase tracking-wider text-[11px]">Traceable Stock Formula</span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-300 font-mono text-[11px]">
            Closing = Opening + Receipts + Transfer In − Sales − Transfer Out − Damage/Expiry ± Adjustments
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
          <span>Txns Logged: <strong className="text-slate-200">{transactions.length}</strong></span>
          <span>·</span>
          <span>ACID Isolation: <strong className="text-emerald-400">Read Committed</strong></span>
        </div>
      </div>

      {/* 8 Primary KPI Cards (Slide 7) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total SKUs</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {totalSkus.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>5 categories</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Stock Units</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {totalStockUnits.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across 3 hubs</div>
        </div>

        <button
          onClick={() => onNavigateTab('stock', 'low')}
          className="p-3 bg-slate-900 hover:bg-slate-800/80 border border-amber-500/30 rounded-lg text-left transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-medium text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>Low Stock</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-1">
            {lowStockItems.length}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">Below reorder point</div>
        </button>

        <button
          onClick={() => onNavigateTab('stock', 'stockout')}
          className="p-3 bg-slate-900 hover:bg-slate-800/80 border border-rose-500/30 rounded-lg text-left transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider flex items-center justify-between">
            <span>Stockout Risk</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-300 mt-1">
            {stockoutItems.length}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1">Zero units available</div>
        </button>

        <button
          onClick={() => onNavigateTab('stock')}
          className="p-3 bg-slate-900 hover:bg-slate-800/80 border border-orange-500/30 rounded-lg text-left transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-medium text-orange-400 uppercase tracking-wider flex items-center justify-between">
            <span>Expiring (&lt;30d)</span>
            <Clock className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-xl font-bold font-mono text-orange-300 mt-1">
            {nearExpiryBatches.length + expiredBatches.length}
          </div>
          <div className="text-[11px] text-orange-400/80 mt-1">FEFO prioritized</div>
        </button>

        <button
          onClick={() => onNavigateTab('replenish')}
          className="p-3 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-left transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Pending POs</span>
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {pendingPOs.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {delayedPOs.length > 0 ? (
              <span className="text-rose-400">{delayedPOs.length} delayed</span>
            ) : (
              'On schedule'
            )}
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('replenish')}
          className="p-3 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-left transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Replenish Req</div>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
            {lowStockItems.length + stockoutItems.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Actionable orders</div>
        </button>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Inventory Value</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            ${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Valuation at cost</div>
        </div>
      </div>

      {/* Main Charts & Analytics Split (Slide 6 & 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stock vs Sales by Category (Slide 6 Bar Chart) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Stock Units vs Monthly Sales Velocity</h2>
              <p className="text-xs text-slate-400">Inventory balance versus sales run-rate by category</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
                <span>Stock Units</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                <span>Monthly Sales</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {categoryStats.map((cat) => {
              const stockWidth = Math.min(100, Math.round((cat.stockUnits / maxCategoryVal) * 100));
              const salesWidth = Math.min(100, Math.round((cat.monthlySalesEst / maxCategoryVal) * 100));

              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{cat.name}</span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      Stock: <strong className="text-cyan-400 font-mono">{cat.stockUnits}</strong> · Est Sales: <strong className="text-rose-400 font-mono">{cat.monthlySalesEst}</strong>/mo
                    </span>
                  </div>

                  <div className="space-y-1">
                    {/* Stock Units bar */}
                    <div className="h-3 w-full bg-slate-800 rounded-sm overflow-hidden flex">
                      <div
                        style={{ width: `${Math.max(stockWidth, 4)}%` }}
                        className="bg-cyan-500 rounded-sm transition-all duration-300"
                        title={`${cat.name} Stock: ${cat.stockUnits}`}
                      />
                    </div>
                    {/* Monthly Sales bar */}
                    <div className="h-3 w-full bg-slate-800 rounded-sm overflow-hidden flex">
                      <div
                        style={{ width: `${Math.max(salesWidth, 4)}%` }}
                        className="bg-rose-500 rounded-sm transition-all duration-300"
                        title={`${cat.name} Monthly Sales: ${cat.monthlySalesEst}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Reorder formula: <code className="text-slate-300">IF quantity_on_hand &le; reorder_point &rarr; trigger PO</code></span>
            <button
              onClick={() => onNavigateTab('dbms')}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>Inspect SQL Rules</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Illustrative Weekly Movement Trend (Slide 7) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Weekly Inflow vs Outflow Trend</h2>
                <p className="text-xs text-slate-400">Daily POS sales versus warehouse receipts</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Sales
                </span>
                <span className="flex items-center gap-1 text-purple-400">
                  <span className="w-2 h-2 rounded-full bg-purple-400" /> Movement
                </span>
              </div>
            </div>

            {/* SVG line / trend graph */}
            <div className="h-44 w-full relative flex items-end justify-between px-2 pt-4 pb-2 border-b border-slate-800">
              {weeklyTrends.map((t) => {
                const salesHeight = (t.sales / 800) * 100;
                const moveHeight = (t.movement / 800) * 100;

                return (
                  <div key={t.day} className="flex flex-col items-center gap-1 flex-1 px-1">
                    <div className="w-full flex items-end justify-center gap-1 h-32">
                      <div
                        style={{ height: `${salesHeight}%` }}
                        className="w-3 bg-cyan-500/80 hover:bg-cyan-400 rounded-t transition-all"
                        title={`${t.day} Sales: ${t.sales} units`}
                      />
                      <div
                        style={{ height: `${moveHeight}%` }}
                        className="w-3 bg-purple-500/80 hover:bg-purple-400 rounded-t transition-all"
                        title={`${t.day} Movement: ${t.movement} units`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{t.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Risk Signals Matrix (Slide 6) */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Active Risk Signals
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Stockouts</span>
                <span className="font-mono font-bold text-rose-400">{stockoutItems.length} SKUs</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Low Stock</span>
                <span className="font-mono font-bold text-amber-400">{lowStockItems.length} SKUs</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Near Expiry</span>
                <span className="font-mono font-bold text-orange-400">{nearExpiryBatches.length} Batches</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Supplier Delay</span>
                <span className="font-mono font-bold text-rose-400">{delayedPOs.length} Orders</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide 2: Business Problems Solved & Operational Highlights */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Enterprise FMCG Solutions in This Build</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-md">
            <div className="font-semibold text-slate-200 mb-1">Overstocking &amp; Stockouts Solved</div>
            <p className="text-slate-400 leading-relaxed">
              Automated reorder point rules evaluate daily velocity against supplier lead time, eliminating stockouts and dead capital.
            </p>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-md">
            <div className="font-semibold text-slate-200 mb-1">Batch Expiry &amp; FEFO Priority</div>
            <p className="text-slate-400 leading-relaxed">
              First-Expired-First-Out sequencing automatically routes batches nearing shelf-life limits, preventing FMCG disposal waste.
            </p>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-md">
            <div className="font-semibold text-slate-200 mb-1">Integrated Barcode Scanner</div>
            <p className="text-slate-400 leading-relaxed">
              Fast camera detection and virtual optical scanner support rapid retail POS sales deductions and goods receipts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
