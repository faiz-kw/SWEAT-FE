import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Plus,
  RefreshCw,
  MoreVertical,
  ExternalLink,
  MessageSquare,
  User,
  Phone,
  Mail,
  ShieldAlert,
  ChevronRight,
  Globe,
  CreditCard,
  Building,
} from 'lucide-react';
import { ticketsApi } from '@/api/endpoints/ticketsApi';
import type {
  SupportTicket,
  TicketStatus,
  TicketCategory,
  TicketPriority,
  CreateTicketPayload,
} from '@/types/tickets';
import { PageHeader, PageBody, KpiTile } from '@/components/enterprise/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const TicketsWorkspace: React.FC = () => {
  const queryClient = useQueryClient();

  // Filters & Search
  const [activeStatusTab, setActiveStatusTab] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Drawers
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Edit / Resolution State
  const [editStatus, setEditStatus] = useState<TicketStatus>('OPEN');
  const [editPriority, setEditPriority] = useState<TicketPriority>('MEDIUM');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Create Form State
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<TicketCategory>('PASSPORT_PURCHASE');
  const [newPriority, setNewPriority] = useState<TicketPriority>('HIGH');
  const [newDescription, setNewDescription] = useState('');
  const [newMemberProfileId, setNewMemberProfileId] = useState('');

  // Queries
  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['ticket-metrics'],
    queryFn: () => ticketsApi.getMetrics(),
    refetchInterval: 30000,
  });

  const { data: ticketsData, isLoading, isFetching, refetch: refetchTickets } = useQuery({
    queryKey: ['tickets', activeStatusTab, categoryFilter, priorityFilter, searchTerm],
    queryFn: () =>
      ticketsApi.getTickets({
        status: activeStatusTab === 'ALL' ? undefined : activeStatusTab,
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
        search: searchTerm.trim() || undefined,
      }),
  });

  // Mutations
  const updateTicketMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      ticketsApi.updateTicket(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-metrics'] });
      setSelectedTicket(updated);
    },
  });

  const resolveTicketMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      ticketsApi.resolveTicket(id, notes),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-metrics'] });
      setSelectedTicket(updated);
      setEditStatus('RESOLVED');
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: (payload: CreateTicketPayload) => ticketsApi.createTicket(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-metrics'] });
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
  });

  const resetCreateForm = () => {
    setNewSubject('');
    setNewCategory('PASSPORT_PURCHASE');
    setNewPriority('HIGH');
    setNewDescription('');
    setNewMemberProfileId('');
  };

  const handleOpenDrawer = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setEditStatus(ticket.status);
    setEditPriority(ticket.priority);
    setResolutionNotes(ticket.resolution_notes || '');
    setIsDrawerOpen(true);
  };

  const handleSaveTicketDetails = () => {
    if (!selectedTicket) return;
    updateTicketMutation.mutate({
      id: selectedTicket.id,
      payload: {
        status: editStatus,
        priority: editPriority,
        resolution_notes: resolutionNotes,
      },
    });
  };

  const handleQuickResolve = (ticketId: string) => {
    resolveTicketMutation.mutate({
      id: ticketId,
      notes: 'Quick-resolved by studio operations.',
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMemberProfileId.trim()) return;
    createTicketMutation.mutate({
      user_profile: newMemberProfileId.trim(),
      category: newCategory,
      priority: newPriority,
      subject: newSubject.trim(),
      description: newDescription.trim(),
    });
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Open</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">In Progress</Badge>;
      case 'RESOLVED':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Resolved</Badge>;
      case 'CLOSED':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'URGENT':
        return <Badge className="bg-rose-600 text-white hover:bg-rose-700">Urgent</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-500 text-white hover:bg-orange-600">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">Medium</Badge>;
      case 'LOW':
        return <Badge variant="outline" className="text-muted-foreground">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getCategoryBadge = (category: TicketCategory) => {
    switch (category) {
      case 'PASSPORT_PURCHASE':
        return (
          <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
            <Globe className="w-3 h-3" /> Passport Purchase
          </Badge>
        );
      case 'MEMBERSHIP_INQUIRY':
        return (
          <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> Membership
          </Badge>
        );
      case 'CLASS_BOOKING':
        return (
          <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Class Booking
          </Badge>
        );
      case 'BILLING_PAYMENT':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> Billing
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> General
          </Badge>
        );
    }
  };

  const ticketsList = ticketsData?.results || [];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Support & Member Tickets"
        description="Query and process member inquiries, cross-branch passport purchase requests, and operational support tickets."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchTickets();
                refetchMetrics();
              }}
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
            </Button>
          </div>
        }
      />

      <PageBody>
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiTile
            title="Open Tickets"
            value={metrics?.total_open ?? 0}
            subtitle="Awaiting response"
            icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
          />
          <KpiTile
            title="In Progress"
            value={metrics?.total_in_progress ?? 0}
            subtitle="Under active review"
            icon={<Clock className="w-5 h-5 text-blue-500" />}
          />
          <KpiTile
            title="Passport Inquiries"
            value={metrics?.passport_requests_pending ?? 0}
            subtitle="Cross-branch purchase requests"
            icon={<Globe className="w-5 h-5 text-indigo-400" />}
          />
          <KpiTile
            title="Resolved Today"
            value={metrics?.resolved_today ?? 0}
            subtitle="Completed sessions/issues"
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          />
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-card border rounded-lg p-4 mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search ticket #, member name, phone, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>

            {/* Category Dropdown Filter */}
            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Category: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="PASSPORT_PURCHASE">Passport Purchase</SelectItem>
                  <SelectItem value="MEMBERSHIP_INQUIRY">Membership Inquiry</SelectItem>
                  <SelectItem value="CLASS_BOOKING">Class Booking</SelectItem>
                  <SelectItem value="BILLING_PAYMENT">Billing & Payment</SelectItem>
                  <SelectItem value="GENERAL_INQUIRY">General Inquiry</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Dropdown Filter */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="Priority: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priorities</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status Tab Bar */}
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
              <Button
                key={st}
                variant={activeStatusTab === st ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveStatusTab(st)}
                className="text-xs font-medium"
              >
                {st === 'ALL' ? 'All Tickets' : st.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-primary" />
              <p>Loading tickets...</p>
            </div>
          ) : ticketsList.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <Ticket className="w-12 h-12 stroke-[1.2] mb-3 text-muted-foreground/60" />
              <h3 className="font-semibold text-lg text-foreground">No Tickets Found</h3>
              <p className="text-sm max-w-sm mt-1">
                No tickets matching your current query filters. When members raise passport requests or support inquiries, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ticketsList.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenDrawer(t)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-medium text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                          {t.ticket_number}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-foreground">{t.member_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          {t.member_phone && <span>{t.member_phone}</span>}
                          {t.active_package_name && (
                            <span className="text-[10px] bg-secondary px-1.5 py-0.2 rounded text-secondary-foreground font-medium">
                              {t.active_package_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getCategoryBadge(t.category)}
                      </td>
                      <td className="px-4 py-3.5 max-w-[260px] truncate">
                        <div className="font-medium text-foreground truncate">{t.subject}</div>
                        <div className="text-xs text-muted-foreground truncate">{t.description || 'No additional details.'}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getPriorityBadge(t.priority)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStatusBadge(t.status)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {t.status !== 'RESOLVED' && t.status !== 'CLOSED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                              onClick={() => handleQuickResolve(t.id)}
                            >
                              Resolve
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleOpenDrawer(t)}
                          >
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageBody>

      {/* Ticket Details & Resolution Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto w-full">
          {selectedTicket && (
            <div className="space-y-6 pt-2">
              <SheetHeader>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-medium text-xs text-primary bg-primary/10 px-2.5 py-1 rounded">
                    {selectedTicket.ticket_number}
                  </span>
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
                <SheetTitle className="text-xl font-bold mt-2">
                  {selectedTicket.subject}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Created {new Date(selectedTicket.created_at).toLocaleString()}
                </SheetDescription>
              </SheetHeader>

              {/* Member Context Card */}
              <div className="bg-muted/40 border rounded-lg p-4 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Member Details
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Name</span>
                    <span className="font-medium">{selectedTicket.member_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Member #</span>
                    <span className="font-mono text-xs">{selectedTicket.member_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Phone</span>
                    <span>{selectedTicket.member_phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Email</span>
                    <span className="truncate block">{selectedTicket.member_email || 'N/A'}</span>
                  </div>
                  <div className="col-span-2 border-t pt-2 mt-1">
                    <span className="text-xs text-muted-foreground block">Active Package</span>
                    <span className="font-medium text-primary">
                      {selectedTicket.active_package_name || 'No active package registered'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category & Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </Label>
                  {getCategoryBadge(selectedTicket.category)}
                </div>
                <div className="p-3 bg-muted/20 border rounded-md text-sm whitespace-pre-wrap">
                  {selectedTicket.description || 'No detailed message provided.'}
                </div>
              </div>

              {/* Status & Priority Modifiers */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <Label htmlFor="ticket-status" className="text-xs font-medium mb-1.5 block">
                    Update Status
                  </Label>
                  <Select
                    value={editStatus}
                    onValueChange={(val) => setEditStatus(val as TicketStatus)}
                  >
                    <SelectTrigger id="ticket-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ticket-priority" className="text-xs font-medium mb-1.5 block">
                    Priority
                  </Label>
                  <Select
                    value={editPriority}
                    onValueChange={(val) => setEditPriority(val as TicketPriority)}
                  >
                    <SelectTrigger id="ticket-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Resolution Notes */}
              <div className="space-y-1.5 border-t pt-4">
                <Label htmlFor="resolution-notes" className="text-xs font-medium block">
                  Internal Operations / Resolution Notes
                </Label>
                <Textarea
                  id="resolution-notes"
                  placeholder="Record outcome, passport session approval reference, or notes..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  className="bg-background text-sm"
                />
              </div>

              {/* Drawer Actions */}
              <div className="flex items-center justify-between gap-3 border-t pt-4">
                {editStatus !== 'RESOLVED' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={() => {
                      setEditStatus('RESOLVED');
                      resolveTicketMutation.mutate({
                        id: selectedTicket.id,
                        notes: resolutionNotes || 'Resolved by studio operations.',
                      });
                    }}
                    disabled={resolveTicketMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Resolved
                  </Button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <Button variant="ghost" onClick={() => setIsDrawerOpen(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={handleSaveTicketDetails}
                    disabled={updateTicketMutation.isPending}
                  >
                    {updateTicketMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Ticket Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Log New Member Ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <Label htmlFor="create-member-id" className="text-xs font-medium mb-1 block">
                Member Profile ID *
              </Label>
              <Input
                id="create-member-id"
                placeholder="Paste User Profile UUID..."
                value={newMemberProfileId}
                onChange={(e) => setNewMemberProfileId(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="create-category" className="text-xs font-medium mb-1 block">
                  Category *
                </Label>
                <Select
                  value={newCategory}
                  onValueChange={(val) => setNewCategory(val as TicketCategory)}
                >
                  <SelectTrigger id="create-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASSPORT_PURCHASE">Passport Purchase</SelectItem>
                    <SelectItem value="MEMBERSHIP_INQUIRY">Membership Inquiry</SelectItem>
                    <SelectItem value="CLASS_BOOKING">Class Booking</SelectItem>
                    <SelectItem value="BILLING_PAYMENT">Billing & Payment</SelectItem>
                    <SelectItem value="GENERAL_INQUIRY">General Inquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="create-priority" className="text-xs font-medium mb-1 block">
                  Priority *
                </Label>
                <Select
                  value={newPriority}
                  onValueChange={(val) => setNewPriority(val as TicketPriority)}
                >
                  <SelectTrigger id="create-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="create-subject" className="text-xs font-medium mb-1 block">
                Subject / Summary *
              </Label>
              <Input
                id="create-subject"
                placeholder="e.g. Request to purchase passport sessions for Bandra branch"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="create-desc" className="text-xs font-medium mb-1 block">
                Description / Member Note
              </Label>
              <Textarea
                id="create-desc"
                placeholder="Details of inquiry or phone call..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTicketMutation.isPending}>
                {createTicketMutation.isPending ? 'Submitting...' : 'Create Ticket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
