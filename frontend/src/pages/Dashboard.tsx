import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  ShoppingCart, Users, Package, Clock,
  TrendingUp, CalendarDays, Filter, X,
} from 'lucide-react';
import { dashboardApi, orderApi, customerApi, articleApi } from '@/lib/api';
import type { DashboardStats, DashboardCharts, Order, Customer, Article } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderStatusBadge } from '@/components/common/StatusBadge';
import { formatDate } from '@/lib/utils';
import { subDays, format } from 'date-fns';

const PIE_COLORS = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#ef4444'];

type DateRange = '7d' | '30d' | '90d' | 'custom';

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  title, value, icon: Icon, color, isLoading,
}: {
  title: string; value: number; icon: React.ElementType; color: string; isLoading: boolean;
}) {
  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            {isLoading
              ? <Skeleton className="h-8 w-16 mt-1" />
              : <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value.toLocaleString()}</p>
            }
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Custom Pie label (outside, clean) ────────────────────────────────────────
function PieLegendTable({ data }: { data: { name: string; totalQuantity: number }[] }) {
  const total = data.reduce((s, d) => s + d.totalQuantity, 0);
  return (
    <div className="space-y-1.5 mt-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
          <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{d.name}</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">{d.totalQuantity}</span>
          <span className="text-gray-400 tabular-nums w-8 text-right">
            {total > 0 ? `${Math.round((d.totalQuantity / total) * 100)}%` : '0%'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate();

  const [stats,          setStats]          = useState<DashboardStats | null>(null);
  const [charts,         setCharts]         = useState<DashboardCharts | null>(null);
  const [upcomingOrders, setUpcomingOrders] = useState<Order[]>([]);
  const [customers,      setCustomers]      = useState<Customer[]>([]);
  const [articles,       setArticles]       = useState<Article[]>([]);

  const [isLoadingStats,  setIsLoadingStats]  = useState(true);
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);

  // ── Filters ──
  const [dateRange,    setDateRange]    = useState<DateRange>('30d');
  const [customStart,  setCustomStart]  = useState('');
  const [customEnd,    setCustomEnd]    = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterArticle,  setFilterArticle]  = useState('');
  const [showFilters,  setShowFilters]  = useState(false);

  // Resolve date range to ISO strings
  const getDateRange = useCallback(() => {
    if (dateRange === 'custom') {
      return { startDate: customStart, endDate: customEnd };
    }
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    return {
      startDate: format(subDays(new Date(), days), 'yyyy-MM-dd'),
      endDate:   format(new Date(), 'yyyy-MM-dd'),
    };
  }, [dateRange, customStart, customEnd]);

  const hasActiveFilters = filterCustomer || filterArticle || dateRange !== '30d';

  const clearFilters = () => {
    setDateRange('30d');
    setCustomStart('');
    setCustomEnd('');
    setFilterCustomer('');
    setFilterArticle('');
  };

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try { setStats(await dashboardApi.getStats()); }
    catch { /* silent */ }
    finally { setIsLoadingStats(false); }
  }, []);

  const fetchCharts = useCallback(async () => {
    setIsLoadingCharts(true);
    const { startDate, endDate } = getDateRange();
    try {
      const params: Record<string, string> = {};
      if (startDate)       params.startDate   = startDate;
      if (endDate)         params.endDate     = endDate;
      if (filterCustomer)  params.customerId  = filterCustomer;
      if (filterArticle)   params.articleId   = filterArticle;
      setCharts(await dashboardApi.getCharts(params));
    } catch { /* silent */ }
    finally { setIsLoadingCharts(false); }
  }, [getDateRange, filterCustomer, filterArticle]);

  const fetchUpcoming = useCallback(async () => {
    try {
      const data = await orderApi.list({ limit: 10, page: 1, status: 'PENDING,CONFIRMED,PREPARING,READY_FOR_PICKUP' });
      setUpcomingOrders(data.data.filter(o => o.pickupDate));
    } catch { /* silent */ }
  }, []);

  // Load customers + articles for filter dropdowns
  useEffect(() => {
    customerApi.list({ limit: 100 }).then(r => setCustomers(r.data)).catch(() => {});
    articleApi.list({ limit: 100 }).then(r => setArticles(r.data)).catch(() => {});
    fetchStats();
    fetchUpcoming();
  }, []);

  useEffect(() => { fetchCharts(); }, [fetchCharts]);

  // ── Stat cards config ────────────────────────────────────────────────────
  const statCards = [
    { title: 'Total Orders',      value: stats?.totalOrders    ?? 0, icon: ShoppingCart, color: 'bg-sky-500'     },
    { title: 'Orders Today',      value: stats?.ordersToday    ?? 0, icon: TrendingUp,   color: 'bg-indigo-500'  },
    { title: 'Upcoming Pickups',  value: stats?.upcomingPickups?? 0, icon: CalendarDays, color: 'bg-purple-500'  },
    { title: 'Pending Orders',    value: stats?.pendingOrders  ?? 0, icon: Clock,        color: 'bg-yellow-500'  },
    { title: 'Total Customers',   value: stats?.totalCustomers ?? 0, icon: Users,        color: 'bg-emerald-500' },
    { title: 'Total Articles',    value: stats?.totalArticles  ?? 0, icon: Package,      color: 'bg-orange-500'  },
  ];

  const pieData = (charts?.mostOrderedArticles || []).slice(0, 5);

  return (
    <div className="space-y-5">

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map(card => (
          <StatCard key={card.title} {...card} isLoading={isLoadingStats} />
        ))}
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-3">

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-sky-500 text-white text-xs font-medium">!</span>
              )}
            </button>

            {/* Date range presets */}
            <div className="flex items-center gap-1">
              {(['7d', '30d', '90d'] as DateRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === r
                      ? 'bg-sky-500 text-white'
                      : 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            )}
          </div>

          {/* Expanded filter row */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">

              {/* Customer filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Customer</label>
                <select
                  value={filterCustomer}
                  onChange={e => setFilterCustomer(e.target.value)}
                  className="h-9 px-2 pr-8 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">All Customers</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>[{c.customerNumber}] {c.orgName}</option>
                  ))}
                </select>
              </div>

              {/* Article filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Article</label>
                <select
                  value={filterArticle}
                  onChange={e => setFilterArticle(e.target.value)}
                  className="h-9 px-2 pr-8 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">All Articles</option>
                  {articles.map(a => (
                    <option key={a.id} value={a.id}>[{a.articleNumber}] {a.name}</option>
                  ))}
                </select>
              </div>

              {/* Custom date range */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Date From</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => { setCustomStart(e.target.value); setDateRange('custom'); }}
                  className="h-9 px-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Date To</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => { setCustomEnd(e.target.value); setDateRange('custom'); }}
                  className="h-9 px-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Charts row 1 ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Orders Per Day */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">Orders Per Day</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCharts ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={charts?.ordersPerDay || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => formatDate(d, 'dd/MM')} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                  <Tooltip labelFormatter={d => formatDate(d as string, 'dd MMM yyyy')} formatter={(v: number) => [v, 'Orders']} />
                  <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">Top Customers by Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCharts ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={(charts?.ordersByCustomer || []).slice(0, 8)} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="customerNumber" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                  <Tooltip
                    formatter={(v: number) => [v, 'Orders']}
                    labelFormatter={label => charts?.ordersByCustomer?.find(c => c.customerNumber === label)?.orgName || label}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts row 2 ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Most Ordered Articles — donut + side legend */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">Most Ordered Articles (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCharts ? <Skeleton className="h-52 w-full" /> : pieData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-gray-400">No data</div>
            ) : (
              <div className="flex items-center gap-4">
                {/* Donut */}
                <div className="shrink-0">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="totalQuantity"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, 'Qty']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend table */}
                <div className="flex-1 min-w-0">
                  <PieLegendTable data={pieData} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pickup Trends */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">Pickup Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCharts ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={charts?.pickupTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => formatDate(d, 'dd/MM')} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                  <Tooltip labelFormatter={d => formatDate(d as string, 'dd MMM yyyy')} formatter={(v: number) => [v, 'Pickups']} />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Upcoming Pickups table ──────────────────────────────────────────── */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Upcoming Pickups
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {upcomingOrders.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No upcoming pickups scheduled</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-t border-b dark:border-gray-700">
                  <tr>
                    {['Order #', 'Customer', 'Pickup Date', 'Time', 'Status', 'Items'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {upcomingOrders.map(order => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-sky-600 text-xs">{order.orderNumber}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{order.customer?.orgName}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatDate(order.pickupDate)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{order.pickupTime || '-'}</td>
                      <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{order.items?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
