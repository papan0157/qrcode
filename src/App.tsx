import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { QRCodeItem, AuthUser, AppSettings } from './types';
import { fetchAllQRCodes, getSettings, checkSupabaseHealth, SupabaseHealthStatus } from './lib/storage';
import { subscribeToRealtimeScans, RealtimeScanEvent } from './lib/realtime';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { StockView } from './views/StockView';
import { QRDetailView } from './views/QRDetailView';
import { SettingsView } from './views/SettingsView';
import { ActivateQuickModal } from './views/ActivateQuickModal';
import { BatchGenerateModal } from './views/BatchGenerateModal';
import { ExportZipModal } from './views/ExportZipModal';
import { PublicQRRedirect } from './views/PublicQRRedirect';

const AUTH_STORAGE_KEY = 'papan_auth_user_v1';

function extractPublicQrCode(): string | null {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);

  // 1. Check path /q/CODE or /q/CODE/ (case-insensitive)
  const pathMatch = path.match(/^\/q\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }

  // 2. Check hash #/q/CODE
  const hashMatch = hash.match(/#\/q\/([a-zA-Z0-9_-]+)/i);
  if (hashMatch && hashMatch[1]) {
    return hashMatch[1];
  }

  // 3. Check param ?q=CODE
  const qParam = searchParams.get('q');
  if (qParam) {
    return qParam;
  }

  return null;
}

