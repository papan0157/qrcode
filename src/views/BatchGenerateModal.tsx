import React, { useState, useEffect } from 'react';
import { X, Layers, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { QRCodeItem } from '../types';
import { generateBatchQRCodes } from '../lib/storage';
import { getPhysicalPlaqueNumber } from '../lib/qr-generator';

interface BatchGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCodes: QRCodeItem[];
  defaultPrefix: string;
  onSuccess: (result: { added: number; firstCode: string; lastCode: string }) => void;
}

export const BatchGenerateModal: React.FC<BatchGenerateModalProps> = ({
  isOpen,
  onClose,
  existingCodes,
  defaultPrefix,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState<number>(100);
  const [prefix, setPrefix] = useState<string>(defaultPrefix || 'PAPAN');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute next range preview
  const cleanPrefix = (prefix || 'PAPAN').trim().toUpperCase();
  let maxNum = 0;
  existingCodes.forEach((item) => {
    if (item.code.startsWith(cleanPrefix)) {
      const numPart = item.code.replace(cleanPrefix, '').replace(/^-/, '');
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  });

  const nextStart = maxNum + 1;
  const nextEnd = maxNum + (quantity > 0 ? quantity : 1);
  const previewStart = `${cleanPrefix}-${String(nextStart).padStart(4, '0')}`;
  const previewEnd = `${cleanPrefix}-${String(nextEnd).padStart(4, '0')}`;

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setPrefix(defaultPrefix || 'PAPAN');
    }
  }, [isOpen, defaultPrefix]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (quantity < 1 || quantity > 5000) {
      setErrorMsg('A quantidade deve ser entre 1 e 5.000 QR Codes.');
      return;
    }

    try {
      setLoading(true);
      const res = await generateBatchQRCodes(quantity, cleanPrefix);
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao gerar lote.');
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
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Gerar QR Codes em Lote
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
            Gere centenas ou milhares de QR Codes pré-gerados que ficarão como <strong>DISPONÍVEL</strong> no estoque.
          </p>

          {errorMsg && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prefixo dos Códigos
              </label>
              <input
                type="text"
                required
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="PAPAN"
                className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm uppercase font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantidade a Gerar
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="5000"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                  className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 mt-2">
                {[50, 100, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantity(preset)}
                    className={`text-xs px-2.5 py-1 rounded-md border font-medium cursor-pointer transition-colors ${
                      quantity === preset
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Sequence Preview */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Último número no banco:</span>
                <span className="font-mono font-semibold">{maxNum > 0 ? `${cleanPrefix}-${String(maxNum).padStart(4, '0')} (Placa ${getPhysicalPlaqueNumber(String(maxNum))})` : 'Nenhum ainda'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Códigos Internos (Sistema):</span>
                <span className="font-mono font-bold text-blue-700">
                  {previewStart} até {previewEnd}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Números Físicos (Placas):</span>
                <span className="font-mono font-bold text-emerald-700">
                  Placa {getPhysicalPlaqueNumber(previewStart)} até Placa {getPhysicalPlaqueNumber(previewEnd)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                A numeração física é gerada automaticamente para produção e estoque. O QR Code é gerado limpo, com o número da placa no rodapé.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-batch-generate"
                type="submit"
                disabled={loading || quantity <= 0}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Gerando códigos...' : `Gerar ${quantity} QR Codes`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
