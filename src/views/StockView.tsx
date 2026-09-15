import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  FileArchive,
  ArrowUpDown,
  ExternalLink,
  Download,
  Settings2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { QRCodeItem, QRStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { DestinationBadge } from '../components/DestinationBadge';
import { buildDynamicUrl, downloadSingleQrPng, getPhysicalPlaqueNumber } from '../lib/qr-generator';

interface StockViewProps {
  qrCodes: QRCodeItem[];
  initialFilter?: 'ALL' | QRStatus;
  onSelectQR: (qr: QRCodeItem) => void;
  onOpenBatchGenerate: () => void;
  onOpenExportZip: () => void;
  onOpenQuickActivate: () => void;
  baseDomain: string;
  useCurrentOrigin: boolean;
}

export const StockView: React.FC<StockViewProps> = ({
  qrCodes,
  initialFilter = 'ALL',
  onSelectQR,
  onOpenBatchGenerate,
  onOpenExportZip,
  onOpenQuickActivate,
  baseDomain,
  useCurrentOrigin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | QRStatus>(initialFilter);
  const [sortBy, setSortBy] = useState<'recent' | 'scans' | 'code'>('recent');

  const filteredAndSorted = useMemo(() => {
    let list = [...qrCodes];

    // Status filter
    if (statusFilter !== 'ALL') {
      list = list.filter((item) => item.status === statusFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.code.toLowerCase().includes(q) ||
          (item.company_name && item.company_name.toLowerCase().includes(q)) ||
          (item.destination_url && item.destination_url.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'recent') {
        const timeA = new Date(a.updated_at || a.created_at).getTime();
        const timeB = new Date(b.updated_at || b.created_at).getTime();
        return timeB - timeA;
      }
      if (sortBy === 'scans') {
        return (b.total_scans || 0) - (a.total_scans || 0);
      }
      if (sortBy === 'code') {
        const numA = parseInt(a.code.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.code.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      }
      return 0;
    });

    return list;
  }, [qrCodes, statusFilter, searchTerm, sortBy]);

  const availableCount = qrCodes.filter((c) => c.status === 'DISPONIVEL').length;

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Batch Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Estoque de QR Codes
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Tempo Real</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {qrCodes.length} códigos registrados ({availableCount} disponíveis para entrega) • Contabilização instantânea
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            id="btn-open-export-zip"
            type="button"
            onClick={onOpenExportZip}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FileArchive className="w-4 h-4 text-emerald-600" />
            <span>Exportar Disponíveis (ZIP)</span>
          </button>

          <button
            id="btn-open-batch-generate"
            type="button"
            onClick={onOpenBatchGenerate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Gerar QR Codes</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar empresa ou código..."
              className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Ordenar:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">Mais recentes</option>
              <option value="scans">Mais acessados</option>
              <option value="code">Código (Ordem)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
          {[
            { id: 'ALL', label: 'Todos', count: qrCodes.length },
            { id: 'DISPONIVEL', label: 'Disponíveis', count: qrCodes.filter((c) => c.status === 'DISPONIVEL').length },
            { id: 'ATIVO', label: 'Ativos', count: qrCodes.filter((c) => c.status === 'ATIVO').length },
            { id: 'PAUSADO', label: 'Pausados', count: qrCodes.filter((c) => c.status === 'PAUSADO').length },
            { id: 'ARQUIVADO', label: 'Arquivados', count: qrCodes.filter((c) => c.status === 'ARQUIVADO').length },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label} <span className="opacity-70 text-[11px]">({tab.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* QR Codes List (Table on Desktop, Cards on Mobile) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-5">Código</th>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Destino</th>
                <th className="py-3 px-4 text-center">Acessos</th>
                <th className="py-3 px-4">Criação</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    Nenhum QR Code encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((item) => (
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
                        <span className="text-slate-400 italic text-xs">Disponível em estoque</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <DestinationBadge type={item.destination_type} url={item.destination_url} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                          (item.total_scans || 0) > 0
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.total_scans || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelectQR(item)}
                          title="Configurar / Detalhes"
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

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredAndSorted.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Nenhum QR Code encontrado.
            </div>
          ) : (
            filteredAndSorted.map((item) => (
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
                      {item.company_name || <span className="text-slate-400 italic text-xs">Disponível em estoque</span>}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <DestinationBadge type={item.destination_type} url={item.destination_url} />
                  <span className="font-semibold text-slate-700">
                    {item.total_scans || 0} escaneamentos
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Criado em: {formatDate(item.created_at)}
                  </span>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleTestLink(item.code, e)}
                      className="px-2.5 py-1 font-semibold text-blue-700 bg-blue-50 active:bg-blue-100 rounded-md flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Testar
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectQR(item)}
                      className="px-2.5 py-1 font-semibold text-slate-700 bg-slate-100 active:bg-slate-200 rounded-md flex items-center gap-1"
                    >
                      <Settings2 className="w-3 h-3" />
                      Abrir
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
