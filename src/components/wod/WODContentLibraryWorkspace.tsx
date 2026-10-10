import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Upload,
  Download,
  RefreshCw,
  Search,
  Filter,
  Tag as TagIcon,
  Video,
  Play,
  Edit3,
  Power,
  FileSpreadsheet,
  ShieldAlert,
  Sparkles,
  Check,
  X,
  ExternalLink,
  Layers,
  Info,
  Film,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts";
import { isOrganizationAdmin } from "@/lib/nav";
import {
  wodApi,
  type WorkoutContentItem,
  type WorkoutTag,
  type WODContentKind,
  type WODItemStatus,
  type WODImportPreviewResponse,
  type WODContentSummary,
  type WODTagGroup,
} from "@/api/endpoints/wodApi";
import { api } from "@/api/client";

const TAG_GROUPS: { code: WODTagGroup; label: string; requiredForMovement?: boolean }[] = [
  { code: "PROGRAM", label: "Program / Class Type", requiredForMovement: true },
  { code: "SECTION", label: "Workout Section", requiredForMovement: true },
  { code: "INTENSITY", label: "Intensity Level", requiredForMovement: true },
  { code: "MUSCLE_GROUP", label: "Muscle Group", requiredForMovement: true },
  { code: "BODY_TARGET", label: "Body Target" },
  { code: "USER_LEVEL", label: "User Level" },
  { code: "BREATHING", label: "Breathing Pattern" },
  { code: "EQUIPMENT", label: "Equipment" },
  { code: "MOVEMENT_FAMILY", label: "Movement Family" },
];

const CONTENT_KINDS: { value: WODContentKind; label: string }[] = [
  { value: "MOVEMENT", label: "Movement" },
  { value: "SETUP", label: "Setup" },
  { value: "INSTRUCTION", label: "Instruction" },
  { value: "TECHNIQUE", label: "Technique" },
  { value: "OTHER", label: "Other" },
];

