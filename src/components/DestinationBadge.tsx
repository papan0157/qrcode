import React from 'react';
import { Star, MessageCircle, Instagram, Globe, Link2 } from 'lucide-react';
import { DestinationType } from '../types';

interface DestinationBadgeProps {
  type: DestinationType | null;
  url?: string | null;
}

export const DestinationBadge: React.FC<DestinationBadgeProps> = ({ type, url }) => {
  if (!type) {
    return <span className="text-xs text-slate-400 italic">— Não configurado</span>;
  }

  switch (type) {
    case 'google_review':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
          Avaliação Google
        </span>
      );
    case 'whatsapp':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
          <MessageCircle className="w-3 h-3 text-emerald-600" />
          WhatsApp
        </span>
      );
    case 'instagram':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-md">
          <Instagram className="w-3 h-3 text-rose-500" />
          Instagram
        </span>
      );
    case 'website':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
          <Globe className="w-3 h-3 text-blue-600" />
          Site
        </span>
      );
    case 'other':
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
          <Link2 className="w-3 h-3 text-slate-500" />
          Outro
        </span>
      );
  }
};
