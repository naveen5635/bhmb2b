import React, { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { customerApi } from '@/lib/api';
import type { CreateOrderInput, Order, Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { OrderItemsForm } from './OrderItemsForm';

const orderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  pickupDate: z.string().optional(),
  pickupTime: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    articleId: z.string().min(1, 'Article is required'),
    quantity: z.number().int().positive('Quantity must be positive'),
  })).min(1, 'At least one item is required'),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderFormProps {
  defaultValues?: Partial<Order>;
  onSubmit: (data: CreateOrderInput) => Promise<void>;
  isLoading?: boolean;
}

export function OrderForm({ defaultValues, onSubmit, isLoading }: OrderFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');

  const methods = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: defaultValues?.customerId || '',
      pickupDate: defaultValues?.pickupDate?.slice(0, 10) || '',
      pickupTime: defaultValues?.pickupTime || '',
      notes: defaultValues?.notes || '',
      items: defaultValues?.items?.map(item => ({
        articleId: item.articleId,
        quantity: item.quantity,
      })) || [],
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = methods;
  const customerId = watch('customerId');

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoadingCustomers(true);
      try {
        const data = await customerApi.list({ limit: 200 });
        setCustomers(data.data);
      } catch {
        console.error('Failed to load customers');
      } finally {
        setIsLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c =>
    customerSearch === '' ||
    c.orgName.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.customerNumber.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === customerId);

  const handleFormSubmit = (data: OrderFormData) => {
    const payload: CreateOrderInput = {
      customerId: data.customerId,
      pickupDate: data.pickupDate || undefined,
      pickupTime: data.pickupTime || undefined,
      notes: data.notes || undefined,
      items: data.items,
    };
    return onSubmit(payload);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* Customer */}
        <div className="space-y-1.5">
          <Label>
            Customer <span className="text-red-500">*</span>
          </Label>
          <div className="space-y-2">
            <Input
              placeholder="Search customer..."
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
            />
            <Select
              value={customerId}
              onValueChange={v => setValue('customerId', v)}
              disabled={isLoadingCustomers}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingCustomers ? 'Loading customers...' : 'Select a customer'} />
              </SelectTrigger>
              <SelectContent>
                {filteredCustomers.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-gray-400">No customers found</div>
                ) : (
                  filteredCustomers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-mono text-xs text-sky-600 mr-2">{c.customerNumber}</span>
                      {c.orgName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          {errors.customerId && <p className="text-xs text-red-600">{errors.customerId.message}</p>}
          {selectedCustomer && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
              <span className="font-medium">{selectedCustomer.orgName}</span>
              {selectedCustomer.contactPerson && ` · ${selectedCustomer.contactPerson}`}
              {selectedCustomer.phone && ` · ${selectedCustomer.phone}`}
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pickupDate">Pickup Date</Label>
            <Input id="pickupDate" type="date" {...register('pickupDate')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pickupTime">Pickup Time</Label>
            <Input id="pickupTime" type="time" {...register('pickupTime')} />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Any special instructions or notes..."
            rows={2}
            {...register('notes')}
          />
        </div>

        <Separator />

        {/* Order Items */}
        <OrderItemsForm />
        {errors.items && typeof errors.items.message === 'string' && (
          <p className="text-xs text-red-600">{errors.items.message}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : defaultValues ? (
              'Update Order'
            ) : (
              'Create Order'
            )}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