const ITEM_STATUSES: { value: WODItemStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
];

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WODContentLibraryWorkspace() {
  const { user } = useAuth();
  const isAdmin = useMemo(
    () => Boolean(user?.isSuperAdmin || user?.userType === "platform" || isOrganizationAdmin(user)),
    [user]
  );

  // Active workspace tab: "library" | "tags"
  const [activeTab, setActiveTab] = useState<"library" | "tags">("library");

  // Data state
  const [items, setItems] = useState<WorkoutContentItem[]>([]);
  const [summary, setSummary] = useState<WODContentSummary>({
    total_count: 0,
    active_count: 0,
    wod_eligible_count: 0,
    complete_count: 0,
    incomplete_count: 0,
    needs_review_count: 0,
    setup_instruction_count: 0,
    missing_video_count: 0,
    video_downloaded_count: 0,
    video_failed_count: 0,
  });
  const [tags, setTags] = useState<WorkoutTag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncingVideos, setSyncingVideos] = useState<boolean>(false);

  // Pagination & Filters
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [search, setSearch] = useState<string>("");
  const [filterProgram, setFilterProgram] = useState<string>("");
  const [filterSection, setFilterSection] = useState<string>("");
  const [filterIntensity, setFilterIntensity] = useState<string>("");
  const [filterMuscle, setFilterMuscle] = useState<string>("");
  const [filterEquipment, setFilterEquipment] = useState<string>("");
  const [filterUserLevel, setFilterUserLevel] = useState<string>("");
  const [filterContentKind, setFilterContentKind] = useState<string>("");
  const [filterClassification, setFilterClassification] = useState<string>("");
  const [filterWodEligible, setFilterWodEligible] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterVideoStatus, setFilterVideoStatus] = useState<string>("");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<WorkoutContentItem | null>(null);
  const [previewItem, setPreviewItem] = useState<WorkoutContentItem | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [loadingVideoBlob, setLoadingVideoBlob] = useState<boolean>(false);

  // Excel Import Modal state
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<WODImportPreviewResponse | null>(null);
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"UPDATE" | "SKIP">("UPDATE");
  const [autoDownloadVideos, setAutoDownloadVideos] = useState<boolean>(true);

  // Tag Management state
  const [selectedTagGroup, setSelectedTagGroup] = useState<WODTagGroup>("PROGRAM");
  const [newTagName, setNewTagName] = useState<string>("");
  const [newTagDescription, setNewTagDescription] = useState<string>("");
  const [newTagOrder, setNewTagOrder] = useState<number>(10);
  const [editingTag, setEditingTag] = useState<WorkoutTag | null>(null);

  // Group tags by tag_group
  const tagsByGroup = useMemo(() => {
    const grouped: Record<string, WorkoutTag[]> = {};
    for (const g of TAG_GROUPS) {
      grouped[g.code] = [];
    }
    for (const t of tags) {
      if (!grouped[t.tag_group]) grouped[t.tag_group] = [];
      grouped[t.tag_group].push(t);
    }
    return grouped;
  }, [tags]);

  const loadTags = async () => {
    if (!isAdmin) return;
    try {
      const data = await wodApi.getTags();
      setTags(data);
    } catch (err: any) {
      console.error("Failed to load WOD tags:", err);
    }
  };

  const loadItems = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        page_size: 50,
      };
      if (search.trim()) params.search = search.trim();
      if (filterProgram) params.program = filterProgram;
      if (filterSection) params.section = filterSection;
      if (filterIntensity) params.intensity = filterIntensity;
      if (filterMuscle) params.muscle_group = filterMuscle;
      if (filterEquipment) params.equipment = filterEquipment;
      if (filterUserLevel) params.user_level = filterUserLevel;
      if (filterContentKind) params.content_kind = filterContentKind;
      if (filterClassification) params.classification_status = filterClassification;
      if (filterWodEligible !== "") params.is_wod_eligible = filterWodEligible;
      if (filterStatus) params.status = filterStatus;
      if (filterVideoStatus === "MISSING") {
        params.missing_video = "true";
      } else if (filterVideoStatus) {
        params.video_download_status = filterVideoStatus;
      }

      const res = await wodApi.getContentItems(params);
      setItems(res.results);
      setSummary(res.summary);
      setTotalPages(res.total_pages);
      setTotalCount(res.count);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.error || "Failed to load WOD Content Library");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void loadTags();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      void loadItems();
    }
  }, [
    isAdmin,
    page,
    search,
    filterProgram,
    filterSection,
    filterIntensity,
    filterMuscle,
    filterEquipment,
    filterUserLevel,
    filterContentKind,
    filterClassification,
    filterWodEligible,
    filterStatus,
    filterVideoStatus,
  ]);

  // Load authenticated video stream into blob URL when previewItem is opened
  useEffect(() => {
    if (videoBlobUrl) {
      URL.revokeObjectURL(videoBlobUrl);
      setVideoBlobUrl(null);
    }
    if (!previewItem || !previewItem.has_stored_video) return;

    let cancelled = false;
    setLoadingVideoBlob(true);
    api
      .get(`/tenant/wod/content-items/${previewItem.id}/stream-video/`, {
        responseType: "blob",
      })
      .then((res) => {
        if (cancelled) return;
        const blob = new Blob([res.data], { type: previewItem.video_mime_type || "video/mp4" });
        const url = URL.createObjectURL(blob);
        setVideoBlobUrl(url);
      })
      .catch((err) => {
        console.error("Failed to stream stored video:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingVideoBlob(false);
      });

    return () => {
      cancelled = true;
    };
  }, [previewItem?.id, previewItem?.has_stored_video, previewItem?.video_downloaded_at]);

  // Strict Admin-Only Guard
  if (!isAdmin) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-foreground">
          Access Restricted — Organization Admin Only
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The Workout of the Day (WOD) Content Library is currently restricted to Tenant / Organization Administrators.
        </p>
      </div>
    );
  }

  const clearFilters = () => {
    setSearch("");
    setFilterProgram("");
    setFilterSection("");
    setFilterIntensity("");
    setFilterMuscle("");
    setFilterEquipment("");
    setFilterUserLevel("");
    setFilterContentKind("");
    setFilterClassification("");
    setFilterWodEligible("");
    setFilterStatus("");
    setFilterVideoStatus("");
    setPage(1);
  };

  const handleToggleStatus = async (item: WorkoutContentItem) => {
    try {
      if (item.status === "ACTIVE") {
        await wodApi.deactivateContentItem(item.id);
        toast.success(`Deactivated "${item.movement_name}"`);
      } else {
        await wodApi.activateContentItem(item.id);
        toast.success(`Activated "${item.movement_name}"`);
      }
      void loadItems();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || "Failed to update status");
    }
  };

  const handleToggleWodEligibility = async (item: WorkoutContentItem) => {
    const target = !item.is_wod_eligible;
    try {
      await wodApi.setWodEligibility(item.id, target);
      toast.success(
        target
          ? `"${item.movement_name}" marked as WOD Eligible`
          : `"${item.movement_name}" removed from WOD Eligibility`
      );
      void loadItems();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || "Cannot mark item as WOD eligible");
    }
  };

  const handleDownloadSingleVideo = async (item: WorkoutContentItem) => {
    const toastId = toast.loading(`Downloading video for "${item.movement_name}"...`);
    try {
      const updated = await wodApi.downloadVideoFromLink(item.id);
      toast.success(`Video downloaded and stored for "${updated.movement_name}"`, { id: toastId });
      void loadItems();
      if (previewItem?.id === item.id) {
        setPreviewItem(updated);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || "Failed to download video from link";
      toast.error(msg, { id: toastId });
      void loadItems();
    }
  };

  const handleSyncPendingVideos = async () => {
    setSyncingVideos(true);
    const toastId = toast.loading("Downloading pending/failed videos from links...");
    try {
      const res = await wodApi.downloadPendingVideos();
      toast.success(
        `Processed ${res.processed_count} video links: ${res.completed_count} downloaded, ${res.failed_count} failed.`,
        { id: toastId }
      );
      void loadItems();
    } catch (err: any) {
      toast.error("Failed to sync pending videos", { id: toastId });
    } finally {
      setSyncingVideos(false);
    }
  };

  // --- Excel Import Handlers ---
  const handlePreviewExcel = async (file: File) => {
    setImportFile(file);
    setImportLoading(true);
    try {
      const preview = await wodApi.previewImport(file);
      setImportPreview(preview);
      toast.success(`Parsed ${preview.summary.total_rows} rows from "${file.name}"`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to parse Excel/CSV file");
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setImportLoading(true);
    try {
      const res = await wodApi.confirmImport({
        rows: importPreview.rows,
        duplicate_strategy: duplicateStrategy,
        auto_download_videos: autoDownloadVideos,
      });
      toast.success(
        `Import complete: ${res.created_count} created, ${res.updated_count} updated, ${res.downloaded_videos_count} videos downloaded.`
      );
      setIsImportOpen(false);
      setImportFile(null);
      setImportPreview(null);
      void loadTags();
      void loadItems();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to confirm import");
    } finally {
      setImportLoading(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const headers = [
      "Name of the movement",
      "Feedback",
      "Ideal for | Program",
      "Resistance | Springs",
      "Breathing",
      "Regression",
      "Regression link",
      "Movement ideal for | Section",
      "Intensity level",
      "Muscle working",
      "Shot by",
      "Shot date",
      "Editor",
      "Edit date",
      "Edit checked",
      "Requirement cut",
      "Video Link (Edited)",
      "Folder number",
      "Cues 1",
      "Cues 2",
      "Cues 3",
      "For Youtube | Public",
      "YT link (Private)",
      "Link to refer for shoot",
    ];
    const sampleRows = [
      [
        "Star Pose Right",
        "Approved",
        "Sweat Stretch",
        "1 Red 1 Blue",
        "Exhale - Natural",
        "Knee Down Star Pose",
        "",
        "Warm Up, Stretch",
        "Moderate",
        "Full Body, Balance",
        "Rohan",
        "2026-09-15",
        "Aarav",
        "2026-09-18",
        "Yes",
        "Clean 30s loop",
        "https://drive.google.com/file/d/1ExampleStarPoseVideo/view",
        "F-101",
        "Stack shoulders over wrist",
        "Lift hips and engage core",
        "Breathe steadily through ribcage",
        "No",
        "",
        "",
      ],
      [
        "How to wear Loop Band",
        "Setup guide",
        "Sweat Total",
        "Loop Band",
        "",
        "",
        "",
        "",
        "",
        "",
        "Rohan",
        "2026-09-15",
        "Aarav",
        "2026-09-18",
        "Yes",
        "Full instruction",
        "https://drive.google.com/file/d/1ExampleSetupLoopBand/view",
        "F-001",
        "Place loop band 2 inches above knees",
        "Ensure band lies flat without rolling",
        "",
        "No",
        "",
        "",
      ],
    ];
    const csvContent =
      [headers, ...sampleRows]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wod_content_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Tag Management Handlers ---
  const handleCreateOrUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) {
      toast.error("Tag name is required");
      return;
    }
    try {
      if (editingTag) {
        await wodApi.updateTag(editingTag.id, {
          tag_group: selectedTagGroup,
          name: newTagName.trim(),
          description: newTagDescription.trim() || null,
          display_order: Number(newTagOrder) || 0,
        });
        toast.success(`Updated tag "${newTagName.trim()}"`);
      } else {
        await wodApi.createTag({
          tag_group: selectedTagGroup,
          name: newTagName.trim(),
          description: newTagDescription.trim() || null,
          display_order: Number(newTagOrder) || 0,
          status: "ACTIVE",
        });
        toast.success(`Created tag "${newTagName.trim()}" in ${selectedTagGroup}`);
      }
      setNewTagName("");
      setNewTagDescription("");
      setNewTagOrder(10);
      setEditingTag(null);
      void loadTags();
    } catch (err: any) {
      toast.error(err?.response?.data?.code?.[0] || err?.response?.data?.detail || "Failed to save tag");
    }
  };

  const handleToggleTagStatus = async (tag: WorkoutTag) => {
    try {
      if (tag.status === "ACTIVE") {
        await wodApi.deactivateTag(tag.id);
        toast.success(`Deactivated tag "${tag.name}"`);
      } else {
        await wodApi.activateTag(tag.id);
        toast.success(`Activated tag "${tag.name}"`);
      }
      void loadTags();
      void loadItems();
    } catch (err: any) {
      toast.error("Failed to toggle tag status");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              WOD Phase 1 · Admin Content Studio
            </span>
            <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Organization Admin Only
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            Workout Content Library
          </h1>
          <p className="text-sm text-muted-foreground">
            Centralized repository for workout movements, setup/instructional videos, normalized multi-group tags, and automatic video link downloading.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("library")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "library"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Film className="h-3.5 w-3.5" />
              Content Library ({summary.total_count})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tags")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "tags"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TagIcon className="h-3.5 w-3.5" />
              Configurable Tags ({tags.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleSyncPendingVideos}
            disabled={syncingVideos}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50"
            title="Download and store videos for any items with Pending or Failed video links"
          >
            <Download className={`h-3.5 w-3.5 ${syncingVideos ? "animate-bounce" : ""}`} />
            Sync Video Links
          </button>

          <button
            type="button"
            onClick={() => {
              setImportFile(null);
              setImportPreview(null);
              setIsImportOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-accent"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Import Excel / CSV
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Content Item
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Total Library Items</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{summary.total_count}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {summary.active_count} Active · {summary.setup_instruction_count} Setup/Instruction
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">WOD Eligible</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{summary.wod_eligible_count}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Verified movements ready for WOD
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Classification Complete</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{summary.complete_count}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            All required tags & video present
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Incomplete / Needs Review</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {summary.incomplete_count + summary.needs_review_count}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {summary.incomplete_count} Incomplete · {summary.needs_review_count} Needs Review
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Videos Stored on Server</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{summary.video_downloaded_count}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Uploaded or downloaded from link
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Missing / Failed Video</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">
            {summary.missing_video_count + summary.video_failed_count}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {summary.missing_video_count} Missing · {summary.video_failed_count} Failed Link
          </p>
        </div>
      </div>

      {activeTab === "library" ? (
        <>
          {/* Filter Bar */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search movements, cues, feedback, folder #, shot by..."
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <select
                value={filterProgram}
                onChange={(e) => {
                  setFilterProgram(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
              >
                <option value="">All Programs</option>
                {(tagsByGroup["PROGRAM"] || []).map((t) => (
                  <option key={t.id} value={t.name}>
                    Program: {t.name}
                  </option>
                ))}
              </select>

              <select
                value={filterSection}
                onChange={(e) => {
                  setFilterSection(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
              >
                <option value="">All Sections</option>
                {(tagsByGroup["SECTION"] || []).map((t) => (
                  <option key={t.id} value={t.name}>
                    Section: {t.name}
                  </option>
                ))}
              </select>

              <select
                value={filterIntensity}
                onChange={(e) => {
                  setFilterIntensity(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
              >
                <option value="">All Intensities</option>
                {(tagsByGroup["INTENSITY"] || []).map((t) => (
                  <option key={t.id} value={t.name}>
                    Intensity: {t.name}
                  </option>
                ))}
              </select>

              <select
                value={filterMuscle}
                onChange={(e) => {
                  setFilterMuscle(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
              >
                <option value="">All Muscle / Body Targets</option>
                {[...(tagsByGroup["MUSCLE_GROUP"] || []), ...(tagsByGroup["BODY_TARGET"] || [])].map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.tag_group === "BODY_TARGET" ? "Target" : "Muscle"}: {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <select
                value={filterEquipment}
                onChange={(e) => {
                  setFilterEquipment(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="">All Equipment</option>
                {(tagsByGroup["EQUIPMENT"] || []).map((t) => (
                  <option key={t.id} value={t.name}>
                    Equipment: {t.name}
                  </option>
                ))}
              </select>

              <select
                value={filterUserLevel}
                onChange={(e) => {
                  setFilterUserLevel(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="">All User Levels</option>
                {(tagsByGroup["USER_LEVEL"] || []).map((t) => (
                  <option key={t.id} value={t.name}>
                    Level: {t.name}
                  </option>
                ))}
              </select>

              <select
                value={filterContentKind}
                onChange={(e) => {
                  setFilterContentKind(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="">All Content Kinds</option>
                {CONTENT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    Kind: {k.label}
                  </option>
                ))}
              </select>

              <select
                value={filterClassification}
                onChange={(e) => {
                  setFilterClassification(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="">All Classification Statuses</option>
                <option value="COMPLETE">Classification: Complete</option>
                <option value="INCOMPLETE">Classification: Incomplete</option>
                <option value="NEEDS_REVIEW">Classification: Needs Review</option>
              </select>

              <select
                value={filterWodEligible}
                onChange={(e) => {
                  setFilterWodEligible(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="">WOD Eligibility: All</option>
                <option value="true">WOD Eligible Only</option>
                <option value="false">Not WOD Eligible</option>
              </select>

              <select
                value={filterVideoStatus}
                onChange={(e) => {
                  setFilterVideoStatus(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="">Video Status: All</option>
                <option value="COMPLETED">Stored / Downloaded</option>
                <option value="PENDING">Pending Download</option>
                <option value="FAILED">Download Failed</option>
                <option value="MISSING">Missing Video</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="">All Statuses</option>
                {ITEM_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    Status: {s.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                Reset Filters
              </button>
            </div>
          </div>

          {/* Content Items Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Movement / Content</th>
                    <th className="px-3 py-3">Kind</th>
                    <th className="px-3 py-3">Program & Sections</th>
                    <th className="px-3 py-3">Intensity & Muscle / Target</th>
                    <th className="px-3 py-3">Breathing & Equipment</th>
                    <th className="px-3 py-3">Video Attachment</th>
                    <th className="px-3 py-3">Classification</th>
                    <th className="px-3 py-3">WOD Eligible</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                        Loading Workout Content Library...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                        No workout content items match the current filters. Click{" "}
                        <strong className="text-foreground">Add Content Item</strong> or{" "}
                        <strong className="text-foreground">Import Excel / CSV</strong> to populate the library.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const programs = item.tags_by_group?.["PROGRAM"] || [];
                      const sections = item.tags_by_group?.["SECTION"] || [];
                      const intensities = item.tags_by_group?.["INTENSITY"] || [];
                      const levels = item.tags_by_group?.["USER_LEVEL"] || [];
                      const muscles = [
                        ...(item.tags_by_group?.["MUSCLE_GROUP"] || []),
                        ...(item.tags_by_group?.["BODY_TARGET"] || []),
                      ];
                      const breathings = item.tags_by_group?.["BREATHING"] || [];
                      const equipments = item.tags_by_group?.["EQUIPMENT"] || [];

                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          {/* Movement Name & Cues */}
                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-foreground">{item.movement_name}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              {item.folder_number && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono">
                                  #{item.folder_number}
                                </span>
                              )}
                              {item.resistance_springs && (
                                <span>Springs: {item.resistance_springs}</span>
                              )}
                            </div>
                            {(item.cue_1 || item.cue_2) && (
                              <div className="mt-1 line-clamp-1 max-w-xs text-[11px] text-muted-foreground">
                                Cue: {item.cue_1 || item.cue_2}
                              </div>
                            )}
                          </td>

                          {/* Content Kind */}
                          <td className="px-3 py-3 align-top">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                item.content_kind === "MOVEMENT"
                                  ? "bg-blue-500/10 text-blue-600"
                                  : "bg-purple-500/10 text-purple-600"
                              }`}
                            >
                              {item.content_kind}
                            </span>
                          </td>

                          {/* Program & Section Tags */}
                          <td className="px-3 py-3 align-top space-y-1.5">
                            <div className="flex flex-wrap gap-1">
                              {programs.length > 0 ? (
                                programs.map((t) => (
                                  <span
                                    key={t.id}
                                    className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                                  >
                                    {t.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-muted-foreground/60">No Program</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {sections.map((t) => (
                                <span
                                  key={t.id}
                                  className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Intensity & Muscle/Target */}
                          <td className="px-3 py-3 align-top space-y-1.5">
                            <div className="flex flex-wrap gap-1">
                              {intensities.map((t) => (
                                <span
                                  key={t.id}
                                  className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400"
                                >
                                  {t.name}
                                </span>
                              ))}
                              {levels.map((t) => (
                                <span
                                  key={t.id}
                                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {muscles.map((t) => (
                                <span
                                  key={t.id}
                                  className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-400"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Breathing & Equipment */}
                          <td className="px-3 py-3 align-top space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {breathings.map((t) => (
                                <span
                                  key={t.id}
                                  className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-foreground"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {equipments.map((t) => (
                                <span
                                  key={t.id}
                                  className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 dark:text-cyan-400"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Video Attachment & Download Status */}
                          <td className="px-3 py-3 align-top">
                            {item.video_download_status === "COMPLETED" && item.has_stored_video ? (
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => setPreviewItem(item)}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                                >
                                  <Play className="h-3 w-3 fill-current" />
                                  {item.video_provider === "UPLOAD" ? "Uploaded Video" : "Downloaded Video"}
                                </button>
                                {item.video_file_size ? (
                                  <div className="text-[10px] text-muted-foreground">
                                    {formatBytes(item.video_file_size)}
                                  </div>
                                ) : null}
                              </div>
                            ) : item.video_download_status === "FAILED" ? (
                              <div className="space-y-1">
                                <span
                                  className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600"
                                  title={item.video_download_error || "Video download failed"}
                                >
                                  <XCircle className="h-3 w-3" />
                                  Download Failed
                                </span>
                                {item.video_download_error && (
                                  <p className="max-w-[160px] truncate text-[10px] text-rose-600" title={item.video_download_error}>
                                    {item.video_download_error}
                                  </p>
                                )}
                                {item.video_url && (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadSingleVideo(item)}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                                  >
                                    <RefreshCw className="h-2.5 w-2.5" /> Retry Download
                                  </button>
                                )}
                              </div>
                            ) : item.video_url ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                                  <Download className="h-3 w-3" />
                                  Pending Download
                                </span>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadSingleVideo(item)}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                                  >
                                    Download from Link
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                Missing Video
                              </span>
                            )}
                          </td>

                          {/* Classification Status */}
                          <td className="px-3 py-3 align-top">
                            {item.classification_status === "COMPLETE" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                                <CheckCircle2 className="h-3 w-3" />
                                COMPLETE
                              </span>
                            ) : item.classification_status === "NEEDS_REVIEW" ? (
                              <div className="space-y-1">
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600"
                                  title={(item.missing_requirements || []).join(", ")}
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  NEEDS REVIEW
                                </span>
                                {item.missing_requirements?.length > 0 && (
                                  <p className="max-w-[150px] truncate text-[10px] text-muted-foreground" title={item.missing_requirements.join(" • ")}>
                                    {item.missing_requirements[0]}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600"
                                  title={(item.missing_requirements || []).join(", ")}
                                >
                                  <Info className="h-3 w-3" />
                                  INCOMPLETE
                                </span>
                                {item.missing_requirements?.length > 0 && (
                                  <p className="max-w-[150px] truncate text-[10px] text-muted-foreground" title={item.missing_requirements.join(" • ")}>
                                    {item.missing_requirements[0]}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>

                          {/* WOD Eligible */}
                          <td className="px-3 py-3 align-top">
                            {item.content_kind !== "MOVEMENT" ? (
                              <span className="text-[11px] text-muted-foreground" title="Setup and instructional videos are never eligible for WOD generation">
                                N/A ({item.content_kind})
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleWodEligibility(item)}
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                  item.is_wod_eligible
                                    ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                                    : "border border-border bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                                }`}
                                title={
                                  item.missing_requirements?.length
                                    ? `Requires: ${item.missing_requirements.join(", ")}`
                                    : "Click to toggle WOD eligibility"
                                }
                              >
                                {item.is_wod_eligible ? (
                                  <>
                                    <Check className="h-3 w-3" /> Eligible
                                  </>
                                ) : (
                                  "Not Eligible"
                                )}
                              </button>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3 align-top">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                item.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : item.status === "INACTIVE"
                                  ? "bg-rose-500/10 text-rose-600"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 align-top text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPreviewItem(item)}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                                title="View Details & Play Video"
                              >
                                <Play className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsFormOpen(true);
                                }}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                                title="Edit Content Item"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item)}
                                className={`rounded-md p-1.5 hover:bg-accent ${
                                  item.status === "ACTIVE" ? "text-emerald-600" : "text-muted-foreground"
                                }`}
                                title={item.status === "ACTIVE" ? "Deactivate Item" : "Activate Item"}
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3 text-xs">
                <span className="text-muted-foreground">
                  Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} items)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-md border border-border bg-background px-3 py-1 font-medium disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-md border border-border bg-background px-3 py-1 font-medium disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Configurable Tags Tab */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Tag Group Sidebar + Create Form */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <h3 className="text-sm font-bold text-foreground">Tag Groups</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Select a group to view or add normalized tag values without schema changes.
              </p>
              <div className="mt-3 space-y-1">
                {TAG_GROUPS.map((g) => {
                  const count = (tagsByGroup[g.code] || []).length;
                  const active = selectedTagGroup === g.code;
                  return (
                    <button
                      key={g.code}
                      type="button"
                      onClick={() => {
                        setSelectedTagGroup(g.code);
                        setEditingTag(null);
                        setNewTagName("");
                        setNewTagDescription("");
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span>
                        {g.label}
                        {g.requiredForMovement && (
                          <span className={`ml-1 text-[10px] ${active ? "text-primary-foreground/80" : "text-amber-600"}`}>
                            *
                          </span>
                        )}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleCreateOrUpdateTag} className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-foreground">
                {editingTag ? `Edit Tag in ${selectedTagGroup}` : `New Tag in ${selectedTagGroup}`}
              </h3>
              <div>
                <label className="block text-xs font-medium text-foreground">Tag Name *</label>
                <input
                  type="text"
                  required
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g., Sweat Stretch, Warm Up, Exhale - Lift..."
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground">Display Order</label>
                <input
                  type="number"
                  value={newTagOrder}
                  onChange={(e) => setNewTagOrder(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={newTagDescription}
                  onChange={(e) => setNewTagDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {editingTag ? "Update Tag" : "Create Tag"}
                </button>
                {editingTag && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTag(null);
                      setNewTagName("");
                      setNewTagDescription("");
                      setNewTagOrder(10);
                    }}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Tag Values Table */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="border-b border-border px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {TAG_GROUPS.find((g) => g.code === selectedTagGroup)?.label} ({selectedTagGroup})
                </h3>
                <p className="text-xs text-muted-foreground">
                  {(tagsByGroup[selectedTagGroup] || []).length} configured tag values
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Tag Name</th>
                    <th className="px-3 py-2.5">Code</th>
                    <th className="px-3 py-2.5">Order</th>
                    <th className="px-3 py-2.5">Used By</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(tagsByGroup[selectedTagGroup] || []).map((tag) => (
                    <tr key={tag.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-semibold text-foreground">
                        {tag.name}
                        {tag.description && (
                          <div className="text-[11px] font-normal text-muted-foreground">{tag.description}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{tag.code}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{tag.display_order}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                          {tag.usage_count ?? 0} items
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            tag.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-rose-500/10 text-rose-600"
                          }`}
                        >
                          {tag.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTag(tag);
                              setNewTagName(tag.name);
                              setNewTagDescription(tag.description || "");
                              setNewTagOrder(tag.display_order || 10);
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                            title="Edit Tag"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleTagStatus(tag)}
                            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                            title={tag.status === "ACTIVE" ? "Deactivate Tag" : "Activate Tag"}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Content Item Modal */}
      {isFormOpen && (
        <ContentItemFormModal
          item={editingItem}
          tagsByGroup={tagsByGroup}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onSaved={() => {
            setIsFormOpen(false);
            setEditingItem(null);
            void loadTags();
            void loadItems();
          }}
          onTagCreated={() => {
            void loadTags();
          }}
        />
      )}

      {/* Video Player & Detail Drawer / Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                    {previewItem.content_kind}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold">
                    {previewItem.status}
                  </span>
                  {previewItem.is_wod_eligible && (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                      WOD Eligible
                    </span>
                  )}
                </div>
                <h2 className="mt-1 text-lg font-bold text-foreground">{previewItem.movement_name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Video Player Section */}
              <div className="overflow-hidden rounded-xl border border-border bg-black/95">
                {previewItem.has_stored_video ? (
                  loadingVideoBlob ? (
                    <div className="flex h-64 items-center justify-center text-xs text-white/80">
                      Loading stored video stream...
                    </div>
                  ) : videoBlobUrl ? (
                    <video
                      key={videoBlobUrl}
                      src={videoBlobUrl}
                      controls
                      autoPlay
                      className="max-h-[400px] w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-64 flex-col items-center justify-center gap-2 text-xs text-white/80">
                      <p>Stored video ready ({previewItem.video_file_name})</p>
                    </div>
                  )
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center gap-3 p-6 text-center text-white/80">
                    <Video className="h-10 w-10 text-white/40" />
                    <div className="text-sm font-medium">
                      {previewItem.video_download_status === "FAILED"
                        ? `Video download from link failed: ${previewItem.video_download_error || "Restricted or invalid URL"}`
                        : previewItem.video_url
                        ? "Video link saved — click below to download video file onto server"
                        : "No video uploaded or linked yet"}
                    </div>
                    {previewItem.video_url && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleVideo(previewItem)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download Video from Link Now
                        </button>
                        <a
                          href={previewItem.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs text-white hover:bg-white/10"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open Source Link
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Coaching Cues & Details */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">Cue 1</div>
                  <div className="mt-1 text-xs text-foreground">{previewItem.cue_1 || "—"}</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">Cue 2</div>
                  <div className="mt-1 text-xs text-foreground">{previewItem.cue_2 || "—"}</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">Cue 3</div>
                  <div className="mt-1 text-xs text-foreground">{previewItem.cue_3 || "—"}</div>
                </div>
              </div>

              {/* Normalized Tags */}
              <div className="rounded-xl border border-border p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Normalized Tags
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 text-xs">
                  {TAG_GROUPS.map((g) => {
                    const groupTags = previewItem.tags_by_group?.[g.code] || [];
                    return (
                      <div key={g.code}>
                        <div className="text-[11px] font-semibold text-muted-foreground">{g.label}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {groupTags.length > 0 ? (
                            groupTags.map((t) => (
                              <span
                                key={t.id}
                                className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                              >
                                {t.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-muted-foreground/50">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Additional Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-muted-foreground">Resistance / Springs:</span>
                  <div className="font-medium text-foreground">{previewItem.resistance_springs || "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Breathing Notes:</span>
                  <div className="font-medium text-foreground">{previewItem.breathing_notes || "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Regression:</span>
                  <div className="font-medium text-foreground">{previewItem.regression_text || "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Folder #:</span>
                  <div className="font-medium text-foreground">{previewItem.folder_number || "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Shot By / Date:</span>
                  <div className="font-medium text-foreground">
                    {previewItem.shot_by || "—"} {previewItem.shot_date ? `(${previewItem.shot_date})` : ""}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Editor / Date:</span>
                  <div className="font-medium text-foreground">
                    {previewItem.editor || "—"} {previewItem.edit_date ? `(${previewItem.edit_date})` : ""}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Edit Checked:</span>
                  <div className="font-medium text-foreground">{previewItem.edit_checked ? "Yes" : "No"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Video Provider / Status:</span>
                  <div className="font-medium text-foreground">
                    {previewItem.video_provider || "—"} ({previewItem.video_download_status})
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-3">
              <button
                type="button"
                onClick={() => {
                  const target = previewItem;
                  setPreviewItem(null);
                  setEditingItem(target);
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Item
              </button>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Preview & Confirm Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Import Workout Content from Excel / CSV
                </h2>
                <p className="text-xs text-muted-foreground">
                  Automatically normalizes multi-value tags, separates Setup/Instruction videos from Movements, and downloads videos from links.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Upload Box */}
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Select Excel (.xlsx) or CSV (.csv) Source File
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Supports columns: Name of the movement, Ideal for | Program, Movement ideal for | Section, Intensity level, Muscle working, Breathing, Video Link (Edited), Cues 1–3, etc.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Sample Template
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                    <Upload className="h-3.5 w-3.5" />
                    {importFile ? "Change File" : "Upload Excel / CSV"}
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handlePreviewExcel(f);
                      }}
                    />
                  </label>
                </div>
              </div>

              {importLoading && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Processing workout content spreadsheet and validating links...
                </div>
              )}

              {importPreview && (
                <div className="space-y-4">
                  {/* Preview Summary */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="text-[11px] text-muted-foreground">Total Rows</div>
                      <div className="text-lg font-bold">{importPreview.summary.total_rows}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="text-[11px] text-muted-foreground">Movements vs Setup</div>
                      <div className="text-lg font-bold text-blue-600">
                        {importPreview.summary.movement_rows} / {importPreview.summary.setup_instruction_rows}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="text-[11px] text-muted-foreground">Complete Rows</div>
                      <div className="text-lg font-bold text-emerald-600">
                        {importPreview.summary.complete_rows}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="text-[11px] text-muted-foreground">Missing / Broken Video</div>
                      <div className="text-lg font-bold text-rose-600">
                        {importPreview.summary.missing_video_rows + importPreview.summary.broken_video_rows}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="text-[11px] text-muted-foreground">Duplicates</div>
                      <div className="text-lg font-bold text-amber-600">
                        {importPreview.summary.duplicate_rows}
                      </div>
                    </div>
                  </div>

                  {/* Import Options */}
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">Duplicate Handling:</span>
                      <select
                        value={duplicateStrategy}
                        onChange={(e) => setDuplicateStrategy(e.target.value as "UPDATE" | "SKIP")}
                        className="rounded-md border border-input bg-background px-2.5 py-1 text-xs"
                      >
                        <option value="UPDATE">Update Existing Movements</option>
                        <option value="SKIP">Skip Duplicate Movements</option>
                      </select>
                    </div>

                    <label className="inline-flex items-center gap-2 font-medium text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoDownloadVideos}
                        onChange={(e) => setAutoDownloadVideos(e.target.checked)}
                        className="rounded border-input"
                      />
                      Automatically download & store video files from Video Links during import
                    </label>
                  </div>

                  {/* Preview Table */}
                  <div className="max-h-[340px] overflow-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-muted text-[11px] font-semibold uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Movement Name</th>
                          <th className="px-3 py-2">Detected Kind</th>
                          <th className="px-3 py-2">Normalized Tags</th>
                          <th className="px-3 py-2">Video Link</th>
                          <th className="px-3 py-2">Classification / Issues</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {importPreview.rows.map((r) => (
                          <tr key={r.row_number} className="hover:bg-muted/20">
                            <td className="px-3 py-2 font-mono text-muted-foreground">{r.row_number}</td>
                            <td className="px-3 py-2 font-semibold text-foreground">
                              {r.movement_name || <span className="text-rose-600">(Missing Name)</span>}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  r.content_kind === "MOVEMENT"
                                    ? "bg-blue-500/10 text-blue-600"
                                    : "bg-purple-500/10 text-purple-600"
                                }`}
                              >
                                {r.content_kind}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(r.tags_by_group || {}).flatMap(([grp, vals]) =>
                                  vals.map((v) => (
                                    <span
                                      key={`${grp}-${v}`}
                                      className="rounded bg-muted px-1.5 py-0.5 text-[10px]"
                                    >
                                      <strong className="text-muted-foreground">{grp}:</strong> {v}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {r.video_url ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                                  <Link2 className="h-3 w-3" /> {r.video_provider || "LINK"}
                                </span>
                              ) : (
                                <span className="text-[11px] text-rose-500">Missing</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  r.classification_status === "COMPLETE"
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : r.classification_status === "NEEDS_REVIEW"
                                    ? "bg-rose-500/10 text-rose-600"
                                    : "bg-amber-500/10 text-amber-600"
                                }`}
                              >
                                {r.classification_status}
                              </span>
                              {r.issues?.length > 0 && (
                                <div className="mt-1 text-[10px] text-muted-foreground">
                                  {r.issues.join(" • ")}
                                </div>
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

            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-3">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!importPreview || importLoading}
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
              >
                <Check className="h-4 w-4" />
                {importLoading ? "Importing & Downloading Videos..." : "Confirm Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===========================================================================
 * Create / Edit Workout Content Item Modal
 * Supports BOTH direct video file upload AND video link (with auto-download)
 * =========================================================================== */

interface ContentItemFormModalProps {
  item: WorkoutContentItem | null;
  tagsByGroup: Record<string, WorkoutTag[]>;
  onClose: () => void;
  onSaved: () => void;
  onTagCreated: () => void;
}

function ContentItemFormModal({
  item,
  tagsByGroup,
  onClose,
  onSaved,
  onTagCreated,
}: ContentItemFormModalProps) {
  const [movementName, setMovementName] = useState<string>(item?.movement_name || "");
  const [contentKind, setContentKind] = useState<WODContentKind>(item?.content_kind || "MOVEMENT");
  const [statusVal, setStatusVal] = useState<WODItemStatus>(item?.status || "ACTIVE");
  const [isWodEligible, setIsWodEligible] = useState<boolean>(item?.is_wod_eligible || false);

  const [description, setDescription] = useState<string>(item?.description || "");
  const [feedback, setFeedback] = useState<string>(item?.feedback || "");
  const [resistanceSprings, setResistanceSprings] = useState<string>(item?.resistance_springs || "");
  const [breathingNotes, setBreathingNotes] = useState<string>(item?.breathing_notes || "");
  const [regressionText, setRegressionText] = useState<string>(item?.regression_text || "");
  const [regressionUrl, setRegressionUrl] = useState<string>(item?.regression_url || "");

  // Video Attachment Mode: "link" | "upload"
  const [videoMode, setVideoMode] = useState<"link" | "upload">(
    item?.video_provider === "UPLOAD" && !item?.video_url ? "upload" : "link"
  );
  const [videoUrl, setVideoUrl] = useState<string>(item?.video_url || "");
  const [privateVideoUrl, setPrivateVideoUrl] = useState<string>(item?.private_video_url || "");
  const [videoFileUpload, setVideoFileUpload] = useState<File | null>(null);
  const [folderNumber, setFolderNumber] = useState<string>(item?.folder_number || "");

  const [cue1, setCue1] = useState<string>(item?.cue_1 || "");
  const [cue2, setCue2] = useState<string>(item?.cue_2 || "");
  const [cue3, setCue3] = useState<string>(item?.cue_3 || "");

  const [shotBy, setShotBy] = useState<string>(item?.shot_by || "");
  const [shotDate, setShotDate] = useState<string>(item?.shot_date || "");
  const [editor, setEditor] = useState<string>(item?.editor || "");
  const [editDate, setEditDate] = useState<string>(item?.edit_date || "");
  const [editChecked, setEditChecked] = useState<boolean>(item?.edit_checked || false);
  const [requirementCut, setRequirementCut] = useState<string>(item?.requirement_cut || "");
  const [youtubePublic, setYoutubePublic] = useState<boolean>(item?.youtube_public || false);
  const [referenceShootUrl, setReferenceShootUrl] = useState<string>(item?.reference_shoot_url || "");

  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    () => new Set((item?.tags || []).map((t) => t.id))
  );
  const [quickTagInputs, setQuickTagInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);

  const toggleTagId = (id: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleQuickAddTag = async (group: WODTagGroup) => {
    const val = (quickTagInputs[group] || "").trim();
    if (!val) return;
    try {
      const created = await wodApi.createTag({
        tag_group: group,
        name: val,
        status: "ACTIVE",
      });
      setSelectedTagIds((prev) => new Set(prev).add(created.id));
      setQuickTagInputs((prev) => ({ ...prev, [group]: "" }));
      onTagCreated();
      toast.success(`Added tag "${created.name}" to ${group}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.code?.[0] || "Failed to create tag");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementName.trim()) {
      toast.error("Movement name is required");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("movement_name", movementName.trim());
      formData.append("content_kind", contentKind);
      formData.append("status", statusVal);
      formData.append("is_wod_eligible", String(contentKind === "MOVEMENT" ? isWodEligible : false));
      formData.append("description", description);
      formData.append("feedback", feedback);
      formData.append("resistance_springs", resistanceSprings);
      formData.append("breathing_notes", breathingNotes);
      formData.append("regression_text", regressionText);
      formData.append("regression_url", regressionUrl);
      formData.append("video_url", videoUrl.trim());
      formData.append("private_video_url", privateVideoUrl.trim());
      formData.append("folder_number", folderNumber.trim());
      formData.append("cue_1", cue1);
      formData.append("cue_2", cue2);
      formData.append("cue_3", cue3);
      formData.append("shot_by", shotBy);
      if (shotDate) formData.append("shot_date", shotDate);
      formData.append("editor", editor);
      if (editDate) formData.append("edit_date", editDate);
      formData.append("edit_checked", String(editChecked));
      formData.append("requirement_cut", requirementCut);
      formData.append("youtube_public", String(youtubePublic));
      formData.append("reference_shoot_url", referenceShootUrl.trim());
      formData.append("tag_ids", JSON.stringify(Array.from(selectedTagIds)));

      if (videoFileUpload) {
        formData.append("video_file_upload", videoFileUpload);
      }

      if (item) {
        await wodApi.updateContentItem(item.id, formData);
        toast.success(`Updated "${movementName.trim()}"`);
      } else {
        await wodApi.createContentItem(formData);
        toast.success(`Created "${movementName.trim()}"`);
      }
      onSaved();
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Failed to save workout content item";
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {item ? `Edit Content: ${item.movement_name}` : "Create Workout Content Item"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Upload a video file directly or provide a video link (the platform will automatically download and store the video from the link).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Core Identity */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-foreground">Movement / Content Name *</label>
              <input
                type="text"
                required
                value={movementName}
                onChange={(e) => setMovementName(e.target.value)}
                placeholder="e.g., Star Pose Right, How to wear Loop Band..."
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
              />
            </div>

            <div>
              <label className="block font-semibold text-foreground">Content Kind *</label>
              <select
                value={contentKind}
                onChange={(e) => {
                  const k = e.target.value as WODContentKind;
                  setContentKind(k);
                  if (k !== "MOVEMENT") setIsWodEligible(false);
                }}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
              >
                {CONTENT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-foreground">Status *</label>
              <select
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value as WODItemStatus)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
              >
                {ITEM_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Video Attachment: Upload File OR Paste Link (Auto-Download) */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-primary" />
                  Video Attachment (Upload Video OR Paste Video Link)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Even if you paste an external link (e.g., Google Drive), the server automatically downloads and stores the video file.
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setVideoMode("link")}
                  className={`rounded-md px-3 py-1 text-[11px] font-semibold ${
                    videoMode === "link" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  Paste Video Link (Auto-Download)
                </button>
                <button
                  type="button"
                  onClick={() => setVideoMode("upload")}
                  className={`rounded-md px-3 py-1 text-[11px] font-semibold ${
                    videoMode === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  Upload Video File
                </button>
              </div>
            </div>

            {videoMode === "upload" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-medium text-foreground">Select Video File (.mp4, .mov, .webm)</label>
                  <input
                    type="file"
                    accept="video/*,.mp4,.mov,.webm,.m4v"
                    onChange={(e) => setVideoFileUpload(e.target.files?.[0] || null)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs"
                  />
                  {videoFileUpload && (
                    <p className="mt-1 text-[11px] text-emerald-600">
                      Selected: {videoFileUpload.name} ({formatBytes(videoFileUpload.size)})
                    </p>
                  )}
                  {item?.has_stored_video && !videoFileUpload && (
                    <p className="mt-1 text-[11px] text-emerald-600">
                      Currently stored on server: {item.video_file_name} ({formatBytes(item.video_file_size)})
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-medium text-foreground">Optional Source / Reference Video URL</label>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-foreground">
                    Video Link (Edited) — Google Drive or Direct Video URL
                  </label>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/.../view"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
                  />
                  {item?.has_stored_video && (
                    <p className="mt-1 text-[11px] text-emerald-600">
                      Stored copy on server: {item.video_file_name} ({formatBytes(item.video_file_size)})
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-medium text-foreground">Folder Number</label>
                  <input
                    type="text"
                    value={folderNumber}
                    onChange={(e) => setFolderNumber(e.target.value)}
                    placeholder="e.g., F-102"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Configurable Multi-Group Tags */}
          <div className="rounded-xl border border-border p-4 space-y-4">
            <div>
              <h3 className="font-bold text-foreground">
                Normalized Multi-Value Tags
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Select one or more tags per group. Movements require at least 1 tag in{" "}
                <strong>Program, Section, Intensity, and Muscle Group / Body Target</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {TAG_GROUPS.map((grp) => {
                const groupTags = (tagsByGroup[grp.code] || []).filter((t) => t.status === "ACTIVE");
                return (
                  <div key={grp.code} className="rounded-lg border border-border bg-muted/15 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {grp.label}
                        {grp.requiredForMovement && contentKind === "MOVEMENT" && (
                          <span className="ml-1 text-rose-500">*</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={quickTagInputs[grp.code] || ""}
                          onChange={(e) =>
                            setQuickTagInputs((prev) => ({ ...prev, [grp.code]: e.target.value }))
                          }
                          placeholder="+ Quick add tag"
                          className="w-28 rounded border border-input bg-background px-2 py-0.5 text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickAddTag(grp.code)}
                          className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {groupTags.map((t) => {
                        const selected = selectedTagIds.has(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleTagId(t.id)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                              selected
                                ? "bg-primary text-primary-foreground shadow-2xs"
                                : "border border-border bg-background text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {selected && <Check className="h-3 w-3" />}
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coaching Cues & Movement Notes */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-medium text-foreground">Cue 1</label>
              <input
                type="text"
                value={cue1}
                onChange={(e) => setCue1(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground">Cue 2</label>
              <input
                type="text"
                value={cue2}
                onChange={(e) => setCue2(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground">Cue 3</label>
              <input
                type="text"
                value={cue3}
                onChange={(e) => setCue3(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-medium text-foreground">Resistance | Springs</label>
              <input
                type="text"
                value={resistanceSprings}
                onChange={(e) => setResistanceSprings(e.target.value)}
                placeholder="e.g., 1 Red 1 Blue"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground">Breathing Notes</label>
              <input
                type="text"
                value={breathingNotes}
                onChange={(e) => setBreathingNotes(e.target.value)}
                placeholder="e.g., Exhale - Natural"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground">Feedback</label>
              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-medium text-foreground">Regression</label>
              <input
                type="text"
                value={regressionText}
                onChange={(e) => setRegressionText(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground">Regression Link</label>
              <input
                type="text"
                value={regressionUrl}
                onChange={(e) => setRegressionUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </div>
          </div>

          {/* Production Metadata */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block font-medium text-foreground">Shot By</label>
              <input
                type="text"
                value={shotBy}
                onChange={(e) => setShotBy(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground">Shot Date</label>
              <input
                type="date"
                value={shotDate}
                onChange={(e) => setShotDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground">Editor</label>
              <input
                type="text"
                value={editor}
                onChange={(e) => setEditor(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground">Edit Date</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="inline-flex items-center gap-2 font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={editChecked}
                onChange={(e) => setEditChecked(e.target.checked)}
              />
              Edit Checked
            </label>
            <label className="inline-flex items-center gap-2 font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={youtubePublic}
                onChange={(e) => setYoutubePublic(e.target.checked)}
              />
              For YouTube | Public
            </label>
            {contentKind === "MOVEMENT" && (
              <label className="inline-flex items-center gap-2 font-semibold text-emerald-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWodEligible}
                  onChange={(e) => setIsWodEligible(e.target.checked)}
                />
                Mark as WOD Eligible (requires ACTIVE + complete tags + video)
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {saving ? "Saving & Processing Video..." : item ? "Save Changes" : "Create Content Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
