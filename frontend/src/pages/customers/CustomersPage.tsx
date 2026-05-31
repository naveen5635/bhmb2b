import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Download, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { customerApi } from '@/lib/api';
import type { Customer, CreateCustomerInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/common/DataTable';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { Pagination } from '@/components/common/Pagination';
import { SearchInput } from '@/components/common/SearchInput';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CustomerForm } from '@/components/forms/CustomerForm';
import { formatDate, downloadBlob } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';

export function CustomersPage() {
  const navigate = useNavigate();

  const [customers,   setCustomers]   = useState<Customer[]>([]);
  const [pagination,  setPagination]  = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading,   setIsLoading]   = useState(true);
  const [search,      setSearch]      = useState('');
  const debouncedSearch               = useDebounce(search, 400);

  const [dialogOpen,       setDialogOpen]       = useState(false);
  const [editingCustomer,  setEditingCustomer]  = useState<Customer | null>(null);
  const [deleteTarget,     setDeleteTarget]     = useState<Customer | null>(null);
  const [isDeleting,       setIsDeleting]       = useState(false);
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [isExporting,      setIsExporting]      = useState(false);

  // ── Bulk selection ──────────────────────────────────────────────────────────
  const [selected,       setSelected]       = useState<Customer[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: pagination.limit };
      if (debouncedSearch) params.search = debouncedSearch;
      const data = await customerApi.list(params);
      setCustomers(data.data);
      setPagination(p => ({ ...p, ...data.pagination }));
    } catch {
      toast({ title: 'Error', description: 'Failed to load customers', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, pagination.limit]);

  useEffect(() => { fetchCustomers(1); }, [debouncedSearch]);

  // ── Single CRUD ─────────────────────────────────────────────────────────────
  const handleSubmit = async (data: CreateCustomerInput) => {
    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await customerApi.update(editingCustomer.id, data);
        toast({ title: 'Customer updated', variant: 'success' });
      } else {
        await customerApi.create(data);
        toast({ title: 'Customer created', variant: 'success' });
      }
      setDialogOpen(false);
      setEditingCustomer(null);
      fetchCustomers(pagination.page);
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to save';
      const hint =
        status === 409 ? 'Customer number already exists — use a different number.' :
        status === 400 ? `Validation: ${err?.response?.data?.details?.map((d: any) => d.message).join(', ') || detail}` :
        !err?.response  ? 'Cannot reach the server — make sure the backend is running.' :
        detail;
      console.error('[Customer save error]', err);
      toast({ title: 'Error saving customer', description: hint, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await customerApi.delete(deleteTarget.id);
      toast({ title: 'Customer deleted', variant: 'success' });
      setDeleteTarget(null);
      fetchCustomers(pagination.page);
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Bulk delete ─────────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    let ok = 0, fail = 0;
    for (const c of selected) {
      try { await customerApi.delete(c.id); ok++; }
      catch { fail++; }
    }
    setIsBulkDeleting(false);
    setBulkDeleteOpen(false);
    setSelected([]);
    toast({
      title: fail === 0 ? `${ok} customer(s) deleted` : `${ok} deleted, ${fail} failed`,
      variant: fail === 0 ? 'success' : 'destructive',
    });
    fetchCustomers(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await customerApi.exportCSV();
      downloadBlob(blob, `customers-${new Date().toISOString().slice(0, 10)}.csv`);
      toast({ title: 'Export ready', variant: 'success' });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Columns ─────────────────────────────────────────────────────────────────
  const columns: ColumnDef<Customer, any>[] = [
    {
      accessorKey: 'customerNumber',
      header: 'Customer #',
      cell: ({ getValue }) => (
        <span className="font-mono text-sky-600 font-medium text-xs">{getValue()}</span>
      ),
    },
    {
      accessorKey: 'orgName',
      header: 'Organization',
      cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    },
    { accessorKey: 'contactPerson', header: 'Contact',  cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'city',          header: 'City',     cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'phone',         header: 'Phone',    cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'taxNumber',     header: 'Tax No.',  cell: ({ getValue }) => getValue() || '-' },
    { accessorKey: 'createdAt',     header: 'Created',  cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      size: 110,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="View detail"
            onClick={() => navigate(`/customers/${row.original.id}`)}>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </Button>
          <Button variant="ghost" size="icon" title="Edit"
            onClick={() => { setEditingCustomer(row.original); setDialogOpen(true); }}>
            <Pencil className="h-4 w-4 text-gray-500" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete"
            onClick={() => setDeleteTarget(row.original)}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
        <Button onClick={() => { setEditingCustomer(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search customers..." />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Bulk action bar — only visible when rows are selected */}
      <BulkActionBar count={selected.length} onClear={() => setSelected([])}>
        <Button
          size="sm"
          variant="destructive"
          className="h-8 text-xs"
          onClick={() => setBulkDeleteOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete {selected.length} Customer(s)
        </Button>
      </BulkActionBar>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
        <DataTable
          data={customers}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No customers found"
          enableSelection
          onSelectionChange={setSelected}
        />
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={fetchCustomers}
        />
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setEditingCustomer(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <CustomerForm
            defaultValues={editingCustomer ?? undefined}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Single delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Delete Customer"
        description={`Delete "${deleteTarget?.orgName}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selected.length} Customer(s)?`}
        description={`You are about to permanently delete ${selected.length} customer(s). This cannot be undone.`}
        confirmLabel={isBulkDeleting ? 'Deleting…' : `Delete ${selected.length} Customer(s)`}
        variant="destructive"
        onConfirm={handleBulkDelete}
        isLoading={isBulkDeleting}
      />
    </div>
  );
}
