import React from 'react';
import {
  Boxes,
  CheckCircle2,
  QrCode,
  TrendingUp,
  Plus,
  ExternalLink,
  Download,
  Settings2,
  Calendar,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { QRCodeItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { DestinationBadge } from '../components/DestinationBadge';
import { buildDynamicUrl, downloadSingleQrPng, getPhysicalPlaqueNumber } from '../lib/qr-generator';

interface DashboardViewProps {
  qrCodes: QRCodeItem[];
  onOpenQuickActivate: () => void;
  onSelectQR: (qr: QRCodeItem) => void;
  onNavigateToStock: () => void;
  baseDomain: string;
  useCurrentOrigin: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  qrCodes,
  onOpenQuickActivate,
  onSelectQR,
  onNavigateToStock,
  baseDomain,
  useCurrentOrigin,
}) => {
  // Compute aggregate numbers
  const totalCodes = qrCodes.length;
  const disponiveis = qrCodes.filter((c) => c.status === 'DISPONIVEL').length;
  const ativos = qrCodes.filter((c) => c.status === 'ATIVO').length;
  const totalAcessos = qrCodes.reduce((acc, curr) => acc + (curr.total_scans || 0), 0);

  // Recent QR codes: sort by updated_at or activated_at or created_at descending
  const recentCodes = [...qrCodes]
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 8);

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

  const handleTestLink = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = buildDynamicUrl(code, baseDomain, useCurrentOrigin);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async (item: QRCodeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const dynamicUrl = buildDynamicUrl(item.code, baseDomain, useCurrentOrigin);
    await downloadSingleQrPng(item.code, dynamicUrl);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/70">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Papan QR
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Tempo Real</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie seus QR Codes dinâmicos com sincronização de acessos instantânea
          </p>
        </div>

        {/* Mobile & Desktop prominent action */}
        <div className="flex items-center gap-3">
          <button
            id="btn-dashboard-quick-activate"
            type="button"
            onClick={onOpenQuickActivate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Ativar QR</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Total de QR Codes */}
        <div
          onClick={onNavigateToStock}
          className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total de QR Codes
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">{totalCodes}</p>
            <p className="text-[11px] text-slate-500 mt-1">Quantidade cadastrada</p>
          </div>
        </div>

        {/* Disponíveis */}
        <div
          onClick={onNavigateToStock}
          className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Disponíveis
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-amber-700">{disponiveis}</p>
            <p className="text-[11px] text-slate-500 mt-1">Prontos para atribuição</p>
          </div>
        </div>

        {/* Ativos */}
        <div
          onClick={onNavigateToStock}
          className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Ativos
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700">{ativos}</p>
            <p className="text-[11px] text-slate-500 mt-1">Vinculados a empresas</p>
          </div>
        </div>

        {/* Acessos */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Acessos
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-bold text-blue-700">{totalAcessos}</p>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Ao vivo</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Total de escaneamentos em tempo real</p>
          </div>
        </div>
      </div>

      {/* QR Codes recentes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">QR Codes recentes</h2>
            <p className="text-xs text-slate-500">Últimas movimentações e ativações no estoque</p>
          </div>
          <button
            type="button"
            onClick={onNavigateToStock}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-5">Código</th>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Destino</th>
                <th className="py-3 px-4 text-center">Acessos</th>
                <th className="py-3 px-4">Último acesso</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {recentCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                    Nenhum QR Code cadastrado ainda. Clique em "+ Ativar QR" ou "+ Gerar QR Codes".
                  </td>
                </tr>
              ) : (
                recentCodes.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectQR(item)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-900 leading-tight">
                          {item.code}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 font-semibold mt-0.5">
                          Placa: {getPhysicalPlaqueNumber(item.code)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {item.company_name ? (
                        <span>{item.company_name}</span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Sem empresa (Estoque)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <DestinationBadge type={item.destination_type} url={item.destination_url} />
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {item.total_scans || 0}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {formatDate(item.last_access_at)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelectQR(item)}
                          title="Detalhes e Configuração"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleTestLink(item.code, e)}
                          title="Testar URL Dinâmica"
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDownload(item, e)}
                          title="Baixar PNG para Placa"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-slate-100">
          {recentCodes.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              Nenhum QR Code cadastrado ainda.
            </div>
          ) : (
            recentCodes.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectQR(item)}
                className="p-4 active:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-base text-slate-900 block">
                      {item.code}
                    </span>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {item.company_name || <span className="text-slate-400 italic text-xs">Sem empresa (Disponível)</span>}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <DestinationBadge type={item.destination_type} url={item.destination_url} />
                  <span className="text-slate-400">•</span>
                  <span className="font-medium text-slate-600">
                    {item.total_scans || 0} acessos
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Último: {formatDate(item.last_access_at)}
                  </span>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleTestLink(item.code, e)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 active:bg-blue-100 rounded-md flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Testar
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectQR(item)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 active:bg-slate-200 rounded-md flex items-center gap-1"
                    >
                      <Settings2 className="w-3 h-3" />
                      Configurar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
