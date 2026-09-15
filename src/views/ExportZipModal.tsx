import React, { useState } from 'react';
import { X, FileArchive, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { QRCodeItem } from '../types';
import { generateQrZip, getPhysicalPlaqueNumber, getPlaqueExportFilename } from '../lib/qr-generator';

interface ExportZipModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableCodes: QRCodeItem[];
  baseDomain: string;
  useCurrentOrigin: boolean;
}

export const ExportZipModal: React.FC<ExportZipModalProps> = ({
  isOpen,
  onClose,
  availableCodes,
  baseDomain,
  useCurrentOrigin,
}) => {
  const [selectedCount, setSelectedCount] = useState<number>(Math.min(availableCodes.length, 50));
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (availableCodes.length === 0) return;
    setLoading(true);
    setDownloadSuccess(false);

    const codesToExport = availableCodes.slice(0, selectedCount);
    setProgress({ current: 0, total: codesToExport.length });

    try {
      const blob = await generateQrZip(
        codesToExport,
        baseDomain,
        useCurrentOrigin,
        (current, total) => {
          setProgress({ current, total });
        }
      );

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const firstCode = codesToExport[0]?.code || '';
      const lastCode = codesToExport[codesToExport.length - 1]?.code || '';
      a.download = `papan-placas-PLACA-${getPhysicalPlaqueNumber(firstCode)}_a_PLACA-${getPhysicalPlaqueNumber(lastCode)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
    } catch (err) {
      console.error('Error generating zip:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileArchive className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Exportar QR Codes (ZIP)
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            Gere um arquivo ZIP com as imagens PNG para produção das placas físicas. O QR Code é gerado limpo e centralizado, com o <strong>Número da Placa</strong> discreto no rodapé.
          </p>

          {availableCodes.length === 0 ? (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              Não há QR Codes com status <strong>DISPONÍVEL</strong> no momento. Gere novos códigos antes de exportar.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantidade a Exportar ({availableCodes.length} disponíveis no estoque)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={availableCodes.length}
                    value={selectedCount}
                    onChange={(e) => setSelectedCount(Math.min(availableCodes.length, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                    className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedCount(availableCodes.length)}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg shrink-0"
                  >
                    Todos ({availableCodes.length})
                  </button>
                </div>
              </div>

              {/* Range Preview */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Números Físicos das Placas:</span>
                  <span className="font-mono font-bold text-slate-900">
                    Placa {getPhysicalPlaqueNumber(availableCodes[0]?.code)} até Placa {getPhysicalPlaqueNumber(availableCodes[Math.min(selectedCount, availableCodes.length) - 1]?.code)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Códigos Internos do Sistema:</span>
                  <span className="font-mono text-slate-700">
                    {availableCodes[0]?.code} até {availableCodes[Math.min(selectedCount, availableCodes.length) - 1]?.code}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                  <span>Padrão de arquivos gerados:</span>
                  <span className="font-mono text-slate-700 font-semibold">{getPlaqueExportFilename(availableCodes[0]?.code)}.png</span>
                </div>
              </div>

              {/* Progress Bar */}
              {loading && progress && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      Renderizando imagens em alta qualidade...
                    </span>
                    <span>{progress.current} / {progress.total}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-150"
                      style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {downloadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Arquivo ZIP baixado com sucesso!</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={loading || selectedCount <= 0}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{loading ? 'Gerando ZIP...' : `Baixar ZIP (${selectedCount} PNGs)`}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
