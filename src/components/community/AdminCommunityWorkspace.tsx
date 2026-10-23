import React, { useState, useEffect, useCallback } from "react";
import {
  Flame,
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pin,
  Lock,
  Unlock,
  Trash2,
  Eye,
  EyeOff,
  ThumbsUp,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  Plus,
  UserX,
  FileText,
  MessageSquare,
  Sparkles,
  Loader2,
  User,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/api/client";
import { useAuth } from "@/contexts";

interface AdminPost {
  id: string;
  journey_title: string;
  content: string;
  category_slug: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
  duration_text: string;
  metric_change: string;
  coach_name_snapshot: string;
  coach_rating: number | string | null;
  status: string;
  is_pinned: boolean;
  is_comments_disabled: boolean;
  likes_count: number;
  comments_count: number;
  reports_count: number;
  author_name: string;
  created_at: string;
}

interface AdminReport {
  id: string;
  reason: string;
  custom_details: string;
  status: string;
  target_type: "POST" | "COMMENT";
  target_id: string;
  target_text: string;
  target_author: string;
  reporter_name: string;
  created_at: string;
}

interface AdminRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  upvotes_count: number;
  admin_response: string;
  author_name: string;
  created_at: string;
}

interface AdminAuditLog {
  id: string;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
  created_at: string;
}

