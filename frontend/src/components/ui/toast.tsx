import * as React from 'react';
import { useToastState } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function Toaster() {
  const toasts = useToastState();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg shadow-lg border animate-fade-in',
            t.variant === 'destructive' ? 'bg-red-50 border-red-200' :
            t.variant === 'success' ? 'bg-green-50 border-green-200' :
            'bg-white border-gray-200'
          )}
        >
          {t.variant === 'success' && <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />}
          {t.variant === 'destructive' && <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />}
          {(!t.variant || t.variant === 'default') && <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />}
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{t.title}</p>
            {t.description && <p className="text-sm text-gray-600 mt-0.5">{t.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
