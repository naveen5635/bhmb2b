import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowLeft, Pencil, Building2, Phone, Mail, MapPin, User } from 'lucide-react';
import { customerApi, orderApi } from '@/lib/api';
import type { Customer, Order, CreateCustomerInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/common/DataTable';
import { Pagination } from '@/components/common/Pagination';
import { CustomerForm } from '@/components/forms/CustomerForm';
import { OrderStatusBadge } from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string; icon?: React.ElementType }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 font-medium">{value}</p>
      </div>
    </div>
  );
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await customerApi.getById(id);
        setCustomer(data);
      } catch {
        toast({ title: 'Error', description: 'Failed to load customer', variant: 'destructive' });
        navigate('/customers');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const fetchOrders = async (page = 1) => {
    if (!id) return;
    setIsLoadingOrders(true);
    try {
      const data = await orderApi.list({ customerId: id, page, limit: 10 });
      setOrders(data.data);
      setPagination(p => ({ ...p, ...data.pagination }));
    } catch {
      console.error('Failed to load orders');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, [id]);

  const handleEdit = async (data: CreateCustomerInput) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const updated = await customerApi.update(id, data);
      setCustomer(updated);
      setEditDialogOpen(false);
      toast({ title: 'Customer updated', variant: 'success' });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to update',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const orderColumns: ColumnDef<Order, any>[] = [
    {
      accessorKey: 'orderNumber',
      header: 'Order #',
      cell: ({ row }) => (
        <span
          className="font-mono text-sky-600 cursor-pointer hover:underline"
          onClick={() => navigate(`/orders/${row.original.id}`)}
        >
          {row.original.orderNumber}
        </span>
      ),
    },
    { accessorKey: 'orderDate', header: 'Order Date', cell: ({ getValue }) => formatDate(getValue() as string) },
    { accessorKey: 'pickupDate', header: 'Pickup Date', cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    },
    {
      id: 'items',
      header: 'Items',
      cell: ({ row }) => `${row.original.items?.length || 0} items`,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </button>
        <Button onClick={() => setEditDialogOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Customer
        </Button>
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-sky-500" />
            {customer.orgName}
            <span className="text-sm font-normal text-gray-400 ml-1">#{customer.customerNumber}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoRow label="Contact Person" value={customer.contactPerson} icon={User} />
            <InfoRow label="Phone" value={customer.phone} icon={Phone} />
            <InfoRow label="Email" value={customer.email} icon={Mail} />
            <InfoRow
              label="Address"
              value={[customer.address, customer.city, customer.postalCode, customer.country].filter(Boolean).join(', ')}
              icon={MapPin}
            />
            <InfoRow label="Created" value={formatDate(customer.createdAt)} />
            <InfoRow label="Last Updated" value={formatDate(customer.updatedAt)} />
          </div>
          {customer.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{customer.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Order History
            {pagination.total > 0 && (
              <span className="text-sm font-normal text-gray-400 ml-2">({pagination.total} total)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={orders}
            columns={orderColumns}
            isLoading={isLoadingOrders}
            emptyMessage="No orders for this customer"
          />
          {pagination.totalPages > 1 && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={fetchOrders}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            defaultValues={customer}
            onSubmit={handleEdit}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
