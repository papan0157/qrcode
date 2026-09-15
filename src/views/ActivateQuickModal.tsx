import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ExternalLink,
  QrCode,
  Sparkles,
  ArrowRight,
  Download,
  AlertCircle,
  Link,
  Building,
  RotateCcw,
} from 'lucide-react';
import { QRCodeItem, DestinationType } from '../types';
import { activateQRCode } from '../lib/storage';
import { buildDynamicUrl, downloadSingleQrPng, getPhysicalPlaqueNumber } from '../lib/qr-generator';

interface ActivateQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableCodes: QRCodeItem[];
  preselectedQR?: QRCodeItem | null;
  onSuccess: (updatedQR: QRCodeItem) => void;
  baseDomain: string;
  useCurrentOrigin: boolean;
}

export const ActivateQuickModal: React.FC<ActivateQuickModalProps> = ({
  isOpen,
  onClose,
  availableCodes,
  preselectedQR,
  onSuccess,
  baseDomain,
  useCurrentOrigin,
}) => {
  const [selectedQR, setSelectedQR] = useState<QRCodeItem | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [destinationType, setDestinationType] = useState<DestinationType>('google_review');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activatedItem, setActivatedItem] = useState<QRCodeItem | null>(null);

  // Pick first available automatically when opening
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setActivatedItem(null);

      if (preselectedQR && preselectedQR.status === 'DISPONIVEL') {
        setSelectedQR(preselectedQR);
      } else if (availableCodes.length > 0) {
        setSelectedQR(availableCodes[0]);
      } else {
        setSelectedQR(null);
      }

      setCompanyName('');
      setDestinationUrl('');
      setDestinationType('google_review');
    }
  }, [isOpen, preselectedQR, availableCodes]);

  if (!isOpen) return null;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedQR) {
      setErrorMsg('Nenhum QR Code disponível no estoque. Gere novos códigos antes de ativar.');
      return;
    }

    if (!companyName.trim()) {
      setErrorMsg('Informe o nome da empresa.');
      return;
    }

    if (!destinationUrl.trim()) {
      setErrorMsg('Cole a URL de destino (ex: link de avaliação do Google).');
      return;
    }

    // Ensure valid URL prefix
    let finalUrl = destinationUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      setLoading(true);
      const updated = await activateQRCode({
        id: selectedQR.id,
        company_name: companyName.trim(),
        destination_url: finalUrl,
        destination_type: destinationType,
      });

      setActivatedItem(updated);
      onSuccess(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao ativar QR Code.');
    } finally {
      setLoading(false);
    }
  };

  const dynamicTestUrl = activatedItem
    ? buildDynamicUrl(activatedItem.code, baseDomain, useCurrentOrigin)
    : '';

  const handleTest = () => {
    if (dynamicTestUrl) {
      window.open(dynamicTestUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadPng = async () => {
    if (activatedItem) {
      await downloadSingleQrPng(activatedItem.code, dynamicTestUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="min-h-full flex items-center justify-center p-3 sm:p-4">
        <div className="relative bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {activatedItem ? 'QR Code Ativado!' : 'Configurar QR Code'}
                </h3>
                <p className="text-xs text-slate-500">
                  {activatedItem ? 'Pronto para entrega da placa' : 'Ativação rápida em menos de 1 minuto'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success State */}
          {activatedItem ? (
            <div className="py-5 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-900 text-white">
                    {activatedItem.code}
                  </span>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    Placa Nº {getPhysicalPlaqueNumber(activatedItem.code)}
                  </span>
                </div>
                <h4 className="text-xl font-bold text-slate-900">
                  QR Code ativado com sucesso.
                </h4>
                <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto">
                  Vinculado a <strong className="text-slate-900">{activatedItem.company_name}</strong>
                </p>
              </div>

              {/* Dynamic URL info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                  URL Dinâmica da Placa Física
                </span>
                <p className="text-xs font-mono text-blue-600 break-all mt-0.5 select-all">
                  {dynamicTestUrl}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  id="btn-test-activated-qr"
                  type="button"
                  onClick={handleTest}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Testar QR Code</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-xs transition-colors cursor-pointer"
                  >
                    <span>Concluir</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleActivate} className="mt-4 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Selected QR Code Display */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Identificação da Placa
                  </span>
                  {selectedQR ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-base font-bold text-slate-900">
                        {selectedQR.code}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Placa: {getPhysicalPlaqueNumber(selectedQR.code)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-red-600">
                      Nenhum código disponível no estoque!
                    </span>
                  )}
                </div>

                {availableCodes.length > 1 && (
                  <select
                    value={selectedQR?.id || ''}
                    onChange={(e) => {
                      const found = availableCodes.find((c) => c.id === e.target.value);
                      if (found) setSelectedQR(found);
                    }}
                    className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 focus:outline-none"
                  >
                    {availableCodes.slice(0, 50).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} (Placa {getPhysicalPlaqueNumber(c.code)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Empresa */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Empresa <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Barbearia do João"
                    className="block w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* URL de Destino */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL de destino <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Link className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="Cole aqui a URL do Google (ex: https://g.page/r/.../review)"
                    className="block w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dica: cole o link curto de avaliação que a empresa copia do Perfil da Empresa no Google.
                </p>
              </div>

              {/* Tipo de Destino */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de destino
                </label>
                <select
                  value={destinationType}
                  onChange={(e) => setDestinationType(e.target.value as DestinationType)}
                  className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                >
                  <option value="google_review">Avaliação Google (Principal)</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                  <option value="website">Site</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              {/* Large Action Button: [ ATIVAR QR CODE ] */}
              <div className="pt-2">
                <button
                  id="btn-confirm-activate-qr"
                  type="submit"
                  disabled={loading || !selectedQR}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <span>Ativando placa...</span>
                  ) : (
                    <>
                      <span>ATIVAR QR CODE</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
