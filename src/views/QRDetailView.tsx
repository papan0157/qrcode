import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Edit3,
  Download,
  Printer,
  PauseCircle,
  PlayCircle,
  Archive,
  Copy,
  Check,
  TrendingUp,
  Calendar,
  Clock,
  Sparkles,
  Link2,
  Building,
  AlertCircle,
  Eye,
  Activity,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import QRCode from 'qrcode';
import { QRCodeItem, QRScanItem, DestinationType, QRStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { DestinationBadge } from '../components/DestinationBadge';
import {
  buildDynamicUrl,
  downloadSingleQrPng,
  generatePlaquePngDataUrl,
  getPhysicalPlaqueNumber,
  getPlaqueExportFilename,
} from '../lib/qr-generator';
import { getScansForQRCode, updateQRCode, recordScan } from '../lib/storage';
import { subscribeToRealtimeScans, RealtimeScanEvent } from '../lib/realtime';

interface QRDetailViewProps {
  qrCode: QRCodeItem;
  onBack: () => void;
  onUpdate: (updated: QRCodeItem) => void;
  baseDomain: string;
  useCurrentOrigin: boolean;
}

export const QRDetailView: React.FC<QRDetailViewProps> = ({
  qrCode,
  onBack,
  onUpdate,
  baseDomain,
  useCurrentOrigin,
}) => {
  const [scans, setScans] = useState<QRScanItem[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editCompany, setEditCompany] = useState(qrCode.company_name || '');
  const [editUrl, setEditUrl] = useState(qrCode.destination_url || '');
  const [editType, setEditType] = useState<DestinationType>(qrCode.destination_type || 'google_review');
  const [editStatus, setEditStatus] = useState<QRStatus>(qrCode.status);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Real-time access indicators
  const [recentScanAlert, setRecentScanAlert] = useState<string | null>(null);
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dynamicUrl = buildDynamicUrl(qrCode.code, baseDomain, useCurrentOrigin);

  // Render high-res QR code on mount
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, dynamicUrl, {
        width: 280,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch(console.error);
    }
  }, [dynamicUrl, qrCode.code]);

  // Load scans on mount
  useEffect(() => {
    let mounted = true;
    setLoadingScans(true);
    getScansForQRCode(qrCode.id)
      .then((data) => {
        if (mounted) {
          setScans(data);
          setLoadingScans(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingScans(false);
      });

    return () => {
      mounted = false;
    };
  }, [qrCode.id]);

  // Real-time listener specifically for this QR code
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeScans((event: RealtimeScanEvent) => {
      if (event.code === qrCode.code || event.qrId === qrCode.id) {
        // Prepend new scan if received
        if (event.newScan) {
          setScans((prev) => [
            event.newScan!,
            ...prev.filter((s) => s.id !== event.newScan!.id),
          ]);
        } else {
          // Re-fetch scans from Supabase to ensure complete list
          getScansForQRCode(qrCode.id).then((freshScans) => {
            setScans(freshScans);
          });
        }

        // Notify parent App component
        onUpdate({
          ...qrCode,
          total_scans:
            event.totalScans > 0 ? event.totalScans : (qrCode.total_scans || 0) + 1,
          last_access_at: event.lastAccessAt || new Date().toISOString(),
        });

        // Flash notification badge
        setRecentScanAlert('Novo acesso contabilizado em tempo real!');
        const timer = setTimeout(() => {
          setRecentScanAlert(null);
        }, 4000);
        return () => clearTimeout(timer);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [qrCode, onUpdate]);

  // Copy dynamic url
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(dynamicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Test dynamic URL (opens /q/:code)
  const handleTest = () => {
    window.open(dynamicUrl, '_blank', 'noopener,noreferrer');
  };

  // Simulate / Record Test Scan directly from the panel
  const handleSimulateScan = async () => {
    if (isSimulatingScan) return;
    try {
      setIsSimulatingScan(true);
      const updated = await recordScan(
        qrCode.code,
        qrCode,
        navigator.userAgent,
        'Painel Admin (Simulação em Tempo Real)'
      );

      if (updated) {
        onUpdate(updated);
      }

      // Reload scans list
      const freshScans = await getScansForQRCode(qrCode.id);
      setScans(freshScans);

      setRecentScanAlert('Acesso de teste gravado e contabilizado em tempo real!');
      setTimeout(() => setRecentScanAlert(null), 4000);
    } catch (err) {
      console.error('Erro ao simular scan:', err);
    } finally {
      setIsSimulatingScan(false);
    }
  };

  // Download PNG for printing
  const handleDownload = async () => {
    await downloadSingleQrPng(qrCode.code, dynamicUrl);
  };

  // Print single plaque
  const handlePrint = async () => {
    const dataUrl = await generatePlaquePngDataUrl(qrCode.code, dynamicUrl, { width: 1000 });
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Imprimir ${getPlaqueExportFilename(qrCode.code)}</title>
            <style>
              body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
              img { max-width: 90%; max-height: 90vh; object-fit: contain; }
              @media print {
                body { margin: 0; }
                img { width: 100%; height: auto; }
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" onload="window.print();window.close();" />
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  // Toggle status (Pausar / Reativar)
  const handleTogglePause = async () => {
    const nextStatus: QRStatus = qrCode.status === 'ATIVO' ? 'PAUSADO' : 'ATIVO';
    const updated = await updateQRCode(qrCode.id, { status: nextStatus });
    onUpdate(updated);
  };

  // Save edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    let finalUrl = editUrl.trim();
    if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      setEditLoading(true);
      const updated = await updateQRCode(qrCode.id, {
        company_name: editCompany.trim() || null,
        destination_url: finalUrl || null,
        destination_type: editType,
        status: editStatus,
      });
      onUpdate(updated);
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setEditLoading(false);
    }
  };

  // Calculate stats: Total, Today, Last 7 Days, Last access
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = now.getTime() - 7 * 86400000;

  const scansToday = scans.filter((s) => new Date(s.scanned_at).getTime() >= startOfToday).length;
  const scansLast7Days = scans.filter((s) => new Date(s.scanned_at).getTime() >= sevenDaysAgo).length;

  // Chart data: 30 days breakdown
  const chartData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dayKey = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const endDay = startDay + 86400000;

    const count = scans.filter((s) => {
      const time = new Date(s.scanned_at).getTime();
      return time >= startDay && time < endDay;
    }).length;

    chartData.push({
      date: dayKey,
      acessos: count,
    });
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top bar with back button & Real-time Live Badge */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao painel</span>
        </button>

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-xs font-medium shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Tempo Real Ativo</span>
        </div>
      </div>

      {/* Real-time Notification Banner */}
      {recentScanAlert && (
        <div className="p-3.5 bg-emerald-500 text-white rounded-xl shadow-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 animate-bounce" />
            <span className="text-xs font-bold">{recentScanAlert}</span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-600 px-2 py-0.5 rounded text-emerald-100">
            {new Date().toLocaleTimeString('pt-BR')}
          </span>
        </div>
      )}

      {/* Main Plaque Card & Details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
            {/* Left: Plaque Mockup with Clean Centered QR and Discreet Footer Number */}
            <div className="w-full sm:w-72 shrink-0 flex flex-col items-center">
              <div className="w-full bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-md flex flex-col items-center text-center relative group">
                <div className="flex items-center justify-between w-full mb-3 px-1">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                    Arte Física da Placa
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                    Placa: {getPhysicalPlaqueNumber(qrCode.code)}
                  </span>
                </div>

                {/* High-res canvas QR - CLEAN & CENTERED, NO TEXT NEAR IT */}
                <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-100 flex items-center justify-center w-full aspect-square">
                  <canvas ref={canvasRef} className="w-48 h-48 object-contain mx-auto" />
                </div>

                {/* Discreet plaque number at bottom footer */}
                <div className="mt-5 w-full pt-3 border-t border-slate-100 flex items-center justify-center">
                  <span className="font-mono text-xs font-semibold text-slate-400 tracking-widest">
                    {getPhysicalPlaqueNumber(qrCode.code)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 text-center mt-2.5">
                QR Code limpo centralizado. Número físico discreto no rodapé.
              </p>
            </div>

            {/* Right: Information & Actions */}
            <div className="flex-1 w-full space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                      {qrCode.code}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                      Número da Placa: {getPhysicalPlaqueNumber(qrCode.code)}
                    </span>
                    <StatusBadge status={qrCode.status} />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {qrCode.company_name || 'QR Code Disponível em Estoque'}
                  </h2>
                </div>

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="btn-edit-qr"
                    type="button"
                    onClick={() => {
                      setEditCompany(qrCode.company_name || '');
                      setEditUrl(qrCode.destination_url || '');
                      setEditType(qrCode.destination_type || 'google_review');
                      setEditStatus(qrCode.status);
                      setIsEditing(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    id="btn-test-qr"
                    type="button"
                    onClick={handleTest}
                    title="Abre a URL dinâmica pública /q/:code para testar o redirecionamento"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Testar Link</span>
                  </button>

                  {/* Simular / Gravar Scan de Teste diretamente */}
                  {qrCode.status === 'ATIVO' && (
                    <button
                      id="btn-simulate-scan"
                      type="button"
                      disabled={isSimulatingScan}
                      onClick={handleSimulateScan}
                      title="Registra um escaneamento de teste e atualiza os contadores em tempo real"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Activity className={`w-3.5 h-3.5 ${isSimulatingScan ? 'animate-spin' : ''}`} />
                      <span>{isSimulatingScan ? 'Contabilizando...' : '+ Registrar Scan Teste'}</span>
                    </button>
                  )}

                  <button
                    id="btn-download-png"
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Baixar PNG</span>
                  </button>

                  <button
                    id="btn-print-qr"
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Destino Atual
                  </span>
                  <div className="mt-1">
                    <DestinationBadge type={qrCode.destination_type} url={qrCode.destination_url} />
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Total de Escaneamentos
                  </span>
                  <p className="mt-1 font-bold text-slate-900 text-lg">
                    {qrCode.total_scans || 0} acessos
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Data de Ativação
                  </span>
                  <p className="mt-1 text-slate-800 font-medium">
                    {formatDate(qrCode.activated_at)}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Último Acesso Registrado
                  </span>
                  <p className="mt-1 text-slate-800 font-medium">
                    {formatDate(qrCode.last_access_at)}
                  </p>
                </div>
              </div>

              {/* Production & Stock Identification Info */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Número Físico da Placa (Rodapé)
                  </span>
                  <span className="font-mono text-sm font-black text-slate-900 mt-0.5 block">
                    {getPhysicalPlaqueNumber(qrCode.code)}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Utilizado na organização do estoque e gravado discretamente no rodapé.
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Nome do Arquivo de Produção
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800 mt-0.5 block break-all">
                    {getPlaqueExportFilename(qrCode.code)}.png
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Código interno mantido no sistema e na URL dinâmica.
                  </p>
                </div>
              </div>

              {/* Dynamic URL Copy Box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  URL Dinâmica Permanente (Gravada no QR Físico)
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-slate-800 break-all select-all font-medium">
                    {dynamicUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-md shrink-0 border border-slate-200 transition-all cursor-pointer"
                    title="Copiar URL"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Real Destination URL Preview (Internal) */}
              {qrCode.destination_url && (
                <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <span className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider block">
                    Destino Interno Configurado
                  </span>
                  <a
                    href={qrCode.destination_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-blue-700 hover:underline break-all mt-0.5 block"
                  >
                    {qrCode.destination_url}
                  </a>
                </div>
              )}

              {/* Status toggle actions */}
              <div className="pt-2 flex items-center gap-3">
                {qrCode.status === 'ATIVO' ? (
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-medium cursor-pointer"
                  >
                    <PauseCircle className="w-4 h-4" />
                    <span>Pausar QR Code (Temporariamente Desativado)</span>
                  </button>
                ) : qrCode.status === 'PAUSADO' ? (
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Reativar QR Code</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ESTATÍSTICAS SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span>Estatísticas de Acesso</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas de escaneamentos em tempo real registrados pela placa física
          </p>
        </div>

        {/* 4 Stat Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Acessos Totais
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {qrCode.total_scans || 0}
            </p>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
              Acessos Hoje
            </span>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {scansToday}
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider block">
              Últimos 7 dias
            </span>
            <p className="text-2xl font-black text-blue-700 mt-1">
              {scansLast7Days}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Último Acesso
            </span>
            <p className="text-xs font-semibold text-slate-800 mt-2">
              {formatDate(qrCode.last_access_at)}
            </p>
          </div>
        </div>

        {/* 30 Days Chart */}
        <div className="pt-4">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-4">
            Escaneamentos por dia (Últimos 30 dias)
          </span>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  interval={3}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value} acessos`, 'Escaneamentos']}
                  labelFormatter={(label: any) => `Data: ${label}`}
                />
                <Bar dataKey="acessos" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scan Log History Table */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Últimos registros de escaneamento
          </h4>

          {loadingScans ? (
            <p className="text-xs text-slate-400 py-4 text-center">Carregando acessos...</p>
          ) : scans.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Nenhum escaneamento registrado ainda para este QR Code.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <th className="py-2 px-3">Data e Hora</th>
                    <th className="py-2 px-3">Dispositivo / User Agent</th>
                    <th className="py-2 px-3">Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scans.slice(0, 10).map((scan) => (
                    <tr key={scan.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                        {formatDate(scan.scanned_at)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate font-mono text-[11px]">
                        {scan.user_agent}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {scan.referrer || 'Placa Física / Direto'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsEditing(false)}
          />

          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Editar QR Code {qrCode.code}
                  </h3>
                  <p className="text-xs text-slate-500">
                    A URL física não muda. Apenas o destino interno é atualizado.
                  </p>
                </div>
              </div>

              {editError && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    placeholder="Nome da empresa"
                    className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL de Destino
                  </label>
                  <input
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="https://..."
                    className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Destino
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as DestinationType)}
                    className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="google_review">Avaliação Google</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="website">Site</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as QRStatus)}
                    className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="ATIVO">ATIVO (Em funcionamento)</option>
                    <option value="DISPONIVEL">DISPONÍVEL (Estoque)</option>
                    <option value="PAUSADO">PAUSADO (Temporariamente desativado)</option>
                    <option value="ARQUIVADO">ARQUIVADO (Descartado)</option>
                  </select>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-save-edit-qr"
                    type="submit"
                    disabled={editLoading}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {editLoading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
