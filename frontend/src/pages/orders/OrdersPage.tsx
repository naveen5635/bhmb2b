import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Eye, Copy, Printer, Trash2, ChevronDown } from 'lucide-react';
import { orderApi, labelApi } from '@/lib/api';
import type { Order, OrderStatus, CreateOrderInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/common/DataTable';
import { Pagination } from '@/components/common/Pagination';
import { SearchInput } from '@/components/common/SearchInput';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { OrderStatusBadge } from '@/components/common/StatusBadge';
import { OrderForm } from '@/components/forms/OrderForm';
import { formatDate, downloadBlob, ORDER_STATUS_CONFIG } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'CANCELLED'];

export function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrinting, setIsPrinting] = useState<string | null>(null);

  const fetchOrders = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: pagination.limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (dateFrom) params.orderDateFrom = dateFrom;
      if (dateTo) params.orderDateTo = dateTo;
      const data = await orderApi.list(params);
      setOrders(data.data);
      setPagination(p => ({ ...p, ...data.pagination }));
    } catch {
      toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, dateFrom, dateTo, pagination.limit]);

  useEffect(() => {
    fetchOrders(1);
  }, [debouncedSearch, statusFilter, dateFrom, dateTo]);

  const handleCreate = async (data: CreateOrderInput) => {
    setIsSubmitting(true);
    try {
      const order = await orderApi.create(data);
      toast({ title: 'Order created', description: `#${order.orderNumber}`, variant: 'success' });
      setCreateOpen(false);
      fetchOrders(1);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to create order',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const order = await orderApi.duplicate(id);
      toast({ title: 'Order duplicated', description: `New order #${order.orderNumber}`, variant: 'success' });
      fetchOrders(pagination.page);
    } catch {
      toast({ title: 'Error', description: 'Failed to duplicate order', variant: 'destructive' });
    }
  };

  const handlePrintLabel = async (orderId: string) => {
    setIsPrinting(orderId);
    try {
      const blob = await labelApi.generate([orderId], 'A6');
      downloadBlob(blob, `label-${orderId}.pdf`);
      toast({ title: 'Label downloaded', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate label', variant: 'destructive' });
    } finally {
      setIsPrinting(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await orderApi.delete(deleteTarget.id);
      toast({ title: 'Order deleted', variant: 'success' });
      setDeleteTarget(null);
      fetchOrders(pagination.page);
    } catch {
      toast({ title: 'Error', description: 'Failed to delete order', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: OrderStatus) => {
    try {
      await orderApi.updateStatus(id, status);
      toast({ title: 'Status updated', variant: 'success' });
      fetchOrders(pagination.page);
    } catch {
      toast({ title: 'Error updating status', variant: 'destructive' });
    }
  };

  const columns: ColumnDef<Order, any>[] = [
    {
      accessorKey: 'orderNumber',
      header: 'Order #',
      cell: ({ row }) => (
        <span
          className="font-mono text-sky-600 font-semibold cursor-pointer hover:underline"
          onClick={() => navigate(`/orders/${row.original.id}`)}
        >
          {row.original.orderNumber}
        </span>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.customer?.orgName}</p>
          <p className="text-xs text-gray-400">{row.original.customer?.customerNumber}</p>
        </div>
      ),
    },
    { accessorKey: 'orderDate', header: 'Order Date', cell: ({ getValue }) => formatDate(getValue() as string) },
    { accessorKey: 'pickupDate', header: 'Pickup Date', cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1">
              <OrderStatusBadge status={row.original.status} />
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {ALL_STATUSES.map(s => (
              <DropdownMenuItem
                key={s}
                onClick={() => handleStatusUpdate(row.original.id, s)}
                className={row.original.status === s ? 'font-semibold' : ''}
              >
                {ORDER_STATUS_CONFIG[s].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      cell: ({ row }) => `${row.original.items?.length || 0} items`,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/orders/${row.original.id}`)} title="View">
            <Eye className="h-4 w-4 text-gray-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDuplicate(row.original.id)} title="Duplicate">
            <Copy className="h-4 w-4 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePrintLabel(row.original.id)}
            disabled={isPrinting === row.original.id}
            title="Print Label"
          >
            <Printer className="h-4 w-4 text-gray-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(row.original)} title="Delete">
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Order
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border">
        <SearchInput value={search} onChange={setSearch} placeholder="Search orders..." />
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'ALL' | OrderStatus)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {ALL_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{ORDER_STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">From:</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">To:</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" />
        </div>
        {(dateFrom || dateTo || statusFilter !== 'ALL' || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border">
        <DataTable data={orders} columns={columns} isLoading={isLoading} emptyMessage="No orders found" />
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={fetchOrders}
        />
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Order</DialogTitle>
          </DialogHeader>
          <OrderForm onSubmit={handleCreate} isLoading={isSubmitting} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Delete Order"
        description={`Delete order #${deleteTarget?.orderNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
