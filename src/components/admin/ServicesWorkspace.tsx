import * as React from "react";
import { Dumbbell, Plus, Clock, Users, Tag, Check, Edit2, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageBody } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchServicesApi,
  createServiceApi,
  updateServiceApi,
  deleteServiceApi,
  type ServiceRow,
} from "@/api/endpoints/api-admin";

export function ServicesWorkspace() {
  const [services, setServices] = React.useState<ServiceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [categoryFilter, setCategoryFilter] = React.useState("all");

  // Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<ServiceRow | null>(null);

  // Form State
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("Personal Training");
  const [price, setPrice] = React.useState(2500);
  const [duration, setDuration] = React.useState(60);
  const [capacity, setCapacity] = React.useState(1);
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadServices = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchServicesApi();
      setServices(data);
    } catch {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadServices();
  }, [loadServices]);

  const openCreateModal = () => {
    setEditingService(null);
    setName("");
    setCategory("Personal Training");
    setPrice(2500);
    setDuration(60);
    setCapacity(1);
    setDescription("");
    setModalOpen(true);
  };

  const openEditModal = (svc: ServiceRow) => {
    setEditingService(svc);
    setName(svc.name);
    setCategory(svc.category);
    setPrice(Number(svc.price));
    setDuration(svc.duration_minutes);
    setCapacity(svc.capacity);
    setDescription(svc.description || "");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Please enter service name");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingService) {
        await updateServiceApi(String(editingService.id), {
          name,
          category,
          price,
          duration_minutes: duration,
          capacity,
          description,
        });
        toast.success(`Service "${name}" updated successfully!`);
      } else {
        await createServiceApi({
          name,
          category,
          price,
          duration_minutes: duration,
          capacity,
          description,
          is_active: true,
        });
        toast.success(`Service "${name}" created successfully!`);
      }
      setModalOpen(false);
      loadServices();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (svc: ServiceRow) => {
    if (!confirm(`Are you sure you want to delete "${svc.name}"?`)) return;
    try {
      await deleteServiceApi(String(svc.id));
      toast.success(`Service "${svc.name}" deleted successfully!`);
      loadServices();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete service");
    }
  };

  const filteredServices = services.filter(
    (s) => categoryFilter === "all" || s.category === categoryFilter
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Services & Offerings Catalog"
        subtitle="Manage fitness programs, personal training packages, reformer pilates, spa suites, and billable amenities."
        actions={
          <Button onClick={openCreateModal} className="gap-2 bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
            Add Service Offering
          </Button>
        }
      />

      <PageBody>
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 border-b border-border/50">
          {(["all", "Fitness", "Personal Training", "Pilates", "Nutrition", "Recovery"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat === "all" ? "All Offerings" : cat}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Loading live service catalog...
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="py-20 text-center rounded-xl border border-dashed border-border/70 p-8 space-y-3">
            <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto" />
            <div className="font-semibold text-base">No services found</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Get started by adding your studio's personal training, pilates, or fitness programs.
            </p>
            <Button onClick={openCreateModal} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create First Service
            </Button>
          </div>
        ) : (
          /* Services Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredServices.map((svc) => (
              <div
                key={svc.id}
                className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm leading-snug">{svc.name}</h3>
                        <span className="text-[11px] text-muted-foreground">{svc.category}</span>
                      </div>
                    </div>

                    <span className="text-base font-bold text-primary">₹{Number(svc.price).toLocaleString()}</span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed min-h-[36px] line-clamp-2 mt-2">
                    {svc.description || "Premium studio fitness session."}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2.5 border-t border-border/40 mt-3 bg-muted/20 -mx-5 px-5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      <span>{svc.duration_minutes} Minutes</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3.5 w-3.5 text-blue-500" />
                      <span>Max {svc.capacity} Client(s)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground font-mono">ID: {svc.id}</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={() => openEditModal(svc)}
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteService(svc)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  {editingService ? `Edit ${editingService.name}` : "Add Service Offering"}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
                <div className="space-y-1.5">
                  <Label htmlFor="svc_name">Service Name *</Label>
                  <Input
                    id="svc_name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Master Trainer 1-on-1 PT"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cat">Category</Label>
                    <select
                      id="cat"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="Personal Training">Personal Training</option>
                      <option value="Pilates">Pilates</option>
                      <option value="Fitness">Fitness & Strength</option>
                      <option value="Nutrition">Nutrition</option>
                      <option value="Recovery">Recovery / Spa</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="price">Price (₹) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="duration">Duration (Minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="capacity">Max Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="desc">Description</Label>
                  <Input
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Service scope & client benefits"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground">
                    {isSubmitting ? "Saving..." : editingService ? "Update Service" : "Save Service Offering"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageBody>
    </div>
  );
}

