import React, { useEffect, useState, useCallback, useRef } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Download, Upload, Pencil, Trash2, FileDown, CheckCircle, XCircle, Archive, Loader2 } from 'lucide-react';
import { articleApi } from '@/lib/api';
import type { Article, ArticleStatus, CreateArticleInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/common/DataTable';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { Pagination } from '@/components/common/Pagination';
import { SearchInput } from '@/components/common/SearchInput';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ArticleStatusBadge } from '@/components/common/StatusBadge';
import { ArticleForm } from '@/components/forms/ArticleForm';
import { formatDate, downloadBlob } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';

export function ArticlesPage() {
  const [articles,   setArticles]   = useState<Article[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading,  setIsLoading]  = useState(true);
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ArticleStatus>('ALL');
  const debouncedSearch = useDebounce(search, 400);

  const [dialogOpen,      setDialogOpen]      = useState(false);
  const [editingArticle,  setEditingArticle]  = useState<Article | null>(null);
  const [deleteTarget,    setDeleteTarget]    = useState<Article | null>(null);
  const [isDeleting,      setIsDeleting]      = useState(false);
  const [isExporting,     setIsExporting]     = useState(false);
  const [isImporting,     setIsImporting]     = useState(false);
  const [importResult,    setImportResult]    = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Bulk selection ──────────────────────────────────────────────────────────
  const [selected,          setSelected]          = useState<Article[]>([]);
  const [bulkDeleteOpen,    setBulkDeleteOpen]    = useState(false);
  const [isBulkProcessing,  setIsBulkProcessing]  = useState(false);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchArticles = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: pagination.limit };
      if (debouncedSearch)      params.search = debouncedSearch;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const data = await articleApi.list(params);
      setArticles(data.data);
      setPagination(p => ({ ...p, ...data.pagination }));
    } catch {
      toast({ title: 'Error', description: 'Failed to load articles', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, pagination.limit]);

  useEffect(() => { fetchArticles(1); }, [debouncedSearch, statusFilter]);

  // ── Single CRUD ─────────────────────────────────────────────────────────────
  const handleSubmit = async (data: CreateArticleInput) => {
    setIsSubmitting(true);
    try {
      if (editingArticle) {
        await articleApi.update(editingArticle.id, data);
        toast({ title: 'Article updated', variant: 'success' });
      } else {
        await articleApi.create(data);
        toast({ title: 'Article created', variant: 'success' });
      }
      setDialogOpen(false);
      setEditingArticle(null);
      fetchArticles(pagination.page);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to save', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await articleApi.delete(deleteTarget.id);
      toast({ title: 'Article deleted', variant: 'success' });
      setDeleteTarget(null);
      fetchArticles(pagination.page);
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (article: Article) => {
    const newStatus: ArticleStatus = article.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await articleApi.update(article.id, { status: newStatus });
      toast({ title: `Article ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`, variant: 'success' });
      fetchArticles(pagination.page);
    } catch {
      toast({ title: 'Error updating status', variant: 'destructive' });
    }
  };

  // ── Bulk actions ─────────────────────────────────────────────────────────────
  const runBulkAction = async (action: (id: string) => Promise<void>, label: string) => {
    setIsBulkProcessing(true);
    let ok = 0, fail = 0;
    for (const a of selected) {
      try { await action(a.id); ok++; }
      catch { fail++; }
    }
    setIsBulkProcessing(false);
    setBulkDeleteOpen(false);
    setSelected([]);
    toast({
      title: fail === 0 ? `${ok} article(s) ${label}` : `${ok} ${label}, ${fail} failed`,
      variant: fail === 0 ? 'success' : 'destructive',
    });
    fetchArticles(1);
  };

  const handleBulkSetActive   = () => runBulkAction(
    id => articleApi.update(id, { status: 'ACTIVE' }).then(() => {}),   'set to Active'
  );
  const handleBulkSetInactive = () => runBulkAction(
    id => articleApi.update(id, { status: 'INACTIVE' }).then(() => {}), 'set to Inactive'
  );
  const handleBulkDelete      = () => runBulkAction(
    id => articleApi.delete(id).then(() => {}),                         'deleted'
  );

  // ── Import / Export ─────────────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const rows = [
      'articleNumber,name,pcsPerCarton,pricePerPcs,weight,storageTemperature,notes,status',
      'ART-001,Weckchen 60g,50,0.35,3.0,-18°C,Individually wrapped,ACTIVE',
      'ART-002,Roggenbrot 500g,12,1.80,6.0,-18°C,,ACTIVE',
      'ART-003,Brezeln tiefgekühlt,24,0.65,4.8,-18°C,Pre-baked,ACTIVE',
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'articles_import_template.csv');
    toast({ title: 'Template downloaded', variant: 'success' });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const result: any = await articleApi.importCSV(file);
      const summary = {
        created: result.created ?? 0,
        updated: result.updated ?? 0,
        skipped: result.skipped ?? 0,
        errors:  result.errors  ?? [],
      };
      setImportResult(summary);
      toast({
        title: 'Import complete',
        description: `${summary.created} created · ${summary.updated} updated · ${summary.skipped} skipped`,
        variant: 'success',
      });
      fetchArticles(1);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Check CSV format and try again';
      toast({ title: 'Import failed', description: msg, variant: 'destructive' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await articleApi.exportCSV();
      downloadBlob(blob, `articles-${new Date().toISOString().slice(0, 10)}.csv`);
      toast({ title: 'Export ready', variant: 'success' });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Columns ─────────────────────────────────────────────────────────────────
  const columns: ColumnDef<Article, any>[] = [
    {
      accessorKey: 'articleNumber',
      header: 'Article #',
      cell: ({ getValue }) => (
        <span className="font-semibold text-gray-800 dark:text-gray-100">{getValue()}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ getValue }) => <span className="font-medium text-gray-700 dark:text-gray-200">{getValue()}</span>,
    },
    { accessorKey: 'pcsPerCarton', header: 'PCS/Carton' },
    {
      accessorKey: 'pricePerPcs',
      header: 'Price/PCS',
      cell: ({ getValue }) => getValue() != null ? `€ ${(getValue() as number).toFixed(2)}` : '-',
    },
    {
      accessorKey: 'weight',
      header: 'Weight (kg)',
      cell: ({ getValue }) => getValue() ? `${getValue()} kg` : '-',
    },
    {
      accessorKey: 'storageTemperature',
      header: 'Temp.',
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <button onClick={() => handleToggleStatus(row.original)} title="Click to toggle">
          <ArticleStatusBadge status={row.original.status} />
        </button>
      ),
    },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="Edit"
            onClick={() => { setEditingArticle(row.original); setDialogOpen(true); }}>
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Articles</h1>
        <Button onClick={() => { setEditingArticle(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Article
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search articles..." />
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'ALL' | ArticleStatus)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" onClick={handleDownloadTemplate} title="Download CSV template">
            <FileDown className="h-4 w-4 mr-2" />
            CSV Template
          </Button>
          <Button
            variant="outline"
            onClick={() => !isImporting && fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</>
              : <><Upload className="h-4 w-4 mr-2" />Import CSV</>
            }
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Import in-progress overlay */}
      {isImporting && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700 animate-fade-in">
          <Loader2 className="h-5 w-5 text-sky-500 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">Uploading and processing CSV…</p>
            <p className="text-xs text-sky-600 dark:text-sky-400">Please wait, do not close this page.</p>
          </div>
        </div>
      )}

      {/* Import result summary */}
      {importResult && !isImporting && (
        <div className="px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">Import complete</p>
            <button onClick={() => setImportResult(null)} className="text-green-500 hover:text-green-700 text-xs">✕ dismiss</button>
          </div>
          <div className="flex gap-4 mt-1">
            <span className="text-xs text-green-700 dark:text-green-300">✓ {importResult.created} created</span>
            <span className="text-xs text-blue-700 dark:text-blue-300">↺ {importResult.updated} updated</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">⊘ {importResult.skipped} skipped</span>
          </div>
          {importResult.errors.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer">{importResult.errors.length} row(s) had issues — click to expand</summary>
              <ul className="mt-1 space-y-0.5">
                {importResult.errors.slice(0, 10).map((e, i) => (
                  <li key={i} className="text-xs text-red-500 font-mono">{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      <BulkActionBar count={selected.length} onClear={() => setSelected([])}>
        <Button
          size="sm" variant="outline"
          className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50"
          disabled={isBulkProcessing}
          onClick={handleBulkSetActive}
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Set Active
        </Button>
        <Button
          size="sm" variant="outline"
          className="h-8 text-xs border-gray-300 text-gray-600 hover:bg-gray-50"
          disabled={isBulkProcessing}
          onClick={handleBulkSetInactive}
        >
          <XCircle className="h-3.5 w-3.5 mr-1.5" />
          Set Inactive
        </Button>
        <Button
          size="sm" variant="outline"
          className="h-8 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
          disabled={isBulkProcessing}
          onClick={handleBulkSetInactive}
          title="Archive hides the article without deleting it"
        >
          <Archive className="h-3.5 w-3.5 mr-1.5" />
          Archive
        </Button>
        <div className="w-px h-4 bg-sky-200 mx-1" />
        <Button
          size="sm" variant="destructive"
          className="h-8 text-xs"
          disabled={isBulkProcessing}
          onClick={() => setBulkDeleteOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete {selected.length}
        </Button>
      </BulkActionBar>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
        <DataTable
          data={articles}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No articles found"
          enableSelection
          onSelectionChange={setSelected}
        />
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={fetchArticles}
        />
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setEditingArticle(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle ? 'Edit Article' : 'Add Article'}</DialogTitle>
          </DialogHeader>
          <ArticleForm
            defaultValues={editingArticle ?? undefined}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Single delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Delete Article"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />

      {/* Bulk delete */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selected.length} Article(s)?`}
        description={`You are about to permanently delete ${selected.length} selected article(s). This cannot be undone.`}
        confirmLabel={isBulkProcessing ? 'Deleting…' : `Delete ${selected.length} Article(s)`}
        variant="destructive"
        onConfirm={handleBulkDelete}
        isLoading={isBulkProcessing}
      />
    </div>
  );
}
