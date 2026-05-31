import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
  className?: string;
}

export function BulkActionBar({ count, onClear, children, className }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-2.5 rounded-lg',
      'bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700',
      'animate-fade-in',
      className
    )}>
      {/* Count badge */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex items-center justify-center w-6 h-6 bg-sky-500 text-white text-xs font-bold rounded-full">
          {count}
        </span>
        <span className="text-sm font-medium text-sky-800 dark:text-sky-200">
          {count === 1 ? 'record' : 'records'} selected
        </span>
      </div>

      <div className="h-4 w-px bg-sky-200 dark:bg-sky-600" />

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {children}
      </div>

      {/* Clear */}
      <button
        onClick={onClear}
        title="Clear selection"
        className="ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
