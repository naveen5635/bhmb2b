import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Copy, Printer, Trash2, Clock,
  User, Calendar, Package, CheckCircle2, RefreshCw, XCircle, FilePlus2,
} from 'lucide-react';
import { orderApi, labelApi } from '@/lib/api';
import type { Order, AuditLog, OrderStatus, CreateOrderInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { OrderStatusBadge } from '@/components/common/StatusBadge';
import { OrderForm } from '@/components/forms/OrderForm';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatDateTime, downloadBlob, ORDER_STATUS_CONFIG } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

// ── Timeline helpers ──────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}> = {
  CREATE:        { label: 'Order Created',    icon: FilePlus2,    iconBg: 'bg-green-100',  iconColor: 'text-green-600'  },
  UPDATE:        { label: 'Order Updated',    icon: RefreshCw,    iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
  STATUS_UPDATE: { label: 'Status Changed',   icon: RefreshCw,    iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
  DELETE:        { label: 'Order Deleted',    icon: XCircle,      iconBg: 'bg-red-100',    iconColor: 'text-red-500'    },
  DUPLICATE:     { label: 'Order Duplicated', icon: Copy,         iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
};

const FIELD_LABELS: Record<string, string> = {
  status:      'Status',
  orderNumber: 'Order Number',
  pickupDate:  'Pickup Date',
  pickupTime:  'Pickup Time',
  notes:       'Notes',
  customerId:  'Customer',
};

function formatChangeValue(key: string, value: unknown): string {
  if (key === 'status') {
    return ORDER_STATUS_CONFIG[value as OrderStatus]?.label ?? String(value);
  }
  if (key === 'pickupDate' && typeof value === 'string') {
    return formatDate(value);
  }
  return String(value ?? '-');
}

function parseChanges(changes: Record<string, unknown>): { label: string; value: string }[] {
  return Object.entries(changes)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => ({
      label: FIELD_LABELS[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      value: formatChangeValue(k, v),
    }));
}

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] ?? {
    label: action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, ' '),
    icon: Clock,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-500',
  };
}

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'CANCELLED'];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const fetchOrder = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [ord, tl] = await Promise.all([
        orderApi.getById(id),
        orderApi.getTimeline(id).catch(() => []),
      ]);
      setOrder(ord);
      setTimeline(tl);
    } catch {
      toast({ title: 'Error', description: 'Failed to load order', variant: 'destructive' });
      navigate('/orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleEdit = async (data: CreateOrderInput) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const updated = await orderApi.update(id, data);
      setOrder(updated);
      setEditOpen(false);
      toast({ title: 'Order updated', variant: 'success' });
      fetchOrder();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to update', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (status: OrderStatus) => {
    if (!id) return;
    try {
      const updated = await orderApi.updateStatus(id, status);
      setOrder(updated);
      toast({ title: 'Status updated', variant: 'success' });
      fetchOrder();
    } catch {
      toast({ title: 'Error updating status', variant: 'destructive' });
    }
  };

  const handleDuplicate = async () => {
    if (!id) return;
    try {
      const dup = await orderApi.duplicate(id);
      toast({ title: 'Order duplicated', description: `New order #${dup.orderNumber}`, variant: 'success' });
      navigate(`/orders/${dup.id}`);
    } catch {
      toast({ title: 'Error', description: 'Failed to duplicate', variant: 'destructive' });
    }
  };

  const handlePrintLabel = async () => {
    if (!id) return;
    setIsPrinting(true);
    try {
      const blob = await labelApi.generate([id], 'A6');
      downloadBlob(blob, `label-${order?.orderNumber || id}.pdf`);
      toast({ title: 'Label downloaded', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate label', variant: 'destructive' });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await orderApi.delete(id);
      toast({ title: 'Order deleted', variant: 'success' });
      navigate('/orders');
    } catch {
      toast({ title: 'Error', description: 'Failed to delete order', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button variant="outline" onClick={handlePrintLabel} disabled={isPrinting}>
            <Printer className="h-4 w-4 mr-2" />
            {isPrinting ? 'Generating...' : 'Print Label'}
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Order Number</p>
              <h2 className="text-2xl font-bold font-mono text-gray-900">{order.orderNumber}</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Status</p>
                <OrderStatusBadge status={order.status} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Update Status</p>
                <Select value={order.status} onValueChange={v => handleStatusUpdate(v as OrderStatus)}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{ORDER_STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <p className="text-sm font-semibold">{order.customer?.orgName}</p>
                <p className="text-xs text-gray-400">#{order.customer?.customerNumber}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Order Date</p>
                <p className="text-sm font-semibold">{formatDate(order.orderDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Pickup Date</p>
                <p className="text-sm font-semibold">{formatDate(order.pickupDate) || '-'}</p>
                {order.pickupTime && <p className="text-xs text-gray-400">{order.pickupTime}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Package className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Total Items</p>
                <p className="text-sm font-semibold">{order.items?.length || 0} items</p>
              </div>
            </div>
          </div>
          {order.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-t border-b">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Article #</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Quantity</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">PCS/Carton</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Total Cartons</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items?.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-sky-600">{item.article?.articleNumber}</td>
                  <td className="px-6 py-3 font-medium">{item.article?.name}</td>
                  <td className="px-6 py-3">{item.quantity.toLocaleString()}</td>
                  <td className="px-6 py-3">{item.pcsPerCarton}</td>
                  <td className="px-6 py-3 font-semibold">{item.totalCartons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Timeline */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-4 top-5 bottom-0 w-px bg-gray-100" />

              <div className="space-y-0">
                {timeline.map((log, idx) => {
                  const cfg     = getActionConfig(log.action);
                  const Icon    = cfg.icon;
                  const changes = log.changes ? parseChanges(log.changes as Record<string, unknown>) : [];
                  const isLast  = idx === timeline.length - 1;

                  return (
                    <div key={log.id} className={`flex gap-4 ${isLast ? '' : 'pb-6'}`}>

                      {/* Icon bubble */}
                      <div className="relative z-10 shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.iconBg}`}>
                          <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-1">
                        {/* Row 1: action label + timestamp */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">{cfg.label}</p>
                          <time className="text-xs text-gray-400 shrink-0">
                            {formatDateTime(log.createdAt)}
                          </time>
                        </div>

                        {/* Row 2: actor */}
                        {log.user && (
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.user.name}
                          </p>
                        )}

                        {/* Row 3: changes as pills / key-value */}
                        {changes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {changes.map(({ label, value }) => (
                              <div
                                key={label}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-xs"
                              >
                                <span className="text-gray-500 font-medium">{label}:</span>
                                <span className="text-gray-800 font-semibold">{value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order #{order.orderNumber}</DialogTitle>
          </DialogHeader>
          <OrderForm
            defaultValues={order}
            onSubmit={handleEdit}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Order"
        description={`Delete order #${order.orderNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
