import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Receipt,
  RotateCcw,
  Search,
  RefreshCw,
  CheckCircle2,
  Link,
  FileText,
} from 'lucide-react';
import { commerceApi } from '../../services/commerceApi';
import {
  Order,
  PaymentTransaction,
  PaymentProvider,
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

interface CommerceWorkspaceProps {
  initialTab?: 'orders' | 'invoices' | 'transactions' | 'refunds';
}

export const CommerceWorkspace: React.FC<CommerceWorkspaceProps> = ({ initialTab = 'orders' }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'orders' | 'invoices' | 'transactions' | 'refunds'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Queries
  const {
    data: orders = [],
    isLoading: loadingOrders,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: () => commerceApi.getOrders(),
  });

  const {
    data: invoices = [],
    isLoading: loadingInvoices,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => commerceApi.getInvoices(),
  });

  const {
    data: transactions = [],
    isLoading: loadingTransactions,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => commerceApi.getTransactions(),
  });

  const {
    data: refunds = [],
    isLoading: loadingRefunds,
    refetch: refetchRefunds,
  } = useQuery({
    queryKey: ['refunds'],
    queryFn: () => commerceApi.getRefunds(),
  });

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
    }) => commerceApi.recordManualPayment(orderId, { amount, payment_provider: provider, payment_method: method }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsRecordPaymentOpen(false);
      setSelectedOrder(null);
      setPaymentAmount('');
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
      setIsRefundOpen(false);
      setSelectedTxn(null);
      setRefundAmount('');
      setRefundReason('');
    },
  });

  const createPaymentLinkMutation = useMutation({
    mutationFn: (orderId: string) => commerceApi.createPaymentLink(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    const num = o.order_number.toLowerCase();
    const customer = (o.member_name || o.lead_name || '').toLowerCase();
    return num.includes(term) || customer.includes(term);
  });

  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    const num = inv.invoice_number.toLowerCase();
    const customer = (inv.member_name || '').toLowerCase();
    return num.includes(term) || customer.includes(term);
  });

  // Calculate Metrics
  const paidOrdersCount = orders.filter((o) => o.status === 'PAID').length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING' || o.status === 'PARTIALLY_PAID').length;
  const totalSettledAmount = transactions
    .filter((t) => t.status === 'SUCCESS')
    .reduce((acc, t) => acc + parseFloat(t.amount || '0'), 0);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Unified Platform Header */}
      <PageHeader
        title="Commerce & Payments Hub"
        subtitle="Commercial checkout, POS settlement, tax-compliant invoice generation, and refund audits."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-md">
              Finance · Commerce
            </span>
            <span className="text-muted-foreground text-xs">
              <span className="font-semibold text-foreground">{orders.length}</span> total orders
            </span>
          </div>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchOrders();
              refetchInvoices();
              refetchTransactions();
              refetchRefunds();
            }}
            title="Refresh"
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
        }
      />

      <PageBody>
        {/* Responsive KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiTile label="Total Orders" value={orders.length} hint="Commercial transactions" />
          <KpiTile label="Settled Orders" value={paidOrdersCount} hint="Fully paid & invoiced" tone="positive" />
          <KpiTile label="Pending Payment" value={pendingOrdersCount} hint="Awaiting settlement" tone="warning" />
          <KpiTile
            label="Total Settled"
            value={`₹${totalSettledAmount.toLocaleString('en-IN')}`}
            hint="Recorded revenues"
            tone="positive"
          />
        </div>

        {/* Navigation Tabs - Responsive Horizontal Scroll */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Orders & Checkout ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Invoices & Tax Slips ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Payment Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('refunds')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'refunds'
                ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            Refunds ({refunds.length})
          </button>
        </div>

        {/* TAB 1: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search orders by number or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-card"
              />
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
                <h3 className="text-base font-semibold text-foreground">No Orders Recorded</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Commercial sales orders generated for memberships, classes, and appointments will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => (
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
                          <p className="text-xs text-muted-foreground mt-0.5">{order.order_type}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            order.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : order.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : order.status === 'REFUNDED'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="mt-4 p-3 bg-muted/40 rounded-lg border border-border/60 space-y-1.5 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal:</span>
                          <span>{order.subtotal} {order.currency}</span>
                        </div>
                        {Number(order.discount_amount) > 0 && (
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                            <span>Discount:</span>
                            <span>-{order.discount_amount} {order.currency}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-muted-foreground">
                          <span>Tax:</span>
                          <span>+{order.tax_amount} {order.currency}</span>
                        </div>
                        <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
                          <span>Total Amount:</span>
                          <span className="text-primary">{order.total_amount} {order.currency}</span>
                        </div>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="mt-3 text-xs text-muted-foreground">
                          <span className="text-foreground font-medium block mb-1">Items ({order.items.length}):</span>
                          <ul className="space-y-0.5">
                            {order.items.map((it) => (
                              <li key={it.id} className="truncate">
                                • {it.item_name_snapshot} (x{it.quantity})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                      {order.status !== 'PAID' && order.status !== 'REFUNDED' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setPaymentAmount(String(order.total_amount));
                              setIsRecordPaymentOpen(true);
                            }}
                            className="flex-1 text-xs"
                          >
                            Record Payment
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => createPaymentLinkMutation.mutate(order.id)}
                            title="Generate Payment Link"
                            className="px-2"
                          >
                            <Link className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {order.status === 'PAID' && (
                        <div className="w-full text-center py-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="size-4" /> Settled & Invoiced
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INVOICES */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search invoices by invoice number or member..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-card"
              />
            </div>

            {loadingInvoices ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading invoices...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <FileText className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Member Invoices Issued</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Invoices are automatically issued with immutable financial snapshots upon full payment of orders.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Invoice #</th>
                        <th className="px-4 py-3">Member</th>
                        <th className="px-4 py-3">Branch</th>
                        <th className="px-4 py-3">Issue Date</th>
                        <th className="px-4 py-3">Total Amount</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3.5 font-mono font-bold text-primary">{inv.invoice_number}</td>
                          <td className="px-4 py-3.5 font-medium text-foreground">{inv.member_name || 'Anonymous'}</td>
                          <td className="px-4 py-3.5 text-muted-foreground">{inv.branch_name}</td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-foreground">
                            {inv.total_amount} {inv.currency}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {loadingTransactions ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading payment transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Payment Transactions Recorded</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Settlements through POS machines, Cash, or Razorpay gateways appear here.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Provider</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Paid At</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3.5 font-semibold text-foreground">{txn.provider}</td>
                          <td className="px-4 py-3.5 text-muted-foreground">{txn.payment_method || 'N/A'}</td>
                          <td className="px-4 py-3.5 font-bold text-foreground">
                            {txn.amount} {txn.currency}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            {txn.paid_at ? new Date(txn.paid_at).toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-medium ${
                                txn.status === 'SUCCESS'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              }`}
                            >
                              {txn.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {txn.status === 'SUCCESS' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTxn(txn);
                                  setRefundAmount(String(txn.amount));
                                  setIsRefundOpen(true);
                                }}
                                className="h-7 text-xs"
                              >
                                Refund
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REFUNDS */}
        {activeTab === 'refunds' && (
          <div className="space-y-4">
            {loadingRefunds ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading refunds...
              </div>
            ) : refunds.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <RotateCcw className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Refunds Processed</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Refund events and credit notes will appear here.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Refund ID</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {refunds.map((ref) => (
                        <tr key={ref.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{ref.id.substring(0, 8)}...</td>
                          <td className="px-4 py-3.5 font-bold text-foreground">{ref.amount}</td>
                          <td className="px-4 py-3.5 text-foreground">{ref.reason_text || 'No reason specified'}</td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            {ref.created_at ? new Date(ref.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">
                              {ref.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </PageBody>

      {/* RECORD PAYMENT MODAL */}
      <Dialog open={isRecordPaymentOpen && !!selectedOrder} onOpenChange={setIsRecordPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Order Payment</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <p className="text-xs text-muted-foreground">
                Order <strong className="text-foreground">{selectedOrder.order_number}</strong> • Total:{' '}
                <strong className="text-primary">{selectedOrder.total_amount} {selectedOrder.currency}</strong>
              </p>

              <div>
                <Label className="mb-1 block">Amount to Collect ({selectedOrder.currency})</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div>
                <Label className="mb-1 block">Provider / Channel</Label>
                <select
                  value={paymentProvider}
                  onChange={(e) => setPaymentProvider(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="CASH">Cash / Front Desk</option>
                  <option value="RAZORPAY">Razorpay Gateway</option>
                  <option value="ICICI_POS">ICICI Card Machine (POS)</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                </select>
              </div>

              <div>
                <Label className="mb-1 block">Payment Method</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="NET_BANKING">Net Banking</option>
                </select>
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
              {recordPaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PROCESS REFUND MODAL */}
      <Dialog open={isRefundOpen && !!selectedTxn} onOpenChange={setIsRefundOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Payment Refund</DialogTitle>
          </DialogHeader>
          {selectedTxn && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              <p className="text-xs text-muted-foreground">
                Transaction ID: <span className="font-mono text-foreground">{selectedTxn.id.substring(0, 8)}...</span> • Original:{' '}
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
