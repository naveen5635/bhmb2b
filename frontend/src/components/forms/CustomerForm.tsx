import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import type { CreateCustomerInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const customerSchema = z.object({
  customerNumber: z.string().min(1, 'Customer number is required'),
  orgName: z.string().min(1, 'Organization name is required'),
  contactPerson: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional().refine(v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: 'Invalid email address',
  }),
  taxNumber: z.string().optional(),
  notes: z.string().optional(),
});

interface CustomerFormProps {
  defaultValues?: Partial<CreateCustomerInput>;
  onSubmit: (data: CreateCustomerInput) => Promise<void>;
  isLoading?: boolean;
}

export function CustomerForm({ defaultValues, onSubmit, isLoading }: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues || {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="customerNumber">
            Customer Number <span className="text-red-500">*</span>
          </Label>
          <Input id="customerNumber" placeholder="e.g. CUST-001" {...register('customerNumber')} />
          {errors.customerNumber && <p className="text-xs text-red-600">{errors.customerNumber.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="orgName">
            Organization Name <span className="text-red-500">*</span>
          </Label>
          <Input id="orgName" placeholder="Company or organization name" {...register('orgName')} />
          {errors.orgName && <p className="text-xs text-red-600">{errors.orgName.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contactPerson">Contact Person</Label>
          <Input id="contactPerson" placeholder="Full name" {...register('contactPerson')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" placeholder="+1 234 567 8900" {...register('phone')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="contact@company.com" {...register('email')} />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input id="address" placeholder="Street address" {...register('address')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" placeholder="City" {...register('city')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input id="postalCode" placeholder="12345" {...register('postalCode')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="country">Country</Label>
          <Input id="country" placeholder="Country" {...register('country')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="taxNumber">Tax Number (USt-IdNr.)</Label>
          <Input id="taxNumber" placeholder="e.g. DE123456789" {...register('taxNumber')} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes..."
          rows={3}
          {...register('notes')}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Customer'
          )}
        </Button>
      </div>
    </form>
  );
}
