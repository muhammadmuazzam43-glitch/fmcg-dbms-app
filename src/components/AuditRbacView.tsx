import React, { useState } from 'react';
import { InventoryTransaction, UserRole } from '../types/inventory';
import { Shield, ShieldAlert, Key, Lock, CheckCircle2, XCircle, Search, RefreshCw } from 'lucide-react';

interface AuditRbacViewProps {
  transactions: InventoryTransaction[];
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
}

export const AuditRbacView: React.FC<AuditRbacViewProps> = ({
  transactions,
  currentRole,
  setCurrentRole,
}) => {
  const [activeTab, setActiveTab] = useState<'audit_log' | 'rbac_matrix'>('audit_log');
  const [searchTxn, setSearchTxn] = useState('');

  // RBAC Permission Grid definition
  const permissions = [
    { name: 'View Dashboard & Analytics', superAdmin: true, inventoryMgr: true, procurement: true, warehouse: true, pos: true, analyst: true },
    { name: 'Scan Barcodes & POS Sale Deduction', superAdmin: true, inventoryMgr: true, procurement: false, warehouse: true, pos: true, analyst: false },
    { name: 'Adjust Stock Balance (Cycle Count Audit)', superAdmin: true, inventoryMgr: true, procurement: false, warehouse: true, pos: false, analyst: false },
    { name: 'Quarantine & Write-Off Expired Batches (FEFO)', superAdmin: true, inventoryMgr: true, procurement: false, warehouse: true, pos: false, analyst: false },
    { name: 'Create & Approve Purchase Orders (POs)', superAdmin: true, inventoryMgr: false, procurement: true, warehouse: false, pos: false, analyst: false },
    { name: 'Perform Inbound Goods Receipt', superAdmin: true, inventoryMgr: true, procurement: true, warehouse: true, pos: false, analyst: false },
    { name: 'Execute Raw SQL Queries in DBMS Studio', superAdmin: true, inventoryMgr: false, procurement: false, warehouse: false, pos: false, analyst: true },
    { name: 'Export Production PostgreSQL DDL Script', superAdmin: true, inventoryMgr: false, procurement: false, warehouse: false, pos: false, analyst: true },
  ];

  const filteredTxns = transactions.filter(
    (t) =>
      t.productName.toLowerCase().includes(searchTxn.toLowerCase()) ||
      t.sku.toLowerCase().includes(searchTxn.toLowerCase()) ||
      t.referenceId.toLowerCase().includes(searchTxn.toLowerCase()) ||
      t.performedBy.toLowerCase().includes(searchTxn.toLowerCase()) ||
      t.type.toLowerCase().includes(searchTxn.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span>Audit Trail &amp; Role-Based Access Control (RBAC)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable database transaction audit ledger, granular role authorization matrix, and user access policies
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('audit_log')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'audit_log'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Transaction Audit Trail ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('rbac_matrix')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'rbac_matrix'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            RBAC Permission Matrix
          </button>
        </div>
      </div>

      {/* Active Role Card */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Current Session Role</div>
            <div className="text-sm font-bold text-white font-mono">{currentRole}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Switch Role Context:</span>
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as UserRole)}
            aria-label="Switch active role context"
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="Super Admin">Super Admin</option>
            <option value="Inventory Manager">Inventory Manager</option>
            <option value="Procurement Officer">Procurement Officer</option>
            <option value="Warehouse Supervisor">Warehouse Supervisor</option>
            <option value="Store POS Operator">Store POS Operator</option>
            <option value="Supply Chain Analyst">Supply Chain Analyst</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Transaction Audit Trail */}
      {activeTab === 'audit_log' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audit ledger by reference ID, SKU, product, user, or transaction type..."
                value={searchTxn}
                onChange={(e) => setSearchTxn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <span className="text-xs font-mono text-cyan-400 shrink-0">
              {filteredTxns.length} entries
            </span>
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-950">
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Txn ID &amp; Timestamp</th>
                    <th className="py-2.5 px-3">Product SKU</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Qty Delta</th>
                    <th className="py-2.5 px-3 text-right">Balance After</th>
                    <th className="py-2.5 px-3 text-right">Value (USD)</th>
                    <th className="py-2.5 px-3">Reference ID</th>
                    <th className="py-2.5 px-3">Actor / Role</th>
                    <th className="py-2.5 px-3">Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                  {filteredTxns.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="font-semibold text-cyan-400">{t.id}</div>
                        <div className="text-[10px] text-slate-500">{t.timestamp}</div>
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap font-sans">
                        <div className="font-mono text-slate-200 font-semibold">{t.sku}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{t.productName}</div>
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.type === 'SALE'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800/50'
                              : t.type === 'RECEIPT'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                              : t.type === 'EXPIRY_WRITEOFF'
                              ? 'bg-orange-950 text-orange-300 border border-orange-800/50'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-right whitespace-nowrap font-bold tabular-nums">
                        <span className={t.quantityChange < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                          {t.quantityChange > 0 ? `+${t.quantityChange}` : t.quantityChange}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-right whitespace-nowrap text-slate-200 tabular-nums">
                        {t.balanceAfter}
                      </td>

                      <td className="py-2 px-3 text-right whitespace-nowrap text-slate-300 tabular-nums">
                        ${t.totalValue.toFixed(2)}
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap text-cyan-300">
                        {t.referenceId}
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap font-sans">
                        <div className="text-slate-200">{t.performedBy}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{t.role}</div>
                      </td>

                      <td className="py-2 px-3 text-slate-400 font-sans truncate max-w-[200px]" title={t.notes}>
                        {t.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: RBAC Matrix */}
      {activeTab === 'rbac_matrix' && (
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-4">System Operation / Capability</th>
                  <th className="py-3 px-3 text-center">Super Admin</th>
                  <th className="py-3 px-3 text-center">Inventory Mgr</th>
                  <th className="py-3 px-3 text-center">Procurement</th>
                  <th className="py-3 px-3 text-center">Warehouse</th>
                  <th className="py-3 px-3 text-center">Store POS</th>
                  <th className="py-3 px-3 text-center">Analyst</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {permissions.map((perm, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {perm.name}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {perm.superAdmin ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {perm.inventoryMgr ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {perm.procurement ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {perm.warehouse ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {perm.pos ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {perm.analyst ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
