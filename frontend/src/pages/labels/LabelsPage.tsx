import React, { useEffect, useState, useCallback } from 'react';
import { Printer, X, Search, FileText, Loader2 } from 'lucide-react';
import { orderApi, labelApi } from '@/lib/api';
import type { Order, LabelSize } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/common/StatusBadge';
import { formatDate, downloadBlob } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';

export function LabelsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [labelSize, setLabelSize] = useState<LabelSize>('A6');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const debouncedSearch = useDebounce(search, 400);

  const fetchOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const params: Record<string, string | number> = { page: 1, limit: 50 };
      if (debouncedSearch) params.search = debouncedSearch;
      const data = await orderApi.list(params);
      setOrders(data.data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' });
    } finally {
      setIsLoadingOrders(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchOrders();
  }, [debouncedSearch]);

  const toggleOrder = (order: Order) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(order.id)) {
      newIds.delete(order.id);
      setSelectedOrders(prev => prev.filter(o => o.id !== order.id));
    } else {
      newIds.add(order.id);
      setSelectedOrders(prev => [...prev, order]);
    }
    setSelectedIds(newIds);
  };

  const removeSelected = (orderId: string) => {
    const newIds = new Set(selectedIds);
    newIds.delete(orderId);
    setSelectedIds(newIds);
    setSelectedOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'No orders selected', description: 'Please select at least one order', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const blob = await labelApi.generate(Array.from(selectedIds), labelSize);
      downloadBlob(blob, `labels-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: 'Labels downloaded', description: `${selectedIds.size} label(s) generated`, variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate labels', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Label Printing</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Order Selector */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Search */}
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search orders..."
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Order List */}
              <div className="max-h-96 overflow-y-auto divide-y">
                {isLoadingOrders ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                      <div className="h-4 w-4 bg-gray-100 rounded animate-pulse" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-40" />
                      </div>
                    </div>
                  ))
                ) : orders.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    No orders found
                  </div>
                ) : (
                  orders.map(order => (
                    <label
                      key={order.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedIds.has(order.id) ? 'bg-sky-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleOrder(order)}
                        className="h-4 w-4 accent-sky-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sky-600 font-medium text-sm">{order.orderNumber}</span>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <p className="text-sm text-gray-700 truncate">{order.customer?.orgName}</p>
                        <p className="text-xs text-gray-400">
                          Pickup: {formatDate(order.pickupDate)} &bull; {order.items?.length || 0} items
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Configuration + Selected */}
        <div className="space-y-4">
          {/* Label Size */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Label Size</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                labelSize === 'A6' ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  value="A6"
                  checked={labelSize === 'A6'}
                  onChange={() => setLabelSize('A6')}
                  className="mt-0.5 accent-sky-500"
                />
                <div>
                  <p className="font-medium text-sm">A6</p>
                  <p className="text-xs text-gray-500">105 x 148mm standard label</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                labelSize === 'THERMAL_4X6' ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  value="THERMAL_4X6"
                  checked={labelSize === 'THERMAL_4X6'}
                  onChange={() => setLabelSize('THERMAL_4X6')}
                  className="mt-0.5 accent-sky-500"
                />
                <div>
                  <p className="font-medium text-sm">Thermal 4x6</p>
                  <p className="text-xs text-gray-500">101.6 x 152.4mm thermal label</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                labelSize === 'A4_HALF' ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  value="A4_HALF"
                  checked={labelSize === 'A4_HALF'}
                  onChange={() => setLabelSize('A4_HALF')}
                  className="mt-0.5 accent-sky-500"
                />
                <div>
                  <p className="font-medium text-sm">A4 Half-Page</p>
                  <p className="text-xs text-gray-500">210 × 148mm — 2 labels per A4 sheet</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                labelSize === 'A4_QUARTER' ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  value="A4_QUARTER"
                  checked={labelSize === 'A4_QUARTER'}
                  onChange={() => setLabelSize('A4_QUARTER')}
                  className="mt-0.5 accent-sky-500"
                />
                <div>
                  <p className="font-medium text-sm">A4 Quarter (4-up) ★</p>
                  <p className="text-xs text-gray-500">105 × 148mm — 4 labels per A4 sheet</p>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Selected Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Selected Orders
                {selectedOrders.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400">({selectedOrders.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {selectedOrders.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">
                  No orders selected
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y">
                  {selectedOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between px-4 py-2">
                      <div>
                        <p className="font-mono text-sm text-sky-600">{order.orderNumber}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{order.customer?.orgName}</p>
                      </div>
                      <button
                        onClick={() => removeSelected(order.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating || selectedIds.size === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Generate & Download PDF
              </>
            )}
          </Button>

          {/* Preview Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Label Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                <div className={`mx-auto bg-white border border-gray-300 rounded shadow-sm flex flex-col items-center justify-center ${
                  labelSize === 'A4_HALF' ? 'w-44 h-32' :
                  labelSize === 'A4_QUARTER' ? 'w-44 h-56' :
                  labelSize === 'A6' ? 'w-32 h-44' : 'w-32 h-48'
                }`}>
                  {labelSize === 'A4_QUARTER' ? (
                    <div className="grid grid-cols-2 gap-0.5 w-full h-full p-1">
                      {[0,1,2,3].map(i => (
                        <div key={i} className="border border-dashed border-gray-300 rounded flex items-center justify-center">
                          <FileText className="h-4 w-4 text-gray-300" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <FileText className="h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-xs text-gray-400 font-medium">
                        {labelSize === 'A6' ? 'A6' : labelSize === 'A4_HALF' ? 'A4 Half' : 'Thermal 4x6'}
                      </p>
                    </>
                  )}
                </div>
                <div className="mt-2">
                  {selectedOrders.length === 0 ? (
                    <p className="text-xs text-gray-400">Select orders to preview</p>
                  ) : (
                    <p className="text-xs text-gray-500 font-mono">{selectedOrders[0].orderNumber}
                      {selectedOrders.length > 1 ? ` +${selectedOrders.length - 1} more` : ''}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
