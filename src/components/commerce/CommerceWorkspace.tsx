import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Receipt,
  RotateCcw,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Link,
  ChevronRight,
  ShieldCheck,
  FileText,
  DollarSign,
  ArrowUpRight,
  Clock,
  Send,
} from 'lucide-react';
import { commerceApi } from '../../services/commerceApi';
import {
  Order,
  PaymentTransaction,
  MemberInvoice,
  Refund,
  PaymentProvider,
} from '../../types/commerce';

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
    queryKey: ['member-invoices'],
    queryFn: () => commerceApi.getInvoices(),
  });

  const {
    data: transactions = [],
    isLoading: loadingTransactions,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ['payment-transactions'],
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
    mutationFn: ({ orderId, amount, provider, method }: { orderId: string; amount: string; provider: string; method: string }) =>
      commerceApi.recordPayment(orderId, {
        amount,
        provider,
        payment_method: method,
        idempotency_key: `IDEM-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['member-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payment-transactions'] });
      setIsRecordPaymentOpen(false);
      setSelectedOrder(null);
      setPaymentAmount('');
    },
  });

  const refundMutation = useMutation({
    mutationFn: ({ txnId, amount, reason }: { txnId: string; amount: string; reason: string }) =>
      commerceApi.processRefund(txnId, { amount, reason_text: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['payment-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      setIsRefundOpen(false);
      setSelectedTxn(null);
      setRefundAmount('');
      setRefundReason('');
    },
  });

  const createPaymentLinkMutation = useMutation({
    mutationFn: (orderId: string) => commerceApi.createPaymentLink(orderId),
    onSuccess: (data) => {
      alert(`Payment link generated successfully: ${data.payment_url || 'Created'}`);
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

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                Layer 2 Module G
              </span>
              <span className="text-xs text-slate-400">Commerce, Billing & Settlement</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Commerce & Payments Hub
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                refetchOrders();
                refetchInvoices();
                refetchTransactions();
                refetchRefunds();
              }}
              className="p-2 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 mt-4 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'orders'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Orders & Checkout ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'invoices'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Invoices & Tax Slips ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'transactions'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Payment Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('refunds')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'refunds'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Refunds ({refunds.length})
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {/* TAB 1: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders by number or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {loadingOrders ? (
              <div className="p-8 text-center text-slate-400">Loading commercial orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
                <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-200">No Orders Recorded</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
                  Commercial sales orders generated for memberships, classes, and appointments will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-mono font-bold text-amber-400">{order.order_number}</span>
                          <h3 className="text-base font-semibold text-white mt-1">
                            {order.member_name || order.lead_name || 'Walk-in Customer'}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">{order.order_type}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            order.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : order.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : order.status === 'REFUNDED'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Subtotal:</span>
                          <span>{order.subtotal} {order.currency}</span>
                        </div>
                        {Number(order.discount_amount) > 0 && (
                          <div className="flex justify-between text-emerald-400">
                            <span>Discount:</span>
                            <span>-{order.discount_amount} {order.currency}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-400">
                          <span>Tax:</span>
                          <span>+{order.tax_amount} {order.currency}</span>
                        </div>
                        <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                          <span>Total Amount:</span>
                          <span className="text-amber-400">{order.total_amount} {order.currency}</span>
                        </div>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="mt-3 text-xs text-slate-400">
                          <span className="text-slate-500 block mb-1">Items ({order.items.length}):</span>
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

                    <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      {order.status !== 'PAID' && order.status !== 'REFUNDED' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setPaymentAmount(String(order.total_amount));
                              setIsRecordPaymentOpen(true);
                            }}
                            className="flex-1 py-1.5 px-2 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors text-center"
                          >
                            Record Payment
                          </button>
                          <button
                            onClick={() => createPaymentLinkMutation.mutate(order.id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                            title="Generate Payment Link"
                          >
                            <Link className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {order.status === 'PAID' && (
                        <div className="w-full text-center py-1 text-xs text-emerald-400 font-medium flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Settled & Invoiced
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
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoices by invoice number or member..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {loadingInvoices ? (
              <div className="p-8 text-center text-slate-400">Loading invoices...</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-200">No Member Invoices Issued</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
                  Invoices are automatically issued with immutable financial snapshots upon full payment of orders.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Invoice #</th>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3">Issue Date</th>
                      <th className="px-4 py-3">Total Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3 font-mono font-bold text-amber-400">{inv.invoice_number}</td>
                        <td className="px-4 py-3 text-white">{inv.member_name || 'Anonymous'}</td>
                        <td className="px-4 py-3 text-slate-400">{inv.branch_name}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-bold text-white">
                          {inv.total_amount} {inv.currency}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {loadingTransactions ? (
              <div className="p-8 text-center text-slate-400">Loading payment transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
                <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-200">No Payment Transactions Recorded</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
                  Settlements through POS machines, Cash, or Razorpay gateways appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Paid At</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3 font-semibold text-white">{txn.provider}</td>
                        <td className="px-4 py-3 text-slate-400">{txn.payment_method || 'N/A'}</td>
                        <td className="px-4 py-3 font-bold text-white">
                          {txn.amount} {txn.currency}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {txn.paid_at ? new Date(txn.paid_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              txn.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {txn.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {txn.status === 'SUCCESS' && (
                            <button
                              onClick={() => {
                                setSelectedTxn(txn);
                                setRefundAmount(String(txn.amount));
                                setIsRefundOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REFUNDS */}
        {activeTab === 'refunds' && (
          <div className="space-y-4">
            {loadingRefunds ? (
              <div className="p-8 text-center text-slate-400">Loading refunds...</div>
            ) : refunds.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
                <RotateCcw className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-200">No Refunds Processed</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
                  Refund events and credit notes will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Refund ID</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950">
                    {refunds.map((ref) => (
                      <tr key={ref.id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{ref.id.substring(0, 8)}...</td>
                        <td className="px-4 py-3 font-bold text-white">{ref.amount}</td>
                        <td className="px-4 py-3 text-slate-300">{ref.reason_text || 'No reason specified'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {ref.created_at ? new Date(ref.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {ref.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* RECORD PAYMENT MODAL */}
      {isRecordPaymentOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Record Order Payment</h3>
            <p className="text-xs text-slate-400">
              Order <strong className="text-slate-200">{selectedOrder.order_number}</strong> • Total:{' '}
              <strong className="text-amber-400">{selectedOrder.total_amount} {selectedOrder.currency}</strong>
            </p>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-400 mb-1">Amount to Collect ({selectedOrder.currency})</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Provider / Channel</label>
                <select
                  value={paymentProvider}
                  onChange={(e) => setPaymentProvider(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                >
                  <option value="CASH">Cash / Front Desk</option>
                  <option value="RAZORPAY">Razorpay Gateway</option>
                  <option value="ICICI_POS">ICICI Card Machine (POS)</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="NET_BANKING">Net Banking</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsRecordPaymentOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  recordPaymentMutation.mutate({
                    orderId: selectedOrder.id,
                    amount: paymentAmount,
                    provider: paymentProvider,
                    method: paymentMethod,
                  })
                }
                disabled={!paymentAmount || recordPaymentMutation.isPending}
                className="px-4 py-2 text-xs font-medium bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {recordPaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESS REFUND MODAL */}
      {isRefundOpen && selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Process Payment Refund</h3>
            <p className="text-xs text-slate-400">
              Transaction ID: <span className="font-mono text-slate-300">{selectedTxn.id.substring(0, 8)}...</span> • Original:{' '}
              <strong className="text-slate-200">{selectedTxn.amount} {selectedTxn.currency}</strong>
            </p>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-400 mb-1">Refund Amount ({selectedTxn.currency})</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Reason for Refund</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Member relocated / service cancellation"
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsRefundOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  refundMutation.mutate({
                    txnId: selectedTxn.id,
                    amount: refundAmount,
                    reason: refundReason,
                  })
                }
                disabled={!refundAmount || refundMutation.isPending}
                className="px-4 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {refundMutation.isPending ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
