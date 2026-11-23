import React, { useState } from 'react';
import { Product, BatchItem, Supplier, PurchaseOrder, InventoryTransaction, SqlQueryPreset } from '../types/inventory';
import { SQL_QUERY_PRESETS, DBMS_SCHEMA_DDL } from '../data/mockData';
import { executeSimulationQuery, QueryResult } from '../utils/sqlEngine';
import { Play, Copy, Check, Terminal, Layers, ShieldCheck, Database, GitBranch, AlertCircle, FileCode, ArrowRight } from 'lucide-react';
import { playSuccessChime } from '../utils/audio';

interface DbmsStudioProps {
  products: Product[];
  batches: BatchItem[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  transactions: InventoryTransaction[];
}

export const DbmsStudio: React.FC<DbmsStudioProps> = ({
  products,
  batches,
  suppliers,
  purchaseOrders,
  transactions,
}) => {
  const [activeTab, setActiveTab] = useState<'sql_workbench' | 'acid_transactions' | 'schema_3nf' | 'ddl_script'>('sql_workbench');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(SQL_QUERY_PRESETS[0].id);
  const [customSql, setCustomSql] = useState<string>(SQL_QUERY_PRESETS[0].sql);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(() =>
    executeSimulationQuery(SQL_QUERY_PRESETS[0].sql, { products, batches, suppliers, purchaseOrders, transactions })
  );
  const [copiedDdl, setCopiedDdl] = useState(false);

  // ACID Simulation state
  const [acidStep, setAcidStep] = useState<number>(0);
  const [acidLog, setAcidLog] = useState<{ step: string; status: 'nominal' | 'active' | 'aborted' | 'committed'; detail: string }[]>([]);

  const handleSelectPreset = (preset: SqlQueryPreset) => {
    setSelectedPresetId(preset.id);
    setCustomSql(preset.sql);
    const result = executeSimulationQuery(preset.sql, { products, batches, suppliers, purchaseOrders, transactions });
    setQueryResult(result);
  };

  const handleRunQuery = () => {
    const result = executeSimulationQuery(customSql, { products, batches, suppliers, purchaseOrders, transactions });
    setQueryResult(result);
  };

  const handleCopyDdl = () => {
    navigator.clipboard.writeText(DBMS_SCHEMA_DDL);
    setCopiedDdl(true);
    playSuccessChime();
    setTimeout(() => setCopiedDdl(false), 2000);
  };

  // ACID Step Runner
  const handleNextAcidStep = (action?: 'commit' | 'rollback') => {
    if (acidStep === 0) {
      setAcidStep(1);
      setAcidLog([
        { step: '1. BEGIN TRANSACTION;', status: 'active', detail: 'ACID Transaction Block opened (xid: 1048291). Snapshot isolation level initialized.' },
      ]);
    } else if (acidStep === 1) {
      setAcidStep(2);
      setAcidLog((prev) => [
        ...prev,
        { step: '2. SELECT ... FOR UPDATE', status: 'active', detail: 'Exclusive row-level lock acquired on SKU BEV-SPR-500. Prevents concurrent phantom reads & race conditions.' },
      ]);
    } else if (acidStep === 2) {
      setAcidStep(3);
      setAcidLog((prev) => [
        ...prev,
        { step: '3. UPDATE products SET quantity_on_hand = quantity_on_hand - 5;', status: 'active', detail: 'Preliminary inventory deduction staged in transaction write-buffer.' },
      ]);
    } else if (acidStep === 3) {
      if (action === 'rollback') {
        setAcidStep(4);
        setAcidLog((prev) => [
          ...prev,
          { step: '4. CONSTRAINT VIOLATION DETECTED & ROLLBACK;', status: 'aborted', detail: 'CHECK constraint chk_quantity_positive raised exception. Transaction aborted. All staged updates reverted to previous consistent state.' },
        ]);
      } else {
        setAcidStep(4);
        setAcidLog((prev) => [
          ...prev,
          { step: '4. COMMIT TRANSACTION;', status: 'committed', detail: 'WAL (Write-Ahead Log) flushed to disk. Changes made durable and permanently visible across all concurrent connections.' },
        ]);
        playSuccessChime();
      }
    } else {
      // Reset
      setAcidStep(0);
      setAcidLog([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <span>DBMS Studio &amp; SQL Intelligence</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Demonstrating relational database concepts: DDL/DML, 3NF schema, ACID transactions, EXPLAIN execution plans &amp; triggers
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('sql_workbench')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'sql_workbench'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            SQL Workbench
          </button>
          <button
            onClick={() => setActiveTab('acid_transactions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'acid_transactions'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ACID Transaction Runner
          </button>
          <button
            onClick={() => setActiveTab('schema_3nf')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'schema_3nf'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3NF Schema &amp; ER
          </button>
          <button
            onClick={() => setActiveTab('ddl_script')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'ddl_script'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            PostgreSQL DDL Export
          </button>
        </div>
      </div>

      {/* Tab 1: SQL Workbench & Execution Plan */}
      {activeTab === 'sql_workbench' && (
        <div className="space-y-4">
          {/* Query Presets Row (Slide 8 Business Queries) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">
              Preset Queries:
            </span>
            {SQL_QUERY_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`px-3 py-1.5 text-xs rounded-md border whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  selectedPresetId === p.id
                    ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/50'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>

          {/* SQL Editor Area */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-semibold text-slate-300">
                  SQL Query Editor (PostgreSQL Dialect)
                </span>
              </div>
              <button
                onClick={handleRunQuery}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Query</span>
              </button>
            </div>

            <textarea
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              rows={8}
              spellCheck={false}
              className="w-full bg-slate-950 p-4 font-mono text-xs text-cyan-300 focus:outline-none resize-y border-none leading-relaxed"
            />
          </div>

          {/* Execution Plan Banner (EXPLAIN ANALYZE) */}
          {queryResult?.plan && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>EXPLAIN ANALYZE Execution Plan</span>
                </span>
                <span className="font-mono text-cyan-400 text-[11px]">
                  Execution Time: {queryResult.executionTimeMs} ms · Returned {queryResult.rowCount} rows
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                {queryResult.plan.map((node, i) => (
                  <div key={i} className="p-2 bg-slate-950 border border-slate-800/80 rounded text-[11px] font-mono">
                    <div className="text-cyan-300 font-semibold truncate">{node.nodeType}</div>
                    <div className="text-slate-400 mt-1 flex justify-between">
                      <span>Cost: {node.totalCost}</span>
                      <span>Rows: {node.actualRows}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query Results Table */}
          {queryResult && (
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
              <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs flex justify-between items-center">
                <span className="font-medium text-slate-300">
                  Result Set ({queryResult.rowCount} records)
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  Status: 200 OK · Read-Committed
                </span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-950">
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                      {queryResult.columns.map((col) => (
                        <th key={col} className="py-2.5 px-3 font-mono whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {queryResult.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        {queryResult.columns.map((col) => (
                          <td key={col} className="py-2 px-3 whitespace-nowrap text-slate-300">
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: ACID Transaction Runner */}
      {activeTab === 'acid_transactions' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
            <h2 className="text-sm font-semibold text-white">ACID Property Verification Workbench</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Step through a simulated atomic POS stock transaction to verify <strong>Atomicity</strong>, <strong>Consistency</strong>, <strong>Isolation</strong>, and <strong>Durability</strong> under PostgreSQL semantics.
            </p>
          </div>

          {/* Interactive Stepper */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-200">
                Transaction Lifecycle State: Step {acidStep} / 4
              </div>
              <div className="flex items-center gap-2">
                {acidStep === 0 && (
                  <button
                    onClick={() => handleNextAcidStep()}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors cursor-pointer"
                  >
                    Start Transaction (BEGIN)
                  </button>
                )}
                {acidStep > 0 && acidStep < 3 && (
                  <button
                    onClick={() => handleNextAcidStep()}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors cursor-pointer"
                  >
                    Execute Next Statement &rarr;
                  </button>
                )}
                {acidStep === 3 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNextAcidStep('commit')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors cursor-pointer"
                    >
                      COMMIT (Success)
                    </button>
                    <button
                      onClick={() => handleNextAcidStep('rollback')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded transition-colors cursor-pointer"
                    >
                      Simulate Failure &amp; ROLLBACK
                    </button>
                  </div>
                )}
                {acidStep === 4 && (
                  <button
                    onClick={() => handleNextAcidStep()}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                  >
                    Reset Transaction
                  </button>
                )}
              </div>
            </div>

            {/* Stepper visual dots */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className={`p-2 rounded border ${acidStep >= 1 ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300' : 'border-slate-800 bg-slate-950 text-slate-600'}`}>
                1. BEGIN
              </div>
              <div className={`p-2 rounded border ${acidStep >= 2 ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300' : 'border-slate-800 bg-slate-950 text-slate-600'}`}>
                2. ROW LOCK (FOR UPDATE)
              </div>
              <div className={`p-2 rounded border ${acidStep >= 3 ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300' : 'border-slate-800 bg-slate-950 text-slate-600'}`}>
                3. UPDATE BALANCE
              </div>
              <div className={`p-2 rounded border ${acidStep === 4 ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300' : 'border-slate-800 bg-slate-950 text-slate-600'}`}>
                4. COMMIT / ROLLBACK
              </div>
            </div>

            {/* Log Stream */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                DBMS Engine WAL &amp; Execution Output:
              </div>
              <div className="bg-slate-950 p-4 rounded border border-slate-800 font-mono text-xs space-y-2 min-h-36">
                {acidLog.length === 0 ? (
                  <div className="text-slate-600">
                    No active transaction. Click &ldquo;Start Transaction (BEGIN)&rdquo; to begin simulation.
                  </div>
                ) : (
                  acidLog.map((log, index) => (
                    <div key={index} className="space-y-0.5">
                      <div className="text-cyan-400 font-semibold">{log.step}</div>
                      <div className={`text-[11px] ${
                        log.status === 'aborted'
                          ? 'text-rose-400'
                          : log.status === 'committed'
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }`}>
                        &rarr; {log.detail}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: 3NF Relational Schema Design (Slide 4) */}
      {activeTab === 'schema_3nf' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <h2 className="text-sm font-semibold text-white">Relational Schema Architecture (Third Normal Form)</h2>
            <p className="text-xs text-slate-400 mt-1">
              Entities adhere strictly to 3NF principles: each non-key column is fully dependent on the primary key, referential integrity enforced via foreign keys, and redundant attributes eliminated.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            {/* Table: products */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
              <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1 flex justify-between">
                <span>TABLE: products</span>
                <span className="text-[10px] text-slate-500">Master Data</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="text-amber-400 font-semibold">&bull; id (PK, UUID)</div>
                <div>&bull; sku (VARCHAR, UNIQUE, NOT NULL)</div>
                <div>&bull; barcode (VARCHAR, UNIQUE, NOT NULL)</div>
                <div>&bull; name (VARCHAR(255), NOT NULL)</div>
                <div>&bull; category (VARCHAR(64))</div>
                <div>&bull; unit_cost (NUMERIC(10,2))</div>
                <div>&bull; selling_price (NUMERIC(10,2))</div>
                <div>&bull; quantity_on_hand (INT, CHECK &ge; 0)</div>
                <div>&bull; reorder_point (INT, NOT NULL)</div>
                <div>&bull; safety_stock (INT, NOT NULL)</div>
                <div className="text-cyan-400">&bull; primary_supplier_id (FK &rarr; suppliers.id)</div>
              </div>
            </div>

            {/* Table: batches */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
              <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1 flex justify-between">
                <span>TABLE: batches</span>
                <span className="text-[10px] text-slate-500">FEFO Expiry</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="text-amber-400 font-semibold">&bull; id (PK, UUID)</div>
                <div className="text-cyan-400">&bull; product_id (FK &rarr; products.id)</div>
                <div>&bull; batch_number (VARCHAR(64), NOT NULL)</div>
                <div>&bull; manufacture_date (DATE, NOT NULL)</div>
                <div>&bull; expiry_date (DATE, NOT NULL)</div>
                <div>&bull; quantity (INT, CHECK &ge; 0)</div>
                <div>&bull; received_quantity (INT)</div>
                <div>&bull; unit_cost (NUMERIC(10,2))</div>
                <div className="text-emerald-400">&bull; CONSTRAINT chk_expiry_future</div>
              </div>
            </div>

            {/* Table: inventory_transactions */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
              <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1 flex justify-between">
                <span>TABLE: inventory_transactions</span>
                <span className="text-[10px] text-slate-500">Immutable Ledger</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="text-amber-400 font-semibold">&bull; id (PK, UUID)</div>
                <div>&bull; timestamp (TIMESTAMPTZ DEFAULT NOW)</div>
                <div className="text-cyan-400">&bull; product_id (FK &rarr; products.id)</div>
                <div>&bull; transaction_type (CHECK ENUM)</div>
                <div>&bull; quantity_change (INT, NOT NULL)</div>
                <div>&bull; balance_after (INT, CHECK &ge; 0)</div>
                <div>&bull; total_value (NUMERIC(12,2))</div>
                <div>&bull; reference_id (VARCHAR(64))</div>
                <div>&bull; performed_by (VARCHAR(128))</div>
              </div>
            </div>

            {/* Table: suppliers */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
              <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1 flex justify-between">
                <span>TABLE: suppliers</span>
                <span className="text-[10px] text-slate-500">Master Data</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="text-amber-400 font-semibold">&bull; id (PK, VARCHAR)</div>
                <div>&bull; code (VARCHAR, UNIQUE)</div>
                <div>&bull; name (VARCHAR, NOT NULL)</div>
                <div>&bull; lead_time_days (INT, CHECK &ge; 0)</div>
                <div>&bull; on_time_delivery_rate (NUMERIC)</div>
                <div>&bull; quality_score (INT)</div>
                <div>&bull; status (VARCHAR)</div>
              </div>
            </div>

            {/* Table: purchase_orders */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
              <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1 flex justify-between">
                <span>TABLE: purchase_orders</span>
                <span className="text-[10px] text-slate-500">Procurement</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="text-amber-400 font-semibold">&bull; id (PK, VARCHAR)</div>
                <div className="text-cyan-400">&bull; supplier_id (FK &rarr; suppliers.id)</div>
                <div>&bull; status (VARCHAR, NOT NULL)</div>
                <div>&bull; created_at (DATE DEFAULT CURRENT_DATE)</div>
                <div>&bull; expected_delivery_date (DATE)</div>
                <div>&bull; total_amount (NUMERIC(12,2))</div>
                <div>&bull; is_delayed (BOOLEAN DEFAULT FALSE)</div>
              </div>
            </div>

            {/* Table: purchase_order_items */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
              <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1 flex justify-between">
                <span>TABLE: purchase_order_items</span>
                <span className="text-[10px] text-slate-500">Junction Entity</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="text-amber-400 font-semibold">&bull; id (PK, UUID)</div>
                <div className="text-cyan-400">&bull; purchase_order_id (FK &rarr; purchase_orders.id ON DELETE CASCADE)</div>
                <div className="text-cyan-400">&bull; product_id (FK &rarr; products.id)</div>
                <div>&bull; quantity_requested (INT, CHECK &gt; 0)</div>
                <div>&bull; quantity_received (INT)</div>
                <div>&bull; unit_cost (NUMERIC(10,2))</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: PostgreSQL DDL Script Export */}
      {activeTab === 'ddl_script' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Production PostgreSQL DDL Code</h2>
              <p className="text-xs text-slate-400">Complete SQL schema file with tables, triggers, indexes, and constraints</p>
            </div>
            <button
              onClick={handleCopyDdl}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors cursor-pointer"
            >
              {copiedDdl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDdl ? 'Copied to Clipboard!' : 'Copy Schema SQL'}</span>
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px]">
            <pre>{DBMS_SCHEMA_DDL}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
