import React, { useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  isLoading?: boolean;
  emptyMessage?: string;
  enableSelection?: boolean;
  onSelectionChange?: (rows: T[]) => void;
}

// Indeterminate checkbox that handles the three-state properly
function IndeterminateCheckbox({
  indeterminate,
  ...rest
}: { indeterminate?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate ?? false;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-4 w-4 accent-sky-500 cursor-pointer rounded"
      {...rest}
    />
  );
}

export function DataTable<T>({
  data,
  columns,
  isLoading,
  emptyMessage = 'No records found',
  enableSelection = false,
  onSelectionChange,
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Clear selection whenever data refreshes (e.g. after bulk action)
  useEffect(() => {
    setRowSelection({});
  }, [data]);

  // Notify parent of selection changes
  useEffect(() => {
    if (!enableSelection || !onSelectionChange) return;
    const selected = table.getSelectedRowModel().rows.map(r => r.original);
    onSelectionChange(selected);
  }, [rowSelection]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectionColumn: ColumnDef<T, any> = {
    id: '_select',
    size: 44,
    enableSorting: false,
    header: ({ table }) => (
      <IndeterminateCheckbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        title="Select all"
      />
    ),
    cell: ({ row }) => (
      <IndeterminateCheckbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
        onClick={e => e.stopPropagation()}
      />
    ),
  };

  const allColumns = enableSelection ? [selectionColumn, ...columns] : columns;

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: enableSelection,
    getRowId: (row, idx) => (row as any).id ?? String(idx),
  });

  const colCount = allColumns.length;

  if (isLoading) {
    return (
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b">
                {allColumns.map((_, j) => (
                  <td key={j} className="p-4">
                    <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder ? null : (
                    <div
                      className={cn(
                        'flex items-center gap-1',
                        header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        header.column.getIsSorted() === 'asc'  ? <ChevronUp   className="h-4 w-4" /> :
                        header.column.getIsSorted() === 'desc' ? <ChevronDown className="h-4 w-4" /> :
                        <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-12 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className={cn(
                  'hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors',
                  row.getIsSelected() && 'bg-sky-50 dark:bg-sky-900/20'
                )}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
