import * as React from "react";
import {
  Image, Film, Music, Plus, RefreshCw, Edit2, Trash2, ExternalLink,
  CheckCircle2, AlertCircle, Play, Eye, Sparkles, Layers, Sliders,
  ArrowUpDown, UploadCloud, Tag, Check, Copy
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { PageHeader, PageBody, KpiTile } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { cmsApi } from "@/api/endpoints/cmsApi";
import { CMSBanner, ProgramCategoryMedia, CMSMediaAsset } from "@/types/cms";

export function CmsWorkspace() {
  const [activeTab, setActiveTab] = React.useState<"banners" | "categories" | "media">("banners");
  const [loading, setLoading] = React.useState(true);

  // Data states
  const [banners, setBanners] = React.useState<CMSBanner[]>([]);
  const [categories, setCategories] = React.useState<ProgramCategoryMedia[]>([]);
  const [mediaAssets, setMediaAssets] = React.useState<CMSMediaAsset[]>([]);

  // Filter & Search
  const [mediaTypeFilter, setMediaTypeFilter] = React.useState<string>("ALL");
  const [mediaSearch, setMediaSearch] = React.useState<string>("");

  // Modals
  const [bannerModalOpen, setBannerModalOpen] = React.useState(false);
  const [editingBanner, setEditingBanner] = React.useState<CMSBanner | null>(null);
  const [mediaSourceMode, setMediaSourceMode] = React.useState<'upload' | 'url'>('upload');
  const [isUploadingBannerMedia, setIsUploadingBannerMedia] = React.useState(false);
  const bannerFileInputRef = React.useRef<HTMLInputElement>(null);
  const [categoryModalOpen, setCategoryModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<ProgramCategoryMedia | null>(null);
  const [mediaModalOpen, setMediaModalOpen] = React.useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = React.useState<{ url: string; type: string; title: string } | null>(null);

  // Form states
  const [bannerForm, setBannerForm] = React.useState<Partial<CMSBanner>>({
    title: "",
    subtitle: "",
    placement: "HOME_HERO",
    media_type: "IMAGE",
    media_url: "",
    thumbnail_url: "",
    link_type: "NONE",
    link_target: "",
    display_order: 0,
    is_active: true,
  });

  const [mediaForm, setMediaForm] = React.useState<Partial<CMSMediaAsset>>({
    title: "",
    description: "",
    media_type: "IMAGE",
    media_url: "",
    thumbnail_url: "",
    tags: [],
    duration_seconds: undefined,
  });

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [bannersRes, catsRes, mediaRes] = await Promise.all([
        cmsApi.getBanners(),
        cmsApi.getCategories(),
        cmsApi.getMediaAssets(),
      ]);
      setBanners(bannersRes);
      setCategories(catsRes);
      setMediaAssets(mediaRes);
    } catch (err: any) {
      console.error("Failed to load CMS data:", err);
      toast.error(err?.response?.data?.detail || "Failed to load CMS content");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Banner Actions ---
  const handleBannerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 150 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 150MB.");
      return;
    }

    try {
      setIsUploadingBannerMedia(true);
      const res = await cmsApi.uploadBannerMedia(file);
      setBannerForm(prev => ({
        ...prev,
        media_url: res.url,
        media_type: res.media_type || (file.type.startsWith('video') ? 'VIDEO' : 'IMAGE'),
      }));
      toast.success(`Uploaded ${file.name} successfully!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to upload media file");
    } finally {
      setIsUploadingBannerMedia(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleOpenBannerModal = (banner?: CMSBanner) => {
    if (banner) {
      setEditingBanner(banner);
      setBannerForm({ ...banner });
      if (banner.media_url && (banner.media_url.startsWith('http://') || banner.media_url.startsWith('https://'))) {
        setMediaSourceMode('url');
      } else {
        setMediaSourceMode('upload');
      }
    } else {
      setEditingBanner(null);
      setMediaSourceMode('upload');
      setBannerForm({
        title: "",
        subtitle: "",
        placement: "HOME_HERO",
        media_type: "VIDEO",
        media_url: "",
        thumbnail_url: "",
        link_type: "NONE",
        link_target: "",
        display_order: banners.length + 1,
        is_active: true,
      });
    }
    setBannerModalOpen(true);
  };

  const handleSaveBanner = async () => {
    if (!bannerForm.title?.trim()) {
      toast.error("Please enter a banner title");
      return;
    }
    if (!bannerForm.media_url?.trim()) {
      toast.error("Please provide an image or video URL");
      return;
    }
    try {
      if (editingBanner) {
        await cmsApi.updateBanner(editingBanner.id, bannerForm);
        toast.success("Banner updated successfully");
      } else {
        await cmsApi.createBanner(bannerForm);
        toast.success("Banner created successfully");
      }
      setBannerModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save banner");
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    try {
      await cmsApi.deleteBanner(id);
      toast.success("Banner deleted");
      loadData();
    } catch (err: any) {
      toast.error("Failed to delete banner");
    }
  };

  const handleToggleBannerActive = async (banner: CMSBanner) => {
    try {
      await cmsApi.updateBanner(banner.id, { is_active: !banner.is_active });
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: !b.is_active } : b));
      toast.success(`Banner ${!banner.is_active ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  // --- Category Actions ---
  const handleEditCategory = (cat: ProgramCategoryMedia) => {
    setEditingCategory(cat);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!editingCategory) return;
    try {
      await cmsApi.updateCategoryMedia(editingCategory.id, editingCategory);
      toast.success(`${editingCategory.category_name} assets updated successfully`);
      setCategoryModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error("Failed to update category media");
    }
  };

  const handleSyncCategories = async () => {
    try {
      const res = await cmsApi.syncCategories();
      toast.success(`Categories synced: ${res.created_count || 0} new added`);
      loadData();
    } catch (err: any) {
      toast.error("Failed to sync categories");
    }
  };

  // --- Media Library Actions ---
  const handleSaveMedia = async () => {
    if (!mediaForm.title?.trim()) {
      toast.error("Please enter asset title");
      return;
    }
    if (!mediaForm.media_url?.trim()) {
      toast.error("Please enter a media URL");
      return;
    }
    try {
      await cmsApi.createMediaAsset(mediaForm);
      toast.success("Media asset saved to library");
      setMediaModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error("Failed to save media asset");
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media asset?")) return;
    try {
      await cmsApi.deleteMediaAsset(id);
      toast.success("Media asset deleted");
      loadData();
    } catch (err: any) {
      toast.error("Failed to delete media asset");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("URL copied to clipboard");
  };

  const filteredMedia = React.useMemo(() => {
    return mediaAssets.filter(m => {
      const matchesType = mediaTypeFilter === "ALL" || m.media_type === mediaTypeFilter;
      const matchesSearch = !mediaSearch.trim() ||
        m.title.toLowerCase().includes(mediaSearch.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(mediaSearch.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [mediaAssets, mediaTypeFilter, mediaSearch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Management System (CMS)"
        description="Curate hero banners, visual category identities (Pilates, Bootcamp), and app audio/video assets."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
            {activeTab === "banners" && (
              <Button size="sm" onClick={() => handleOpenBannerModal()} className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Banner
              </Button>
            )}
            {activeTab === "categories" && (
              <Button size="sm" variant="outline" onClick={handleSyncCategories}>
                <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
                Sync Categories
              </Button>
            )}
            {activeTab === "media" && (
              <Button size="sm" onClick={() => setMediaModalOpen(true)} className="bg-primary text-primary-foreground">
                <UploadCloud className="w-4 h-4 mr-1.5" />
                Upload Asset
              </Button>
            )}
          </div>
        }
      />

      <PageBody>
        {/* KPI Summary Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KpiTile
            title="Active Home Banners"
            value={banners.filter(b => b.is_active).length.toString()}
            subtext={`${banners.length} total banners configured`}
            icon={<Image className="w-4 h-4 text-primary" />}
          />
          <KpiTile
            title="Program Categories"
            value={categories.length.toString()}
            subtext="Pilates, Bootcamp & Core Disciplines"
            icon={<Layers className="w-4 h-4 text-emerald-500" />}
          />
          <KpiTile
            title="Video Clips & Teasers"
            value={mediaAssets.filter(m => m.media_type === "VIDEO").length.toString()}
            subtext="Trailers & Exercise form guides"
            icon={<Film className="w-4 h-4 text-purple-500" />}
          />
          <KpiTile
            title="Audio Tracks"
            value={mediaAssets.filter(m => m.media_type === "AUDIO").length.toString()}
            subtext="Workout beats & guided meditation"
            icon={<Music className="w-4 h-4 text-amber-500" />}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border pb-3 mb-6">
          <button
            onClick={() => setActiveTab("banners")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "banners"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Image className="w-4 h-4" />
            Home Screen Banners ({banners.length})
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "categories"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Layers className="w-4 h-4" />
            Program Categories & Media ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab("media")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "media"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Film className="w-4 h-4" />
            Media Library (Audio/Video/Image) ({mediaAssets.length})
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: HOME BANNERS                                            */}
        {/* ============================================================== */}
        {activeTab === "banners" && (
          <div className="space-y-4">
            {banners.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-xl bg-card">
                <Image className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold">No Banners Configured</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                  Add promotional banners, class highlight sliders, or seasonal announcements for the mobile app.
                </p>
                <Button onClick={() => handleOpenBannerModal()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Banner
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banners.map(b => (
                  <div
                    key={b.id}
                    className={cn(
                      "group relative rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col",
                      !b.is_active && "opacity-60 bg-muted/30"
                    )}
                  >
                    {/* Media Preview Box */}
                    <div className="relative aspect-[16/9] w-full bg-black/10 overflow-hidden">
                      {b.media_type === "VIDEO" ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
                          {b.thumbnail_url ? (
                            <img src={b.thumbnail_url} alt={b.title} className="w-full h-full object-cover" />
                          ) : (
                            <Film className="w-10 h-10 text-white/50" />
                          )}
                          <button
                            onClick={() => setPreviewMediaUrl({ url: b.media_url, type: "VIDEO", title: b.title })}
                            className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center hover:scale-110 transition-transform"
                          >
                            <Play className="w-5 h-5 ml-0.5" />
                          </button>
                        </div>
                      ) : (
                        <img
                          src={b.media_url}
                          alt={b.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      <div className="absolute top-2 left-2 flex gap-1">
                        <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur text-[11px]">
                          {b.placement_display || b.placement.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="bg-black/60 text-white backdrop-blur text-[11px]">
                          Order: {b.display_order}
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Switch
                          checked={b.is_active}
                          onCheckedChange={() => handleToggleBannerActive(b)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Banner Info */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-base line-clamp-1">{b.title}</h4>
                        {b.subtitle && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{b.subtitle}</p>
                        )}
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Action:</span>
                          <span className="capitalize">{b.link_type.toLowerCase()}</span>
                          {b.link_target && (
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] truncate max-w-[150px]">
                              {b.link_target}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-4">
                        <span className="text-[11px] text-muted-foreground">
                          {b.branch_name || "All Branches"}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenBannerModal(b)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteBanner(b.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PROGRAM CATEGORIES MEDIA (PILATES & BOOTCAMP)           */}
        {/* ============================================================== */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="bg-muted/40 rounded-xl p-4 border border-border flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">Visual Identity per Discipline</h4>
                <p className="text-xs text-muted-foreground">
                  Attach navigation icons, hero category banners, teaser preview videos, and descriptions for Sweat Pilates & Sweat Bootcamp.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleSyncCategories}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Sync with Classes
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {categories.map(c => (
                <div key={c.id} className="rounded-xl border bg-card overflow-hidden shadow-sm flex flex-col">
                  {/* Category Header Banner Preview */}
                  <div className="relative aspect-[21/9] w-full bg-zinc-900 overflow-hidden">
                    {c.banner_url ? (
                      <img src={c.banner_url} alt={c.category_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No Banner Image Set
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-3 left-4 flex items-center gap-3">
                      {/* Icon Preview */}
                      <div className="w-12 h-12 rounded-xl border-2 border-white/80 bg-zinc-950 overflow-hidden shadow-lg flex items-center justify-center shrink-0">
                        {c.icon_url ? (
                          <img src={c.icon_url} alt="icon" className="w-full h-full object-cover" />
                        ) : (
                          <Layers className="w-6 h-6 text-white/50" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white leading-tight">{c.category_name}</h3>
                        <p className="text-xs text-white/80 font-medium">{c.tagline || c.category_code}</p>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Marketing Overview
                      </Label>
                      <p className="text-sm text-foreground/90 mt-1 line-clamp-3">
                        {c.content_description || "No description set yet. Provide a compelling overview for members."}
                      </p>
                    </div>

                    {/* Preview video indicator */}
                    <div className="flex items-center justify-between text-xs bg-muted/50 p-2.5 rounded-lg border border-border">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Film className="w-4 h-4 text-primary" />
                        {c.video_url ? "Teaser Video Attached" : "No Preview Video"}
                      </span>
                      {c.video_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setPreviewMediaUrl({ url: c.video_url!, type: "VIDEO", title: `${c.category_name} Teaser` })}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Watch Preview
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center justify-end pt-2 border-t border-border">
                      <Button size="sm" onClick={() => handleEditCategory(c)}>
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                        Edit Category Assets
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: MEDIA LIBRARY (AUDIO, VIDEO, IMAGE)                    */}
        {/* ============================================================== */}
        {activeTab === "media" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
              <div className="flex items-center gap-1.5 w-full md:w-auto">
                {["ALL", "IMAGE", "VIDEO", "AUDIO"].map(type => (
                  <Button
                    key={type}
                    size="sm"
                    variant={mediaTypeFilter === type ? "default" : "outline"}
                    onClick={() => setMediaTypeFilter(type)}
                    className="text-xs capitalize"
                  >
                    {type.toLowerCase()}
                  </Button>
                ))}
              </div>
              <div className="w-full md:w-72">
                <Input
                  placeholder="Search assets by title or tag..."
                  value={mediaSearch}
                  onChange={e => setMediaSearch(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Media Grid */}
            {filteredMedia.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-xl bg-card">
                <Film className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold">No Media Assets Found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                  Upload promotional videos, workout background music, or high-res studio photography.
                </p>
                <Button onClick={() => setMediaModalOpen(true)}>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Upload First Asset
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredMedia.map(m => (
                  <div key={m.id} className="rounded-xl border bg-card overflow-hidden shadow-sm group flex flex-col justify-between">
                    <div className="relative aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden">
                      {m.media_type === "IMAGE" && (
                        <img src={m.media_url} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      )}
                      {m.media_type === "VIDEO" && (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {m.thumbnail_url ? (
                            <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
                          ) : (
                            <Film className="w-10 h-10 text-white/40" />
                          )}
                          <button
                            onClick={() => setPreviewMediaUrl({ url: m.media_url, type: "VIDEO", title: m.title })}
                            className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:scale-110 transition-transform"
                          >
                            <Play className="w-4 h-4 ml-0.5" />
                          </button>
                        </div>
                      )}
                      {m.media_type === "AUDIO" && (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-950 to-zinc-900 text-white">
                          <Music className="w-8 h-8 text-indigo-400 mb-2" />
                          <button
                            onClick={() => setPreviewMediaUrl({ url: m.media_url, type: "AUDIO", title: m.title })}
                            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Play Audio
                          </button>
                        </div>
                      )}

                      <Badge className="absolute top-2 left-2 text-[10px] bg-black/70 text-white backdrop-blur">
                        {m.media_type}
                      </Badge>
                      {m.duration_seconds && (
                        <Badge className="absolute bottom-2 right-2 text-[10px] bg-black/70 text-white backdrop-blur">
                          {Math.floor(m.duration_seconds / 60)}:{(m.duration_seconds % 60).toString().padStart(2, "0")}
                        </Badge>
                      )}
                    </div>

                    <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-sm line-clamp-1">{m.title}</h4>
                        {m.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{m.description}</p>
                        )}
                        {m.tags && m.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {m.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border mt-3 text-xs">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyToClipboard(m.media_url)}>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy URL
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDeleteMedia(m.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </PageBody>

      {/* ============================================================== */}
      {/* MODAL: CREATE / EDIT BANNER                                    */}
      {/* ============================================================== */}
      <Dialog open={bannerModalOpen} onOpenChange={setBannerModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBanner ? "Edit Banner" : "New App Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Banner Headline / Title *</Label>
              <Input
                placeholder="e.g. Sweat Bootcamp: Core & Conditioning"
                value={bannerForm.title || ""}
                onChange={e => setBannerForm({ ...bannerForm, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Subtitle / Call to Action</Label>
              <Input
                placeholder="e.g. Book your trial session today"
                value={bannerForm.subtitle || ""}
                onChange={e => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Placement</Label>
                <select
                  value={bannerForm.placement}
                  onChange={e => setBannerForm({ ...bannerForm, placement: e.target.value as any })}
                  className="w-full mt-1 border border-input rounded-md h-9 px-3 text-xs bg-background"
                >
                  <option value="HOME_HERO">Home Screen Hero</option>
                  <option value="HOME_PROMO">Home Promo Card</option>
                  <option value="CATEGORY_HEADER">Category Header</option>
                  <option value="OFFERS_SLIDER">Offers Slider</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Media Type</Label>
                <select
                  value={bannerForm.media_type}
                  onChange={e => setBannerForm({ ...bannerForm, media_type: e.target.value as any })}
                  className="w-full mt-1 border border-input rounded-md h-9 px-3 text-xs bg-background"
                >
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                </select>
              </div>
            </div>

            {/* Media Source & File / URL Input */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Banner Media (Video or Image) *</Label>
                <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md border border-border text-[11px]">
                  <button
                    type="button"
                    onClick={() => setMediaSourceMode('upload')}
                    className={cn(
                      "px-2.5 py-1 rounded transition-colors flex items-center gap-1",
                      mediaSourceMode === 'upload' ? "bg-background font-semibold text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <UploadCloud className="size-3" />
                    <span>Upload File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaSourceMode('url')}
                    className={cn(
                      "px-2.5 py-1 rounded transition-colors flex items-center gap-1",
                      mediaSourceMode === 'url' ? "bg-background font-semibold text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ExternalLink className="size-3" />
                    <span>Direct Link</span>
                  </button>
                </div>
              </div>

              {mediaSourceMode === 'upload' ? (
                <div>
                  <input
                    type="file"
                    ref={bannerFileInputRef}
                    accept="video/mp4,video/quicktime,video/webm,video/m4v,image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleBannerFileSelect}
                    className="hidden"
                  />

                  {isUploadingBannerMedia ? (
                    <div className="h-32 border border-dashed border-primary rounded-lg flex flex-col items-center justify-center gap-2 bg-primary/5 text-primary text-xs">
                      <RefreshCw className="size-5 animate-spin" />
                      <span className="font-semibold">Uploading video to media storage...</span>
                      <span className="text-[10px] text-muted-foreground">Please wait a moment</span>
                    </div>
                  ) : bannerForm.media_url ? (
                    <div className="space-y-2 border border-border rounded-lg p-2.5 bg-muted/20">
                      {bannerForm.media_type === 'VIDEO' || bannerForm.media_url.match(/\.(mp4|mov|webm|m4v)(\?.*)?$/i) ? (
                        <div className="relative rounded overflow-hidden bg-black max-h-48 flex items-center justify-center">
                          <video
                            src={bannerForm.media_url}
                            controls
                            className="w-full max-h-48 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="relative rounded overflow-hidden bg-muted max-h-48 flex items-center justify-center">
                          <img
                            src={bannerForm.media_url}
                            alt="Banner Preview"
                            className="w-full max-h-48 object-cover rounded"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[240px]">
                          {bannerForm.media_url}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => bannerFileInputRef.current?.click()}
                          >
                            <UploadCloud className="size-3 mr-1" />
                            Change File
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => setBannerForm({ ...bannerForm, media_url: "" })}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => bannerFileInputRef.current?.click()}
                      className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/40 transition-colors rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
                    >
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <UploadCloud className="size-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Click to upload video or image</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Supports MP4, MOV, WebM, PNG, JPG (up to 150MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="https://... image or video mp4/m3u8"
                    value={bannerForm.media_url || ""}
                    onChange={e => setBannerForm({ ...bannerForm, media_url: e.target.value })}
                    className="font-mono text-xs"
                  />
                  {bannerForm.media_url && (
                    <div className="rounded overflow-hidden border border-border p-1 bg-muted/20">
                      {bannerForm.media_type === 'VIDEO' ? (
                        <video src={bannerForm.media_url} controls className="w-full max-h-36 bg-black rounded object-contain" />
                      ) : (
                        <img src={bannerForm.media_url} alt="Preview" className="w-full max-h-36 rounded object-cover" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {bannerForm.media_type === "VIDEO" && (
              <div>
                <Label className="text-xs">Video Thumbnail / Poster Image URL</Label>
                <Input
                  placeholder="https://... poster still image"
                  value={bannerForm.thumbnail_url || ""}
                  onChange={e => setBannerForm({ ...bannerForm, thumbnail_url: e.target.value })}
                  className="mt-1 font-mono text-xs"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tap Action Type</Label>
                <select
                  value={bannerForm.link_type}
                  onChange={e => setBannerForm({ ...bannerForm, link_type: e.target.value as any })}
                  className="w-full mt-1 border border-input rounded-md h-9 px-3 text-xs bg-background"
                >
                  <option value="NONE">None (Static)</option>
                  <option value="CATEGORY">Open Category</option>
                  <option value="PACKAGE">Open Membership Plan</option>
                  <option value="BOOKING">Open Class Booking</option>
                  <option value="EXTERNAL_URL">External Website</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Action Target / ID</Label>
                <Input
                  placeholder="Target ID, slug or URL"
                  value={bannerForm.link_target || ""}
                  onChange={e => setBannerForm({ ...bannerForm, link_target: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={bannerForm.is_active}
                  onCheckedChange={checked => setBannerForm({ ...bannerForm, is_active: checked })}
                />
                <Label className="text-xs">Active & Visible in App</Label>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  placeholder="Order"
                  value={bannerForm.display_order ?? 0}
                  onChange={e => setBannerForm({ ...bannerForm, display_order: parseInt(e.target.value) || 0 })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBannerModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveBanner}>Save Banner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: EDIT CATEGORY MEDIA                                     */}
      {/* ============================================================== */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Visual Identity: {editingCategory?.category_name}</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">Tagline / Subheading</Label>
                <Input
                  value={editingCategory.tagline || ""}
                  onChange={e => setEditingCategory({ ...editingCategory, tagline: e.target.value })}
                  placeholder="e.g. Core Strength & Sculpting"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Navigation / Filter Icon URL (Square / Circle)</Label>
                <Input
                  value={editingCategory.icon_url || ""}
                  onChange={e => setEditingCategory({ ...editingCategory, icon_url: e.target.value })}
                  placeholder="https://... png or svg icon"
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Hero Banner Image URL (Wide Landscape)</Label>
                <Input
                  value={editingCategory.banner_url || ""}
                  onChange={e => setEditingCategory({ ...editingCategory, banner_url: e.target.value })}
                  placeholder="https://... hero header image"
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Teaser / Overview Video URL</Label>
                <Input
                  value={editingCategory.video_url || ""}
                  onChange={e => setEditingCategory({ ...editingCategory, video_url: e.target.value })}
                  placeholder="https://... mp4 video teaser"
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Rich Marketing Description</Label>
                <Textarea
                  value={editingCategory.content_description || ""}
                  onChange={e => setEditingCategory({ ...editingCategory, content_description: e.target.value })}
                  placeholder="Detailed breakdown of the discipline for members..."
                  rows={3}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCategoryModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveCategory}>Save Category Assets</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: UPLOAD / ADD MEDIA ASSET                                */}
      {/* ============================================================== */}
      <Dialog open={mediaModalOpen} onOpenChange={setMediaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add App Media Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Asset Title *</Label>
              <Input
                placeholder="e.g. Pilates Reformer Movement Reel"
                value={mediaForm.title || ""}
                onChange={e => setMediaForm({ ...mediaForm, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Media Type</Label>
              <select
                value={mediaForm.media_type}
                onChange={e => setMediaForm({ ...mediaForm, media_type: e.target.value as any })}
                className="w-full mt-1 border border-input rounded-md h-9 px-3 text-xs bg-background"
              >
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video Clip</option>
                <option value="AUDIO">Audio Track</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Media Stream / Direct URL *</Label>
              <Input
                placeholder="https://..."
                value={mediaForm.media_url || ""}
                onChange={e => setMediaForm({ ...mediaForm, media_url: e.target.value })}
                className="mt-1 font-mono text-xs"
              />
            </div>
            {mediaForm.media_type === "VIDEO" && (
              <div>
                <Label className="text-xs">Poster Still Thumbnail URL</Label>
                <Input
                  placeholder="https://..."
                  value={mediaForm.thumbnail_url || ""}
                  onChange={e => setMediaForm({ ...mediaForm, thumbnail_url: e.target.value })}
                  className="mt-1 font-mono text-xs"
                />
              </div>
            )}
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                placeholder="Brief summary of where this is used..."
                value={mediaForm.description || ""}
                onChange={e => setMediaForm({ ...mediaForm, description: e.target.value })}
                rows={2}
                className="mt-1 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMediaModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveMedia}>Save Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: MEDIA PREVIEW PLAYER                                    */}
      {/* ============================================================== */}
      <Dialog open={!!previewMediaUrl} onOpenChange={() => setPreviewMediaUrl(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black text-white">
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <h4 className="text-sm font-semibold truncate">{previewMediaUrl?.title}</h4>
            <Badge variant="outline" className="text-xs text-white border-white/20">
              {previewMediaUrl?.type}
            </Badge>
          </div>
          <div className="p-4 flex items-center justify-center min-h-[300px]">
            {previewMediaUrl?.type === "VIDEO" && (
              <video src={previewMediaUrl.url} controls autoPlay className="w-full max-h-[420px] rounded" />
            )}
            {previewMediaUrl?.type === "AUDIO" && (
              <div className="w-full p-6 text-center space-y-4">
                <Music className="w-16 h-16 text-indigo-400 mx-auto animate-pulse" />
                <audio src={previewMediaUrl.url} controls autoPlay className="w-full" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