export default function App() {
  // Public scan redirect detection: initialized synchronously from window.location
  const [publicQrCode, setPublicQrCode] = useState<string | null>(() => extractPublicQrCode());

  // Authenticated user state
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Data state
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [loading, setLoading] = useState(true);
  const [supabaseHealth, setSupabaseHealth] = useState<SupabaseHealthStatus | null>(null);

  // Navigation
  const [currentView, setCurrentView] = useState<'dashboard' | 'stock' | 'disponiveis' | 'ativos' | 'settings'>('dashboard');
  const [selectedQR, setSelectedQR] = useState<QRCodeItem | null>(null);

  // Modals
  const [isQuickActivateOpen, setIsQuickActivateOpen] = useState(false);
  const [isBatchGenerateOpen, setIsBatchGenerateOpen] = useState(false);
  const [isExportZipOpen, setIsExportZipOpen] = useState(false);
  const [preselectedForActivate, setPreselectedForActivate] = useState<QRCodeItem | null>(null);

  // Mobile Menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check URL on load and when popstate occurs for /q/:code
  useEffect(() => {
    const checkPublicRoute = () => {
      setPublicQrCode(extractPublicQrCode());
    };

    checkPublicRoute();
    window.addEventListener('popstate', checkPublicRoute);
    return () => window.removeEventListener('popstate', checkPublicRoute);
  }, []);

  // Silent refresh directly from Supabase (does not show full-page loading spinner)
  const syncSilent = useCallback(async () => {
    try {
      const data = await fetchAllQRCodes();
      if (data && Array.isArray(data)) {
        setQrCodes(data);
        setSelectedQR((prev) => {
          if (!prev) return null;
          return data.find((item) => item.id === prev.id) || prev;
        });
      }
    } catch {
      // Silently ignore background polling errors
    }
  }, []);

  // Initial load with health check
  const loadData = async () => {
    try {
      setLoading(true);
      const health = await checkSupabaseHealth();
      setSupabaseHealth(health);

      if (health.tablesExist) {
        const data = await fetchAllQRCodes();
        setQrCodes(data);
      } else {
        setQrCodes([]);
      }
    } catch (err) {
      console.error('Error loading QR codes from Supabase:', err);
      setQrCodes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSettings(getSettings());
  }, []);

  // Real-time synchronization: Instant events + multi-tab BroadcastChannel + visibility sync
  useEffect(() => {
    // 1. Subscribe to instant real-time scan events
    const unsubscribe = subscribeToRealtimeScans((event: RealtimeScanEvent) => {
      // Update qrCodes list reactively in 0ms
      setQrCodes((prev) =>
        prev.map((item) => {
          if (item.code === event.code || item.id === event.qrId) {
            const nextScans =
              event.totalScans > 0 ? event.totalScans : (item.total_scans || 0) + 1;
            return {
              ...item,
              total_scans: nextScans,
              last_access_at: event.lastAccessAt || new Date().toISOString(),
            };
          }
          return item;
        })
      );

      // Also update currently opened detail view if it matches
      setSelectedQR((prev) => {
        if (prev && (prev.code === event.code || prev.id === event.qrId)) {
          const nextScans =
            event.totalScans > 0 ? event.totalScans : (prev.total_scans || 0) + 1;
          return {
            ...prev,
            total_scans: nextScans,
            last_access_at: event.lastAccessAt || new Date().toISOString(),
          };
        }
        return prev;
      });

      // Silently fetch fresh state from Supabase to guarantee 100% parity
      setTimeout(() => {
        syncSilent();
      }, 500);
    });

    // 2. Gentle polling every 3.5s when tab is active and visible
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncSilent();
      }
    }, 3500);

    // 3. Immediate sync on window focus or tab visibility change
    const handleFocus = () => syncSilent();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncSilent();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncSilent]);

  // Handle Login
  const handleLoginSuccess = (authUser: AuthUser) => {
    setUser(authUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  // If this is a physical scan route (/q/:code)
  if (publicQrCode) {
    return <PublicQRRedirect code={publicQrCode} />;
  }

  // If not logged in, show Login
  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Calculations for sidebar badges
  const disponiveisCount = qrCodes.filter((c) => c.status === 'DISPONIVEL').length;
  const ativosCount = qrCodes.filter((c) => c.status === 'ATIVO').length;

  const handleOpenQuickActivateWithPreselected = (qr?: QRCodeItem) => {
    setPreselectedForActivate(qr || null);
    setIsQuickActivateOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top sticky Navbar */}
      <Navbar
        user={user}
        onOpenQuickActivate={() => handleOpenQuickActivateWithPreselected()}
        onLogout={handleLogout}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onNavigate={(view) => {
          setSelectedQR(null);
          setCurrentView(view);
        }}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => {
            setSelectedQR(null);
            setCurrentView(view);
          }}
          counts={{
            total: qrCodes.length,
            disponiveis: disponiveisCount,
            ativos: ativosCount,
          }}
          user={user}
          onLogout={handleLogout}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          onOpenQuickActivate={() => handleOpenQuickActivateWithPreselected()}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {/* Supabase Schema Alert Banner */}
          {supabaseHealth && !supabaseHealth.tablesExist && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold">Atenção: Tabelas não encontradas no Supabase</h3>
                  <p className="text-xs text-amber-700 mt-0.5">
                    O projeto está conectado ao Supabase, mas as tabelas <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded font-semibold text-amber-900">qr_codes</code> e <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded font-semibold text-amber-900">qr_scans</code> ainda não foram criadas no seu banco de dados.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={loadData}
                  className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Verificar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('settings')}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Ver Script SQL
                </button>
              </div>
            </div>
          )}

          {/* Detail View of a specific QR code */}
          {selectedQR ? (
            <QRDetailView
              qrCode={selectedQR}
              onBack={() => {
                setSelectedQR(null);
                loadData();
              }}
              onUpdate={(updated) => {
                setSelectedQR(updated);
                setQrCodes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
              }}
              baseDomain={settings.qrBaseDomain}
              useCurrentOrigin={settings.useCurrentOriginForLinks}
            />
          ) : currentView === 'dashboard' ? (
            <DashboardView
              qrCodes={qrCodes}
              onOpenQuickActivate={() => handleOpenQuickActivateWithPreselected()}
              onSelectQR={(qr) => setSelectedQR(qr)}
              onNavigateToStock={() => setCurrentView('stock')}
              baseDomain={settings.qrBaseDomain}
              useCurrentOrigin={settings.useCurrentOriginForLinks}
            />
          ) : currentView === 'stock' ? (
            <StockView
              qrCodes={qrCodes}
              initialFilter="ALL"
              onSelectQR={(qr) => setSelectedQR(qr)}
              onOpenBatchGenerate={() => setIsBatchGenerateOpen(true)}
              onOpenExportZip={() => setIsExportZipOpen(true)}
              onOpenQuickActivate={() => handleOpenQuickActivateWithPreselected()}
              baseDomain={settings.qrBaseDomain}
              useCurrentOrigin={settings.useCurrentOriginForLinks}
            />
          ) : currentView === 'disponiveis' ? (
            <StockView
              key="view-disponiveis"
              qrCodes={qrCodes}
              initialFilter="DISPONIVEL"
              onSelectQR={(qr) => setSelectedQR(qr)}
              onOpenBatchGenerate={() => setIsBatchGenerateOpen(true)}
              onOpenExportZip={() => setIsExportZipOpen(true)}
              onOpenQuickActivate={() => handleOpenQuickActivateWithPreselected()}
              baseDomain={settings.qrBaseDomain}
              useCurrentOrigin={settings.useCurrentOriginForLinks}
            />
          ) : currentView === 'ativos' ? (
            <StockView
              key="view-ativos"
              qrCodes={qrCodes}
              initialFilter="ATIVO"
              onSelectQR={(qr) => setSelectedQR(qr)}
              onOpenBatchGenerate={() => setIsBatchGenerateOpen(true)}
              onOpenExportZip={() => setIsExportZipOpen(true)}
              onOpenQuickActivate={() => handleOpenQuickActivateWithPreselected()}
              baseDomain={settings.qrBaseDomain}
              useCurrentOrigin={settings.useCurrentOriginForLinks}
            />
          ) : currentView === 'settings' ? (
            <SettingsView
              settings={settings}
              onUpdateSettings={(newSettings) => setSettings(newSettings)}
              onResetData={loadData}
            />
          ) : null}
        </main>
      </div>

      {/* MODAL 1: Quick Activate (1-minute on-site flow) */}
      <ActivateQuickModal
        isOpen={isQuickActivateOpen}
        onClose={() => {
          setIsQuickActivateOpen(false);
          setPreselectedForActivate(null);
        }}
        availableCodes={qrCodes.filter((c) => c.status === 'DISPONIVEL')}
        preselectedQR={preselectedForActivate}
        onSuccess={(updated) => {
          setQrCodes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        }}
        baseDomain={settings.qrBaseDomain}
        useCurrentOrigin={settings.useCurrentOriginForLinks}
      />

      {/* MODAL 2: Batch Generate (100, 500, 1000 codes) */}
      <BatchGenerateModal
        isOpen={isBatchGenerateOpen}
        onClose={() => setIsBatchGenerateOpen(false)}
        existingCodes={qrCodes}
        defaultPrefix={settings.defaultPrefix}
        onSuccess={async () => {
          await loadData();
        }}
      />

      {/* MODAL 3: Export Available QR Codes to ZIP */}
      <ExportZipModal
        isOpen={isExportZipOpen}
        onClose={() => setIsExportZipOpen(false)}
        availableCodes={qrCodes.filter((c) => c.status === 'DISPONIVEL')}
        baseDomain={settings.qrBaseDomain}
        useCurrentOrigin={settings.useCurrentOriginForLinks}
      />
    </div>
  );
}
