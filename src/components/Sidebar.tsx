import React from 'react';
import {
  LayoutDashboard,
  QrCode,
  CheckCircle2,
  Boxes,
  Settings,
  LogOut,
  ShieldCheck,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { AuthUser } from '../types';

interface SidebarProps {
  currentView: 'dashboard' | 'stock' | 'disponiveis' | 'ativos' | 'settings';
  onNavigate: (view: 'dashboard' | 'stock' | 'disponiveis' | 'ativos' | 'settings') => void;
  counts: {
    total: number;
    disponiveis: number;
    ativos: number;
  };
  user: AuthUser | null;
  onLogout: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onOpenQuickActivate: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  counts,
  user,
  onLogout,
  mobileMenuOpen,
  setMobileMenuOpen,
  onOpenQuickActivate,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'stock',
      label: 'QR Codes',
      icon: QrCode,
      badge: counts.total,
      badgeClass: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'disponiveis',
      label: 'Disponíveis',
      icon: Boxes,
      badge: counts.disponiveis,
      badgeClass: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'ativos',
      label: 'Ativos',
      icon: CheckCircle2,
      badge: counts.ativos,
      badgeClass: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      badge: null,
    },
  ];

  const handleNavClick = (viewId: any) => {
    onNavigate(viewId);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 shrink-0">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-link-${item.id}`}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-slate-800 text-slate-200' : item.badgeClass
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Activation Card in Sidebar */}
        <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
          <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs mb-1">
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span>Visita Presencial</span>
          </div>
          <p className="text-xs text-blue-800/80 mb-3 leading-relaxed">
            Ative uma placa física com o link do Google em menos de 1 minuto.
          </p>
          <button
            id="btn-sidebar-quick-activate"
            type="button"
            onClick={onOpenQuickActivate}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold text-center transition-colors shadow-xs cursor-pointer"
          >
            + Ativar QR Agora
          </button>
        </div>

        {/* Footer info in desktop sidebar */}
        <div className="mt-auto pt-6 border-t border-slate-100 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span>Papan Media v1.0</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-xl flex flex-col p-5 z-50">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-blue-400" />
                </div>
                <span className="font-bold text-slate-900">Papan QR</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                Papan Media
              </span>
            </div>

            <nav className="mt-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`mobile-nav-${item.id}`}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== null && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          isActive ? 'bg-slate-800 text-slate-200' : item.badgeClass
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-6">
              <button
                id="btn-mobile-quick-activate"
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenQuickActivate();
                }}
                className="w-full py-3 px-4 bg-blue-600 active:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Ativar Novo QR Code</span>
              </button>
            </div>

            {user && (
              <div className="mt-auto pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Admin
                  </span>
                </div>
                <button
                  id="btn-mobile-logout"
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair do sistema</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
