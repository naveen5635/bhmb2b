import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import type { ArticleStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Safely coerce a field to a positive number or undefined
const optionalPositiveNumber = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = parseFloat(String(v));
    return isNaN(n) || n <= 0 ? undefined : n;
  },
  z.number().positive().optional()
);

const articleSchema = z.object({
  articleNumber:      z.string().min(1, 'Article number is required'),
  name:               z.string().min(1, 'Article name is required'),
  pcsPerCarton:       z.coerce.number().int().positive('Must be a positive integer'),
  pricePerPcs:        optionalPositiveNumber,
  weight:             optionalPositiveNumber,
  storageTemperature: z.string().optional(),
  notes:              z.string().optional(),
  status:             z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

type ArticleFormData = z.infer<typeof articleSchema>;

interface ArticleFormProps {
  defaultValues?: Partial<ArticleFormData>;
  onSubmit: (data: ArticleFormData) => Promise<void>;
  isLoading?: boolean;
}

export function ArticleForm({ defaultValues, onSubmit, isLoading }: ArticleFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      status: 'ACTIVE',
      ...defaultValues,
    },
  });

  const status = watch('status');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="space-y-1.5">
          <Label htmlFor="articleNumber">
            Article Number <span className="text-red-500">*</span>
          </Label>
          <Input id="articleNumber" placeholder="e.g. ART-001" {...register('articleNumber')} />
          {errors.articleNumber && <p className="text-xs text-red-600">{errors.articleNumber.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input id="name" placeholder="Article name" {...register('name')} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pcsPerCarton">
            PCS per Carton <span className="text-red-500">*</span>
          </Label>
          <Input
            id="pcsPerCarton"
            type="number"
            min={1}
            placeholder="e.g. 24"
            {...register('pcsPerCarton')}
          />
          {errors.pcsPerCarton && <p className="text-xs text-red-600">{errors.pcsPerCarton.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pricePerPcs">
            Price per PCS (€)
            <span className="ml-1 text-gray-400 font-normal text-xs">(optional)</span>
          </Label>
          {/* text input avoids spinner arrows; inputMode triggers decimal keyboard on mobile */}
          <Input
            id="pricePerPcs"
            inputMode="decimal"
            placeholder="e.g. 2.50"
            {...register('pricePerPcs')}
          />
          {errors.pricePerPcs && <p className="text-xs text-red-600">{errors.pricePerPcs.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="weight">
            Weight per Carton (kg)
            <span className="ml-1 text-gray-400 font-normal text-xs">(optional)</span>
          </Label>
          <Input
            id="weight"
            inputMode="decimal"
            placeholder="e.g. 10.5"
            {...register('weight')}
          />
          {errors.weight && <p className="text-xs text-red-600">{errors.weight.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="storageTemperature">Storage Temperature</Label>
          <Input
            id="storageTemperature"
            placeholder="e.g. -18°C"
            {...register('storageTemperature')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status || 'ACTIVE'}
            onValueChange={v => setValue('status', v as ArticleStatus)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
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
            'Save Article'
          )}
        </Button>
      </div>
    </form>
  );
}
