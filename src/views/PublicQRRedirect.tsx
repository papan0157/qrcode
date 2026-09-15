import React, { useEffect, useState } from 'react';
import { QrCode, AlertTriangle } from 'lucide-react';
import { fetchQRCodeByCode, recordScan } from '../lib/storage';
import { QRCodeItem } from '../types';

interface PublicQRRedirectProps {
  code: string;
  onGoToHome?: () => void;
}

export const PublicQRRedirect: React.FC<PublicQRRedirectProps> = ({ code }) => {
  const [statusError, setStatusError] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function processRedirect() {
      try {
        const qr = await fetchQRCodeByCode(code);

        if (!active) return;

        // Se o QR não existir ou não estiver ATIVO ou não possuir URL de destino:
        // Exibir mensagem de indisponível (sem revelar o destino)
        if (!qr || qr.status !== 'ATIVO' || !qr.destination_url) {
          setStatusError('Este QR Code não está disponível.');
          return;
        }

        const target = qr.destination_url;
        setTargetUrl(target);

        // 1. Registrar o scan no Supabase com garantia de persistência e broadcast em tempo real
        try {
          await Promise.race([
            recordScan(qr.code, qr),
            new Promise((resolve) => setTimeout(resolve, 750)),
          ]);
        } catch (scanErr) {
          console.error('Erro ao registrar scan:', scanErr);
        }

        // 2. Redirecionamento direto e imediato para a URL de destino
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = target;
          } else {
            window.location.replace(target);
          }
        } catch {
          window.location.href = target;
        }
      } catch (err) {
        console.error('Erro no redirecionamento do QR:', err);
        if (active) {
          setStatusError('Este QR Code não está disponível.');
        }
      }
    }

    processRedirect();

    return () => {
      active = false;
    };
  }, [code]);

  // Se o QR Code estiver DISPONÍVEL, PAUSADO, ARQUIVADO ou inexistente
  if (statusError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
            {code.toUpperCase()}
          </span>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            Este QR Code não está disponível.
          </h1>

          <p className="text-sm text-slate-500 mb-6">
            Esta placa física ainda não foi ativada ou encontra-se temporariamente desativada pelo estabelecimento.
          </p>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
            <QrCode className="w-3.5 h-3.5 text-blue-500" />
            <span>Papan QR • Papan Media</span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback visual discreto caso o navegador impeça o redirecionamento automático
  if (targetUrl) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center">
        <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-4 mx-auto" />
        <p className="text-sm font-medium text-slate-700 mb-2">Redirecionando para o destino...</p>
        <p className="text-xs text-slate-400 mb-4">Acesso contabilizado em tempo real.</p>
        <a
          href={targetUrl}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
        >
          Clique aqui se não redirecionar automaticamente
        </a>
      </div>
    );
  }

  return null;
};
