import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  Eye,
  User,
  MapPin,
  Calendar,
  CreditCard,
  Package,
  ShieldCheck,
  Tag,
  ChevronRight,
  X,
  Smartphone,
  Store,
  Layers,
  ArrowUpRight,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader, PageBody, KpiTile, Section } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  retailOrdersApi,
  RetailOrder,
  RetailOrderItem,
  RetailOrderFilters,
} from '@/api/endpoints/retailOrdersApi';
import { api } from '@/api/client';

export function PurchasesWorkspace() {
  // State
  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<RetailOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isUpdatingFulfillment, setIsUpdatingFulfillment] = useState<boolean>(false);

  // Branches
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFulfillment, setSelectedFulfillment] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Fetch branches once
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await api.get<any>('/tenant/branches/');
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.results)
          ? res.data.results
          : [];
        setBranches(list.map((b: any) => ({ id: String(b.id), name: b.name || b.code || `Branch #${b.id}` })));
      } catch {
        // non-blocking
      }
    }
    loadBranches();
  }, []);

  // Fetch orders
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: RetailOrderFilters = {
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        fulfillment_status: selectedFulfillment !== 'all' ? selectedFulfillment : undefined,
        search: searchTerm.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };
      const data = await retailOrdersApi.getRetailOrders(filters);
      setOrders(data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to load retail orders from server.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranch, selectedStatus, selectedFulfillment, searchTerm, dateFrom, dateTo]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedBranch('all');
    setSelectedStatus('all');
    setSelectedFulfillment('all');
    setDateFrom('');
    setDateTo('');
  };

  // KPIs
  const kpis = useMemo(() => {
    const totalCount = orders.length;
    let paidRevenue = 0;
    let readyForPickupCount = 0;
    let unfulfilledCount = 0;

    for (const order of orders) {
      const total = Number(order.total_amount) || 0;
      if (order.status === 'PAID') {
        paidRevenue += total;
      }
      if (order.fulfillment_status === 'READY_FOR_PICKUP') {
        readyForPickupCount += 1;
      }
      if (order.status === 'PAID' && order.fulfillment_status === 'UNFULFILLED') {
        unfulfilledCount += 1;
      }
    }

    return {
      totalCount,
      paidRevenue,
      readyForPickupCount,
      unfulfilledCount,
    };
  }, [orders]);

  // Fulfillment transition handler
  const handleFulfillTransition = async (orderId: string, newStatus: 'READY_FOR_PICKUP' | 'FULFILLED') => {
    setIsUpdatingFulfillment(true);
    try {
      const updatedOrder = await retailOrdersApi.fulfillOrder(orderId, newStatus);
      toast.success(
        newStatus === 'READY_FOR_PICKUP'
          ? `Order #${updatedOrder.order_number} marked Ready for Pickup!`
          : `Order #${updatedOrder.order_number} marked Collected & Fulfilled!`
      );
      // Update local state
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      if (selectedOrder && selectedOrder.id === updatedOrder.id) {
        setSelectedOrder(updatedOrder);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Fulfillment transition failed.';
      toast.error(detail);
    } finally {
      setIsUpdatingFulfillment(false);
    }
  };

  // Status Badge Renderers
  const renderPaymentBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 font-medium">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 font-medium">
            Cancelled
          </Badge>
        );
      case 'REFUNDED':
        return (
          <Badge className="bg-purple-500/15 text-purple-400 border border-purple-500/30 font-medium">
            Refunded
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderFulfillmentBadge = (fStatus: string, pStatus: string) => {
    switch (fStatus) {
      case 'FULFILLED':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
            <Check className="w-3 h-3 mr-1" />
            Collected
          </Badge>
        );
      case 'READY_FOR_PICKUP':
        return (
          <Badge className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-medium animate-pulse">
            <Store className="w-3 h-3 mr-1" />
            Ready for Pickup
          </Badge>
        );
      case 'UNFULFILLED':
        return (
          <Badge className={pStatus === 'PAID' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium' : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 font-medium'}>
            <Clock className="w-3 h-3 mr-1" />
            {pStatus === 'PAID' ? 'Awaiting Prep' : 'Unpaid'}
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 font-medium">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{fStatus}</Badge>;
    }
  };

  const formatCurrency = (val: number | string, currency = 'INR') => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="Retail Orders & Purchases"
        subtitle="Manage member retail orders, stock reservations, pickup fulfillment, and payment receipts."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadOrders}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <PageBody className="space-y-6">
        {/* KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTile
            title="Total Retail Orders"
            value={kpis.totalCount}
            hint="Recorded retail orders"
            icon={<ShoppingBag className="w-5 h-5 text-indigo-400" />}
            tone="neutral"
          />
          <KpiTile
            title="Paid Revenue"
            value={formatCurrency(kpis.paidRevenue)}
            hint="Confirmed gateway payments"
            icon={<CreditCard className="w-5 h-5 text-emerald-400" />}
            tone="positive"
          />
          <KpiTile
            title="Ready for Pickup"
            value={kpis.readyForPickupCount}
            hint="Awaiting member collection"
            icon={<Store className="w-5 h-5 text-purple-400" />}
            tone="neutral"
          />
          <KpiTile
            title="Awaiting Prep"
            value={kpis.unfulfilledCount}
            hint="Paid orders to fulfill"
            icon={<Clock className="w-5 h-5 text-amber-400" />}
            tone="neutral"
          />
        </div>

        {/* Filter Bar */}
        <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="w-4 h-4 text-primary" />
              <span>Filter Retail Purchases</span>
            </div>
            {(searchTerm || selectedBranch !== 'all' || selectedStatus !== 'all' || selectedFulfillment !== 'all' || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="relative col-span-1 sm:col-span-2">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search order #, customer, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Branch Filter */}
            <div>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pickup Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Statuses</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fulfillment Status Filter */}
            <div>
              <Select value={selectedFulfillment} onValueChange={setSelectedFulfillment}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Fulfillment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fulfillment Statuses</SelectItem>
                  <SelectItem value="UNFULFILLED">Unfulfilled / Awaiting</SelectItem>
                  <SelectItem value="READY_FOR_PICKUP">Ready for Pickup</SelectItem>
                  <SelectItem value="FULFILLED">Collected / Fulfilled</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-xs"
                placeholder="From Date"
              />
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-center justify-between text-destructive">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Failed to retrieve retail purchase records</p>
                <p className="text-xs opacity-90">{error}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadOrders} className="text-xs">
              Retry
            </Button>
          </div>
        )}

        {/* Main Orders Table */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/60">
                <TableHead className="w-[160px] text-xs font-semibold">Order Details</TableHead>
                <TableHead className="text-xs font-semibold">Date & Time</TableHead>
                <TableHead className="text-xs font-semibold">Customer / Member</TableHead>
                <TableHead className="text-xs font-semibold">Pickup Branch</TableHead>
                <TableHead className="text-xs font-semibold">Purchased Items</TableHead>
                <TableHead className="text-right text-xs font-semibold">Total</TableHead>
                <TableHead className="text-xs font-semibold text-center">Payment</TableHead>
                <TableHead className="text-xs font-semibold text-center">Fulfillment</TableHead>
                <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9} className="py-4 text-center">
                      <div className="h-6 w-full animate-pulse bg-muted/40 rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No retail orders found</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchTerm || selectedBranch !== 'all' || selectedStatus !== 'all' || selectedFulfillment !== 'all'
                          ? 'Try adjusting your filters or search terms.'
                          : 'Retail orders placed through the mobile app will automatically appear here.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const itemsCount = order.items?.reduce((acc, it) => acc + it.quantity, 0) || 0;
                  const firstItem = order.items?.[0];
                  const itemSummary =
                    order.items?.length === 1
                      ? `${firstItem.product_name_snapshot} (x${firstItem.quantity})`
                      : order.items?.length > 1
                      ? `${firstItem.product_name_snapshot} (x${firstItem.quantity}) +${order.items.length - 1} more`
                      : 'No items';

                  return (
                    <TableRow key={order.id} className="hover:bg-muted/20 transition-colors">
                      {/* Order Number & Source */}
                      <TableCell className="font-mono text-xs">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{order.order_number}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
                          <Smartphone className="w-3 h-3 text-primary/70" />
                          <span>{order.order_source || 'Mobile App'}</span>
                        </div>
                      </TableCell>

                      {/* Date & Time */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </TableCell>

                      {/* Customer / Member */}
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">
                          {order.user_profile_name || 'Member'}
                        </div>
                        {(order.user_profile_phone || order.user_profile_email) && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                            {order.user_profile_phone || order.user_profile_email}
                          </div>
                        )}
                      </TableCell>

                      {/* Branch */}
                      <TableCell className="text-xs">
                        <div className="inline-flex items-center gap-1 text-foreground font-medium">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {order.branch_name || 'Home Branch'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Purchased Items */}
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground truncate max-w-[180px]" title={itemSummary}>
                          {itemSummary}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {itemsCount} {itemsCount === 1 ? 'unit' : 'units'} total
                        </div>
                      </TableCell>

                      {/* Total */}
                      <TableCell className="text-right text-xs font-semibold font-mono text-foreground">
                        {formatCurrency(order.total_amount, order.currency)}
                      </TableCell>

                      {/* Payment Status */}
                      <TableCell className="text-center">
                        {renderPaymentBadge(order.status)}
                      </TableCell>

                      {/* Fulfillment Status */}
                      <TableCell className="text-center">
                        {renderFulfillmentBadge(order.fulfillment_status, order.status)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Staff Actions for Paid Orders */}
                          {order.status === 'PAID' && order.fulfillment_status === 'UNFULFILLED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 gap-1 px-2"
                              disabled={isUpdatingFulfillment}
                              onClick={() => handleFulfillTransition(order.id, 'READY_FOR_PICKUP')}
                            >
                              <Store className="w-3 h-3" />
                              Ready
                            </Button>
                          )}

                          {order.status === 'PAID' && order.fulfillment_status === 'READY_FOR_PICKUP' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 gap-1 px-2"
                              disabled={isUpdatingFulfillment}
                              onClick={() => handleFulfillTransition(order.id, 'FULFILLED')}
                            >
                              <Check className="w-3 h-3" />
                              Collect
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="View Order Details"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </PageBody>

      {/* Order Detail Sheet (Slide-Over Drawer) */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto space-y-6 bg-card border-border/80">
          {selectedOrder && (
            <>
              <SheetHeader className="border-b border-border/60 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SheetTitle className="text-base font-bold font-mono">
                        {selectedOrder.order_number}
                      </SheetTitle>
                      {renderPaymentBadge(selectedOrder.status)}
                    </div>
                    <SheetDescription className="text-xs">
                      Placed on {formatDate(selectedOrder.created_at)} via {selectedOrder.order_source || 'Mobile App'}
                    </SheetDescription>
                  </div>
                  <div>
                    {renderFulfillmentBadge(selectedOrder.fulfillment_status, selectedOrder.status)}
                  </div>
                </div>
              </SheetHeader>

              {/* Customer & Pickup Branch Card */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>Customer & Pickup Location</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground text-[11px]">Member Name</p>
                    <p className="font-semibold text-foreground mt-0.5">
                      {selectedOrder.user_profile_name || 'Member'}
                    </p>
                    {selectedOrder.user_profile_phone && (
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        {selectedOrder.user_profile_phone}
                      </p>
                    )}
                    {selectedOrder.user_profile_email && (
                      <p className="text-muted-foreground text-[11px]">
                        {selectedOrder.user_profile_email}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[11px]">Pickup Branch</p>
                    <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{selectedOrder.branch_name || 'Home Branch'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Immutable Purchased Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    <span>Purchased Items (Purchase-Time Snapshots)</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {selectedOrder.items?.length || 0} line {selectedOrder.items?.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-border/60">
                        <TableHead className="text-[11px] font-semibold">Item & SKU</TableHead>
                        <TableHead className="text-center text-[11px] font-semibold">Qty</TableHead>
                        <TableHead className="text-right text-[11px] font-semibold">Unit Price</TableHead>
                        <TableHead className="text-right text-[11px] font-semibold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items?.map((item) => (
                        <TableRow key={item.id} className="border-border/40">
                          <TableCell className="py-2.5">
                            <p className="text-xs font-semibold text-foreground">
                              {item.product_name_snapshot}
                            </p>
                            {item.sku_snapshot && (
                              <p className="text-[10px] font-mono text-muted-foreground">
                                SKU: {item.sku_snapshot}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs py-2.5 font-mono">
                            x{item.quantity}
                          </TableCell>
                          <TableCell className="text-right text-xs py-2.5 font-mono text-muted-foreground">
                            {formatCurrency(item.unit_price, selectedOrder.currency)}
                          </TableCell>
                          <TableCell className="text-right text-xs py-2.5 font-mono font-semibold text-foreground">
                            {formatCurrency(item.total_price, selectedOrder.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Financial Summary */}
                <div className="rounded-xl border border-border/60 bg-muted/10 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(selectedOrder.subtotal_amount, selectedOrder.currency)}</span>
                  </div>
                  {Number(selectedOrder.tax_amount) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Taxes & GST</span>
                      <span className="font-mono">+{formatCurrency(selectedOrder.tax_amount, selectedOrder.currency)}</span>
                    </div>
                  )}
                  {Number(selectedOrder.discount_amount) > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount</span>
                      <span className="font-mono">-{formatCurrency(selectedOrder.discount_amount, selectedOrder.currency)}</span>
                    </div>
                  )}
                  <div className="border-t border-border/60 pt-2 flex justify-between font-bold text-sm text-foreground">
                    <span>Grand Total</span>
                    <span className="font-mono">{formatCurrency(selectedOrder.total_amount, selectedOrder.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Verified Payments & Transactions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Gateway Payment Record</span>
                </div>

                {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.payments.map((p, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-border/60 bg-card p-3 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                            {p.provider || 'RAZORPAY'}
                          </span>
                          {renderPaymentBadge(p.status || selectedOrder.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground font-mono">
                          <div>
                            <span>Payment ID: </span>
                            <span className="text-foreground">{p.provider_payment_id || p.provider_transaction_id || '—'}</span>
                          </div>
                          <div>
                            <span>Amount: </span>
                            <span className="text-foreground">{formatCurrency(p.amount || selectedOrder.total_amount, selectedOrder.currency)}</span>
                          </div>
                          {p.created_at && (
                            <div className="col-span-2">
                              <span>Verified: </span>
                              <span className="text-foreground">{formatDate(p.created_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/40 bg-muted/10 p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {selectedOrder.status === 'PAID'
                        ? 'Payment verified via server-side gateway confirmation.'
                        : 'Awaiting server-side Razorpay confirmation. Stock is currently reserved.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Fulfillment Actions & Audit */}
              <div className="space-y-3 border-t border-border/60 pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                  <Store className="w-3.5 h-3.5 text-primary" />
                  <span>Order Pickup & Fulfillment</span>
                </div>

                {selectedOrder.fulfilled_at && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-semibold">Order Collected by Member</p>
                      <p className="text-[11px] opacity-90">
                        Marked collected on {formatDate(selectedOrder.fulfilled_at)}
                        {selectedOrder.fulfilled_by_name ? ` by ${selectedOrder.fulfilled_by_name}` : ''}.
                      </p>
                    </div>
                  </div>
                )}

                {selectedOrder.status !== 'PAID' && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Unpaid Order Cannot Be Fulfilled</p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Under server data safety rules, orders cannot be marked ready for pickup or collected until verified gateway payment is received.
                      </p>
                    </div>
                  </div>
                )}

                {/* Staff Actions */}
                {selectedOrder.status === 'PAID' && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {selectedOrder.fulfillment_status === 'UNFULFILLED' && (
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs"
                        disabled={isUpdatingFulfillment}
                        onClick={() => handleFulfillTransition(selectedOrder.id, 'READY_FOR_PICKUP')}
                      >
                        <Store className="w-4 h-4" />
                        Mark Ready for Pickup
                      </Button>
                    )}

                    {selectedOrder.fulfillment_status === 'READY_FOR_PICKUP' && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs"
                        disabled={isUpdatingFulfillment}
                        onClick={() => handleFulfillTransition(selectedOrder.id, 'FULFILLED')}
                      >
                        <Check className="w-4 h-4" />
                        Mark Collected / Handed Over
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <SheetFooter className="border-t border-border/60 pt-4 flex sm:justify-between items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>
                  Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
