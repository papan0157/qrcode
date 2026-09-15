import React from 'react';
import { QrCode, Plus, Menu, X, LogOut, ExternalLink, ShieldCheck } from 'lucide-react';
import { AuthUser } from '../types';

interface NavbarProps {
  user: AuthUser | null;
  onOpenQuickActivate: () => void;
  onLogout: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onNavigate: (view: 'dashboard' | 'stock' | 'disponiveis' | 'ativos' | 'settings') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenQuickActivate,
  onLogout,
  mobileMenuOpen,
  setMobileMenuOpen,
  onNavigate,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <QrCode className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">Papan QR</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  Papan Media
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-none hidden sm:block">
                QR Codes Dinâmicos para Placas
              </p>
            </div>
          </div>

          {/* Quick Actions & Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Highlight + Ativar QR Button */}
            <button
              id="btn-quick-activate-nav"
              type="button"
              onClick={onOpenQuickActivate}
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Ativar QR</span>
            </button>

            {user && (
              <div className="hidden md:flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Admin</span>
                  </div>
                  <span className="text-[11px] text-slate-500 max-w-[150px] truncate block">
                    {user.email}
                  </span>
                </div>
                <button
                  id="btn-logout-nav"
                  type="button"
                  onClick={onLogout}
                  title="Sair da conta"
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              id="btn-mobile-menu-toggle"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
