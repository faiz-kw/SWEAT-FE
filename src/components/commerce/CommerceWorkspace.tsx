import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  CreditCard,
  Receipt,
  RotateCcw,
  Search,
  RefreshCw,
  CheckCircle2,
  FileText,
  TrendingUp,
  Banknote,
  Clock,
  Calendar,
  Users,
  ShieldCheck,
  AlertCircle,
  Building2,
  DollarSign,
  ArrowUpRight,
  Info,
  Link,
} from 'lucide-react';
import { commerceApi } from '@/api/endpoints/commerceApi';
import { crmApi } from '@/api/endpoints/crmApi';
import {
  Order,
  PaymentTransaction,
  PaymentProvider,
  MemberInvoice,
  Refund,
} from '../../types/commerce';
import { PageHeader, PageBody, KpiTile } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { usePermissions } from '../../lib/permissions';
import { toast } from 'sonner';

export type FinanceTab =
  | 'orders'
  | 'invoices'
  | 'payments'
  | 'outstanding'
  | 'revenue'
  | 'refunds'
  | 'expenses';

interface CommerceWorkspaceProps {
  initialTab?: FinanceTab;
}

export const CommerceWorkspace: React.FC<CommerceWorkspaceProps> = ({ initialTab = 'orders' }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canRecordPayment = can('finance.payments.create') || can('finance.pricing.create') || can('core.settings.edit');
  const canRefund = can('finance.refunds.create') || can('core.settings.edit');

  const [activeTab, setActiveTab] = useState<FinanceTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentSubView, setPaymentSubView] = useState<'all' | 'cash_report'>('all');
  const [cashReportDate, setCashReportDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabClick = (tab: FinanceTab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedProvider('all');
    const targetRoute = `/finance/${tab}`;
    navigate({ to: targetRoute as any }).catch(() => {});
  };

  // Modals
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<PaymentTransaction | null>(null);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('CASH');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');

  // Refund form state
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');

  // Branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => crmApi.getBranches(),
  });

  // Queries
  const {
    data: summary,
    isLoading: loadingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['commerce-summary', selectedBranch],
    queryFn: () => commerceApi.getSummary(selectedBranch === 'all' ? undefined : selectedBranch),
  });

  const {
    data: orders = [],
    isLoading: loadingOrders,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['orders', selectedBranch],
    queryFn: () => commerceApi.getOrders(selectedBranch === 'all' ? undefined : { branch_id: selectedBranch }),
  });

  const {
    data: invoices = [],
    isLoading: loadingInvoices,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['invoices', selectedBranch],
    queryFn: () => commerceApi.getInvoices(selectedBranch === 'all' ? undefined : { branch_id: selectedBranch }),
  });

  const {
    data: transactions = [],
    isLoading: loadingTransactions,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ['transactions', selectedBranch],
    queryFn: () => commerceApi.getTransactions(selectedBranch === 'all' ? undefined : { branch_id: selectedBranch }),
  });

  const {
    data: refunds = [],
    isLoading: loadingRefunds,
    refetch: refetchRefunds,
  } = useQuery({
    queryKey: ['refunds', selectedBranch],
    queryFn: () => commerceApi.getRefunds(selectedBranch === 'all' ? undefined : { branch_id: selectedBranch }),
  });

  const {
    data: cashReport,
    isLoading: loadingCashReport,
    refetch: refetchCashReport,
  } = useQuery({
    queryKey: ['cash-report', selectedBranch, cashReportDate],
    queryFn: () => commerceApi.getCashReport({
      branch_id: selectedBranch === 'all' ? undefined : selectedBranch,
      date: cashReportDate || undefined,
    }),
    enabled: activeTab === 'payments',
  });

  const handleRefreshAll = () => {
    refetchSummary();
    refetchOrders();
    refetchInvoices();
    refetchTransactions();
    refetchRefunds();
    refetchCashReport();
    toast.success('Finance records refreshed from backend');
  };

  // Mutations
  const recordPaymentMutation = useMutation({
    mutationFn: ({
      orderId,
      amount,
      provider,
      method,
    }: {
      orderId: string;
      amount: string;
      provider: PaymentProvider;
      method: string;
    }) =>
      commerceApi.recordPayment(orderId, {
        amount,
        provider,
        payment_method: method,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['commerce-summary'] });
      setIsRecordPaymentOpen(false);
      setSelectedOrder(null);
      setPaymentAmount('');
      toast.success('Payment recorded successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to record payment');
    },
  });

  const refundMutation = useMutation({
    mutationFn: ({
      txnId,
      amount,
      reason,
    }: {
      txnId: string;
      amount: string;
      reason: string;
    }) => commerceApi.processRefund(txnId, { amount, reason_text: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['commerce-summary'] });
      setIsRefundOpen(false);
      setSelectedTxn(null);
      setRefundAmount('');
      setRefundReason('');
      toast.success('Refund processed successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to process refund');
    },
  });

  const createPaymentLinkMutation = useMutation({
    mutationFn: (orderId: string) => commerceApi.createPaymentLink(orderId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (data?.payment_url) {
        navigator.clipboard.writeText(data.payment_url);
        toast.success('Payment link copied to clipboard!');
      } else {
        toast.success('Payment link created');
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to generate payment link');
    },
  });
  // Filtered lists
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const term = searchTerm.toLowerCase();
      const num = o.order_number.toLowerCase();
      const customer = (o.member_name || o.lead_name || '').toLowerCase();
      const item = (o.item_summary || '').toLowerCase();
      const matchesSearch = num.includes(term) || customer.includes(term) || item.includes(term);
      const matchesStatus = selectedStatus === 'all' || o.status === selectedStatus;
      const matchesBranch = selectedBranch === 'all' || o.branch === selectedBranch;
      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [orders, searchTerm, selectedStatus, selectedBranch]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const term = searchTerm.toLowerCase();
      const num = inv.invoice_number.toLowerCase();
      const orderNum = (inv.order_number || '').toLowerCase();
      const customer = (inv.member_name || '').toLowerCase();
      const matchesSearch = num.includes(term) || customer.includes(term) || orderNum.includes(term);
      const matchesStatus = selectedStatus === 'all' || inv.status === selectedStatus;
      const matchesBranch = selectedBranch === 'all' || inv.branch === selectedBranch;
      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [invoices, searchTerm, selectedStatus, selectedBranch]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const term = searchTerm.toLowerCase();
      const ref = (t.provider_transaction_id || t.id || '').toLowerCase();
      const orderNum = (t.order_number || '').toLowerCase();
      const customer = (t.member_name || '').toLowerCase();
      const matchesSearch = ref.includes(term) || orderNum.includes(term) || customer.includes(term);
      const matchesProvider = selectedProvider === 'all' || t.provider?.toUpperCase() === selectedProvider.toUpperCase();
      const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
      const matchesBranch = selectedBranch === 'all' || (t as any).branch_id === selectedBranch;
      return matchesSearch && matchesProvider && matchesStatus && matchesBranch;
    });
  }, [transactions, searchTerm, selectedProvider, selectedStatus, selectedBranch]);

  const filteredRefunds = useMemo(() => {
    return refunds.filter((r) => {
      const term = searchTerm.toLowerCase();
      const ref = (r.provider_reference || r.id || '').toLowerCase();
      const orderNum = (r.order_number || '').toLowerCase();
      const customer = (r.member_name || '').toLowerCase();
      const reason = (r.reason_text || '').toLowerCase();
      const matchesSearch = ref.includes(term) || orderNum.includes(term) || customer.includes(term) || reason.includes(term);
      const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [refunds, searchTerm, selectedStatus]);

  // Outstanding orders: unpaid or partially paid orders where outstanding balance > 0
  const outstandingOrders = useMemo(() => {
    return orders.filter((o) => {
      const isUnsettled = o.status === 'PENDING_PAYMENT' || o.status === 'PARTIALLY_PAID';
      const balance = parseFloat(o.outstanding_balance || String(o.total_amount || '0'));
      const hasBalance = balance > 0;
      const term = searchTerm.toLowerCase();
      const num = o.order_number.toLowerCase();
      const customer = (o.member_name || o.lead_name || '').toLowerCase();
      const matchesSearch = num.includes(term) || customer.includes(term);
      const matchesStatus = selectedStatus === 'all' || o.status === selectedStatus;
      const matchesBranch = selectedBranch === 'all' || o.branch === selectedBranch;
      return isUnsettled && hasBalance && matchesSearch && matchesStatus && matchesBranch;
    });
  }, [orders, searchTerm, selectedStatus, selectedBranch]);

  // Backend authoritative or computed KPIs
  const totalOrdersCount = summary?.total_orders ?? orders.length;
  const settledOrdersCount = summary?.settled_orders ?? orders.filter((o) => o.status === 'PAID').length;
  const pendingOrdersCount = summary?.pending_orders ?? orders.filter((o) => o.status === 'PENDING_PAYMENT' || o.status === 'PARTIALLY_PAID').length;
  const totalSettledAmount = summary
    ? parseFloat(summary.total_settled_amount || '0')
    : transactions
        .filter((t) => t.status === 'SUCCESS')
        .reduce((acc, t) => acc + parseFloat(String(t.amount || '0')), 0);

  const totalOutstandingAmount = summary
    ? parseFloat(summary.total_outstanding_amount || '0')
    : outstandingOrders.reduce((acc, o) => acc + parseFloat(o.outstanding_balance || String(o.total_amount || '0')), 0);

  const grossRevenue = summary ? parseFloat(summary.gross_revenue || '0') : totalSettledAmount;
  const refundedAmount = summary ? parseFloat(summary.refunded_amount || '0') : refunds.filter((r) => r.status === 'SUCCESS').reduce((acc, r) => acc + parseFloat(String(r.amount || '0')), 0);
  const netRevenue = summary ? parseFloat(summary.net_revenue || '0') : Math.max(0, grossRevenue - refundedAmount);
  const cashCollected = summary ? parseFloat(summary.cash_collected || '0') : transactions.filter((t) => t.status === 'SUCCESS' && t.provider === 'CASH').reduce((acc, t) => acc + parseFloat(String(t.amount || '0')), 0);
  const onlineCollected = summary ? parseFloat(summary.online_collected || '0') : transactions.filter((t) => t.status === 'SUCCESS' && t.provider !== 'CASH').reduce((acc, t) => acc + parseFloat(String(t.amount || '0')), 0);
  const pendingCashAmount = summary ? parseFloat(summary.pending_approval_cash_amount || '0') : transactions.filter((t) => t.status === 'PENDING' && t.provider === 'CASH').reduce((acc, t) => acc + parseFloat(String(t.amount || '0')), 0);

  const openRecordPaymentModal = (order: Order) => {
    setSelectedOrder(order);
    const balance = order.outstanding_balance || String(order.total_amount || '');
    setPaymentAmount(balance);
    setPaymentProvider('CASH');
    setPaymentMethod('CASH');
    setIsRecordPaymentOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Platform Header */}
      <PageHeader
        title="Finance & Payments Command Center"
        subtitle="Authoritative sales orders, verified payment transactions, tax-compliant invoicing, and commercial dues."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-md">
              Finance Architecture
            </span>
            <span className="text-muted-foreground text-xs">
              <span className="font-semibold text-foreground">{totalOrdersCount}</span> total orders
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {branches.length > 0 && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="h-8 text-xs bg-card border border-border rounded-lg px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Studio Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              title="Refresh"
              className="gap-1.5 h-8 text-xs"
            >
              <RefreshCw className="size-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* Authoritative KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
          <KpiTile label="Total Orders" value={totalOrdersCount} hint="Commercial transactions" />
          <KpiTile label="Settled Orders" value={settledOrdersCount} hint="100% paid orders" tone="positive" />
          <KpiTile label="Pending Payment" value={pendingOrdersCount} hint="Unpaid or partial dues" tone="warning" />
          <KpiTile
            label="Total Settled"
            value={`₹${totalSettledAmount.toLocaleString('en-IN')}`}
            hint="Approved collections"
            tone="positive"
          />
          <KpiTile
            label="Total Outstanding"
            value={`₹${totalOutstandingAmount.toLocaleString('en-IN')}`}
            hint="Remaining dues"
            tone="destructive"
          />
        </div>

        {/* Navigation Tabs - Synchronized to URL Route */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border pb-2 mb-4 overflow-x-auto scrollbar-thin">
          {[
            { id: 'invoices', label: 'Invoices & Tax Slips', count: invoices.length, icon: Receipt },
            { id: 'payments', label: 'Payment Transactions', count: transactions.length, icon: CreditCard },
            { id: 'orders', label: 'Orders & Checkout', count: orders.length, icon: FileText },
            { id: 'outstanding', label: 'Outstanding Dues', count: outstandingOrders.length, icon: Clock },
            { id: 'revenue', label: 'Revenue Analytics', icon: TrendingUp },
            { id: 'refunds', label: 'Refunds', count: refunds.length, icon: RotateCcw },
            { id: 'expenses', label: 'Studio Expenses', icon: DollarSign },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as FinanceTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: INVOICES & TAX SLIPS */}
        {activeTab === 'invoices' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search invoices by number, member, or order..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-card text-xs"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-9 text-xs bg-card border border-border rounded-lg px-2.5 text-foreground"
              >
                <option value="all">All Invoice Statuses</option>
                <option value="PAID">Paid</option>
                <option value="ISSUED">Issued</option>
                <option value="VOID">Void</option>
              </select>
            </div>

            {loadingInvoices ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading authoritative invoices...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Receipt className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Invoices Found</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Tax-compliant member invoices issued upon completed full payments will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-mono font-bold text-primary">{inv.invoice_number}</span>
                          <h3 className="text-base font-semibold text-foreground mt-1">
                            {inv.member_name || 'Member Customer'}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            Order: {inv.order_number || inv.order.substring(0, 8)}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Branch</span>
                          <span className="font-medium text-foreground">{inv.branch_name || 'Studio'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Issued Date</span>
                          <span className="font-medium text-foreground">
                            {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString('en-IN') : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Tax / GST</span>
                          <span className="font-medium text-foreground">₹{parseFloat(String(inv.tax_amount || '0')).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Total Amount</span>
                          <span className="font-bold text-primary text-sm">₹{parseFloat(String(inv.total_amount || '0')).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">GST Tax Snapshot</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="size-3.5" /> Immutable
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PAYMENT TRANSACTIONS */}
        {activeTab === 'payments' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* View Sub-Toggle */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentSubView('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    paymentSubView === 'all'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Transactions ({transactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentSubView('cash_report')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    paymentSubView === 'cash_report'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Banknote className="size-3.5" />
                  <span>Daily Cash Collection Report</span>
                </button>
              </div>
              {paymentSubView === 'cash_report' && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Calendar className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      value={cashReportDate}
                      onChange={(e) => setCashReportDate(e.target.value)}
                      className="pl-8 h-8 text-xs bg-card border-border w-36"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchCashReport()}
                    className="h-8 text-xs gap-1"
                  >
                    <RefreshCw className="size-3" />
                    <span>Refresh</span>
                  </Button>
                </div>
              )}
            </div>

            {paymentSubView === 'cash_report' ? (
              /* CASH COLLECTION REPORT VIEW */
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Header Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-card border border-border rounded-xl p-3.5 sm:p-4">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Physical Cash Recorded</span>
                    <span className="text-xl sm:text-2xl font-bold text-foreground mt-1 block">
                      ₹{parseFloat(cashReport?.total_physical_cash_recorded || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">Includes pending verification</span>
                  </div>
                  <div className="bg-card border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-3.5 sm:p-4">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Approved / Settled Cash</span>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                      ₹{parseFloat(cashReport?.approved_cash || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-emerald-600/80 mt-0.5 block">Recognized revenue</span>
                  </div>
                  <div className="bg-card border border-amber-500/20 bg-amber-500/5 rounded-xl p-3.5 sm:p-4">
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Pending Approval</span>
                    <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                      ₹{parseFloat(cashReport?.pending_approval_cash || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-amber-600/80 mt-0.5 block">Requires manager review</span>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3.5 sm:p-4">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Rejected Cash</span>
                    <span className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
                      ₹{parseFloat(cashReport?.rejected_cash || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">{cashReport?.total_transactions || 0} total cash txn(s)</span>
                  </div>
                </div>

                {/* Agent-Wise Breakdown Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-primary" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Agent-wise Cash Collection — {cashReport?.branch_name || 'All Branches'} ({cashReport?.date || cashReportDate})
                      </h4>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/30 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Receiving Agent / Staff</th>
                          <th className="px-4 py-2.5 font-semibold">Transactions</th>
                          <th className="px-4 py-2.5 font-semibold">Physical Cash</th>
                          <th className="px-4 py-2.5 font-semibold">Approved (Settled)</th>
                          <th className="px-4 py-2.5 font-semibold">Pending Approval</th>
                          <th className="px-4 py-2.5 font-semibold">Rejected</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(cashReport?.agent_collections || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                              No cash collections recorded for this branch on {cashReportDate}.
                            </td>
                          </tr>
                        ) : (
                          (cashReport?.agent_collections || []).map((ag) => (
                            <tr key={ag.agent_id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-semibold text-foreground">{ag.agent_name}</td>
                              <td className="px-4 py-3 font-mono">{ag.count}</td>
                              <td className="px-4 py-3 font-bold text-foreground">
                                ₹{parseFloat(ag.physical_cash).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                                ₹{parseFloat(ag.approved_cash).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 font-semibold text-amber-600 dark:text-amber-400">
                                ₹{parseFloat(ag.pending_cash).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 font-medium text-rose-600 dark:text-rose-400">
                                ₹{parseFloat(ag.rejected_cash).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Individual Cash Transactions Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="size-4 text-amber-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Cash Transactions Ledger ({cashReport?.transactions?.length || 0})
                      </h4>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/30 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Txn Reference</th>
                          <th className="px-4 py-2.5 font-semibold">Order #</th>
                          <th className="px-4 py-2.5 font-semibold">Customer / Lead</th>
                          <th className="px-4 py-2.5 font-semibold">Amount</th>
                          <th className="px-4 py-2.5 font-semibold">Status</th>
                          <th className="px-4 py-2.5 font-semibold">Receiving Agent</th>
                          <th className="px-4 py-2.5 font-semibold">Date / Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(cashReport?.transactions || []).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                              No individual cash transactions found.
                            </td>
                          </tr>
                        ) : (
                          (cashReport?.transactions || []).map((t) => {
                            const isPending = t.status === 'PENDING';
                            const isApproved = t.status === 'SUCCESS';
                            return (
                              <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                                  {t.provider_transaction_id || t.id.substring(0, 8)}
                                </td>
                                <td className="px-4 py-3 font-mono font-semibold text-foreground">
                                  {t.order_number || t.order}
                                </td>
                                <td className="px-4 py-3 font-medium text-foreground">
                                  {t.member_name || 'Customer'}
                                </td>
                                <td className="px-4 py-3 font-bold text-foreground">
                                  ₹{parseFloat(String(t.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      isApproved
                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                        : isPending
                                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                        : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                    }`}
                                  >
                                    {isPending ? 'PENDING APPROVAL' : t.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {t.recorded_by_name || 'Staff'}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                                  {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* ALL TRANSACTIONS VIEW */
              <>
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search payments by ref, order #, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-card text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="h-9 text-xs bg-card border border-border rounded-lg px-2.5 text-foreground"
                >
                  <option value="all">All Providers</option>
                  <option value="CASH">CASH</option>
                  <option value="RAZORPAY">RAZORPAY</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-9 text-xs bg-card border border-border rounded-lg px-2.5 text-foreground"
                >
                  <option value="all">All Statuses</option>
                  <option value="SUCCESS">Success</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
            </div>

            {loadingTransactions ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading payment transactions...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Payment Transactions Recorded</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Cash collections and online Razorpay transactions will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTransactions.map((txn) => {
                  const isCash = txn.provider?.toUpperCase() === 'CASH';
                  const isPendingApproval = isCash && txn.status === 'PENDING';
                  return (
                    <div
                      key={txn.id}
                      className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              {isCash ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  <Banknote className="size-3" /> CASH
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                  <CreditCard className="size-3" /> RAZORPAY
                                </span>
                              )}
                              <span className="text-xs font-mono text-muted-foreground">
                                {txn.provider_transaction_id || txn.id.substring(0, 8)}
                              </span>
                            </div>
                            <h3 className="text-base font-semibold text-foreground mt-1.5">
                              {txn.member_name || 'Customer'}
                            </h3>
                            <p className="text-xs text-muted-foreground font-mono">
                              Order: {txn.order_number || txn.order}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              txn.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : isPendingApproval
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}
                          >
                            {isPendingApproval ? 'PENDING APPROVAL' : txn.status}
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground block">Branch</span>
                            <span className="font-medium text-foreground">{txn.branch_name || 'Studio'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Date</span>
                            <span className="font-medium text-foreground">
                              {txn.paid_at ? new Date(txn.paid_at).toLocaleDateString('en-IN') : txn.created_at ? new Date(txn.created_at).toLocaleDateString('en-IN') : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Recorded By</span>
                            <span className="font-medium text-foreground">{txn.recorded_by_name || 'Staff'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Approved By</span>
                            <span className="font-medium text-foreground">{txn.approved_by_name || (isPendingApproval ? 'Awaiting Manager' : '-')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-muted-foreground block">Amount</span>
                          <span className="text-base font-bold text-foreground">
                            ₹{parseFloat(String(txn.amount || '0')).toLocaleString('en-IN')}
                          </span>
                        </div>
                        {canRefund && txn.status === 'SUCCESS' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                            onClick={() => {
                              setSelectedTxn(txn);
                              setRefundAmount(String(txn.amount));
                              setIsRefundOpen(true);
                            }}
                          >
                            <RotateCcw className="size-3" />
                            <span>Refund</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
              </>
            )}
          </div>
        )}
        {/* TAB 3: ORDERS & CHECKOUT */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search orders by number, customer, or package..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-card text-xs"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-9 text-xs bg-card border border-border rounded-lg px-2.5 text-foreground"
              >
                <option value="all">All Order Statuses</option>
                <option value="PAID">Paid / Completed</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PENDING_PAYMENT">Pending Payment</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            {loadingOrders ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading commercial orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Receipt className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Orders Found</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Commercial sales orders generated for memberships, classes, and appointments will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => {
                  const paid = parseFloat(order.paid_amount || '0');
                  const total = parseFloat(String(order.total_amount || '0'));
                  const outstanding = parseFloat(order.outstanding_balance || String(Math.max(0, total - paid)));
                  return (
                    <div
                      key={order.id}
                      className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-mono font-bold text-primary">{order.order_number}</span>
                            <h3 className="text-base font-semibold text-foreground mt-1">
                              {order.member_name || order.lead_name || 'Walk-in Customer'}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{order.item_summary || order.order_type}</p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              order.status === 'SETTLED' || order.status === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : order.status === 'PARTIALLY_PAID'
                                ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground block">Total</span>
                            <span className="font-bold text-foreground">₹{total.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Paid</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{paid.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Due</span>
                            <span className={`font-bold ${outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                              ₹{outstanding.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 text-[11px] text-muted-foreground flex items-center justify-between">
                          <span>Branch: {order.branch_name || 'Studio'}</span>
                          <span>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '-'}</span>
                        </div>
                      </div>

                      {order.status !== 'PAID' && canRecordPayment && (
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 h-8 text-xs font-semibold"
                            onClick={() => openRecordPaymentModal(order)}
                          >
                            Record Payment
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => createPaymentLinkMutation.mutate(order.id)}
                            disabled={createPaymentLinkMutation.isPending}
                          >
                            <Link className="size-3" />
                            <span>Link</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: OUTSTANDING DUES */}
        {activeTab === 'outstanding' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search outstanding dues by customer or order..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-card text-xs"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-9 text-xs bg-card border border-border rounded-lg px-2.5 text-foreground"
              >
                <option value="all">All Outstanding Dues</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PENDING_PAYMENT">Pending Payment / Unpaid</option>
              </select>
            </div>

            {loadingOrders ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading outstanding accounts...
              </div>
            ) : outstandingOrders.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Zero Outstanding Dues</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  All commercial orders in the selected scope are fully settled and up to date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {outstandingOrders.map((order) => {
                  const paid = parseFloat(order.paid_amount || '0');
                  const total = parseFloat(String(order.total_amount || '0'));
                  const outstanding = parseFloat(order.outstanding_balance || String(Math.max(0, total - paid)));
                  return (
                    <div
                      key={order.id}
                      className="bg-card border border-amber-500/30 dark:border-amber-500/20 rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-amber-500/60 transition-all shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                              {order.order_number}
                            </span>
                            <h3 className="text-base font-semibold text-foreground mt-1">
                              {order.member_name || order.lead_name || 'Customer'}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{order.item_summary || 'Membership Package'}</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            {order.status}
                          </span>
                        </div>

                        <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Order Total:</span>
                            <span className="font-semibold text-foreground">₹{total.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Paid Amount:</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{paid.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-amber-500/20 text-sm">
                            <span className="font-bold text-amber-700 dark:text-amber-400">Outstanding Balance:</span>
                            <span className="font-extrabold text-amber-700 dark:text-amber-400">₹{outstanding.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        <div className="mt-3 text-[11px] text-muted-foreground flex items-center justify-between">
                          <span>Branch: {order.branch_name || 'Studio'}</span>
                          <span>Ordered: {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '-'}</span>
                        </div>
                      </div>

                      {canRecordPayment && (
                        <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => openRecordPaymentModal(order)}
                          >
                            Collect Installment
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {/* TAB 5: REVENUE ANALYTICS */}
        {activeTab === 'revenue' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Revenue KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-xl border border-border bg-card">
                <span className="text-xs text-muted-foreground block">Gross Revenue</span>
                <span className="text-lg font-bold text-foreground block mt-1">₹{grossRevenue.toLocaleString('en-IN')}</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">All collections</span>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <span className="text-xs text-muted-foreground block">Total Refunds</span>
                <span className="text-lg font-bold text-rose-600 block mt-1">₹{refundedAmount.toLocaleString('en-IN')}</span>
                <span className="text-[11px] text-muted-foreground mt-1 block">Processed returns</span>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <span className="text-xs text-muted-foreground block">Net Revenue</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 block mt-1">₹{netRevenue.toLocaleString('en-IN')}</span>
                <span className="text-[11px] text-muted-foreground mt-1 block">Gross minus refunds</span>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <span className="text-xs text-muted-foreground block">Cash Collected</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 block mt-1">₹{cashCollected.toLocaleString('en-IN')}</span>
                <span className="text-[11px] text-muted-foreground mt-1 block">Approved cash only</span>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <span className="text-xs text-muted-foreground block">Online Collected</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 block mt-1">₹{onlineCollected.toLocaleString('en-IN')}</span>
                <span className="text-[11px] text-muted-foreground mt-1 block">Razorpay instruments</span>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <span className="text-xs text-muted-foreground block">Pending Cash</span>
                <span className="text-lg font-bold text-muted-foreground block mt-1">₹{pendingCashAmount.toLocaleString('en-IN')}</span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block">Not recognized revenue</span>
              </div>
            </div>

            {/* Split & Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-border bg-card space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Banknote className="size-4 text-primary" /> Payment Method Collection Split
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Online (Razorpay):</span>
                    <span className="font-semibold text-foreground">
                      ₹{onlineCollected.toLocaleString('en-IN')} (
                      {grossRevenue > 0 ? Math.round((onlineCollected / grossRevenue) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex">
                    <div
                      className="bg-blue-600 h-full"
                      style={{ width: `${grossRevenue > 0 ? (onlineCollected / grossRevenue) * 100 : 0}%` }}
                    />
                    <div
                      className="bg-amber-600 h-full"
                      style={{ width: `${grossRevenue > 0 ? (cashCollected / grossRevenue) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">In-Studio Cash (Approved):</span>
                    <span className="font-semibold text-foreground">
                      ₹{cashCollected.toLocaleString('en-IN')} (
                      {grossRevenue > 0 ? Math.round((cashCollected / grossRevenue) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-border bg-card space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600" /> Revenue Integrity Policy
                </h4>
                <div className="text-xs text-muted-foreground space-y-1.5">
                  <p>• Only <strong>approved cash</strong> and <strong>verified Razorpay payments</strong> feed recognized revenue.</p>
                  <p>• Pending cash transactions await manager sign-off and are excluded from revenue totals.</p>
                  <p>• Partial installment payments immediately recognize the exact collected portion.</p>
                </div>
              </div>
            </div>

            {/* Live Transactions Audit Ledger */}
            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Live Revenue Inflow Ledger (Successful Transactions)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Order #</th>
                      <th className="p-2.5">Customer</th>
                      <th className="p-2.5">Provider</th>
                      <th className="p-2.5">Amount</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {transactions
                      .filter((t) => t.status === 'SUCCESS')
                      .slice(0, 10)
                      .map((t) => (
                        <tr key={t.id} className="hover:bg-muted/30">
                          <td className="p-2.5 text-muted-foreground">
                            {t.paid_at ? new Date(t.paid_at).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="p-2.5 font-mono text-primary font-semibold">{t.order_number || t.order}</td>
                          <td className="p-2.5 text-foreground">{t.member_name || 'Customer'}</td>
                          <td className="p-2.5 font-semibold text-muted-foreground">{t.provider}</td>
                          <td className="p-2.5 font-bold text-foreground">₹{parseFloat(String(t.amount)).toLocaleString('en-IN')}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                              SETTLED
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: REFUNDS */}
        {activeTab === 'refunds' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search refunds by order, customer, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-card text-xs"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-9 text-xs bg-card border border-border rounded-lg px-2.5 text-foreground"
              >
                <option value="all">All Refund Statuses</option>
                <option value="SUCCESS">Success / Processed</option>
                <option value="APPROVED">Approved</option>
                <option value="REQUESTED">Requested</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {loadingRefunds ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading refunds audit log...
              </div>
            ) : filteredRefunds.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <RotateCcw className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Refunds Recorded</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Refund events recorded against transactions will appear in this audit log.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRefunds.map((refund) => (
                  <div
                    key={refund.id}
                    className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-mono font-bold text-rose-600">
                            {refund.order_number || 'Refund #' + refund.id.substring(0, 8)}
                          </span>
                          <h3 className="text-base font-semibold text-foreground mt-1">
                            {refund.member_name || 'Customer'}
                          </h3>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            refund.status === 'PROCESSED'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : refund.status === 'APPROVED'
                              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                              : refund.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}
                        >
                          {refund.status}
                        </span>
                      </div>

                      <div className="mt-3 p-2.5 rounded-lg bg-muted/40 text-xs">
                        <span className="text-muted-foreground block text-[11px]">Reason</span>
                        <p className="font-medium text-foreground mt-0.5">{refund.reason_text || refund.reason_code || 'Service adjustment'}</p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Requested By</span>
                          <span className="font-medium text-foreground">{refund.requested_by_name || 'Staff'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Processed Date</span>
                          <span className="font-medium text-foreground">
                            {refund.created_at ? new Date(refund.created_at).toLocaleDateString('en-IN') : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Refunded Amount</span>
                      <span className="text-base font-bold text-rose-600">
                        ₹{parseFloat(String(refund.amount || '0')).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: STUDIO EXPENSES */}
        {activeTab === 'expenses' && (
          <div className="space-y-4 animate-in fade-in duration-150 max-w-3xl mx-auto">
            <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 text-center space-y-4 shadow-sm">
              <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <DollarSign className="size-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 mb-2">
                  <Info className="size-3.5" /> EXPENSE BACKEND NOT IMPLEMENTED
                </div>
                <h3 className="text-lg font-bold text-foreground">Studio Operating Expenses & Outflow Tracking</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto mt-2 leading-relaxed">
                  Per the SWEAT platform architecture and domain specification, separate vendor expense and outflow accounting models are not implemented in the backend.
                </p>
                <p className="text-xs text-muted-foreground max-w-lg mx-auto mt-1 leading-relaxed">
                  All financial reporting operates strictly against authoritative revenue, commercial orders, verified payment transactions, and tax invoices.
                </p>
              </div>

              <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabClick('revenue')}
                  className="gap-1.5 text-xs"
                >
                  <TrendingUp className="size-3.5 text-emerald-600" />
                  <span>View Revenue Analytics</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabClick('outstanding')}
                  className="gap-1.5 text-xs"
                >
                  <Clock className="size-3.5 text-amber-600" />
                  <span>View Outstanding Dues</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageBody>

      {/* MODAL 1: RECORD ORDER PAYMENT */}
      <Dialog open={isRecordPaymentOpen && !!selectedOrder} onOpenChange={setIsRecordPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Order Payment</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <p className="text-xs text-muted-foreground">
                Order <span className="font-mono text-primary font-bold">{selectedOrder.order_number}</span> for{' '}
                <strong className="text-foreground">{selectedOrder.member_name || selectedOrder.lead_name || 'Customer'}</strong>
              </p>

              <div>
                <Label className="mb-1 block">Payment Amount ({selectedOrder.currency})</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <Label className="mb-1 block">Payment Provider</Label>
                <select
                  value={paymentProvider}
                  onChange={(e) => setPaymentProvider(e.target.value as PaymentProvider)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="CASH">Cash (In-Studio Collection)</option>
                  <option value="RAZORPAY">Razorpay</option>
                </select>
              </div>

              <div>
                <Label className="mb-1 block">Payment Method / Channel</Label>
                <Input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="e.g. CASH, FRONT_DESK"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsRecordPaymentOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedOrder &&
                recordPaymentMutation.mutate({
                  orderId: selectedOrder.id,
                  amount: paymentAmount,
                  provider: paymentProvider,
                  method: paymentMethod,
                })
              }
              disabled={!paymentAmount || recordPaymentMutation.isPending}
            >
              {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: PROCESS REFUND */}
      <Dialog open={isRefundOpen && !!selectedTxn} onOpenChange={setIsRefundOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Payment Refund</DialogTitle>
          </DialogHeader>
          {selectedTxn && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <p className="text-xs text-muted-foreground">
                Transaction: <span className="font-mono text-foreground">{selectedTxn.id.substring(0, 8)}...</span> • Original:{' '}
                <strong className="text-foreground">{selectedTxn.amount} {selectedTxn.currency}</strong>
              </p>

              <div>
                <Label className="mb-1 block">Refund Amount ({selectedTxn.currency})</Label>
                <Input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>

              <div>
                <Label className="mb-1 block">Reason for Refund</Label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Member relocated / service cancellation"
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsRefundOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedTxn &&
                refundMutation.mutate({
                  txnId: selectedTxn.id,
                  amount: refundAmount,
                  reason: refundReason,
                })
              }
              disabled={!refundAmount || refundMutation.isPending}
            >
              {refundMutation.isPending ? 'Processing...' : 'Confirm Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};