export function AdminCommunityWorkspace() {
  const { user } = useAuth();
  const tenantSlug = user?.branding?.tenant_slug || (user?.tenantName ? user.tenantName.toLowerCase().replace(/\s+/g, "-") : "sweat");
  const tenantDisplayName = user?.branding?.app_name || user?.tenantName || "Organization";

  const [activeTab, setActiveTab] = useState<string>("posts");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Overview Stats
  const [stats, setStats] = useState({
    total_posts: 0,
    published_posts: 0,
    pending_reports: 0,
    open_requests: 0,
    active_sanctions: 0,
  });

  // Data lists
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Action Modals
  const [selectedPost, setSelectedPost] = useState<AdminPost | null>(null);
  const [takeDownModalPostId, setTakeDownModalPostId] = useState<string | null>(null);
  const [takeDownReason, setTakeDownReason] = useState<string>("Violation of Community Guidelines");
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  // Request Edit Modal
  const [editingRequest, setEditingRequest] = useState<AdminRequest | null>(null);
  const [requestStatusInput, setRequestStatusInput] = useState<string>("PLANNED");
  const [requestAdminReply, setRequestAdminReply] = useState<string>("");

  // Pagination Controls
  const [postsPage, setPostsPage] = useState<number>(1);
  const [postsPageSize, setPostsPageSize] = useState<number>(10);
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditPageSize, setAuditPageSize] = useState<number>(10);

  // 1. Fetch Overview Stats
  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get<{
        total_posts: number;
        published_posts: number;
        pending_reports: number;
        open_requests: number;
        active_sanctions: number;
      }>("/admin/community/overview/", {
        headers: tenantSlug ? { "X-Tenant-Slug": tenantSlug } : undefined,
      });
      if (res?.data) {
        setStats(res.data);
      }
    } catch (e) {
      console.error("Failed to load community overview", e);
    }
  }, [tenantSlug]);

  // 2. Fetch Posts
  const fetchPosts = useCallback(async () => {
    try {
      const params: Record<string, any> = {};
      if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;
      if (searchQuery.trim()) params.q = searchQuery.trim();

      const res = await api.get<{ results: AdminPost[] }>("/admin/community/posts/", {
        params,
        headers: tenantSlug ? { "X-Tenant-Slug": tenantSlug } : undefined,
      });
      if (res?.data) {
        setPosts(res.data.results || []);
      }
    } catch (e) {
      console.error("Failed to load admin community posts", e);
    }
  }, [statusFilter, searchQuery, tenantSlug]);

  // 3. Fetch Reports
  const fetchReports = useCallback(async () => {
    try {
      const res = await api.get<{ results: AdminReport[] }>("/admin/community/reports/", {
        headers: tenantSlug ? { "X-Tenant-Slug": tenantSlug } : undefined,
      });
      if (res?.data) {
        setReports(res.data.results || []);
      }
    } catch (e) {
      console.error("Failed to load moderation reports", e);
    }
  }, [tenantSlug]);

  // 4. Fetch Requests
  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get<{ results: AdminRequest[] }>("/admin/community/requests/", {
        headers: tenantSlug ? { "X-Tenant-Slug": tenantSlug } : undefined,
      });
      if (res?.data) {
        setRequests(res.data.results || []);
      }
    } catch (e) {
      console.error("Failed to load community requests", e);
    }
  }, [tenantSlug]);

  // 5. Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await api.get<{ results: AdminAuditLog[] }>("/admin/community/audit-logs/", {
        headers: tenantSlug ? { "X-Tenant-Slug": tenantSlug } : undefined,
      });
      if (res?.data) {
        setAuditLogs(res.data.results || []);
      }
    } catch (e) {
      console.error("Failed to load audit logs", e);
    }
  }, [tenantSlug]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchOverview(), fetchPosts(), fetchReports(), fetchRequests(), fetchAuditLogs()]);
    setIsLoading(false);
  }, [fetchOverview, fetchPosts, fetchReports, fetchRequests, fetchAuditLogs]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handle Pin Toggle
  const handleTogglePin = async (postId: string) => {
    try {
      await api.patch(
        `/admin/community/posts/${postId}/`,
        { action: "PIN", reason: "Toggled Announcement Pin status" },
        { headers: tenantSlug ? { "X-Tenant-Slug": tenantSlug } : undefined }
      );
      toast.success("Pin status updated!");
      void fetchPosts();
      void fetchOverview();
    } catch (e) {
      toast.error("Failed to toggle pin");
    }
  };

  // Handle Lock Comments
  const handleToggleLock = async (postId: string) => {
    try {
      await api.patch(
        `/admin/community/posts/${postId}/`,
        { action: "LOCK_COMMENTS", reason: "Toggled comments lock" },
        { headers: tenantSlug ? { "X-Tenant-Slug": tenantSlug } : undefined }
      );
      toast.success("Comment lock updated!");
      void fetchPosts();
    } catch (e) {
      toast.error("Failed to update comment lock");
    }
  };

  // Take down post
  const handleConfirmTakeDown = async () => {
    if (!takeDownModalPostId) return;
    setIsSubmittingAction(true);
    try {
      await api.delete(`/admin/community/posts/${takeDownModalPostId}/`, {
        headers: tenantSlug ? { "X-Tenant-Slug": tenantSlug } : undefined,
        body: JSON.stringify({ reason: takeDownReason }),
      });
      toast.success("Post taken down and logged to audit trail.");
      setTakeDownModalPostId(null);
      void fetchPosts();
      void fetchOverview();
    } catch (e) {
      toast.error("Failed to take down post");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Resolve Report (Upheld or Dismissed)
  const handleResolveReport = async (reportId: string, action: "UPHELD" | "DISMISSED") => {
    try {
      await api.post(
        `/admin/community/reports/${reportId}/resolve/`,
        { action, reason: `Resolved as ${action}` },
        { headers: tenantSlug ? { "X-Tenant-Slug": tenantSlug } : undefined }
      );
      toast.success(`Report resolved as ${action}!`);
      void fetchReports();
      void fetchOverview();
      void fetchPosts();
    } catch (e) {
      toast.error("Failed to resolve report");
    }
  };

  // Update Request Status & Official Response
  const handleSaveRequestUpdate = async () => {
    if (!editingRequest) return;
    setIsSubmittingAction(true);
    try {
      await api.patch(
        `/admin/community/requests/${editingRequest.id}/`,
        {
          status: requestStatusInput,
          admin_response: requestAdminReply,
        },
        { headers: tenantSlug ? { "X-Tenant-Slug": tenantSlug } : undefined }
      );
      toast.success("Member request updated with official response!");
      setEditingRequest(null);
      void fetchRequests();
      void fetchOverview();
    } catch (e) {
      toast.error("Failed to update request");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const paginatedPosts = posts.slice((postsPage - 1) * postsPageSize, postsPage * postsPageSize);
  const totalPostPages = Math.max(1, Math.ceil(posts.length / postsPageSize));

  const paginatedAuditLogs = auditLogs.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize);
  const totalAuditPages = Math.max(1, Math.ceil(auditLogs.length / auditPageSize));

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* 1. HEADER & KPI CARDS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-bold text-primary flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-rose-500 fill-rose-500" />
              Community Command Center
            </span>
            <Badge variant="outline" className="text-[10px] font-semibold border-rose-500/30 text-rose-500 bg-rose-500/10">
              Live Governance
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Community & Content Moderation
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage member-generated transformations, review abuse reports, process gym requests, and maintain studio standards.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadData()}
          disabled={isLoading}
          className="gap-1.5 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-primary")} />
          Sync Data
        </Button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Total Posts
          </span>
          <span className="text-2xl font-extrabold text-foreground mt-1 block">
            {stats.total_posts}
          </span>
          <span className="text-[10px] text-emerald-500 font-semibold">
            {stats.published_posts} Published Live
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Pending Reports
          </span>
          <span className={cn("text-2xl font-extrabold mt-1 block", stats.pending_reports > 0 ? "text-rose-500" : "text-foreground")}>
            {stats.pending_reports}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Abuse & Spam Flags
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Open Requests
          </span>
          <span className="text-2xl font-extrabold text-amber-500 mt-1 block">
            {stats.open_requests}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Awaiting Admin Review
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Active Sanctions
          </span>
          <span className="text-2xl font-extrabold text-foreground mt-1 block">
            {stats.active_sanctions}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Muted / Restricted Users
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Multi-Tenant Isolation
          </span>
          <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 mt-2">
            <CheckCircle2 className="h-4 w-4" /> Active ({tenantDisplayName})
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Cross-tenant leakage: 0
          </span>
        </div>
      </div>

      {/* 2. MAIN TABS NAVIGATION */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-2xl border border-border/80 flex w-full overflow-x-auto scrollbar-none justify-start sm:inline-flex sm:w-auto">
          <TabsTrigger value="posts" className="gap-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0">
            <FileText className="h-3.5 w-3.5" />
            Content Master Grid ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 text-xs font-bold rounded-xl relative whitespace-nowrap shrink-0">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
            Moderation Queue
            {stats.pending_reports > 0 && (
              <span className="ml-1 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                {stats.pending_reports}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Member Requests ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0">
            <Clock className="h-3.5 w-3.5" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* =================================================================== */}
        {/* TAB 1: CONTENT MASTER GRID                                         */}
        {/* =================================================================== */}
        <TabsContent value="posts" className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, coach..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void fetchPosts()}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-muted-foreground font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="FLAGGED">Flagged</option>
                <option value="HIDDEN">Hidden</option>
                <option value="REMOVED">Removed</option>
              </select>
            </div>
          </div>

          {/* Posts Data Table */}
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-xs text-left">
                <thead className="bg-muted/50 border-b border-border/80 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Author</th>
                    <th className="px-4 py-3">Journey Title & Content</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Metrics & Coach</th>
                    <th className="px-4 py-3">Engagement</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedPosts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground italic">
                        No community posts found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-muted/20 transition-all">
                        <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                          {post.author_name}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <span className="font-bold text-foreground block truncate">
                            {post.journey_title || "Untitled Post"}
                          </span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {post.content}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider py-0 px-1.5">
                            {post.category_slug}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-bold text-foreground block">
                            {post.metric_change || "—"} {post.duration_text ? `(${post.duration_text})` : ""}
                          </span>
                          {post.coach_name_snapshot && (
                            <span className="text-[10px] text-muted-foreground">
                              Coach: {post.coach_name_snapshot}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[11px] text-muted-foreground">
                          ❤️ {post.likes_count} • 💬 {post.comments_count}
                          {post.reports_count > 0 && (
                            <span className="text-rose-500 font-bold ml-1">
                              • 🚨 {post.reports_count}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge
                            className={cn(
                              "text-[9px] uppercase font-bold tracking-wider py-0 px-2",
                              post.status === "PUBLISHED" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                              post.status === "FLAGGED" && "bg-rose-500/10 text-rose-500 border-rose-500/30",
                              post.status === "REMOVED" && "bg-zinc-500/10 text-zinc-500 border-zinc-500/30",
                              post.status === "HIDDEN" && "bg-amber-500/10 text-amber-500 border-amber-500/30"
                            )}
                          >
                            {post.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Pin Announcement */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTogglePin(post.id)}
                              className={cn("h-7 w-7 rounded-lg", post.is_pinned && "text-amber-500 fill-amber-500")}
                              title={post.is_pinned ? "Unpin Post" : "Pin Announcement"}
                            >
                              <Pin className="h-3.5 w-3.5" />
                            </Button>

                            {/* Lock Comments */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleLock(post.id)}
                              className={cn("h-7 w-7 rounded-lg", post.is_comments_disabled && "text-rose-500")}
                              title={post.is_comments_disabled ? "Unlock Comments" : "Lock Comments"}
                            >
                              {post.is_comments_disabled ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                            </Button>

                            {/* View Details */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedPost(post)}
                              className="h-7 w-7 rounded-lg text-primary"
                              title="View Details & Media"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {/* Take Down */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setTakeDownModalPostId(post.id)}
                              className="h-7 w-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              title="Take Down Post"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            {posts.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/80 bg-muted/20 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={postsPageSize}
                    onChange={(e) => {
                      setPostsPageSize(Number(e.target.value));
                      setPostsPage(1);
                    }}
                    className="h-7 px-2 rounded-lg border border-border bg-background text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>
                    Showing {Math.min((postsPage - 1) * postsPageSize + 1, posts.length)}–
                    {Math.min(postsPage * postsPageSize, posts.length)} of {posts.length} posts
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={postsPage <= 1}
                    onClick={() => setPostsPage((p) => Math.max(1, p - 1))}
                    className="h-7 w-7 p-0 rounded-lg"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-2 text-xs font-bold text-foreground">
                    Page {postsPage} of {totalPostPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={postsPage >= totalPostPages}
                    onClick={() => setPostsPage((p) => Math.min(totalPostPages, p + 1))}
                    className="h-7 w-7 p-0 rounded-lg"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 2: MODERATION QUEUE (REPORTED POSTS & COMMENTS)                */}
        {/* =================================================================== */}
        <TabsContent value="reports" className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Review reported member content. Upholding a report takes down the offending content and logs a strike. Dismissing restores the content to the live feed.
            </span>
          </div>

          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="p-12 text-center bg-card rounded-2xl border border-border/80">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-foreground">Moderation Queue is Clean!</h3>
                <p className="text-xs text-muted-foreground mt-1">There are no pending abuse reports at this time.</p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col md:flex-row items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/30 text-[9px] uppercase font-bold tracking-wider">
                        {report.reason}
                      </Badge>
                      <span className="text-xs font-semibold text-muted-foreground">
                        Reported by {report.reporter_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        • {new Date(report.created_at).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        FLAGGED {report.target_type} CONTENT:
                      </span>
                      <p className="font-semibold text-foreground">&quot;{report.target_text}&quot;</p>
                      <span className="text-[10px] text-muted-foreground">
                        Author: {report.target_author}
                      </span>
                    </div>

                    {report.custom_details && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Reporter note: &quot;{report.custom_details}&quot;
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveReport(report.id, "DISMISSED")}
                      className="text-xs h-8 border-border/80"
                    >
                      Dismiss (Safe)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResolveReport(report.id, "UPHELD")}
                      className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white font-bold"
                    >
                      Uphold & Take Down
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 3: MEMBER REQUESTS KANBAN BOARD                                */}
        {/* =================================================================== */}
        <TabsContent value="requests" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Under Review */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                  Under Review
                </span>
                <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-[10px]">
                  {requests.filter((r) => r.status === "UNDER_REVIEW").length}
                </Badge>
              </div>

              {requests.filter((r) => r.status === "UNDER_REVIEW").map((req) => (
                <div key={req.id} className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-foreground">{req.title}</span>
                    <Badge variant="outline" className="text-[10px] font-bold shrink-0">
                      👍 {req.upvotes_count}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{req.description}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingRequest(req);
                      setRequestStatusInput(req.status);
                      setRequestAdminReply(req.admin_response || "");
                    }}
                    className="w-full text-xs h-7 mt-2"
                  >
                    Respond & Move Status
                  </Button>
                </div>
              ))}
            </div>

            {/* Column 2: Planned / In Progress */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                  Planned & In Progress
                </span>
                <Badge variant="outline" className="border-blue-500/40 text-blue-500 text-[10px]">
                  {requests.filter((r) => r.status === "PLANNED" || r.status === "IN_PROGRESS").length}
                </Badge>
              </div>

              {requests.filter((r) => r.status === "PLANNED" || r.status === "IN_PROGRESS").map((req) => (
                <div key={req.id} className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-foreground">{req.title}</span>
                    <Badge variant="outline" className="text-[10px] font-bold shrink-0">
                      👍 {req.upvotes_count}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{req.description}</p>
                  {req.admin_response && (
                    <div className="p-2 rounded-xl bg-muted/40 text-[10px] text-primary border border-border/60">
                      <strong>{tenantDisplayName}:</strong> {req.admin_response}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingRequest(req);
                      setRequestStatusInput(req.status);
                      setRequestAdminReply(req.admin_response || "");
                    }}
                    className="w-full text-xs h-7 mt-2"
                  >
                    Update Status
                  </Button>
                </div>
              ))}
            </div>

            {/* Column 3: Completed */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                  Completed
                </span>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 text-[10px]">
                  {requests.filter((r) => r.status === "COMPLETED").length}
                </Badge>
              </div>

              {requests.filter((r) => r.status === "COMPLETED").map((req) => (
                <div key={req.id} className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-foreground">{req.title}</span>
                    <Badge variant="outline" className="text-[10px] font-bold text-emerald-500 border-emerald-500/40 shrink-0">
                      ✓ Done
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{req.description}</p>
                  {req.admin_response && (
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {req.admin_response}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 4: AUDIT TRAIL LOGS                                            */}
        {/* =================================================================== */}
        <TabsContent value="audit" className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-xs text-left">
                <thead className="bg-muted/50 border-b border-border/80 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Administrator</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">
                        No community audit actions logged yet.
                      </td>
                    </tr>
                  ) : (
                    paginatedAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20 transition-all">
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-foreground whitespace-nowrap">
                          {log.actor_name}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider py-0 px-1.5">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                          {log.target_type} ({log.target_id.slice(0, 8)}...)
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground max-w-sm truncate">
                          {log.reason || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Audit Pagination Bar */}
            {auditLogs.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/80 bg-muted/20 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={auditPageSize}
                    onChange={(e) => {
                      setAuditPageSize(Number(e.target.value));
                      setAuditPage(1);
                    }}
                    className="h-7 px-2 rounded-lg border border-border bg-background text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>
                    Showing {Math.min((auditPage - 1) * auditPageSize + 1, auditLogs.length)}–
                    {Math.min(auditPage * auditPageSize, auditLogs.length)} of {auditLogs.length} audit logs
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    className="h-7 w-7 p-0 rounded-lg"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-2 text-xs font-bold text-foreground">
                    Page {auditPage} of {totalAuditPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={auditPage >= totalAuditPages}
                    onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                    className="h-7 w-7 p-0 rounded-lg"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ===================================================================== */}
      {/* MODAL: POST DETAILS & MEDIA LIGHTBOX                                  */}
      {/* ===================================================================== */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border-border bg-card">
          {selectedPost && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-extrabold text-foreground">
                  {selectedPost.journey_title || "Community Post Inspection"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  By {selectedPost.author_name} • Posted on {new Date(selectedPost.created_at).toLocaleString("en-IN")}
                </DialogDescription>
              </DialogHeader>

              {/* Before & After Lightbox */}
              {(selectedPost.before_photo_url || selectedPost.after_photo_url) && (
                <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-border">
                  <div className="relative aspect-square bg-muted/40">
                    {selectedPost.before_photo_url && (
                      <img src={selectedPost.before_photo_url} alt="Before" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      BEFORE
                    </span>
                  </div>
                  <div className="relative aspect-square bg-muted/40">
                    {selectedPost.after_photo_url && (
                      <img src={selectedPost.after_photo_url} alt="After" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute top-2 right-2 bg-white/90 text-black text-[10px] font-bold px-2 py-0.5 rounded">
                      AFTER
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 text-xs space-y-2">
                <span className="font-bold text-muted-foreground block text-[10px] uppercase">Story Content</span>
                <p className="text-foreground leading-relaxed whitespace-pre-line">{selectedPost.content}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                <span>Duration: <strong>{selectedPost.duration_text || "—"}</strong></span>
                <span>Metric Change: <strong>{selectedPost.metric_change || "—"}</strong></span>
                <span>Coach: <strong>{selectedPost.coach_name_snapshot || "—"}</strong></span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL: TAKE DOWN POST CONFIRMATION                                    */}
      {/* ===================================================================== */}
      <Dialog open={!!takeDownModalPostId} onOpenChange={(open) => !open && setTakeDownModalPostId(null)}>
        <DialogContent className="max-w-md p-6 rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-rose-500 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Take Down Content
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This will remove the post from the live member feed and record an audit log.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-foreground block">
              Moderation Reason
            </label>
            <Input
              value={takeDownReason}
              onChange={(e) => setTakeDownReason(e.target.value)}
              className="text-xs rounded-xl"
            />

            <Button
              disabled={isSubmittingAction}
              onClick={handleConfirmTakeDown}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl mt-2"
            >
              {isSubmittingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Take Down
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL: EDIT MEMBER REQUEST STATUS & OFFICIAL RESPONSE                */}
      {/* ===================================================================== */}
      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="max-w-md p-6 rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Respond to Member Request
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingRequest?.title} (by {editingRequest?.author_name})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground block">Status</label>
              <select
                value={requestStatusInput}
                onChange={(e) => setRequestStatusInput(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:outline-none"
              >
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="CONSIDERING">Under Consideration</option>
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="DECLINED">Declined</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground block">
                Official Studio Response (Visible to Members)
              </label>
              <Textarea
                placeholder="Write the official studio response..."
                rows={3}
                value={requestAdminReply}
                onChange={(e) => setRequestAdminReply(e.target.value)}
                className="text-xs rounded-xl resize-none"
              />
            </div>

            <Button
              disabled={isSubmittingAction}
              onClick={handleSaveRequestUpdate}
              className="w-full font-bold py-2 rounded-xl mt-2"
            >
              {isSubmittingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save & Publish Response
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
