import React from 'react';
import { UserRole } from '../types/inventory';
import { QrCode, Shield, Database, LayoutDashboard, Package, RefreshCw, Bell } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  lowStockCount: number;
  onOpenQuickScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  currentRole,
  setCurrentRole,
  lowStockCount,
  onOpenQuickScan,
}) => {
  const roles: UserRole[] = [
    'Super Admin',
    'Inventory Manager',
    'Procurement Officer',
    'Warehouse Supervisor',
    'Store POS Operator',
    'Supply Chain Analyst',
  ];

  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'stock', label: 'Stock & FEFO Batches', icon: Package },
    { id: 'barcode', label: 'Barcode Scanner', icon: QrCode },
    { id: 'replenish', label: 'Replenishment & POs', icon: RefreshCw, alertBadge: lowStockCount },
    { id: 'dbms', label: 'DBMS Studio & SQL', icon: Database },
    { id: 'rbac', label: 'Audit & Security', icon: Shield },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
              FMCG
            </div>
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="text-left group cursor-pointer focus:outline-none"
            >
              <span className="text-base font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors whitespace-nowrap">
                FMCG Inventory Intelligence
              </span>
              <span className="hidden lg:inline text-xs text-slate-400 ml-2">
                DBMS & Supply Chain Engine
              </span>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.alertBadge && item.alertBadge > 0 ? (
                    <span className="ml-1 text-[11px] font-mono font-semibold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                      {item.alertBadge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action & Role Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Barcode Scan CTA */}
            <button
              onClick={onOpenQuickScan}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md shadow-sm transition-colors cursor-pointer whitespace-nowrap"
              title="Launch instant barcode scanner or POS test"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan Barcode</span>
            </button>

            {/* Role Switcher */}
            <div className="relative group">
              <label htmlFor="role-select" className="sr-only">Active Role</label>
              <select
                id="role-select"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as UserRole)}
                aria-label="Select active user role"
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar for smaller screens */}
        <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.alertBadge && item.alertBadge > 0 ? (
                  <span className="text-[10px] px-1 bg-amber-500/20 text-amber-300 rounded">
                    {item.alertBadge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
