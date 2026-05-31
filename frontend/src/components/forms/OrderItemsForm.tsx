import React, { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { articleApi } from '@/lib/api';
import type { Article } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OrderItemField {
  articleId: string;
  quantity: number;
}

export function OrderItemsForm() {
  const { control, register, setValue, formState: { errors } } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);

  const watchedItems = useWatch({ control, name: 'items' }) as OrderItemField[];

  useEffect(() => {
    const fetchArticles = async () => {
      setIsLoadingArticles(true);
      try {
        const data = await articleApi.list({ limit: 200, status: 'ACTIVE' });
        setArticles(data.data);
      } catch {
        console.error('Failed to load articles');
      } finally {
        setIsLoadingArticles(false);
      }
    };
    fetchArticles();
  }, []);

  const getArticle = (articleId: string) => articles.find(a => a.id === articleId);

  const calcCartons = (articleId: string, quantity: number): number => {
    const article = getArticle(articleId);
    if (!article || !quantity) return 0;
    return Math.ceil(quantity / article.pcsPerCarton);
  };

  const handleArticleChange = (index: number, articleId: string) => {
    setValue(`items.${index}.articleId`, articleId);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Order Items</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ articleId: '', quantity: 1 })}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      {fields.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-lg py-6 text-center">
          <p className="text-sm text-gray-400">No items added. Click "Add Item" to start.</p>
        </div>
      )}

      {fields.map((field, index) => {
        const currentItem = watchedItems?.[index];
        const selectedArticle = currentItem?.articleId ? getArticle(currentItem.articleId) : null;
        const cartons = calcCartons(currentItem?.articleId, currentItem?.quantity);

        return (
          <div key={field.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
            {/* Article Selector */}
            <div className="flex-1 space-y-1">
              <label className="text-xs text-gray-500">Article</label>
              <Select
                value={currentItem?.articleId || ''}
                onValueChange={v => handleArticleChange(index, v)}
                disabled={isLoadingArticles}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={isLoadingArticles ? 'Loading...' : 'Select article'} />
                </SelectTrigger>
                <SelectContent>
                  {articles.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="font-mono text-xs text-sky-600 mr-2">{a.articleNumber}</span>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedArticle && (
                <p className="text-xs text-gray-400">
                  {selectedArticle.pcsPerCarton} pcs/carton
                  {selectedArticle.storageTemperature && ` · ${selectedArticle.storageTemperature}`}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="w-24 space-y-1">
              <label className="text-xs text-gray-500">Quantity</label>
              <Input
                type="number"
                min={1}
                className="h-9"
                {...register(`items.${index}.quantity`, { valueAsNumber: true })}
              />
            </div>

            {/* Total Cartons */}
            <div className="w-24 space-y-1">
              <label className="text-xs text-gray-500">Cartons</label>
              <div className="h-9 flex items-center px-3 bg-white border rounded-md text-sm font-semibold text-gray-700">
                {currentItem?.articleId && currentItem?.quantity ? cartons : '-'}
              </div>
            </div>

            {/* Remove */}
            <div className="pt-5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="h-9 w-9 text-red-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}

      {fields.length > 0 && (
        <div className="flex justify-end text-sm text-gray-500">
          {fields.length} item{fields.length !== 1 ? 's' : ''}
          {watchedItems?.some(i => i.articleId && i.quantity) && (
            <span className="ml-3">
              Total cartons: {watchedItems.reduce((sum, item) => sum + calcCartons(item.articleId, item.quantity), 0)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
