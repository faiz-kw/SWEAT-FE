import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Search,
  RefreshCw,
  Video,
  Film,
  Award,
  Sparkles,
  Play,
  RotateCw,
  UserCheck,
  Tag,
  DollarSign,
  Building2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  CalendarX,
  Info,
  ExternalLink,
  Activity,
  Pencil,
  QrCode,
  ToggleLeft,
  ToggleRight,
  LayoutList,
  LayoutGrid,
  MapPin,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Save,
  Upload,
  Ban,
  RotateCcw,
  X,
  Trash2,
} from "lucide-react";
import { ExcelImportWizardModal } from "@/components/common/ExcelImportWizardModal";
import { AssignWorkoutVideoModal } from "./AssignWorkoutVideoModal";
import { CancelClassModal } from "./CancelClassModal";
import { BranchScheduleTimePicker, formatTime12h } from "./BranchScheduleTimePicker";
import { formatOccurrenceDate, formatOccurrenceDateTime } from "@/utils/dateTimeUtils";
import { toast } from "sonner";
import { classesApi } from "@/api/endpoints/classesApi";
import {
  ClassCategory,
  ClassTemplate,
  ClassScheduleRule,
  RuleTimeSlot,
  ClassOccurrence,
  ClassOccurrenceTrainerInfo,
  ClassContentItem,
  ClassPrice,
  ClassBranchAvailability,
  DeliveryMode,
  ClassTemplateStatus,
  TrainerOccurrenceRole,
  ClassesMetadata,
  ClassesMetadataOption,
} from "../../types/classes";
import { useAuth } from "@/api/auth/AuthProvider";
import { isOrganizationAdmin, isTrainerUser } from "@/lib/nav";
import { PageHeader, PageBody, KpiTile } from "@/components/enterprise/Page";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/contexts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePermissions } from "../../lib/permissions";
import { useGlobalSearchSync } from "@/hooks/useGlobalSearchSync";
import { cn } from "@/lib/utils";
import { TrainerAllottedClassesView } from "./TrainerAllottedClassesView";
import { ClassAttendanceModal } from "./ClassAttendanceModal";
import { ClassBookingBreakdown } from "./ClassBookingBreakdown";
import { AssignTrainerModal } from "./AssignTrainerModal";
import { ClassPassScanModal } from "./ClassPassScanModal";

export function normalizeDaysOfWeek(days: any): number[] {
  if (!days) return [];
  if (Array.isArray(days)) {
    return days.map(Number).filter((n) => !isNaN(n) && n >= 1 && n <= 7);
  }
  if (typeof days === "string") {
    try {
      const parsed = JSON.parse(days);
      if (Array.isArray(parsed)) {
        return parsed.map(Number).filter((n) => !isNaN(n) && n >= 1 && n <= 7);
      }
    } catch {
      // not json
    }
    return days
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 7);
  }
  if (typeof days === "object") {
    if (Array.isArray(days.days)) {
      return days.days.map(Number).filter((n: any) => !isNaN(n) && n >= 1 && n <= 7);
    }
    return Object.keys(days)
      .map(Number)
      .filter((n) => !isNaN(n) && n >= 1 && n <= 7);
  }
  return [];
}

interface TagAutocompleteInputProps {
  label: string;
  placeholder: string;
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  badgeColorClass?: string;
}

const TagAutocompleteInput: React.FC<TagAutocompleteInputProps> = ({
  label,
  placeholder,
  selectedTags,
  onChange,
  suggestions,
  badgeColorClass = "bg-primary/10 text-primary border-primary/20",
}) => {
  const [inputVal, setInputVal] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = inputVal.trim().toLowerCase();

  // Filter suggestions case-insensitively, excluding already selected
  const filteredSuggestions = query
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(query) &&
          !selectedTags.some((st) => st.toLowerCase() === s.toLowerCase()),
      )
    : [];

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    if (selectedTags.some((st) => st.toLowerCase() === trimmed.toLowerCase())) {
      setInputVal("");
      setIsOpen(false);
      return;
    }
    // Match against suggestions to preserve canonical casing from WOD tags
    const existingMatch = suggestions.find((s) => s.toLowerCase() === trimmed.toLowerCase());
    const finalTag = existingMatch || trimmed;

    onChange([...selectedTags, finalTag]);
    setInputVal("");
    setIsOpen(false);
  };

  const handleRemoveTag = (indexToRemove: number) => {
    onChange(selectedTags.filter((_, i) => i !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        handleAddTag(filteredSuggestions[0]);
      } else if (inputVal.trim()) {
        handleAddTag(inputVal.replace(/,/g, ""));
      }
    } else if (e.key === "Backspace" && !inputVal && selectedTags.length > 0) {
      handleRemoveTag(selectedTags.length - 1);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <Label className="text-[10px] font-semibold block mb-1 text-foreground">{label}</Label>
      <div
        className="min-h-[34px] w-full rounded-md border border-input bg-background p-1.5 text-xs focus-within:ring-1 focus-within:ring-primary flex flex-wrap items-center gap-1.5 cursor-text transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedTags.map((tag, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${badgeColorClass}`}
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(idx);
              }}
              className="hover:opacity-70 focus:outline-none ml-0.5"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (inputVal.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? placeholder : "+ add tag..."}
          className="flex-1 min-w-[100px] bg-transparent border-0 p-0 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
        />
      </div>

      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-lg py-1 text-xs">
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">
            WOD Tag Suggestions ({filteredSuggestions.length})
          </div>
          {filteredSuggestions.slice(0, 15).map((sug, i) => (
            <div
              key={i}
              className="px-2.5 py-1.5 hover:bg-accent cursor-pointer flex items-center justify-between text-popover-foreground transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddTag(sug);
              }}
            >
              <span className="font-medium">{sug}</span>
              <span className="text-[10px] text-muted-foreground">Select</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ClassesWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { locationId } = useApp();
  const { can } = usePermissions();
  const canCreate = can("ops.classes.create");
  const canEdit = can("ops.classes.edit");
  const canDelete = can("ops.classes.delete");
  const isOrgAdmin = isOrganizationAdmin(user);
  const canCancel = can("ops.classes.cancel") || isOrgAdmin || canEdit;
  const isTrainer = isTrainerUser(user);
  const canViewClasses = can("ops.classes.view") || isOrgAdmin;
  const isAuthorized =
    !isTrainer &&
    (canViewClasses ||
      isOrgAdmin ||
      canCreate ||
      canEdit ||
      Boolean(user?.permissions && user.permissions.includes("core.settings.edit")));
  const isTrainerRole = isTrainer;

  // Global Branch Scope
  const globalBranchId = locationId && locationId !== "all" ? locationId : undefined;

  type PrimaryTab = "sessions" | "setup" | "rules";
  type SetupSubTab = "templates" | "categories";

  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>("sessions");
  const [setupSubTab, setSetupSubTab] = useState<SetupSubTab>("templates");
  const [showTrainerCheckins, setShowTrainerCheckins] = useState<boolean>(isTrainerRole);
  const [showContentStudio, setShowContentStudio] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [dateFilterMode, setDateFilterMode] = useState<
    "today" | "week" | "custom" | "range" | "all"
  >("today");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [templateStatusFilter, setTemplateStatusFilter] = useState<string>("ACTIVE");
  const [categoryStatusFilter, setCategoryStatusFilter] = useState<string>("ALL");
  const [ruleStatusFilter, setRuleStatusFilter] = useState<string>("ACTIVE");
  const [selectedCheckInFilter, setSelectedCheckInFilter] = useState<
    "ALL" | "CHECKED_IN" | "PENDING"
  >("ALL");
  const [attendanceModalOccurrence, setAttendanceModalOccurrence] =
    useState<ClassOccurrence | null>(null);
  const [deletingOccId, setDeletingOccId] = useState<string | null>(null);
  const [cancellingOccurrence, setCancellingOccurrence] = useState<ClassOccurrence | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [restoringOccId, setRestoringOccId] = useState<string | null>(null);
  const [selectedVideoOccurrence, setSelectedVideoOccurrence] = useState<ClassOccurrence | null>(
    null,
  );
  const [isAssignVideoOpen, setIsAssignVideoOpen] = useState<boolean>(false);
  const [editOccurrence, setEditOccurrence] = useState<ClassOccurrence | null>(null);
  const [scanOccurrence, setScanOccurrence] = useState<ClassOccurrence | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editCapacity, setEditCapacity] = useState("20");
  const [editStatus, setEditStatus] = useState("SCHEDULED");
  const [editTrainerId, setEditTrainerId] = useState("");
  const [initialTrainerId, setInitialTrainerId] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editMuscles, setEditMuscles] = useState<string[]>([]);
  const [editEquipment, setEditEquipment] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEditSlot = (occ: ClassOccurrence) => {
    setEditOccurrence(occ);
    setEditDate(occ.occurrence_date || "");

    let sTime = occ.start_time || "";
    if (!sTime && occ.start_at) {
      const d = new Date(occ.start_at);
      sTime = !isNaN(d.getTime()) ? d.toTimeString().substring(0, 5) : "";
    } else if (sTime.length > 5) {
      sTime = sTime.substring(0, 5);
    }
    setEditStartTime(sTime);

    let eTime = occ.end_time || "";
    if (!eTime && occ.end_at) {
      const d = new Date(occ.end_at);
      eTime = !isNaN(d.getTime()) ? d.toTimeString().substring(0, 5) : "";
    } else if (eTime.length > 5) {
      eTime = eTime.substring(0, 5);
    }
    setEditEndTime(eTime);

    setEditCapacity(String(occ.capacity || 20));
    setEditStatus(occ.status || "SCHEDULED");
    setEditVideoUrl(occ.online_join_url || "");
    const curVideoUrl = occ.online_join_url || "";
    if (curVideoUrl) {
      const normYt = (url: string) => {
        const m = url.match(
          /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
        );
        return m ? m[1] : url.trim().toLowerCase();
      };
      const searchKey = normYt(curVideoUrl);
      const matched = (availableVideosForCreate?.results || []).find((v: any) => {
        if (!v.video_url) return false;
        return normYt(v.video_url) === searchKey || v.video_url.toLowerCase().includes(searchKey);
      });
      if (matched) {
        const mList = Array.isArray(matched.targeted_muscles)
          ? matched.targeted_muscles
          : typeof matched.targeted_muscles === "string"
            ? matched.targeted_muscles
                .split(/[,|&/]/)
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];
        const eList = Array.isArray(matched.equipment_required)
          ? matched.equipment_required
          : typeof matched.equipment_required === "string"
            ? matched.equipment_required
                .split(/[,+/&|]/)
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];
        setEditMuscles(mList);
        setEditEquipment(eList);
      } else {
        setEditMuscles([]);
        setEditEquipment([]);
      }
    } else {
      setEditMuscles([]);
      setEditEquipment([]);
    }

    const isCancelledOrDeactivated = occ.status === "CANCELLED" || occ.status === "DEACTIVATED";
    const activeTrainers = isCancelledOrDeactivated
      ? []
      : [...(occ.trainers || []), ...(occ.assigned_trainers || [])].filter(
          (t: any) => t.status === "ASSIGNED" || t.status === "CONFIRMED",
        );
    const leadTrainer =
      activeTrainers.find((t: any) => t.trainer_role === "LEAD") || activeTrainers[0];
    const currentTrId = leadTrainer?.trainer_profile || leadTrainer?.trainer_profile_id || "";
    setEditTrainerId(currentTrId);
    setInitialTrainerId(currentTrId);

    // Auto-fetch workout video, targeted muscles, and equipment from Content Studio / trainer-video if available
    if (occ.id) {
      classesApi
        .getTrainerClassVideo(occ.id)
        .then((vInfo) => {
          if (vInfo) {
            if (vInfo.video_url) {
              setEditVideoUrl((prev) => prev || vInfo.video_url || "");
            }
            if (Array.isArray(vInfo.targeted_muscles) && vInfo.targeted_muscles.length > 0) {
              setEditMuscles((prev) =>
                prev.length > 0 ? prev : (vInfo.targeted_muscles as string[]),
              );
            }
            if (Array.isArray(vInfo.equipment_required) && vInfo.equipment_required.length > 0) {
              setEditEquipment((prev) =>
                prev.length > 0 ? prev : (vInfo.equipment_required as string[]),
              );
            }
          }
        })
        .catch(() => {});
    }
  };

  const handleSaveSlotEdit = async () => {
    if (!editOccurrence?.id) return;
    try {
      setIsSavingEdit(true);
      await classesApi.updateOccurrence(editOccurrence.id, {
        occurrence_date: editDate,
        start_time: editStartTime.length === 5 ? `${editStartTime}:00` : editStartTime,
        end_time: editEndTime.length === 5 ? `${editEndTime}:00` : editEndTime,
        capacity: Number(editCapacity) || 20,
        status: editStatus as any,
        online_join_url: editVideoUrl.trim(),
      });

      if (editVideoUrl.trim() || editVideoUrl.trim() !== (editOccurrence.online_join_url || "")) {
        await classesApi.updateOccurrenceVideo(editOccurrence.id, editVideoUrl.trim(), undefined, {
          targeted_muscles: editMuscles,
          equipment_required: editEquipment,
        });
      }

      // Reassign trainer if genuinely changed, or unassign if set to empty
      let trainerWarning: string | null = null;
      let trainerAssignedSuccess = false;
      if (editTrainerId && editTrainerId !== initialTrainerId) {
        try {
          await classesApi.assignTrainer(editOccurrence.id, editTrainerId, "LEAD");
          trainerAssignedSuccess = true;
        } catch (trainerErr: any) {
          console.warn("Trainer assignment warning:", trainerErr);
          trainerWarning =
            trainerErr?.response?.data?.error ||
            trainerErr?.response?.data?.detail ||
            "Trainer could not be assigned.";
        }
      } else if (!editTrainerId && initialTrainerId) {
        try {
          await classesApi.unassignTrainer(editOccurrence.id, initialTrainerId);
        } catch (unassignErr: any) {
          console.warn("Trainer unassign warning:", unassignErr);
        }
      }

      if (trainerWarning) {
        toast.warning(`Class slot updated, but trainer assignment warning: ${trainerWarning}`);
      } else if (trainerAssignedSuccess) {
        toast.success("Class slot and trainer assigned successfully!");
      } else {
        toast.success("Class slot updated successfully!");
      }

      queryClient.invalidateQueries({ queryKey: ["class-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["classes-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-trainers"] });
      refetchOccurrences();
      setEditOccurrence(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to update class slot",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };
  const isAdminUser = isOrgAdmin || canDelete;

  const handleDeleteOccurrenceSlot = async (occ: ClassOccurrence) => {
    if (!occ?.id) return;
    const booked = occ.total_booked || 0;
    const msg =
      booked > 0
        ? `Warning: This class slot has ${booked} active booking(s). Deleting it will permanently remove the slot and cancel bookings. Proceed?`
        : `Are you sure you want to permanently delete this slot (${occ.class_template_name || "Class"} on ${occ.occurrence_date} at ${occ.start_time})?`;
    if (!window.confirm(msg)) return;
    try {
      setDeletingOccId(occ.id);
      await classesApi.deleteOccurrence(occ.id);
      toast.success("Class slot deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["class-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["classes-calendar"] });
      refetchOccurrences();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to delete class slot.");
    } finally {
      setDeletingOccId(null);
    }
  };

  const handleRestoreOccurrenceSlot = async (occ: ClassOccurrence) => {
    if (!occ?.id) return;
    const msg = `Reactivate this class session (${occ.template_name || occ.class_name || "Class"} on ${occ.occurrence_date})? It will be reopened for member bookings.`;
    if (!window.confirm(msg)) return;
    try {
      setRestoringOccId(occ.id);
      const res = await classesApi.restoreOccurrence(occ.id);
      toast.success(res?.message || "Class session reactivated successfully.");
      queryClient.invalidateQueries({ queryKey: ["class-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["classes-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-schedule"] });
      refetchOccurrences();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail || err?.message || "Failed to reactivate class session.",
      );
    } finally {
      setRestoringOccId(null);
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
  };
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sessionsPage, setSessionsPage] = useState<number>(1);
  const [sessionsPageSize, setSessionsPageSize] = useState<number>(20);
  const [rulesPage, setRulesPage] = useState<number>(1);
  const [rulesPageSize, setRulesPageSize] = useState<number>(18);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [sessionFromDate, setSessionFromDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [sessionToDate, setSessionToDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [ruleDateFilterMode, setRuleDateFilterMode] = useState<
    "all" | "today" | "custom" | "range"
  >("all");
  const [ruleSelectedDate, setRuleSelectedDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [ruleFromDate, setRuleFromDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [ruleToDate, setRuleToDate] = useState<string>("");
  const [ruleDayOfWeek, setRuleDayOfWeek] = useState<string>("ALL");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [selectedTrainerFilter, setSelectedTrainerFilter] = useState<string>("ALL");
  const [sessionStartTime, setSessionStartTime] = useState<string>("");
  const [sessionEndTime, setSessionEndTime] = useState<string>("");
  const isTimeRangeInvalid = Boolean(
    sessionStartTime && sessionEndTime && sessionEndTime <= sessionStartTime,
  );
  const isDateRangeInvalid = Boolean(
    dateFilterMode === "range" &&
    sessionFromDate &&
    sessionToDate &&
    sessionFromDate > sessionToDate,
  );

  const CATEGORY_COLOR_PALETTES = [
    {
      badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
      dot: "bg-violet-500",
      selected: "bg-violet-600 text-white border-violet-600",
      unselected:
        "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20",
    },
    {
      badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
      dot: "bg-orange-500",
      selected: "bg-orange-600 text-white border-orange-600",
      unselected:
        "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/20",
    },
    {
      badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      dot: "bg-emerald-500",
      selected: "bg-emerald-600 text-white border-emerald-600",
      unselected:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
    },
    {
      badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
      dot: "bg-blue-500",
      selected: "bg-blue-600 text-white border-blue-600",
      unselected:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20",
    },
    {
      badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
      dot: "bg-rose-500",
      selected: "bg-rose-600 text-white border-rose-600",
      unselected:
        "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20",
    },
    {
      badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      dot: "bg-amber-500",
      selected: "bg-amber-600 text-white border-amber-600",
      unselected:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
    },
    {
      badge: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
      dot: "bg-cyan-500",
      selected: "bg-cyan-600 text-white border-cyan-600",
      unselected:
        "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20",
    },
    {
      badge: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30",
      dot: "bg-fuchsia-500",
      selected: "bg-fuchsia-600 text-white border-fuchsia-600",
      unselected:
        "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30 hover:bg-fuchsia-500/20",
    },
  ];

  const getCategoryPalette = (
    categoryName?: string,
    categoryCode?: string,
  ): (typeof CATEGORY_COLOR_PALETTES)[number] => {
    const token = `${categoryCode || ""} ${categoryName || ""}`.toUpperCase().trim();
    if (token.includes("PILATES")) return CATEGORY_COLOR_PALETTES[0]!;
    if (token.includes("BOOTCAMP")) return CATEGORY_COLOR_PALETTES[1]!;
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % CATEGORY_COLOR_PALETTES.length;
    return CATEGORY_COLOR_PALETTES[idx] || CATEGORY_COLOR_PALETTES[0]!;
  };

  const getCategoryBadgeStyle = (categoryName?: string, categoryCode?: string) => {
    return `${getCategoryPalette(categoryName, categoryCode).badge} font-bold`;
  };

  // Debounce search term & reset pagination
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setSessionsPage(1);
      setRulesPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setSessionsPage(1);
    setRulesPage(1);
  }, [
    dateFilterMode,
    selectedDate,
    sessionFromDate,
    sessionToDate,
    ruleDateFilterMode,
    ruleSelectedDate,
    ruleFromDate,
    ruleToDate,
    ruleDayOfWeek,
    selectedStatusFilter,
    ruleStatusFilter,
    selectedCheckInFilter,
    selectedTrainerFilter,
    selectedBranchFilter,
    selectedCategoryFilter,
    sessionStartTime,
    sessionEndTime,
    locationId,
    primaryTab,
  ]);

  // Reset local branch filter when global location changes
  React.useEffect(() => {
    setSelectedBranchFilter("");
  }, [locationId]);

  const effectiveBranchFilter = selectedBranchFilter || globalBranchId || undefined;

  const todayStr = React.useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const todayLabel = React.useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, []);

  const weekEndStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const hasActiveFilters = Boolean(
    searchTerm ||
    selectedBranchFilter ||
    selectedCategoryFilter !== "ALL" ||
    selectedStatusFilter !== "ALL" ||
    selectedCheckInFilter !== "ALL" ||
    (selectedTrainerFilter && selectedTrainerFilter !== "ALL") ||
    sessionStartTime ||
    sessionEndTime ||
    dateFilterMode !== "today",
  );

  const handleResetFilters = () => {
    handleSearchChange("");
    setDebouncedSearch("");
    setSelectedBranchFilter("");
    setSelectedCategoryFilter("ALL");
    setSelectedStatusFilter("ALL");
    setSelectedCheckInFilter("ALL");
    setSelectedTrainerFilter("ALL");
    setSessionStartTime("");
    setSessionEndTime("");
    setDateFilterMode("today");
    setSelectedDate(todayStr);
    setSessionsPage(1);
  };

  // Modals state
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClassCategory | null>(null);

  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ClassTemplate | null>(null);

  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ClassScheduleRule | null>(null);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [auditRule, setAuditRule] = useState<ClassScheduleRule | null>(null);

  const [isGenerateOccurrencesOpen, setIsGenerateOccurrencesOpen] = useState(false);
  const [selectedRuleForGen, setSelectedRuleForGen] = useState<ClassScheduleRule | null>(null);
  const [genFromDate, setGenFromDate] = useState<string>(selectedDate);
  const [genToDate, setGenToDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0] || "";
  });

  const [isCreateOccurrenceOpen, setIsCreateOccurrenceOpen] = useState(false);
  const [occurrenceError, setOccurrenceError] = useState<string | null>(null);

  const [isAssignTrainerOpen, setIsAssignTrainerOpen] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<ClassOccurrence | null>(null);
  const [trainerProfileIdInput, setTrainerProfileIdInput] = useState("");
  const [trainerRoleInput, setTrainerRoleInput] = useState<TrainerOccurrenceRole>("LEAD");
  const [trainerError, setTrainerError] = useState<string | null>(null);

  const [isBranchAvailOpen, setIsBranchAvailOpen] = useState(false);
  const [selectedTemplateForAvail, setSelectedTemplateForAvail] = useState<ClassTemplate | null>(
    null,
  );

  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [selectedTemplateForPricing, setSelectedTemplateForPricing] =
    useState<ClassTemplate | null>(null);

  const [isCreateContentOpen, setIsCreateContentOpen] = useState(false);
  const [isCreateMappingOpen, setIsCreateMappingOpen] = useState(false);

  // Forms state (Tenant-facing Code fields removed)
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    display_order: 1 as number | string,
    status: "ACTIVE",
  });

  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "",
    program: "",
    description: "",
    default_duration_minutes: "60" as number | string,
    default_capacity: "20" as number | string,
    default_trial_capacity: "0" as number | string,
    default_waitlist_capacity: "0" as number | string,
    default_delivery_mode: "OFFLINE" as DeliveryMode,
    allow_booking: true,
    allow_trial: false,
    allow_waitlist: false,
    allow_reschedule: true,
    image_url: "",
    status: "ACTIVE" as ClassTemplateStatus,
    branch_capacities: [] as Array<{
      branch_id: string;
      branch_name: string;
      is_enabled: boolean;
      capacity_override: number | string;
      trial_capacity_override: number | string;
      waitlist_capacity_override: number | string;
    }>,
  });

  const [ruleModalStep, setRuleModalStep] = useState<1 | 2>(1);
  const [templateBlocks, setTemplateBlocks] = useState<Array<{
    uid: number;
    class_template: string;
    days_of_week: number[];
    time_slots: RuleTimeSlot[];
    default_trainer?: string;
  }>>([
    {
      uid: 1,
      class_template: "",
      days_of_week: [1, 3, 5],
      time_slots: [{ id: "1", start_time: "07:00", end_time: "07:50" }],
      default_trainer: "",
    },
  ]);

  const [previewOccurrences, setPreviewOccurrences] = useState<Array<{
    id: string;
    date: string;
    dayNum: number;
    dayName: string;
    startTime: string;
    endTime: string;
    templateId: string;
    templateName: string;
    templateCategoryName: string;
    templateCategoryId: string;
    templateCapacity: number;
    branchId: string;
    branchName: string;
    trainerId: string;
    trainerName: string;
  }>>([]);
  const [previewFilterBranch, setPreviewFilterBranch] = useState<string>("ALL");
  const [previewFilterTemplate, setPreviewFilterTemplate] = useState<string>("ALL");
  const [previewFilterDay, setPreviewFilterDay] = useState<string>("ALL");
  const [previewFilterTrainer, setPreviewFilterTrainer] = useState<string>("ALL");
  const [previewSearch, setPreviewSearch] = useState<string>("");
  const [previewViewMode, setPreviewViewMode] = useState<"WEEK" | "TABLE">("WEEK");
  const [previewWeekOffset, setPreviewWeekOffset] = useState<number>(0);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [successDetails, setSuccessDetails] = useState<{
    rulesCount: number;
    sessionsCount: number;
    branchesCount: number;
    templatesCount: number;
    trainersCount: number;
  }>({ rulesCount: 0, sessionsCount: 0, branchesCount: 0, templatesCount: 0, trainersCount: 0 });

  const [ruleForm, setRuleForm] = useState({
    class_template: "",
    branch: "",
    branches: [] as string[],
    recurrence_type: "WEEKLY",
    days_of_week: [1, 2, 3, 4, 5] as number[],
    start_time: "08:30",
    end_time: "09:30",
    time_slots: [{ id: "1", start_time: "08:30", end_time: "09:30" }] as RuleTimeSlot[],
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: "",
    delivery_mode: "OFFLINE" as DeliveryMode,
    capacity_override: "",
    trial_capacity_override: "",
    waitlist_capacity_override: "",
    status: "ACTIVE",
    auto_generate_slots: true,
    generate_from_date: new Date().toISOString().split("T")[0],
    generate_to_date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split("T")[0];
    })(),
  });

  const [occurrenceForm, setOccurrenceForm] = useState({
    class_template: "",
    branch: "",
    occurrence_date: "",
    start_time: "",
    end_time: "",
    delivery_mode: "",
    capacity: "",
    trial_capacity: "",
    waitlist_capacity: "",
    video_id: "AUTO",
  });

  const [branchAvailForm, setBranchAvailForm] = useState({
    branch: "",
    status: "ENABLED" as "ENABLED" | "DISABLED",
    capacity_override: "",
    trial_capacity_override: "",
    waitlist_capacity_override: "",
  });

  const [pricingForm, setPricingForm] = useState({
    branch: "",
    currency: "INR",
    price: "",
    tax_percent: "18.00",
    effective_from: selectedDate,
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const [contentForm, setContentForm] = useState({
    title: "",
    description: "",
    content_type: "VIDEO" as "VIDEO" | "VIDEO_LINK" | "DOCUMENT" | "IMAGE" | "OTHER",
    external_url: "",
    display_order: 1,
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const [mappingForm, setMappingForm] = useState({
    content_item: "",
    class_template: "",
    class_category: "",
    program: "",
    delivery_mode: "" as DeliveryMode | "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  // Queries
  const {
    data: categories = [],
    isLoading: loadingCategories,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["class-categories"],
    queryFn: () => classesApi.getCategories(),
  });

  const {
    data: templates = [],
    isLoading: loadingTemplates,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: ["class-templates"],
    queryFn: () => classesApi.getTemplates(),
  });

  const {
    data: paginatedRules,
    isLoading: loadingRules,
    refetch: refetchRules,
  } = useQuery({
    queryKey: [
      "class-schedule-rules",
      effectiveBranchFilter,
      selectedCategoryFilter,
      primaryTab === "rules" ? ruleStatusFilter : "ALL",
      primaryTab === "rules" ? debouncedSearch : "",
      primaryTab === "rules" ? ruleDateFilterMode : "all",
      primaryTab === "rules" ? ruleSelectedDate : "",
      primaryTab === "rules" ? ruleFromDate : "",
      primaryTab === "rules" ? ruleToDate : "",
      primaryTab === "rules" ? ruleDayOfWeek : "ALL",
      rulesPage,
      rulesPageSize,
    ],
    queryFn: () =>
      classesApi.getScheduleRulesPaginated({
        branch_id: effectiveBranchFilter,
        category_id: selectedCategoryFilter !== "ALL" ? selectedCategoryFilter : undefined,
        status: primaryTab === "rules" && ruleStatusFilter !== "ALL" ? ruleStatusFilter : undefined,
        date:
          primaryTab === "rules"
            ? ruleDateFilterMode === "today"
              ? todayStr
              : ruleDateFilterMode === "custom"
                ? ruleSelectedDate
                : undefined
            : undefined,
        from_date:
          primaryTab === "rules" && ruleDateFilterMode === "range" && ruleFromDate
            ? ruleFromDate
            : undefined,
        to_date:
          primaryTab === "rules" && ruleDateFilterMode === "range" && ruleToDate
            ? ruleToDate
            : undefined,
        day_of_week: primaryTab === "rules" && ruleDayOfWeek !== "ALL" ? ruleDayOfWeek : undefined,
        search: primaryTab === "rules" && debouncedSearch ? debouncedSearch : undefined,
        page: rulesPage,
        page_size: rulesPageSize,
      }),
  });
  const rules = paginatedRules?.results ?? [];
  const totalRulesCount = paginatedRules?.count ?? rules.length;
  const totalRulesPages = Math.max(1, Math.ceil(totalRulesCount / rulesPageSize));

  const {
    data: paginatedOccurrences,
    isLoading: loadingOccurrences,
    refetch: refetchOccurrences,
    isFetching: fetchingOccurrences,
  } = useQuery({
    queryKey: [
      "class-occurrences",
      dateFilterMode,
      selectedDate,
      sessionFromDate,
      sessionToDate,
      effectiveBranchFilter,
      selectedCategoryFilter,
      primaryTab === "sessions" ? selectedStatusFilter : "ALL",
      primaryTab === "sessions" ? selectedCheckInFilter : "ALL",
      primaryTab === "sessions" ? selectedTrainerFilter : "ALL",
      primaryTab === "sessions" ? debouncedSearch : "",
      primaryTab === "sessions" ? sessionStartTime : "",
      primaryTab === "sessions" ? sessionEndTime : "",
      sessionsPage,
      sessionsPageSize,
    ],
    queryFn: () =>
      classesApi.getOccurrencesPaginated({
        occurrence_date:
          dateFilterMode === "custom"
            ? selectedDate
            : dateFilterMode === "today"
              ? todayStr
              : undefined,
        from_date:
          dateFilterMode === "week"
            ? todayStr
            : dateFilterMode === "range" && sessionFromDate && !isDateRangeInvalid
              ? sessionFromDate
              : undefined,
        to_date:
          dateFilterMode === "week"
            ? weekEndStr
            : dateFilterMode === "range" && sessionToDate && !isDateRangeInvalid
              ? sessionToDate
              : undefined,
        branch_id: effectiveBranchFilter,
        category_id: selectedCategoryFilter !== "ALL" ? selectedCategoryFilter : undefined,
        status:
          primaryTab === "sessions" && selectedStatusFilter !== "ALL"
            ? selectedStatusFilter
            : undefined,
        check_in_status:
          primaryTab === "sessions" && selectedCheckInFilter !== "ALL"
            ? selectedCheckInFilter
            : undefined,
        trainer_id:
          primaryTab === "sessions" && selectedTrainerFilter && selectedTrainerFilter !== "ALL"
            ? selectedTrainerFilter
            : undefined,
        search: primaryTab === "sessions" && debouncedSearch ? debouncedSearch : undefined,
        start_time: primaryTab === "sessions" && sessionStartTime ? sessionStartTime : undefined,
        end_time: primaryTab === "sessions" && sessionEndTime ? sessionEndTime : undefined,
        page: sessionsPage,
        page_size: sessionsPageSize,
      }),
  });
  const occurrences = paginatedOccurrences?.results ?? [];
  const totalSessionsCount = paginatedOccurrences?.count ?? occurrences.length;
  const totalSessionsPages = Math.max(1, Math.ceil(totalSessionsCount / sessionsPageSize));

  // KPI Specific Queries (Branch-Aware via global Studio Branch selection)
  const {
    data: todayOccurrences = [],
    isLoading: loadingTodayOccurrences,
    refetch: refetchTodayOccurrences,
  } = useQuery({
    queryKey: ["class-occurrences-today", globalBranchId, todayStr],
    queryFn: () =>
      classesApi.getOccurrences({
        occurrence_date: todayStr,
        branch_id: globalBranchId,
      }),
  });

  const {
    data: rulesKpiData,
    isLoading: loadingAllRulesForBranch,
    refetch: refetchRulesForBranch,
  } = useQuery({
    queryKey: ["class-schedule-rules-kpi", globalBranchId],
    queryFn: () =>
      classesApi.getScheduleRulesPaginated({
        branch_id: globalBranchId,
        page: 1,
        page_size: 1,
      }),
  });

  const {
    data: allBranchAvailabilities = [],
    isLoading: loadingAllBranchAvailabilities,
    refetch: refetchAllBranchAvailabilities,
  } = useQuery({
    queryKey: ["all-class-branch-availabilities"],
    queryFn: () => classesApi.getBranchAvailabilities(),
  });

  // KPI Calculations
  const todaySessionsCount = todayOccurrences.length;

  const activeTemplatesCount = React.useMemo(() => {
    const active = templates.filter((t) => t.status === "ACTIVE");
    if (!globalBranchId || globalBranchId === "ALL" || globalBranchId.toUpperCase() === "ALL") {
      return active.length;
    }
    return active.filter((t) => {
      const avails = allBranchAvailabilities.filter((ba: any) => ba.class_template === t.id);
      if (avails.length === 0) return true;
      return avails.some(
        (ba: any) =>
          ba.branch === globalBranchId && (ba.status === "ENABLED" || ba.status === "ACTIVE"),
      );
    }).length;
  }, [templates, globalBranchId, allBranchAvailabilities]);

  const activeRecurringRulesCount =
    rulesKpiData?.summary?.active_count ?? paginatedRules?.summary?.active_count ?? 0;

  const todayConfirmedBookings = React.useMemo(() => {
    return todayOccurrences.reduce((acc, occ) => acc + (occ.booking_count ?? 0), 0);
  }, [todayOccurrences]);

  const todayWaitlistBookings = React.useMemo(() => {
    return todayOccurrences.reduce((acc, occ) => acc + (occ.waitlist_count ?? 0), 0);
  }, [todayOccurrences]);

  const {
    data: contentItems = [],
    isLoading: loadingContent,
    refetch: refetchContent,
  } = useQuery({
    queryKey: ["class-content-items"],
    queryFn: () => classesApi.getContentItems(),
  });

  const { data: contentMappings = [], refetch: refetchMappings } = useQuery({
    queryKey: ["class-content-mappings"],
    queryFn: () => classesApi.getContentMappings(),
  });

  // Recurring Schedule Rule Audit Query
  const { data: rawRuleAuditEvents = [], isLoading: isRuleAuditLoading } = useQuery({
    queryKey: ["rule-audit-events", auditRule?.id],
    queryFn: () =>
      classesApi.getAuditEvents({
        entity_type: "ClassScheduleRule",
        entity_id: auditRule?.id,
      }),
    enabled: Boolean(auditRule?.id),
  });

  const ruleAuditEvents = React.useMemo(() => {
    if (!auditRule?.id) return [];
    return rawRuleAuditEvents.filter((evt: any) => {
      if (evt.entity_id && evt.entity_id !== auditRule.id) return false;
      if (evt.entity_type && evt.entity_type !== "ClassScheduleRule") return false;
      return true;
    });
  }, [rawRuleAuditEvents, auditRule?.id]);

  // Canonical Backend Metadata for zero hardcoded dropdown options
  const { data: metadata, isLoading: loadingMetadata } = useQuery<ClassesMetadata>({
    queryKey: ["classes-metadata"],
    queryFn: () => classesApi.getClassesMetadata(),
  });

  // External dropdown data (Real backend queries)
  const { data: branches = [] } = useQuery({
    queryKey: ["tenant-branches"],
    queryFn: () => classesApi.getBranches(),
  });

  // Real-time Branch Operating Hours & Holiday Exceptions for Recurring Rule
  const { data: allBranchWorkingHours = [] } = useQuery({
    queryKey: ["all-tenant-branch-working-hours"],
    queryFn: () => classesApi.getBranchWorkingHours(),
    staleTime: 1000 * 60 * 5,
  });

  const getBranchOperatingDetails = (branchId: string) => {
    const hours = allBranchWorkingHours.filter((w: any) => String(w.branch) === String(branchId) && w.is_open);
    if (!hours || hours.length === 0) {
      return { timeStr: "06:00 AM – 10:00 PM", daysCount: 7, isConfigured: false, label: "06:00 AM – 10:00 PM (7d/wk)" };
    }
    let earliest = "23:59";
    let latest = "00:00";
    hours.forEach((wh: any) => {
      if (wh.is_24_hours) {
        earliest = "00:00";
        latest = "23:59";
      } else {
        if (wh.open_time && wh.open_time.substring(0, 5) < earliest) earliest = wh.open_time.substring(0, 5);
        if (wh.close_time && wh.close_time.substring(0, 5) > latest) latest = wh.close_time.substring(0, 5);
      }
    });
    const minT = earliest === "23:59" ? "06:00" : earliest;
    const maxT = latest === "00:00" ? "22:00" : latest;
    const label = `${formatTime12h(minT)} – ${formatTime12h(maxT)} (${hours.length}d/wk)`;
    return { timeStr: `${formatTime12h(minT)} – ${formatTime12h(maxT)}`, daysCount: hours.length, isConfigured: true, label };
  };

  const getCombinedOperatingWindowSummary = () => {
    if (ruleForm.branches.length === 0) {
      return { text: "No branch selected", daysText: "Select at least 1 branch" };
    }
    const targetHours = allBranchWorkingHours.filter(
      (w: any) => ruleForm.branches.some((bId) => String(bId) === String(w.branch)) && w.is_open
    );
    if (targetHours.length === 0) {
      return {
        text: `Branch Operating Window: 06:00 AM – 10:00 PM across ${ruleForm.branches.length} selected branch(es)`,
        daysText: "Verified across selected branches",
      };
    }
    let earliest = "23:59";
    let latest = "00:00";
    targetHours.forEach((wh: any) => {
      if (wh.is_24_hours) {
        earliest = "00:00";
        latest = "23:59";
      } else {
        if (wh.open_time && wh.open_time.substring(0, 5) < earliest) earliest = wh.open_time.substring(0, 5);
        if (wh.close_time && wh.close_time.substring(0, 5) > latest) latest = wh.close_time.substring(0, 5);
      }
    });
    const minT = earliest === "23:59" ? "06:00" : earliest;
    const maxT = latest === "00:00" ? "22:00" : latest;
    return {
      text: `Combined Operating Window: ${formatTime12h(minT)} – ${formatTime12h(maxT)} across ${ruleForm.branches.length} selected branch(es)`,
      daysText: "Operating hours verified (Admin → Location)",
    };
  };

  const { data: ruleBranchWorkingHours = [] } = useQuery({
    queryKey: ["branch-working-hours", ruleForm.branch],
    queryFn: () => classesApi.getBranchWorkingHours(ruleForm.branch),
    enabled: !!ruleForm.branch,
  });

  const { data: ruleBranchExceptions = [] } = useQuery({
    queryKey: ["branch-operating-exceptions", ruleForm.branch],
    queryFn: () => classesApi.getBranchOperatingExceptions(ruleForm.branch),
    enabled: !!ruleForm.branch,
  });

  // Real-time Branch Operating Hours & Holiday Exceptions for One-Off Session Modal
  const { data: occurrenceBranchWorkingHours = [] } = useQuery({
    queryKey: ["branch-working-hours", occurrenceForm.branch],
    queryFn: () => classesApi.getBranchWorkingHours(occurrenceForm.branch),
    enabled: !!occurrenceForm.branch,
  });

  const buildInitialBranchCapacities = (availabilities?: ClassBranchAvailability[]) => {
    const list = availabilities || [];
    return branches.map((b) => {
      const match = list.find((a: any) => {
        const branchVal =
          a.branch_id || (typeof a.branch === "object" && a.branch ? a.branch.id : a.branch);
        return String(branchVal) === String(b.id);
      });
      return {
        branch_id: b.id,
        branch_name: b.name,
        is_enabled: match ? match.status === "ENABLED" : true,
        capacity_override: match?.capacity_override != null ? String(match.capacity_override) : "",
        trial_capacity_override:
          match?.trial_capacity_override != null ? String(match.trial_capacity_override) : "",
        waitlist_capacity_override:
          match?.waitlist_capacity_override != null ? String(match.waitlist_capacity_override) : "",
      };
    });
  };

  const { data: occurrenceBranchExceptions = [] } = useQuery({
    queryKey: ["branch-operating-exceptions", occurrenceForm.branch],
    queryFn: () => classesApi.getBranchOperatingExceptions(occurrenceForm.branch),
    enabled: !!occurrenceForm.branch,
  });

  const isDayClosed = (dayNum: number) => {
    const wh = ruleBranchWorkingHours.find((w: any) => w.day_of_week === dayNum);
    return wh ? !wh.is_open : false;
  };

  const getDayScheduleText = (dayNum: number) => {
    const wh = ruleBranchWorkingHours.find((w: any) => w.day_of_week === dayNum);
    if (!wh) return null;
    if (!wh.is_open) return "Closed";
    if (wh.is_24_hours) return "24h Open";
    return `${formatTime12h(wh.open_time?.substring(0, 5))} – ${formatTime12h(wh.close_time?.substring(0, 5))}`;
  };

  const getEffectiveOperatingWindow = () => {
    if (!ruleBranchWorkingHours || ruleBranchWorkingHours.length === 0) {
      return {
        minTime: undefined,
        maxTime: undefined,
        text: "Operating schedule not configured for selected branch",
      };
    }

    const normalizedFormDays = normalizeDaysOfWeek(ruleForm.days_of_week);
    const targetDays =
      normalizedFormDays.length > 0
        ? normalizedFormDays
        : ruleBranchWorkingHours.filter((w: any) => w.is_open).map((w: any) => w.day_of_week);

    if (targetDays.length === 0) {
      return { minTime: undefined, maxTime: undefined, text: "No active operating days selected" };
    }

    let earliestOpen = "23:59";
    let latestClose = "00:00";
    let hasOpen = false;

    for (const d of targetDays) {
      const wh = ruleBranchWorkingHours.find((w: any) => w.day_of_week === d);
      if (wh && wh.is_open) {
        hasOpen = true;
        if (wh.is_24_hours) {
          earliestOpen = "00:00";
          latestClose = "23:59";
          break;
        }
        if (wh.open_time && wh.open_time.substring(0, 5) < earliestOpen)
          earliestOpen = wh.open_time.substring(0, 5);
        if (wh.close_time && wh.close_time.substring(0, 5) > latestClose)
          latestClose = wh.close_time.substring(0, 5);
      }
    }

    if (!hasOpen) {
      return {
        minTime: undefined,
        maxTime: undefined,
        text: "Selected days are closed in branch schedule",
      };
    }

    const minT = earliestOpen === "23:59" ? undefined : earliestOpen;
    const maxT = latestClose === "00:00" ? undefined : latestClose;
    return {
      minTime: minT,
      maxTime: maxT,
      text:
        minT && maxT
          ? `Branch Operating Window: ${formatTime12h(minT)} – ${formatTime12h(maxT)}`
          : "Operating schedule pending",
    };
  };

  const activeHolidayClosures = ruleBranchExceptions.filter((ex: any) => {
    if (!ex.is_closed) return false;
    if (!ruleForm.valid_from) return false;
    if (ruleForm.valid_until) {
      return ex.exception_date >= ruleForm.valid_from && ex.exception_date <= ruleForm.valid_until;
    }
    return ex.exception_date >= ruleForm.valid_from;
  });

  // Dynamic schedule, operating window, and holiday resolution for one-off class session
  const getOccurrenceDateSchedule = () => {
    if (!occurrenceForm.branch) {
      return {
        isConfigured: false,
        isOpen: false,
        isException: false,
        statusText: "Select a branch to view operating schedule",
        reason: null,
        minTime: undefined,
        maxTime: undefined,
      };
    }
    if (!occurrenceForm.occurrence_date) {
      return {
        isConfigured: false,
        isOpen: false,
        isException: false,
        statusText: "Select session date to view operating schedule",
        reason: null,
        minTime: undefined,
        maxTime: undefined,
      };
    }

    // 1. Date-specific operating exception / holiday (Rule 2: Exceptions override weekly hours)
    const exception = occurrenceBranchExceptions.find(
      (ex: any) => ex.exception_date === occurrenceForm.occurrence_date,
    );

    if (exception) {
      if (exception.is_closed) {
        return {
          isConfigured: true,
          isOpen: false,
          isException: true,
          statusText: `Closed for holiday/exception: ${exception.reason || "Branch Closed"}`,
          reason: exception.reason || "Operating Exception / Holiday Closure",
          minTime: undefined,
          maxTime: undefined,
        };
      }
      const minT = exception.open_time ? exception.open_time.substring(0, 5) : "00:00";
      const maxT = exception.close_time ? exception.close_time.substring(0, 5) : "23:59";
      return {
        isConfigured: true,
        isOpen: true,
        isException: true,
        statusText: `Special holiday hours (${exception.reason || "Holiday"}): ${formatTime12h(minT)} – ${formatTime12h(maxT)}`,
        reason: exception.reason,
        minTime: minT,
        maxTime: maxT,
      };
    }

    // 2. Weekly schedule: Python isoweekday Mon=1, Sun=7 (Canonical ISO standard)
    const dateParts = occurrenceForm.occurrence_date.split("-").map(Number);
    const y = dateParts[0] || new Date().getFullYear();
    const m = dateParts[1] || 1;
    const d = dateParts[2] || 1;
    const dateObj = new Date(y, m - 1, d);
    const jsDay = dateObj.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    const wh = occurrenceBranchWorkingHours.find((w: any) => w.day_of_week === dayOfWeek);

    if (wh) {
      if (!wh.is_open) {
        return {
          isConfigured: true,
          isOpen: false,
          isException: false,
          statusText: "Branch is closed on this day of the week",
          reason: "Weekly Closed Day",
          minTime: undefined,
          maxTime: undefined,
        };
      }
      if (wh.is_24_hours) {
        return {
          isConfigured: true,
          isOpen: true,
          isException: false,
          statusText: "Branch is open 24 hours",
          reason: null,
          minTime: "00:00",
          maxTime: "23:59",
        };
      }
      const minT = wh.open_time ? wh.open_time.substring(0, 5) : "00:00";
      const maxT = wh.close_time ? wh.close_time.substring(0, 5) : "23:59";
      return {
        isConfigured: true,
        isOpen: true,
        isException: false,
        statusText: `Operating Window: ${formatTime12h(minT)} – ${formatTime12h(maxT)}`,
        reason: null,
        minTime: minT,
        maxTime: maxT,
      };
    }

    // 3. Fallback when days are not yet seeded in backend (Plug-and-play readiness)
    return {
      isConfigured: false,
      isOpen: true,
      isException: false,
      statusText: "Operating schedule pending configuration for this branch",
      reason: null,
      minTime: undefined,
      maxTime: undefined,
    };
  };

  const occurrenceSchedule = getOccurrenceDateSchedule();

  const getEligibleTrainersForCategory = (categoryId?: string, categoryName?: string) => {
    if (!trainers || trainers.length === 0) return [];
    if (!categoryId && !categoryName) return trainers;

    return trainers.filter((tr: any) => {
      if (tr.can_teach_all_specialties) return true;
      if (categoryId && Array.isArray(tr.category_ids)) {
        if (tr.category_ids.some((cid: any) => String(cid) === String(categoryId))) return true;
      }
      if (categoryId && Array.isArray(tr.categories)) {
        if (tr.categories.some((c: any) => String(c.id || c.category_id || c) === String(categoryId))) return true;
      }
      if (categoryName && Array.isArray(tr.categories)) {
        if (tr.categories.some((c: any) => (c.name || c.category_name || "").toLowerCase() === categoryName.toLowerCase())) return true;
      }
      if (categoryName && Array.isArray(tr.category_names)) {
        if (tr.category_names.some((cn: string) => String(cn).toLowerCase() === categoryName.toLowerCase())) return true;
      }
      return false;
    });
  };

  const addTemplateBlock = () => {
    const nextUid = templateBlocks.length > 0 ? Math.max(...templateBlocks.map((t) => t.uid)) + 1 : 1;
    const activeTemplates = templates.filter(
      (t) => (t.status || "").toUpperCase() === "ACTIVE" || (!t.status && (t as any).is_active !== false)
    );
    const availableTpl = activeTemplates.find((t) => !templateBlocks.some((b) => b.class_template === t.id)) || activeTemplates[0] || templates[0];
    const dur = availableTpl?.default_duration_minutes || 60;
    const durEndM = Math.min(1439, 8 * 60 + dur);
    const endH = Math.floor(durEndM / 60) % 24;
    const endM = durEndM % 60;
    const endStr = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;

    setTemplateBlocks((prev) => [
      ...prev,
      {
        uid: nextUid,
        class_template: availableTpl?.id || "",
        days_of_week: [2, 4, 6],
        time_slots: [{ id: String(Date.now()), start_time: "08:00", end_time: endStr }],
        default_trainer: "",
      },
    ]);
  };

  const removeTemplateBlock = (uid: number) => {
    if (templateBlocks.length <= 1) return;
    setTemplateBlocks((prev) => prev.filter((b) => b.uid !== uid));
  };

  const updateTemplateBlock = (uid: number, updates: Partial<{
    class_template: string;
    days_of_week: number[];
    time_slots: RuleTimeSlot[];
    default_trainer?: string;
  }>) => {
    setTemplateBlocks((prev) => prev.map((b) => (b.uid === uid ? { ...b, ...updates } : b)));
  };

  const addSlotToBlock = (uid: number) => {
    setTemplateBlocks((prev) =>
      prev.map((b) => {
        if (b.uid !== uid) return b;
        const lastSlot = b.time_slots[b.time_slots.length - 1];
        const tpl = templates.find((t) => t.id === b.class_template);
        const dur = tpl?.default_duration_minutes || 60;
        let nextStart = "10:00";
        let nextEnd = "11:00";

        if (lastSlot && lastSlot.end_time) {
          nextStart = lastSlot.end_time;
          const parts = nextStart.split(":");
          const h = parseInt(parts[0] || "0", 10);
          const m = parseInt(parts[1] || "0", 10);
          const endTotalM = Math.min(1439, h * 60 + m + dur);
          const eh = Math.floor(endTotalM / 60) % 24;
          const em = endTotalM % 60;
          nextEnd = `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`;
        }

        return {
          ...b,
          time_slots: [
            ...b.time_slots,
            { id: String(Date.now() + Math.random()), start_time: nextStart, end_time: nextEnd },
          ],
        };
      })
    );
  };

  const removeSlotFromBlock = (uid: number, slotIdx: number) => {
    setTemplateBlocks((prev) =>
      prev.map((b) => {
        if (b.uid !== uid || b.time_slots.length <= 1) return b;
        return {
          ...b,
          time_slots: b.time_slots.filter((_, idx) => idx !== slotIdx),
        };
      })
    );
  };

  const updateSlotInBlock = (
    uid: number,
    slotIdx: number,
    field: "start_time" | "end_time",
    val: string
  ) => {
    setTemplateBlocks((prev) =>
      prev.map((b) => {
        if (b.uid !== uid) return b;
        const tpl = templates.find((t) => t.id === b.class_template);
        const dur = tpl?.default_duration_minutes || 60;
        const newSlots = b.time_slots.map((s, idx) => {
          if (idx !== slotIdx) return s;
          const updated = { ...s, [field]: val };
          if (field === "start_time" && val) {
            const parts = val.split(":");
            const h = parseInt(parts[0] || "0", 10);
            const m = parseInt(parts[1] || "0", 10);
            const endTotalM = Math.min(1439, h * 60 + m + dur);
            const eh = Math.floor(endTotalM / 60) % 24;
            const em = endTotalM % 60;
            updated.end_time = `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`;
          }
          return updated;
        });
        return { ...b, time_slots: newSlots };
      })
    );
  };

  const calculatePreviewOccurrences = () => {
    const fromStr = ruleForm.generate_from_date || ruleForm.valid_from;
    const toStr = ruleForm.generate_to_date || ruleForm.valid_until;
    if (!fromStr || !toStr) return [];

    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr);
    if (toDate < fromDate) return [];

    const selectedBranchesList = branches.filter((b) => ruleForm.branches.includes(b.id));
    const occurrences: Array<{
      id: string;
      date: string;
      dayNum: number;
      dayName: string;
      startTime: string;
      endTime: string;
      templateId: string;
      templateName: string;
      templateCategoryName: string;
      templateCategoryId: string;
      templateCapacity: number;
      branchId: string;
      branchName: string;
      trainerId: string;
      trainerName: string;
    }> = [];

    const curr = new Date(fromDate);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    while (curr <= toDate) {
      const dateIso = curr.toISOString().split("T")[0] || "";
      const jsDay = curr.getDay(); // 0=Sun, 1=Mon...6=Sat
      const isoDay = jsDay === 0 ? 7 : jsDay; // 1=Mon...7=Sun
      const dayName = dayNames[jsDay] || "";

      selectedBranchesList.forEach((branch) => {
        templateBlocks.forEach((tb) => {
          if (tb.class_template && tb.days_of_week.includes(isoDay)) {
            const tpl = templates.find((t) => t.id === tb.class_template);
            const tplName = tpl?.name || "Class";
            const catName =
              tpl?.category_name ||
              categories.find((c) => c.id === tpl?.category)?.name ||
              "General";
            const catId = tpl?.category || "";
            const cap = tpl?.default_capacity || 20;

            tb.time_slots.forEach((slot) => {
              if (slot.start_time && slot.end_time) {
                const uniqueKey = `${dateIso}_${branch.id}_${tb.class_template}_${slot.start_time}`;
                const existing = previewOccurrences.find((p) => p.id === uniqueKey);
                const assignedTrId = existing ? existing.trainerId : tb.default_trainer || "";
                const trObj = trainers.find(
                  (tr: any) => (tr.id || tr.trainer_profile_id) === assignedTrId
                );
                const trName = trObj
                  ? trObj.full_name || trObj.trainer_name || trObj.name || trObj.employee_name
                  : "";

                occurrences.push({
                  id: uniqueKey,
                  date: dateIso,
                  dayNum: isoDay,
                  dayName: dayName,
                  startTime: slot.start_time,
                  endTime: slot.end_time,
                  templateId: tb.class_template,
                  templateName: tplName,
                  templateCategoryName: catName,
                  templateCategoryId: catId,
                  templateCapacity: Number(cap),
                  branchId: branch.id,
                  branchName: branch.name,
                  trainerId: assignedTrId,
                  trainerName: trName,
                });
              }
            });
          }
        });
      });

      curr.setDate(curr.getDate() + 1);
    }

    return occurrences;
  };

  const validateStep1 = (): boolean => {
    if (ruleForm.branches.length === 0) {
      setRuleError("Please select at least one branch.");
      return false;
    }
    if (templateBlocks.length === 0) {
      setRuleError("Please configure at least one class template.");
      return false;
    }
    for (let i = 0; i < templateBlocks.length; i++) {
      const tb = templateBlocks[i];
      if (!tb || !tb.class_template) {
        setRuleError(`Template block #${i + 1} is missing a selected class template.`);
        return false;
      }
      if (tb.days_of_week.length === 0) {
        setRuleError(`Template block #${i + 1} must have at least one day selected.`);
        return false;
      }
      if (tb.time_slots.length === 0) {
        setRuleError(`Template block #${i + 1} must have at least one time slot.`);
        return false;
      }
      for (let s = 0; s < tb.time_slots.length; s++) {
        const slot = tb.time_slots[s];
        if (!slot || !slot.start_time || !slot.end_time) {
          setRuleError(`Template #${i + 1}, Slot #${s + 1} is missing start or end time.`);
          return false;
        }
        if (slot.end_time <= slot.start_time) {
          setRuleError(`Template #${i + 1}, Slot #${s + 1}: End time must be strictly greater than start time.`);
          return false;
        }
      }
    }
    setRuleError(null);
    return true;
  };

  const openNewRuleModal = () => {
    setRuleError(null);
    setEditingRule(null);
    setRuleModalStep(1);
    setPreviewOccurrences([]);
    const initialBranches = selectedBranchFilter
      ? [selectedBranchFilter]
      : branches.map((b) => b.id);
    const defaultBranchId = selectedBranchFilter || initialBranches[0] || "";

    const activeTemplates = templates.filter(
      (t) => (t.status || "").toUpperCase() === "ACTIVE" || (!t.status && (t as any).is_active !== false)
    );
    const firstActiveTemplate = activeTemplates[0]?.id || templates[0]?.id || "";
    const activeTplObj = templates.find((t) => t.id === firstActiveTemplate);
    const initDur = activeTplObj?.default_duration_minutes || 50;
    const durEndM = Math.min(1439, 7 * 60 + initDur);
    const endH = Math.floor(durEndM / 60) % 24;
    const endM = durEndM % 60;
    const endStr = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;

    setTemplateBlocks([
      {
        uid: 1,
        class_template: firstActiveTemplate,
        days_of_week: [1, 3, 5],
        time_slots: [
          { id: "1", start_time: "07:00", end_time: endStr },
          { id: "2", start_time: "18:00", end_time: "18:50" },
        ],
        default_trainer: "",
      },
    ]);

    setRuleForm({
      class_template: firstActiveTemplate,
      branch: defaultBranchId,
      branches: initialBranches,
      recurrence_type: "WEEKLY",
      days_of_week: [1, 3, 5],
      start_time: "07:00",
      end_time: endStr,
      time_slots: [{ id: "1", start_time: "07:00", end_time: endStr }],
      valid_from: new Date().toISOString().split("T")[0],
      valid_until: "",
      delivery_mode: "OFFLINE",
      capacity_override: "",
      trial_capacity_override: "",
      waitlist_capacity_override: "",
      status: "ACTIVE",
      auto_generate_slots: true,
      generate_from_date: new Date().toISOString().split("T")[0],
      generate_to_date: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split("T")[0];
      })(),
    });
    setIsCreateRuleOpen(true);
  };

  const openEditRuleModal = (rule: ClassScheduleRule) => {
    setRuleError(null);
    setEditingRule(rule);
    setRuleModalStep(1);
    const resolvedTemplateId = (() => {
      const raw = rule.class_template as any;
      if (typeof raw === "object" && raw !== null) return raw.id || "";
      if (typeof raw === "string" && raw) {
        if (templates.some((t) => t.id === raw)) return raw;
        const matchByName = templates.find(
          (t) => t.name?.trim().toLowerCase() === raw.trim().toLowerCase(),
        );
        if (matchByName) return matchByName.id;
        return raw;
      }
      if ((rule as any).class_template_id) return (rule as any).class_template_id;
      if (rule.class_name || (rule as any).template_name) {
        const nameToFind = (rule.class_name || (rule as any).template_name || "")
          .trim()
          .toLowerCase();
        const match = templates.find((t) => t.name?.trim().toLowerCase() === nameToFind);
        if (match) return match.id;
      }
      return "";
    })();
    const initialSlotStart = rule.start_time ? rule.start_time.substring(0, 5) : "";
    const initialSlotEnd = rule.end_time ? rule.end_time.substring(0, 5) : "";
    setRuleForm({
      class_template: resolvedTemplateId,
      branch: rule.branch || "",
      branches: rule.branch ? [rule.branch] : [],
      recurrence_type: (rule as any).recurrence_type || "WEEKLY",
      days_of_week: normalizeDaysOfWeek(rule.days_of_week),
      start_time: initialSlotStart,
      end_time: initialSlotEnd,
      time_slots: [{ id: "1", start_time: initialSlotStart, end_time: initialSlotEnd }],
      valid_from: rule.valid_from || new Date().toISOString().split("T")[0],
      valid_until: rule.valid_until || "",
      delivery_mode: rule.delivery_mode || "OFFLINE",
      capacity_override: rule.capacity_override != null ? String(rule.capacity_override) : "",
      trial_capacity_override:
        rule.trial_capacity_override != null ? String(rule.trial_capacity_override) : "",
      waitlist_capacity_override:
        rule.waitlist_capacity_override != null ? String(rule.waitlist_capacity_override) : "",
      status: rule.status || "ACTIVE",
      auto_generate_slots: false,
      generate_from_date: rule.valid_from || new Date().toISOString().split("T")[0],
      generate_to_date: rule.valid_until || "",
    });
    setIsCreateRuleOpen(true);
  };

  const addTimeSlot = () => {
    setRuleForm((prev) => {
      const lastSlot = prev.time_slots[prev.time_slots.length - 1];
      const selTpl = templates.find((t) => t.id === prev.class_template);
      const dur = selTpl?.default_duration_minutes || 60;
      let nextStart = "";
      let nextEnd = "";

      if (lastSlot && lastSlot.end_time) {
        nextStart = lastSlot.end_time;
        const parts = nextStart.split(":");
        const h = parseInt(parts[0] || "0", 10);
        const m = parseInt(parts[1] || "0", 10);
        const endM = Math.min(1439, h * 60 + m + dur);
        const eh = Math.floor(endM / 60) % 24;
        const em = endM % 60;
        nextEnd = `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`;
      }

      const newSlots: RuleTimeSlot[] = [
        ...prev.time_slots,
        {
          id: String(Date.now() + Math.random()),
          start_time: nextStart,
          end_time: nextEnd,
        },
      ];

      return {
        ...prev,
        time_slots: newSlots,
        start_time: newSlots[0]?.start_time || "",
        end_time: newSlots[0]?.end_time || "",
      };
    });
  };

  const removeTimeSlot = (indexToRemove: number) => {
    setRuleForm((prev) => {
      if (prev.time_slots.length <= 1) return prev;
      const newSlots = prev.time_slots.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        time_slots: newSlots,
        start_time: newSlots[0]?.start_time || "",
        end_time: newSlots[0]?.end_time || "",
      };
    });
  };

  const updateTimeSlot = (
    indexToUpdate: number,
    field: "start_time" | "end_time",
    value: string,
  ) => {
    setRuleForm((prev) => {
      const selTpl = templates.find((t) => t.id === prev.class_template);
      const dur = selTpl?.default_duration_minutes || 60;
      const newSlots = prev.time_slots.map((slot, idx) => {
        if (idx !== indexToUpdate) return slot;
        const updated = { ...slot, [field]: value };
        if (field === "start_time" && value) {
          const parts = value.split(":");
          const h = parseInt(parts[0] || "0", 10);
          const m = parseInt(parts[1] || "0", 10);
          const endM = Math.min(1439, h * 60 + m + dur);
          const eh = Math.floor(endM / 60) % 24;
          const em = endM % 60;
          updated.end_time = `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`;
        }
        return updated;
      });

      return {
        ...prev,
        time_slots: newSlots,
        start_time: newSlots[0]?.start_time || "",
        end_time: newSlots[0]?.end_time || "",
      };
    });
  };

  const handleRuleTemplateChange = (val: string) => {
    const tpl = templates.find((t) => t.id === val);
    const dur = tpl?.default_duration_minutes || 60;
    setRuleForm((prev) => {
      const updatedSlots = prev.time_slots.map((s) => {
        if (!s.start_time) return s;
        const parts = s.start_time.split(":");
        const h = parseInt(parts[0] || "0", 10);
        const m = parseInt(parts[1] || "0", 10);
        const endM = Math.min(1439, h * 60 + m + dur);
        const eh = Math.floor(endM / 60) % 24;
        const em = endM % 60;
        return {
          ...s,
          end_time: `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`,
        };
      });
      return {
        ...prev,
        class_template: val,
        time_slots: updatedSlots,
        start_time: updatedSlots[0]?.start_time || "",
        end_time: updatedSlots[0]?.end_time || "",
      };
    });
  };

  const openNewOccurrenceModal = () => {
    setOccurrenceError(null);
    const defaultBranchId =
      selectedBranchFilter || (branches.length === 1 ? branches[0]?.id || "" : "");
    const defaultDate = selectedDate || new Date().toISOString().split("T")[0] || "";
    setOccurrenceForm({
      class_template: "",
      branch: defaultBranchId,
      occurrence_date: defaultDate,
      start_time: "",
      end_time: "",
      delivery_mode: "OFFLINE",
      capacity: "",
      trial_capacity: "",
      waitlist_capacity: "",
      video_id: "AUTO",
    });
    setIsCreateOccurrenceOpen(true);
  };

  const { data: trainers = [] } = useQuery({
    queryKey: ["tenant-trainers"],
    queryFn: () => classesApi.getTrainers(),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["tenant-programs"],
    queryFn: () => classesApi.getPrograms(),
  });

  const { data: branchAvailabilities = [], refetch: refetchAvailabilities } = useQuery({
    queryKey: ["class-branch-availabilities", selectedTemplateForAvail?.id],
    queryFn: () => classesApi.getBranchAvailabilities(selectedTemplateForAvail?.id),
    enabled: !!selectedTemplateForAvail,
  });

  const { data: classPrices = [], refetch: refetchPrices } = useQuery({
    queryKey: ["class-prices", selectedTemplateForPricing?.id],
    queryFn: () => classesApi.getClassPrices(selectedTemplateForPricing?.id),
    enabled: !!selectedTemplateForPricing,
  });

  const refetchAll = () => {
    refetchCategories();
    refetchTemplates();
    refetchRules();
    refetchOccurrences();
    refetchContent();
    refetchTodayOccurrences();
    refetchRulesForBranch();
    refetchAllBranchAvailabilities();
  };

  // Mutations
  const saveCategoryMutation = useMutation({
    mutationFn: (data: typeof categoryForm) => {
      const payload: any = {
        name: data.name,
        description: data.description || "",
        display_order: data.display_order ? Number(data.display_order) : 1,
        status: (data.status as "ACTIVE" | "INACTIVE") || "ACTIVE",
      };
      if (editingCategory) {
        return classesApi.updateCategory(editingCategory.id, payload);
      }
      return classesApi.createCategory(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-categories"] });
      setIsCreateCategoryOpen(false);
      setEditingCategory(null);
      setCategoryForm({ name: "", description: "", display_order: 1, status: "ACTIVE" });
      toast.success(editingCategory ? "Category updated" : "Category created");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.error || err?.response?.data?.detail || "Failed to save category",
      );
    },
  });

  const toggleCategoryStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) => {
      return classesApi.updateCategory(id, { status });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["class-categories"] });
      toast.success(vars.status === "ACTIVE" ? "Category activated" : "Category deactivated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to update category status");
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (data: typeof templateForm) => {
      const selectedCat = categories.find((c) => c.id === data.category);
      const payload: any = {
        name: data.name || selectedCat?.name || "",
        category: data.category || null,
        program: data.program || null,
        description: data.description || "",
        default_duration_minutes: data.default_duration_minutes
          ? Number(data.default_duration_minutes)
          : 60,
        default_capacity: data.default_capacity ? Number(data.default_capacity) : 20,
        default_trial_capacity: data.default_trial_capacity
          ? Number(data.default_trial_capacity)
          : 0,
        default_waitlist_capacity: data.default_waitlist_capacity
          ? Number(data.default_waitlist_capacity)
          : 0,
        default_delivery_mode: (data.default_delivery_mode as DeliveryMode) || "OFFLINE",
        allow_booking: data.allow_booking,
        allow_trial: data.allow_trial,
        allow_waitlist: data.allow_waitlist,
        allow_reschedule: data.allow_reschedule,
        image_url: data.image_url || null,
        status: (data.status as ClassTemplateStatus) || "ACTIVE",
        branch_capacities: (data.branch_capacities || []).map((bc: any) => ({
          branch_id: bc.branch_id,
          is_enabled: bc.is_enabled !== false,
          status: bc.is_enabled === false ? "DISABLED" : "ENABLED",
          capacity_override:
            bc.capacity_override !== "" && bc.capacity_override != null
              ? Number(bc.capacity_override)
              : null,
          trial_capacity_override:
            bc.trial_capacity_override !== "" && bc.trial_capacity_override != null
              ? Number(bc.trial_capacity_override)
              : null,
          waitlist_capacity_override:
            bc.waitlist_capacity_override !== "" && bc.waitlist_capacity_override != null
              ? Number(bc.waitlist_capacity_override)
              : null,
        })),
      };
      if (editingTemplate) {
        return classesApi.updateTemplate(editingTemplate.id, payload);
      }
      return classesApi.createTemplate(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-templates"] });
      queryClient.invalidateQueries({ queryKey: ["class-templates-all"] });
      queryClient.invalidateQueries({ queryKey: ["all-class-branch-availabilities"] });
      setIsCreateTemplateOpen(false);
      setEditingTemplate(null);
      resetTemplateForm();
      toast.success(editingTemplate ? "Template updated" : "Template created");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.error || err?.response?.data?.detail || "Failed to save template",
      );
    },
  });

  const toggleTemplateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClassTemplateStatus }) => {
      return classesApi.updateTemplate(id, { status });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["class-templates"] });
      toast.success(vars.status === "ACTIVE" ? "Template activated" : "Template deactivated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to update template status");
    },
  });

  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      category: "",
      program: "",
      description: "",
      default_duration_minutes: "60",
      default_capacity: "20",
      default_trial_capacity: "0",
      default_waitlist_capacity: "0",
      default_delivery_mode: "OFFLINE",
      allow_booking: true,
      allow_trial: false,
      allow_waitlist: false,
      allow_reschedule: true,
      image_url: "",
      status: "ACTIVE",
      branch_capacities: buildInitialBranchCapacities(),
    });
  };
  const saveRuleMutation = useMutation({
    mutationFn: (data: typeof ruleForm) => {
      const selectedBranches =
        data.branches && data.branches.length > 0
          ? data.branches
          : data.branch
            ? [data.branch]
            : [];
      const slotsToSubmit =
        data.time_slots && data.time_slots.length > 0
          ? data.time_slots.map((s) => ({ start_time: s.start_time, end_time: s.end_time }))
          : [{ start_time: data.start_time, end_time: data.end_time }];

      if (editingRule) {
        const primaryBranch = selectedBranches.includes(editingRule.branch)
          ? editingRule.branch
          : selectedBranches[0] || editingRule.branch;
        const primarySlot = slotsToSubmit[0] || {
          start_time: data.start_time,
          end_time: data.end_time,
        };
        const payload: any = {
          class_template: data.class_template,
          branch: primaryBranch,
          recurrence_type: data.recurrence_type || "WEEKLY",
          days_of_week: data.days_of_week,
          start_time: primarySlot.start_time,
          end_time: primarySlot.end_time,
          valid_from: data.valid_from,
          valid_until: data.valid_until || null,
          delivery_mode: data.delivery_mode || "OFFLINE",
          capacity_override: data.capacity_override ? Number(data.capacity_override) : null,
          trial_capacity_override: data.trial_capacity_override
            ? Number(data.trial_capacity_override)
            : null,
          waitlist_capacity_override: data.waitlist_capacity_override
            ? Number(data.waitlist_capacity_override)
            : null,
          status: data.status || "ACTIVE",
        };
        const updatePromise = classesApi.updateScheduleRule(editingRule.id, payload);

        const additionalBranches = selectedBranches.filter((bId) => bId !== primaryBranch);
        const additionalSlots = slotsToSubmit.slice(1);

        if (additionalBranches.length > 0 || additionalSlots.length > 0) {
          const promises: Promise<any>[] = [updatePromise];

          if (additionalSlots.length > 0 && additionalSlots[0]) {
            promises.push(
              classesApi.createScheduleRule({
                ...payload,
                branches: [primaryBranch],
                branch: primaryBranch,
                time_slots: additionalSlots,
                start_time: additionalSlots[0].start_time,
                end_time: additionalSlots[0].end_time,
                generate_slots: data.auto_generate_slots !== false,
                generate_from_date: data.generate_from_date || data.valid_from,
                generate_to_date: data.generate_to_date || data.valid_until || null,
              } as any),
            );
          }

          if (additionalBranches.length > 0 && slotsToSubmit[0]) {
            promises.push(
              classesApi.createScheduleRule({
                ...payload,
                branches: additionalBranches,
                branch: additionalBranches[0],
                time_slots: slotsToSubmit,
                start_time: slotsToSubmit[0].start_time,
                end_time: slotsToSubmit[0].end_time,
                generate_slots: data.auto_generate_slots !== false,
                generate_from_date: data.generate_from_date || data.valid_from,
                generate_to_date: data.generate_to_date || data.valid_until || null,
              } as any),
            );
          }

          return Promise.all(promises).then((results) => {
            let totalOccs = 0;
            let totalCreated = 1;
            for (const r of results.slice(1)) {
              if (r && typeof r === "object") {
                totalOccs += (r as any).occurrences_generated || 0;
                totalCreated += (r as any).count || 1;
              }
            }
            return {
              ...results[0],
              count: totalCreated,
              occurrences_generated: totalOccs,
              message: `Rule updated and ${totalCreated - 1} additional rule(s) created with ${totalOccs} slot(s) generated!`,
            };
          });
        }

        return updatePromise;
      }

      const payload: any = {
        branches: selectedBranches,
        templates:
          templateBlocks && templateBlocks.length > 0
            ? templateBlocks.map((tb) => ({
                class_template: tb.class_template,
                days_of_week: tb.days_of_week,
                time_slots: tb.time_slots.map((s) => ({
                  start_time: s.start_time,
                  end_time: s.end_time,
                })),
                default_trainer: tb.default_trainer || null,
              }))
            : undefined,
        trainer_assignments: previewOccurrences
          .filter((o) => o.trainerId)
          .map((o) => ({
            date: o.date,
            start_time: o.startTime,
            branch: o.branchId,
            class_template: o.templateId,
            trainer: o.trainerId,
          })),
        class_template: templateBlocks[0]?.class_template || data.class_template,
        branch: selectedBranches[0] || data.branch,
        time_slots: templateBlocks[0]?.time_slots || slotsToSubmit,
        start_time:
          templateBlocks[0]?.time_slots[0]?.start_time ||
          slotsToSubmit[0]?.start_time ||
          data.start_time,
        end_time:
          templateBlocks[0]?.time_slots[0]?.end_time ||
          slotsToSubmit[0]?.end_time ||
          data.end_time,
        recurrence_type: data.recurrence_type || "WEEKLY",
        days_of_week: templateBlocks[0]?.days_of_week || data.days_of_week,
        valid_from: data.valid_from,
        valid_until: data.valid_until || null,
        delivery_mode: "OFFLINE",
        status: "ACTIVE",
        generate_slots: data.auto_generate_slots !== false,
        generate_from_date: data.generate_from_date || data.valid_from,
        generate_to_date: data.generate_to_date || data.valid_until || null,
      };
      return classesApi.createScheduleRule(payload);
    },
    onSuccess: (resp: any) => {
      queryClient.invalidateQueries({ queryKey: ["class-schedule-rules"] });
      queryClient.invalidateQueries({ queryKey: ["class-schedule-rules-kpi"] });
      queryClient.invalidateQueries({ queryKey: ["class-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["today-class-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["classes-occurrences-kpi"] });
      
      const selectedBrs = ruleForm.branches.length > 0 ? ruleForm.branches : [ruleForm.branch];
      const totalCreatedRules =
        resp?.count ||
        selectedBrs.length * (templateBlocks?.length || 1) * (ruleForm.time_slots?.length || 1);
      const totalOccsGenerated = resp?.occurrences_generated || previewOccurrences.length;
      
      setSuccessDetails({
        rulesCount: totalCreatedRules,
        sessionsCount: totalOccsGenerated,
        branchesCount: selectedBrs.length,
        templatesCount: templateBlocks.length > 0 ? templateBlocks.length : 1,
        trainersCount:
          resp?.trainers_assigned || previewOccurrences.filter((p) => p.trainerId).length,
      });

      setIsCreateRuleOpen(false);
      setIsSuccessModalOpen(true);
      setEditingRule(null);
      setRuleError(null);
      if (resp?.message) {
        toast.success(resp.message);
      } else if (resp?.occurrences_generated != null && resp.occurrences_generated > 0) {
        toast.success(`Recurring rule(s) created & ${resp.occurrences_generated} slots generated!`);
      } else if (resp?.count) {
        toast.success(`${resp.count} recurring schedule rule(s) created!`);
      } else {
        toast.success(editingRule ? "Schedule rule updated" : "Schedule rule created");
      }
    },
    onError: (err: any) => {
      const resp = err?.response?.data;
      let errorMsg = "Failed to save schedule rule.";
      if (typeof resp === "string") {
        errorMsg = resp;
      } else if (resp && typeof resp === "object") {
        if (resp.detail) {
          errorMsg = resp.detail;
        } else if (resp.error) {
          errorMsg = resp.error;
        } else {
          const messages = Object.entries(resp).map(([field, errs]) => {
            const text = Array.isArray(errs) ? errs.join(", ") : String(errs);
            const fieldLabel = field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            return `${fieldLabel}: ${text}`;
          });
          if (messages.length > 0) {
            errorMsg = messages.join(" | ");
          }
        }
      }
      setRuleError(errorMsg);
      toast.error(errorMsg);
    },
  });

  const toggleRuleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) => {
      return classesApi.updateScheduleRule(id, { status });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["class-schedule-rules"] });
      queryClient.invalidateQueries({ queryKey: ["class-occurrences"] });
      toast.success(vars.status === "ACTIVE" ? "Rule activated" : "Rule deactivated");
    },
    onError: (err: any) => {
      const apiError =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        (typeof err?.response?.data === "object"
          ? Object.entries(err.response.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
              .join(" | ")
          : null) ||
        "Failed to update rule status";
      toast.error(apiError);
    },
  });

  const generateOccurrencesMutation = useMutation({
    mutationFn: () => {
      if (!selectedRuleForGen) throw new Error("No rule selected");
      return classesApi.generateOccurrencesFromRule(selectedRuleForGen.id, genFromDate, genToDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-occurrences"] });
      setIsGenerateOccurrencesOpen(false);
      setSelectedRuleForGen(null);
    },
  });

  const { data: availableVideosForCreate } = useQuery({
    queryKey: ["available-workout-videos", "FOR_CREATE"],
    queryFn: () => classesApi.getAvailableWorkoutVideos({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: availableTagsData } = useQuery({
    queryKey: ["available-wod-tags"],
    queryFn: () => classesApi.getAvailableTags(),
    staleTime: 5 * 60 * 1000,
  });

  const createOccurrenceMutation = useMutation({
    mutationFn: async (data: typeof occurrenceForm) => {
      const payload: any = {
        class_template: data.class_template,
        branch: data.branch,
        occurrence_date: data.occurrence_date,
        start_time: data.start_time,
        end_time: data.end_time,
        delivery_mode: data.delivery_mode || "OFFLINE",
      };
      if (data.capacity !== "" && data.capacity !== null && data.capacity !== undefined) {
        payload.capacity = Number(data.capacity);
      }
      if (
        data.trial_capacity !== "" &&
        data.trial_capacity !== null &&
        data.trial_capacity !== undefined
      ) {
        payload.trial_capacity = Number(data.trial_capacity);
      }
      if (
        data.waitlist_capacity !== "" &&
        data.waitlist_capacity !== null &&
        data.waitlist_capacity !== undefined
      ) {
        payload.waitlist_capacity = Number(data.waitlist_capacity);
      }
      const createdOcc = await classesApi.createOccurrence(payload);
      if (
        data.video_id &&
        data.video_id !== "AUTO" &&
        data.video_id !== "NONE" &&
        (createdOcc as any)?.id
      ) {
        try {
          await classesApi.assignOccurrenceVideo((createdOcc as any).id, data.video_id);
        } catch (e) {
          console.warn("Could not assign video to new occurrence", e);
        }
      }
      return createdOcc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-occurrences"] });
      setIsCreateOccurrenceOpen(false);
      setOccurrenceError(null);
    },
    onError: (err: any) => {
      const resp = err?.response?.data;
      let errorMsg = "Failed to schedule occurrence.";
      if (typeof resp === "string") {
        errorMsg = resp;
      } else if (resp && typeof resp === "object") {
        if (resp.detail) {
          errorMsg = resp.detail;
        } else if (resp.error) {
          errorMsg = typeof resp.error === "string" ? resp.error : JSON.stringify(resp.error);
        } else {
          const messages = Object.entries(resp).map(([field, errs]) => {
            const text = Array.isArray(errs) ? errs.join(", ") : String(errs);
            const fieldLabel = field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            return `${fieldLabel}: ${text}`;
          });
          if (messages.length > 0) {
            errorMsg = messages.join(" | ");
          }
        }
      }
      setOccurrenceError(errorMsg);
    },
  });

  const assignTrainerMutation = useMutation({
    mutationFn: ({
      occurrenceId,
      trainerId,
      role,
    }: {
      occurrenceId: string;
      trainerId: string;
      role: TrainerOccurrenceRole;
    }) => classesApi.assignTrainer(occurrenceId, trainerId, role),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["class-occurrences"] });
      setIsAssignTrainerOpen(false);
      setSelectedOccurrence(null);
      setTrainerProfileIdInput("");
      setTrainerError(null);
      toast.success(
        data?.trainer_name
          ? `Assigned ${data.trainer_name} (${data.trainer_role || "Lead"}) successfully!`
          : "Trainer assigned to class occurrence successfully!",
      );
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ||
        "Validation failed. Trainer may have conflict or lack specialty.";
      setTrainerError(msg);
      toast.error("Failed to assign trainer", { description: msg });
    },
  });

  const assignContentMutation = useMutation({
    mutationFn: (occurrenceId: string) => classesApi.rotateContent(occurrenceId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["class-occurrences"] });
      toast.success(
        data?.content_title
          ? `Workout content rotated to: "${data.content_title}" (Cycle #${data.rotation_cycle_number})`
          : "Workout content rotated successfully!",
      );
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || "Failed to rotate workout content.";
      toast.error(msg, {
        description:
          'No workout items are in this template’s mapping pool yet. Go to "Content Studio" tab to create content items and map them.',
      });
    },
  });

  const createBranchAvailMutation = useMutation({
    mutationFn: (data: typeof branchAvailForm) => {
      if (!selectedTemplateForAvail) throw new Error("No template selected");
      return classesApi.createBranchAvailability({
        class_template: selectedTemplateForAvail.id,
        branch: data.branch,
        status: data.status,
        capacity_override: data.capacity_override ? Number(data.capacity_override) : undefined,
        trial_capacity_override: data.trial_capacity_override
          ? Number(data.trial_capacity_override)
          : undefined,
        waitlist_capacity_override: data.waitlist_capacity_override
          ? Number(data.waitlist_capacity_override)
          : undefined,
      });
    },
    onSuccess: () => {
      refetchAvailabilities();
      queryClient.invalidateQueries({ queryKey: ["all-class-branch-availabilities"] });
      setBranchAvailForm({
        branch: "",
        status: "ENABLED",
        capacity_override: "",
        trial_capacity_override: "",
        waitlist_capacity_override: "",
      });
    },
  });

  const createPricingMutation = useMutation({
    mutationFn: (data: typeof pricingForm) => {
      if (!selectedTemplateForPricing) throw new Error("No template selected");
      return classesApi.createClassPrice({
        class_template: selectedTemplateForPricing.id,
        branch: data.branch || undefined,
        currency: data.currency,
        price: data.price,
        tax_percent: data.tax_percent,
        effective_from: data.effective_from,
        status: data.status,
      });
    },
    onSuccess: () => {
      refetchPrices();
      setPricingForm({
        branch: "",
        currency: "INR",
        price: "",
        tax_percent: "18.00",
        effective_from: selectedDate,
        status: "ACTIVE",
      });
    },
  });

  const saveContentMutation = useMutation({
    mutationFn: (data: typeof contentForm) => {
      return classesApi.createContentItem({
        title: data.title,
        description: data.description,
        content_type: data.content_type as any,
        external_url: data.external_url || undefined,
        display_order: Number(data.display_order),
        status: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-content-items"] });
      setIsCreateContentOpen(false);
      setContentForm({
        title: "",
        description: "",
        content_type: "VIDEO",
        external_url: "",
        display_order: 1,
        status: "ACTIVE",
      });
    },
  });

  const saveMappingMutation = useMutation({
    mutationFn: (data: typeof mappingForm) => {
      return classesApi.createContentMapping({
        content_item: data.content_item,
        class_template: data.class_template || undefined,
        class_category: data.class_category || undefined,
        program: data.program || undefined,
        delivery_mode: (data.delivery_mode as DeliveryMode) || undefined,
        status: data.status,
      });
    },
    onSuccess: () => {
      refetchMappings();
      setIsCreateMappingOpen(false);
      setMappingForm({
        content_item: "",
        class_template: "",
        class_category: "",
        program: "",
        delivery_mode: "",
        status: "ACTIVE",
      });
    },
  });

  // Filter helpers
  const filteredCategories = categories.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      c.name.toLowerCase().includes(term) ||
      (c.description || "").toLowerCase().includes(term);
    const matchesStatus = categoryStatusFilter === "ALL" || c.status === categoryStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredTemplates = templates.filter((tpl) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      tpl.name.toLowerCase().includes(term) ||
      (tpl.category_name || "").toLowerCase().includes(term) ||
      (tpl.program_name || "").toLowerCase().includes(term);
    const matchesStatus = templateStatusFilter === "ALL" || tpl.status === templateStatusFilter;
    const matchesCategory =
      selectedCategoryFilter === "ALL" || tpl.category === selectedCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const filteredOccurrences = occurrences;

  const filteredRules = rules;

  const filteredContent = contentItems.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(term) ||
      (item.description || "").toLowerCase().includes(term)
    );
  });

  // Non-admin / Trainer view: Only show Allotted Classes & Attendance
  if (!isAuthorized) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <PageHeader
          title="Assigned Classes & Attendance"
          subtitle="View your scheduled sessions, check in booked members, and record class attendance."
        />
        <PageBody>
          <TrainerAllottedClassesView />
        </PageBody>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Platform Header */}
      <PageHeader
        title="Group Classes Command Center"
        subtitle="Manage class setup, schedules, sessions and trainer operations."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-md">
              Operations · Classes
            </span>
            <span className="text-muted-foreground text-xs">
              {primaryTab === "sessions" &&
                `${totalSessionsCount} Session${totalSessionsCount === 1 ? "" : "s"} Scheduled`}
              {primaryTab === "setup" &&
                `${templates.length} Templates · ${categories.length} Categories`}
              {primaryTab === "rules" &&
                `${totalRulesCount} Recurring Rule${totalRulesCount === 1 ? "" : "s"}`}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await Promise.allSettled([
                  queryClient.invalidateQueries({ queryKey: ["class-occurrences"] }),
                  queryClient.invalidateQueries({ queryKey: ["class-schedule-rules"] }),
                  queryClient.invalidateQueries({ queryKey: ["class-categories"] }),
                  queryClient.invalidateQueries({ queryKey: ["class-templates"] }),
                  queryClient.invalidateQueries({ queryKey: ["class-occurrences-today"] }),
                  refetchOccurrences(),
                  refetchRules(),
                ]);
                toast.success("Classes refreshed");
              }}
              disabled={fetchingOccurrences}
              className="gap-1.5 h-8 text-xs font-semibold"
              title="Refresh classes data"
            >
              <RefreshCw
                className={cn(
                  "size-3.5 transition-transform",
                  fetchingOccurrences && "animate-spin",
                )}
              />
              <span>Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExcelImportOpen(true)}
              className="gap-1.5 h-8 text-xs font-semibold"
              title="Upload classes or schedule from Excel"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Upload Excel</span>
            </Button>
            {primaryTab === "sessions" && canCreate && (
              <Button
                size="sm"
                onClick={openNewOccurrenceModal}
                className="gap-1.5 h-8 text-xs font-semibold"
              >
                <Plus className="size-3.5" />
                <span>Schedule One-Off Session</span>
              </Button>
            )}

            {primaryTab === "setup" && setupSubTab === "templates" && canCreate && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingTemplate(null);
                  resetTemplateForm();
                  setIsCreateTemplateOpen(true);
                }}
                className="gap-1.5 h-8 text-xs font-semibold"
              >
                <Plus className="size-3.5" />
                <span>New Class Template</span>
              </Button>
            )}

            {primaryTab === "setup" && setupSubTab === "categories" && canCreate && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({
                    name: "",
                    description: "",
                    display_order: categories.length + 1,
                    status: "ACTIVE",
                  });
                  setIsCreateCategoryOpen(true);
                }}
                className="gap-1.5 h-8 text-xs font-semibold"
              >
                <Plus className="size-3.5" />
                <span>New Class Category</span>
              </Button>
            )}

            {primaryTab === "rules" && canCreate && (
              <Button
                size="sm"
                onClick={openNewRuleModal}
                className="gap-1.5 h-8 text-xs font-semibold"
              >
                <Plus className="size-3.5" />
                <span>New Recurring Rule</span>
              </Button>
            )}
          </div>
        }
      />

      <PageBody>
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <KpiTile
            title="TODAY'S SESSIONS"
            value={
              loadingTodayOccurrences ? (
                <Skeleton className="h-7 w-12 my-0.5 rounded-md" />
              ) : (
                todaySessionsCount
              )
            }
          />
          <KpiTile
            title="ACTIVE CLASS TEMPLATES"
            value={
              loadingTemplates || loadingAllBranchAvailabilities ? (
                <Skeleton className="h-7 w-12 my-0.5 rounded-md" />
              ) : (
                activeTemplatesCount
              )
            }
          />
          <KpiTile
            title="ACTIVE RECURRING RULES"
            value={
              loadingAllRulesForBranch ? (
                <Skeleton className="h-7 w-12 my-0.5 rounded-md" />
              ) : (
                activeRecurringRulesCount
              )
            }
          />
          <KpiTile
            title="TODAY'S BOOKINGS"
            value={
              loadingTodayOccurrences ? (
                <Skeleton className="h-7 w-12 my-0.5 rounded-md" />
              ) : (
                todayConfirmedBookings
              )
            }
            delta={
              !loadingTodayOccurrences
                ? `${todayConfirmedBookings} Confirmed · ${todayWaitlistBookings} Waitlisted`
                : undefined
            }
          />
        </div>

        {/* Quick Access Area */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 pb-3 border-b border-border/50">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1">
            Quick Access
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              title="View trainer attendance and session check-in status."
              onClick={() => {
                setShowTrainerCheckins((prev) => !prev);
                setShowContentStudio(false);
                setPrimaryTab("sessions");
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                showTrainerCheckins && primaryTab === "sessions"
                  ? "bg-primary/10 border-primary/40 text-primary shadow-2xs"
                  : "bg-card border-border/70 text-foreground hover:bg-muted/60 hover:border-border shadow-2xs"
              }`}
            >
              <Award className="size-3.5 text-primary shrink-0" />
              <span>Trainer Check-ins</span>
            </button>

            <button
              type="button"
              title="Manage trainer reference videos, documents and class content."
              onClick={() => {
                setShowContentStudio((prev) => !prev);
                setShowTrainerCheckins(false);
                setPrimaryTab("sessions");
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                showContentStudio && primaryTab === "sessions"
                  ? "bg-primary/10 border-primary/40 text-primary shadow-2xs"
                  : "bg-card border-border/70 text-foreground hover:bg-muted/60 hover:border-border shadow-2xs"
              }`}
            >
              <Sparkles className="size-3.5 text-primary shrink-0" />
              <span>Content Studio</span>
            </button>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setPrimaryTab("sessions");
              setShowTrainerCheckins(false);
              setShowContentStudio(false);
              setSearchTerm("");
              setSelectedStatusFilter("ALL");
              setSelectedBranchFilter("");
            }}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              primaryTab === "sessions" && !showTrainerCheckins && !showContentStudio
                ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Calendar className="size-3.5" />
            <span>Sessions ({totalSessionsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPrimaryTab("setup");
              setShowTrainerCheckins(false);
              setShowContentStudio(false);
              setSearchTerm("");
              setTemplateStatusFilter("ACTIVE");
              setCategoryStatusFilter("ALL");
              setSelectedBranchFilter("");
            }}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              primaryTab === "setup"
                ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <LayoutGrid className="size-3.5" />
            <span>Class Setup</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPrimaryTab("rules");
              setShowTrainerCheckins(false);
              setShowContentStudio(false);
              setSearchTerm("");
              setRuleStatusFilter("ACTIVE");
              setSelectedBranchFilter("");
            }}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              primaryTab === "rules"
                ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <RotateCw className="size-3.5" />
            <span>Recurring Rules ({totalRulesCount})</span>
          </button>
        </div>

        {/* Class Type Quick Filter Bar (Pilates vs Bootcamp differentiation) */}
        {!showTrainerCheckins &&
          !showContentStudio &&
          !(primaryTab === "setup" && setupSubTab === "categories") &&
          categories.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 px-3.5 py-2.5 bg-card border border-border rounded-xl shadow-2xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1.5 flex items-center gap-1">
                  <Filter className="size-3 text-primary" />
                  Class Type:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("ALL")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    selectedCategoryFilter === "ALL"
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted"
                  }`}
                >
                  All Types
                </button>
                {categories
                  .filter((cat) => cat.status === "ACTIVE")
                  .map((cat) => {
                    const isSelected = selectedCategoryFilter === cat.id;
                    const palette = getCategoryPalette(cat.name, cat.code);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(isSelected ? "ALL" : cat.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          isSelected ? `${palette.selected} shadow-2xs` : `${palette.unselected}`
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${isSelected ? "bg-white" : palette.dot}`}
                        />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
              </div>
              {selectedCategoryFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("ALL")}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  Clear Type Filter
                </button>
              )}
            </div>
          )}

        {/* VIEW: TRAINER ATTENDANCE & CHECK-INS (Exposed from Sessions) */}
        {primaryTab === "sessions" && showTrainerCheckins && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border rounded-xl shadow-xs">
              <div className="flex items-center gap-2.5">
                <Award className="size-4 text-primary" />
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Trainer Attendance View</h4>
                  <p className="text-xs text-muted-foreground">
                    Session-level trainer assignments, biometric verification, and check-in
                    compliance.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTrainerCheckins(false)}
                className="text-xs"
              >
                Back to Sessions
              </Button>
            </div>
            <TrainerAllottedClassesView />
          </div>
        )}

        {/* TAB: CLASS SETUP (Templates & Categories) */}
        {primaryTab === "setup" && (
          <div className="space-y-4 mt-4">
            {/* Secondary Navigation */}
            <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setSetupSubTab("templates");
                  setSearchTerm("");
                  setTemplateStatusFilter("ACTIVE");
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  setupSubTab === "templates"
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Class Templates ({templates.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetupSubTab("categories");
                  setSearchTerm("");
                  setCategoryStatusFilter("ALL");
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  setupSubTab === "categories"
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Class Categories ({categories.length})
              </button>
            </div>

            {/* Helper Info below sub-tabs */}
            <p className="text-xs text-muted-foreground">
              {setupSubTab === "templates"
                ? "Define reusable class types under Sweat Pilates or Sweat Bootcamp."
                : "Group classes into categories such as Sweat Pilates or Sweat Bootcamp."}
            </p>

            {/* Sub-tab: Categories */}
            {setupSubTab === "categories" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
                  <div className="relative min-w-[200px] flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search categories by name..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={categoryStatusFilter}
                      onChange={(e) => setCategoryStatusFilter(e.target.value)}
                      className="h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    >
                      <option value="ALL">All Statuses</option>
                      {(metadata?.statuses || [])
                        .filter(
                          (s: ClassesMetadataOption<string>) =>
                            s.value === "ACTIVE" || s.value === "INACTIVE",
                        )
                        .map((s: ClassesMetadataOption<string>) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {loadingCategories ? (
                  <div className="p-12 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                    Loading categories from tenant database...
                  </div>
                ) : filteredCategories.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                    <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                      <Tag className="size-6" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      No Class Categories Found
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                      Create categories like HIIT, Mobility, Strength, or Recovery to organize class
                      templates.
                    </p>
                    {canCreate && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingCategory(null);
                          setCategoryForm({
                            name: "",
                            description: "",
                            display_order: 1,
                            status: "ACTIVE",
                          });
                          setIsCreateCategoryOpen(true);
                        }}
                      >
                        <Plus className="size-3.5 mr-1" /> Add Category
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className={`text-[11px] px-2.5 py-0.5 ${getCategoryBadgeStyle(cat.name, cat.code)}`}
                            >
                              {cat.name}
                            </Badge>
                            <Badge
                              variant={cat.status === "ACTIVE" ? "default" : "secondary"}
                              className={
                                cat.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : ""
                              }
                            >
                              {cat.status}
                            </Badge>
                          </div>
                          <h3 className="text-base font-semibold text-foreground mt-2.5">
                            {cat.name}
                          </h3>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {cat.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                          <span>Order: #{cat.display_order}</span>
                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setCategoryForm({
                                    name: cat.name,
                                    description: cat.description || "",
                                    display_order: cat.display_order,
                                    status: cat.status,
                                  });
                                  setIsCreateCategoryOpen(true);
                                }}
                                className="text-xs gap-1 h-7"
                              >
                                <Edit2 className="size-3" /> Edit
                              </Button>
                            )}
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  toggleCategoryStatusMutation.mutate({
                                    id: cat.id,
                                    status: cat.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                                  })
                                }
                                className={`text-xs h-7 ${cat.status === "ACTIVE" ? "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"}`}
                              >
                                {cat.status === "ACTIVE" ? "Deactivate" : "Activate"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab: Templates */}
            {setupSubTab === "templates" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
                  <div className="relative min-w-[200px] flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search class templates by name..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    >
                      <option value="ALL">All Class Types</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={templateStatusFilter}
                      onChange={(e) => setTemplateStatusFilter(e.target.value)}
                      className="h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    >
                      <option value="ALL">All Statuses</option>
                      {(metadata?.statuses?.length
                        ? metadata.statuses.filter(
                            (s: ClassesMetadataOption<string>) =>
                              s.value === "ACTIVE" || s.value === "INACTIVE",
                          )
                        : [
                            { value: "ACTIVE", label: "Active" },
                            { value: "INACTIVE", label: "Inactive" },
                          ]
                      ).map((s: { value: string; label: string }) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {loadingTemplates ? (
                  <div className="p-12 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                    Loading class templates...
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                    <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                      <Award className="size-6" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      {templateStatusFilter === "INACTIVE"
                        ? "No Inactive Class Templates"
                        : "No Class Templates Found"}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                      {templateStatusFilter === "INACTIVE"
                        ? "There are currently no deactivated or inactive class templates."
                        : "Create high-intensity, mobility, or strength workout templates to schedule group classes."}
                    </p>
                    {canCreate && templateStatusFilter !== "INACTIVE" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingTemplate(null);
                          resetTemplateForm();
                          setIsCreateTemplateOpen(true);
                        }}
                      >
                        <Plus className="size-3.5 mr-1" /> New Template
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className={`bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs overflow-hidden ${tpl.status === "INACTIVE" ? "opacity-85 bg-muted/15 border-dashed" : ""}`}
                      >
                        <div>
                          {tpl.image_url && (
                            <div className="-mx-4 -mt-4 sm:-mx-5 sm:-mt-5 mb-3.5 h-36 w-[calc(100%+2rem)] sm:w-[calc(100%+2.5rem)] overflow-hidden bg-muted/30 border-b border-border">
                              <img
                                src={tpl.image_url}
                                alt={tpl.name}
                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            {tpl.category_name ? (
                              <Badge
                                variant="outline"
                                className={`text-[11px] px-2.5 py-0.5 ${getCategoryBadgeStyle(tpl.category_name, tpl.category_code)}`}
                              >
                                {tpl.category_name}
                              </Badge>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                <Award className="size-3.5 text-primary" />
                                <span>Class Template</span>
                              </div>
                            )}
                            <Badge
                              variant={tpl.status === "ACTIVE" ? "default" : "secondary"}
                              className={
                                tpl.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : "bg-zinc-500/10 text-zinc-600 border border-zinc-500/20 dark:text-zinc-400"
                              }
                            >
                              {tpl.status}
                            </Badge>
                          </div>
                          <h3 className="text-base font-semibold text-foreground mt-2.5">
                            {tpl.name}
                          </h3>
                          {tpl.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {tpl.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                            {tpl.program_name && (
                              <span className="bg-muted px-2 py-0.5 rounded text-foreground font-medium border border-border">
                                Program: {tpl.program_name}
                              </span>
                            )}
                            <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground border border-border">
                              Mode: {tpl.default_delivery_mode}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60">
                              <span className="text-muted-foreground block text-[11px]">
                                Duration
                              </span>
                              <span className="font-semibold text-foreground">
                                {tpl.default_duration_minutes} mins
                              </span>
                            </div>
                            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60">
                              <span className="text-muted-foreground block text-[11px]">
                                Capacity
                              </span>
                              <span className="font-semibold text-foreground">
                                {tpl.default_capacity} (WL: {tpl.default_waitlist_capacity ?? 0} ·
                                Trial: {tpl.default_trial_capacity ?? 0})
                              </span>
                            </div>
                          </div>

                          {tpl.branch_availabilities &&
                            tpl.branch_availabilities.filter(
                              (a: any) => a.capacity_override != null,
                            ).length > 0 && (
                              <div className="mt-2.5 p-2 bg-primary/5 rounded-lg border border-primary/15 text-[11px]">
                                <span className="text-muted-foreground font-medium block mb-1">
                                  Branch Capacities (Beds):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {tpl.branch_availabilities
                                    .filter((a: any) => a.capacity_override != null)
                                    .map((a: any) => (
                                      <span
                                        key={a.id || a.branch}
                                        className="bg-background/80 border border-border px-1.5 py-0.5 rounded text-[10px] font-medium text-foreground"
                                      >
                                        {a.branch_name || "Branch"}:{" "}
                                        <strong className="text-primary">
                                          {a.capacity_override} beds
                                        </strong>
                                      </span>
                                    ))}
                                </div>
                              </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-1.5 text-xs">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedTemplateForAvail(tpl);
                                setIsBranchAvailOpen(true);
                              }}
                              className="text-xs gap-1 h-7 text-muted-foreground hover:text-foreground"
                            >
                              <Building2 className="size-3" /> Branches
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedTemplateForPricing(tpl);
                                setIsPricingOpen(true);
                              }}
                              className="text-xs gap-1 h-7 text-muted-foreground hover:text-foreground"
                            >
                              <DollarSign className="size-3" /> Pricing
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const tplAvails =
                                    tpl.branch_availabilities &&
                                    tpl.branch_availabilities.length > 0
                                      ? tpl.branch_availabilities
                                      : allBranchAvailabilities.filter((ba: any) => {
                                          const tplId =
                                            ba.class_template_id ||
                                            (typeof ba.class_template === "object" &&
                                            ba.class_template
                                              ? ba.class_template.id
                                              : ba.class_template);
                                          return String(tplId) === String(tpl.id);
                                        });
                                  setEditingTemplate(tpl);
                                  setTemplateForm({
                                    name: tpl.name,
                                    category: tpl.category || "",
                                    program: tpl.program || "",
                                    description: tpl.description || "",
                                    default_duration_minutes: tpl.default_duration_minutes,
                                    default_capacity: tpl.default_capacity,
                                    default_trial_capacity: tpl.default_trial_capacity || 0,
                                    default_waitlist_capacity: tpl.default_waitlist_capacity || 0,
                                    default_delivery_mode: tpl.default_delivery_mode,
                                    allow_booking: tpl.allow_booking,
                                    allow_trial: tpl.allow_trial,
                                    allow_waitlist: tpl.allow_waitlist,
                                    allow_reschedule: tpl.allow_reschedule,
                                    image_url: tpl.image_url || "",
                                    status: tpl.status,
                                    branch_capacities: buildInitialBranchCapacities(tplAvails),
                                  });
                                  setIsCreateTemplateOpen(true);
                                }}
                                className="text-xs gap-1 h-7"
                              >
                                <Edit2 className="size-3" /> Edit
                              </Button>
                            )}
                            {canEdit && (
                              <Button
                                size="sm"
                                variant={tpl.status === "ACTIVE" ? "ghost" : "outline"}
                                onClick={() =>
                                  toggleTemplateStatusMutation.mutate({
                                    id: tpl.id,
                                    status: tpl.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                                  })
                                }
                                className={`text-xs h-7 ${tpl.status === "ACTIVE" ? "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10" : "text-emerald-600 hover:text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/10 font-medium"}`}
                              >
                                {tpl.status === "ACTIVE" ? "Deactivate" : "Activate"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: RECURRING RULES */}
        {primaryTab === "rules" && (
          <div className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative min-w-[200px] flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search rules by class, type, or branch..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                  </div>

                  {/* Date Filter Mode Tabs for Recurring Rules */}
                  <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setRuleDateFilterMode("all")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        ruleDateFilterMode === "all"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All Dates
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleDateFilterMode("today")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        ruleDateFilterMode === "today"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleDateFilterMode("custom")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        ruleDateFilterMode === "custom"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Pick Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleDateFilterMode("range")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        ruleDateFilterMode === "range"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Date Range
                    </button>
                  </div>

                  {/* Single Date Picker (checks validity window + weekday recurrence) */}
                  {ruleDateFilterMode === "custom" && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0 hidden sm:block" />
                      <Input
                        type="date"
                        value={ruleSelectedDate}
                        onChange={(e) => setRuleSelectedDate(e.target.value)}
                        className="h-8 bg-background w-auto text-xs"
                        title="Filter recurring rules active on this date & weekday"
                      />
                    </div>
                  )}

                  {/* Date Range Pickers */}
                  {ruleDateFilterMode === "range" && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Input
                        type="date"
                        value={ruleFromDate}
                        onChange={(e) => setRuleFromDate(e.target.value)}
                        className="h-8 bg-background w-auto text-xs"
                        title="Valid From"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="date"
                        value={ruleToDate}
                        onChange={(e) => setRuleToDate(e.target.value)}
                        className="h-8 bg-background w-auto text-xs"
                        title="Valid Until"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Class Type Filter */}
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    title="Filter by class type (Pilates / Bootcamp)"
                  >
                    <option value="ALL">All Class Types</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* Day of Week Filter */}
                  <select
                    value={ruleDayOfWeek}
                    onChange={(e) => setRuleDayOfWeek(e.target.value)}
                    className="h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    title="Filter by recurring weekday"
                  >
                    <option value="ALL">All Days</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                    <option value="7">Sunday</option>
                  </select>

                  <select
                    value={selectedBranchFilter}
                    onChange={(e) => setSelectedBranchFilter(e.target.value)}
                    className="h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={ruleStatusFilter}
                    onChange={(e) => setRuleStatusFilter(e.target.value)}
                    className="h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ALL">All Statuses</option>
                  </select>
                </div>
              </div>

              {loadingRules ? (
                <div className="p-12 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl">
                  <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                  Loading recurring schedule rules...
                </div>
              ) : filteredRules.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                  <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <RotateCw className="size-6" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {ruleStatusFilter === "INACTIVE"
                      ? "No Inactive Schedule Rules"
                      : "No Recurring Schedule Rules"}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                    {ruleStatusFilter === "INACTIVE"
                      ? "There are currently no deactivated or inactive recurring schedule rules."
                      : "Configure recurring weekly timetable patterns to automatically populate occurrence slots."}
                  </p>
                  {canCreate && ruleStatusFilter !== "INACTIVE" && (
                    <Button size="sm" onClick={openNewRuleModal}>
                      <Plus className="size-3.5 mr-1" /> New Recurring Rule
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRules.map((rule) => {
                    const matchedTpl = templates.find((t) => t.id === rule.class_template);
                    const className =
                      rule.class_name || rule.template_name || matchedTpl?.name || "Class Schedule";
                    const branchName =
                      rule.branch_name ||
                      branches.find((b) => b.id === rule.branch)?.name ||
                      "Studio Branch";
                    const categoryName = rule.category_name || matchedTpl?.category_name;
                    const categoryCode = rule.category_code || matchedTpl?.category_code;
                    const programName = rule.program_name || matchedTpl?.program_name;

                    return (
                      <div
                        key={rule.id}
                        className="bg-card border border-border/70 hover:border-primary/40 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-xs transition"
                      >
                        <div className="space-y-2.5">
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                {categoryName && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-2 py-0 ${getCategoryBadgeStyle(categoryName, categoryCode)}`}
                                  >
                                    {categoryName}
                                  </Badge>
                                )}
                                {programName && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60 truncate max-w-[160px]">
                                    {programName}
                                  </span>
                                )}
                              </div>
                              <h4
                                className="text-sm font-bold text-foreground truncate"
                                title={className}
                              >
                                {className}
                              </h4>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="truncate font-medium text-foreground/80">
                                  {branchName}
                                </span>
                              </div>
                            </div>
                            <Badge
                              variant={rule.status === "ACTIVE" ? "default" : "secondary"}
                              className={
                                rule.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] shrink-0"
                                  : "text-[10px] shrink-0"
                              }
                            >
                              {rule.status}
                            </Badge>
                          </div>

                          {/* Details Block */}
                          <div className="p-2.5 bg-muted/40 rounded-lg border border-border/40 space-y-2 text-xs">
                            {/* Time Window */}
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span className="flex items-center gap-1.5 font-semibold text-foreground font-mono">
                                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                {rule.start_time ? formatTime12h(rule.start_time) : "--"} –{" "}
                                {rule.end_time ? formatTime12h(rule.end_time) : "--"}
                              </span>
                            </div>

                            {/* Weekdays */}
                            <div className="pt-0.5">
                              <div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                                Schedule Days
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                {(() => {
                                  const ruleDays = normalizeDaysOfWeek(rule.days_of_week);
                                  return [1, 2, 3, 4, 5, 6, 7].map((d) => {
                                    const isActive = ruleDays.includes(d);
                                    return (
                                      <span
                                        key={d}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                          isActive
                                            ? "bg-primary/15 text-primary font-semibold border border-primary/30"
                                            : "bg-muted/30 text-muted-foreground/40 border border-transparent"
                                        }`}
                                      >
                                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d - 1]}
                                      </span>
                                    );
                                  });
                                })()}
                              </div>
                            </div>

                            {/* Validity & Capacity */}
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                              <span className="flex items-center gap-1 truncate">
                                <Calendar className="w-3 h-3 shrink-0" />
                                {rule.valid_from} to {rule.valid_until || "Ongoing"}
                              </span>
                              {rule.capacity_override ? (
                                <span className="font-mono flex items-center gap-1 shrink-0">
                                  <Users className="w-3 h-3" />
                                  {rule.capacity_override} Cap
                                  {(rule.waitlist_capacity_override != null ||
                                    rule.trial_capacity_override != null) && (
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                      (
                                      {[
                                        rule.waitlist_capacity_override != null
                                          ? `WL: ${rule.waitlist_capacity_override}`
                                          : null,
                                        rule.trial_capacity_override != null
                                          ? `Trial: ${rule.trial_capacity_override}`
                                          : null,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                      )
                                    </span>
                                  )}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Card Actions Bar */}
                        <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAuditRule(rule)}
                              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground gap-1"
                              title="View audit logs"
                            >
                              <Activity className="w-3 h-3 text-indigo-500" />
                              <span>Audit</span>
                            </Button>

                            {canCreate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRuleForGen(rule);
                                  setGenFromDate(selectedDate);
                                  setIsGenerateOccurrencesOpen(true);
                                }}
                                className="h-6 text-[11px] px-2 text-primary hover:text-primary/80 gap-1 font-medium"
                                title="Generate sessions"
                              >
                                <Calendar className="w-3 h-3" />
                                <span>Generate</span>
                              </Button>
                            )}
                          </div>

                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditRuleModal(rule)}
                                className="w-6 h-6 text-muted-foreground hover:text-foreground"
                                title="Edit schedule rule"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>

                              <button
                                type="button"
                                role="switch"
                                aria-checked={rule.status === "ACTIVE"}
                                onClick={() =>
                                  toggleRuleStatusMutation.mutate({
                                    id: rule.id,
                                    status: rule.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                                  })
                                }
                                className={`group relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs select-none h-5 w-11 ${
                                  rule.status === "ACTIVE"
                                    ? "bg-emerald-600 dark:bg-emerald-500"
                                    : "bg-rose-600 dark:bg-rose-500"
                                }`}
                                title={
                                  rule.status === "ACTIVE"
                                    ? "Active (ON) - click to deactivate"
                                    : "Inactive (OFF) - click to activate"
                                }
                              >
                                <span className="sr-only">
                                  {rule.status === "ACTIVE" ? "Active" : "Inactive"}
                                </span>
                                <span
                                  aria-hidden="true"
                                  className={`pointer-events-none inline-flex items-center justify-center transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out font-black text-[8px] uppercase tracking-tighter h-4 w-4 ${
                                    rule.status === "ACTIVE"
                                      ? "translate-x-6 text-emerald-700"
                                      : "translate-x-0 text-rose-700"
                                  }`}
                                >
                                  {rule.status === "ACTIVE" ? "ON" : "OFF"}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recurring Rules Pagination Controls */}
              {!loadingRules && totalRulesCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card px-4 py-3 rounded-xl border border-border shadow-xs">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Showing{" "}
                      <span className="font-semibold text-foreground">
                        {Math.min((rulesPage - 1) * rulesPageSize + 1, totalRulesCount)}
                      </span>
                      –
                      <span className="font-semibold text-foreground">
                        {Math.min(rulesPage * rulesPageSize, totalRulesCount)}
                      </span>{" "}
                      of <span className="font-semibold text-foreground">{totalRulesCount}</span>{" "}
                      rules
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span>Per page:</span>
                      <select
                        value={rulesPageSize}
                        onChange={(e) => {
                          setRulesPageSize(Number(e.target.value));
                          setRulesPage(1);
                        }}
                        className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {[9, 18, 36, 72].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRulesPage((p) => Math.max(1, p - 1))}
                      disabled={rulesPage <= 1 || loadingRules}
                      className="h-7 px-2.5 text-xs gap-1"
                    >
                      <ChevronLeft className="size-3.5" />
                      Prev
                    </Button>
                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: Math.min(5, totalRulesPages) }, (_, idx) => {
                        let pageNum = idx + 1;
                        if (totalRulesPages > 5) {
                          const start = Math.max(1, Math.min(rulesPage - 2, totalRulesPages - 4));
                          pageNum = start + idx;
                        }
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setRulesPage(pageNum)}
                            className={`h-7 min-w-[28px] px-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                              rulesPage === pageNum
                                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRulesPage((p) => Math.min(totalRulesPages, p + 1))}
                      disabled={rulesPage >= totalRulesPages || loadingRules}
                      className="h-7 px-2.5 text-xs gap-1"
                    >
                      Next
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: SESSIONS (Class Occurrences) */}
        {primaryTab === "sessions" && !showTrainerCheckins && !showContentStudio && (
          <div className="space-y-4 mt-4">
            {/* Filter & Control Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative w-full sm:w-auto sm:min-w-[220px] sm:max-w-xs flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search class, type, branch, or trainer..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="h-8 pl-8 pr-7 text-xs bg-background w-full"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSearchChange("");
                        setDebouncedSearch("");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer transition-colors"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Date Filter Tabs */}
                <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs overflow-x-auto no-scrollbar max-w-full shrink-0">
                  <button
                    type="button"
                    onClick={() => setDateFilterMode("today")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer whitespace-nowrap ${
                      dateFilterMode === "today"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Today ({todayLabel})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilterMode("week")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer whitespace-nowrap ${
                      dateFilterMode === "week"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Next 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilterMode("custom")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer whitespace-nowrap ${
                      dateFilterMode === "custom"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Custom Date
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilterMode("range")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer whitespace-nowrap ${
                      dateFilterMode === "range"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Date Range
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilterMode("all")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer whitespace-nowrap ${
                      dateFilterMode === "all"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Dates
                  </button>
                </div>

                {/* Custom Date Input */}
                {dateFilterMode === "custom" && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-primary shrink-0 hidden sm:block" />
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-8 bg-background w-auto text-xs"
                    />
                  </div>
                )}

                {/* Date Range Inputs */}
                {dateFilterMode === "range" && (
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <Input
                      type="date"
                      value={sessionFromDate}
                      onChange={(e) => setSessionFromDate(e.target.value)}
                      className={`h-8 bg-background w-auto text-xs ${isDateRangeInvalid ? "border-destructive ring-1 ring-destructive/40" : ""}`}
                      title="From Date"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={sessionToDate}
                      onChange={(e) => setSessionToDate(e.target.value)}
                      className={`h-8 bg-background w-auto text-xs ${isDateRangeInvalid ? "border-destructive ring-1 ring-destructive/40" : ""}`}
                      title="To Date"
                    />
                    {isDateRangeInvalid && (
                      <span className="text-[11px] text-destructive font-medium shrink-0 animate-in fade-in duration-150">
                        From date must be on or before To date
                      </span>
                    )}
                  </div>
                )}

                {/* Class Type Filter */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium shrink-0"
                  title="Filter by class type (Pilates / Bootcamp)"
                >
                  <option value="ALL">All Class Types</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Branch Filter */}
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium shrink-0"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                {/* Trainer Filter */}
                <select
                  value={selectedTrainerFilter}
                  onChange={(e) => setSelectedTrainerFilter(e.target.value)}
                  className="h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium shrink-0"
                  title="Filter by assigned trainer"
                >
                  <option value="ALL">All Trainers</option>
                  {trainers.map((tr: any) => {
                    const trId = tr.id || tr.trainer_profile_id;
                    const trName =
                      tr.trainer_name || tr.full_name || tr.name || tr.employee_name || "Trainer";
                    return (
                      <option key={trId} value={trId}>
                        {trName}
                      </option>
                    );
                  })}
                </select>

                {/* Trainer Check-In Filter */}
                <select
                  value={selectedCheckInFilter}
                  onChange={(e) => setSelectedCheckInFilter(e.target.value as any)}
                  className="h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium shrink-0"
                >
                  <option value="ALL">All Trainer Check-ins</option>
                  <option value="CHECKED_IN">Checked In</option>
                  <option value="PENDING">Pending Check-in</option>
                  <option value="NO_TRAINER">No Trainer / Unassigned</option>
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium shrink-0"
                >
                  <option value="ALL">All Statuses</option>
                  {(
                    metadata?.occurrence_statuses || [
                      { value: "SCHEDULED", label: "Scheduled" },
                      { value: "OPEN", label: "Open" },
                      { value: "FULL", label: "Full" },
                      { value: "IN_PROGRESS", label: "In Progress" },
                      { value: "COMPLETED", label: "Completed" },
                      { value: "CANCELLED", label: "Cancelled" },
                      { value: "DEACTIVATED", label: "Deactivated" },
                    ]
                  ).map((s: ClassesMetadataOption<string>) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                {/* Time Range Filter */}
                <div
                  className={`inline-flex items-center gap-1.5 bg-background border rounded-lg px-2.5 h-8 transition-colors shrink-0 ${
                    isTimeRangeInvalid
                      ? "border-destructive/60 bg-destructive/5 text-destructive ring-1 ring-destructive/40"
                      : sessionStartTime || sessionEndTime
                        ? "border-primary/50 ring-1 ring-primary/20 bg-primary/[0.02]"
                        : "border-border hover:border-border/80"
                  }`}
                  title={
                    isTimeRangeInvalid
                      ? "End time must be after start time"
                      : "Filter classes by scheduled time window"
                  }
                >
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(
                        "session-start-time-input",
                      ) as HTMLInputElement | null;
                      try {
                        el?.showPicker?.();
                      } catch {
                        el?.focus();
                      }
                    }}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer select-none transition-colors"
                    title="Click to select start time"
                  >
                    <Clock
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isTimeRangeInvalid
                          ? "text-destructive"
                          : sessionStartTime || sessionEndTime
                            ? "text-primary"
                            : "text-muted-foreground"
                      }`}
                    />
                    <span className="text-[11px] font-medium hidden sm:inline text-muted-foreground">
                      Time
                    </span>
                  </button>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[11px] text-muted-foreground font-medium select-none">
                      From
                    </span>
                    <input
                      id="session-start-time-input"
                      type="time"
                      value={sessionStartTime}
                      onChange={(e) => setSessionStartTime(e.target.value)}
                      onClick={(e) => {
                        try {
                          (e.currentTarget as HTMLInputElement).showPicker?.();
                        } catch {}
                      }}
                      className="h-6 w-[100px] sm:w-[106px] text-[11px] sm:text-xs bg-transparent border-0 p-0 text-foreground font-medium focus:outline-none focus:ring-0 cursor-pointer"
                      title="Filter Start Time (e.g. 06:00 AM)"
                      aria-label="Filter Start Time"
                    />
                    <span className="text-[11px] text-muted-foreground font-medium select-none px-0.5">
                      To
                    </span>
                    <input
                      id="session-end-time-input"
                      type="time"
                      value={sessionEndTime}
                      onChange={(e) => setSessionEndTime(e.target.value)}
                      onClick={(e) => {
                        try {
                          (e.currentTarget as HTMLInputElement).showPicker?.();
                        } catch {}
                      }}
                      className="h-6 w-[100px] sm:w-[106px] text-[11px] sm:text-xs bg-transparent border-0 p-0 text-foreground font-medium focus:outline-none focus:ring-0 cursor-pointer"
                      title="Filter End Time (e.g. 10:00 AM)"
                      aria-label="Filter End Time"
                    />
                  </div>

                  {(sessionStartTime || sessionEndTime) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionStartTime("");
                        setSessionEndTime("");
                      }}
                      className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer transition-colors"
                      title="Clear time filter"
                      aria-label="Clear time filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isTimeRangeInvalid && (
                  <span className="text-[11px] text-destructive font-medium flex items-center gap-1 shrink-0 animate-in fade-in duration-150">
                    End time must be after start time
                  </span>
                )}

                {/* Reset All Filters Button */}
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1 border-dashed shrink-0"
                    title="Reset all filters to default"
                  >
                    <RotateCcw className="size-3" />
                    <span>Reset Filters</span>
                  </Button>
                )}
              </div>

              {/* View Mode Toggle Only */}
              <div className="flex items-center gap-2 self-start sm:self-auto sm:ml-auto lg:self-center shrink-0">
                <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                  <Button
                    type="button"
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="h-7 px-2.5 text-xs font-semibold gap-1"
                    title="List View"
                  >
                    <LayoutList className="size-3.5" />
                    <span className="hidden sm:inline">List</span>
                  </Button>
                  <Button
                    type="button"
                    variant={viewMode === "cards" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("cards")}
                    className="h-7 px-2.5 text-xs font-semibold gap-1"
                    title="Cards View"
                  >
                    <LayoutGrid className="size-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Loading / Empty / Data Rendering */}
            {loadingOccurrences ? (
              <div className="p-12 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading classes schedule from database...
              </div>
            ) : filteredOccurrences.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Calendar className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No Class Sessions Found</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                  {hasActiveFilters
                    ? "No sessions match the selected filters. Try broadening your search or resetting filters."
                    : `No sessions scheduled for the selected timeframe. Generate sessions from recurring rules or schedule a one-off session.`}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {hasActiveFilters && (
                    <Button size="sm" variant="outline" onClick={handleResetFilters}>
                      <RotateCcw className="size-3.5 mr-1" /> Reset All Filters
                    </Button>
                  )}
                  {canCreate && (
                    <Button size="sm" onClick={openNewOccurrenceModal}>
                      <Plus className="size-3.5 mr-1" /> Schedule One-Off Session
                    </Button>
                  )}
                </div>
              </div>
            ) : viewMode === "list" ? (
              /* ==================== LIST / TABLE VIEW ==================== */
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 font-bold text-foreground">
                        <th className="py-3 px-3 text-center w-20 min-w-[80px] whitespace-nowrap sticky left-0 z-20 bg-muted/95 backdrop-blur-xs">
                          Actions
                        </th>
                        <th className="py-3 px-4 min-w-[150px] sticky left-20 z-20 bg-muted/95 backdrop-blur-xs">
                          Class Session
                        </th>
                        <th className="py-3 px-4">Class Type</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Assigned Trainer</th>
                        <th className="py-3 px-4">Trainer Check-in</th>
                        <th className="py-3 px-4">Bookings</th>
                        <th className="py-3 px-4">Waitlist</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredOccurrences.map((occ) => {
                        const matchedTpl = templates.find((t) => t.id === occ.class_template);
                        const categoryName = occ.category_name || matchedTpl?.category_name;
                        const categoryCode = occ.category_code || matchedTpl?.category_code;
                        const programName = occ.program_name || matchedTpl?.program_name;
                        const isCompleted = occ.status === "COMPLETED";
                        const isCancelled = occ.status === "CANCELLED";
                        const isDeactivated = occ.status === "DEACTIVATED";
                        const isInProgress = occ.status === "IN_PROGRESS";
                        const isFull =
                          occ.status === "FULL" || (occ.booking_count ?? 0) >= occ.capacity;

                        const isCheckedIn =
                          !isCancelled &&
                          !isDeactivated &&
                          Boolean(
                            occ.trainer_checked_in ||
                            occ.trainer_check_in_details?.checked_in ||
                            (occ.trainers &&
                              occ.trainers.some((t: any) => t.status === "CONFIRMED")) ||
                            (occ.assigned_trainers &&
                              occ.assigned_trainers.some((t: any) => t.status === "CONFIRMED")),
                          );

                        const allTrainers =
                          isCancelled || isDeactivated
                            ? []
                            : [...(occ.trainers || []), ...(occ.assigned_trainers || [])].filter(
                                (t: any) => t.status !== "CANCELLED",
                              );
                        const hasTrainer = allTrainers.length > 0;

                        const startTimeFormatted = occ.start_time
                          ? formatTime12h(occ.start_time)
                          : occ.start_at
                            ? formatTime12h(occ.start_at)
                            : "";
                        const endTimeFormatted = occ.end_time
                          ? formatTime12h(occ.end_time)
                          : occ.end_at
                            ? formatTime12h(occ.end_at)
                            : "";

                        const bookedCount = occ.booking_count ?? 0;
                        const waitlistCount = occ.waitlist_count ?? 0;

                        return (
                          <tr
                            key={occ.id}
                            onClick={() => setAttendanceModalOccurrence(occ)}
                            className={`transition-colors cursor-pointer group ${
                              isCancelled
                                ? "bg-rose-500/[0.04] dark:bg-rose-950/20 hover:bg-rose-500/10 border-l-4 border-l-rose-500"
                                : isDeactivated
                                  ? "bg-amber-500/[0.04] dark:bg-amber-950/20 hover:bg-amber-500/10 border-l-4 border-l-amber-500"
                                  : isInProgress
                                    ? "bg-blue-500/[0.04] dark:bg-blue-950/20 hover:bg-blue-500/10 border-l-4 border-l-blue-500"
                                    : "hover:bg-muted/60"
                            }`}
                            title="Click row to view class details, workout video, and roster"
                          >
                            {/* Column 1: Upfront Cancel/Reactivate Toggle and Edit Actions */}
                            <td
                              className="py-3 px-3 text-center whitespace-nowrap sticky left-0 z-10 bg-card group-hover:bg-muted/90 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Class Active / Cancel Toggle Switch - Placed upfront on the far left before Edit */}
                                {canCancel && (
                                  <div
                                    className="inline-flex items-center px-1"
                                    onClick={(e) => e.stopPropagation()}
                                    title={
                                      isCompleted
                                        ? "Class session completed"
                                        : isCancelled
                                          ? "Class cancelled — Toggle to reactivate"
                                          : isDeactivated
                                            ? "Class deactivated — Toggle to reactivate"
                                            : "Class active — Toggle to cancel"
                                    }
                                  >
                                    <Switch
                                      checked={!isCancelled && !isDeactivated}
                                      disabled={isCompleted || restoringOccId === occ.id}
                                      onCheckedChange={(checked) => {
                                        if (!checked) {
                                          setCancellingOccurrence(occ);
                                          setIsCancelModalOpen(true);
                                        } else {
                                          handleRestoreOccurrenceSlot(occ);
                                        }
                                      }}
                                      className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-rose-500/80 cursor-pointer h-4 w-7 sm:h-5 sm:w-9"
                                      aria-label={
                                        isCancelled
                                          ? "Cancelled class - toggle to reactivate"
                                          : "Active class - toggle to cancel"
                                      }
                                    />
                                  </div>
                                )}

                                {canEdit && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditSlot(occ);
                                    }}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                    title="Edit slot details, time, or video"
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                )}

                                {canEdit && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setScanOccurrence(occ);
                                    }}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/5"
                                    title="Scan pass — check member in / out"
                                  >
                                    <QrCode className="size-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                            {/* Class Session Info */}
                            <td className="py-3 px-4 min-w-[150px] sticky left-20 z-10 bg-card group-hover:bg-muted/90 transition-colors">
                              <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                <span>
                                  {occ.template_name || occ.class_name || "Class Session"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 font-medium bg-primary/5 text-primary border-primary/20"
                                >
                                  {occ.delivery_mode || "OFFLINE"}
                                </Badge>
                                {(occ as any).active_content?.title && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate max-w-[140px]">
                                    <Sparkles className="size-2.5 text-primary shrink-0" />
                                    {(occ as any).active_content.title}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Class Type (Pilates / Bootcamp) */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {categoryName ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-2 py-0.5 ${getCategoryBadgeStyle(categoryName, categoryCode)}`}
                                  >
                                    {categoryName}
                                  </Badge>
                                  {programName && (
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                      {programName}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Branch */}
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 font-medium text-foreground text-xs">
                                <MapPin className="size-3 text-primary shrink-0" />
                                <span className="truncate max-w-[150px]">
                                  {occ.branch_name || "Main Branch"}
                                </span>
                              </span>
                            </td>

                            {/* Date & Time */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-semibold text-foreground text-xs flex items-center gap-1">
                                <Calendar className="size-3 text-muted-foreground shrink-0" />
                                {formatOccurrenceDate(occ.occurrence_date, occ.start_at)}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                                <Clock className="size-2.5 shrink-0" />
                                {startTimeFormatted} – {endTimeFormatted}
                              </div>
                            </td>

                            {/* Assigned Trainer */}
                            <td className="py-3 px-4">
                              {hasTrainer ? (
                                <div className="space-y-0.5">
                                  {allTrainers.slice(0, 2).map((t, idx) => {
                                    const displayName =
                                      t.trainer_name && t.trainer_name.toLowerCase() !== "sweat"
                                        ? t.trainer_name
                                        : t.trainer_code || "Trainer";
                                    return (
                                      <div
                                        key={t.id || idx}
                                        className="flex items-center gap-1 text-xs"
                                      >
                                        <span
                                          className="font-semibold text-foreground truncate max-w-[130px]"
                                          title={displayName}
                                        >
                                          {displayName}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] px-1 py-0 text-muted-foreground"
                                        >
                                          {t.trainer_role || "Lead"}
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                  {allTrainers.length > 2 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      +{allTrainers.length - 2} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic text-[11px]">
                                  Unassigned
                                </span>
                              )}
                            </td>

                            {/* Trainer Check-In Status */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isCheckedIn ? (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-bold gap-1 px-2 py-0.5 inline-flex items-center"
                                >
                                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                                  <span>Checked In</span>
                                </Badge>
                              ) : hasTrainer ? (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold gap-1 px-2 py-0.5 inline-flex items-center"
                                >
                                  <Clock className="size-3 text-amber-500 shrink-0" />
                                  <span>Pending Check-in</span>
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-muted-foreground bg-muted/40 text-[10px] px-1.5 py-0.5"
                                >
                                  No Trainer
                                </Badge>
                              )}
                            </td>

                            {/* Bookings Made */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`text-xs font-bold px-2 py-0.5 ${
                                  isFull
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                    : "bg-primary/10 text-primary border-primary/20"
                                }`}
                              >
                                {isFull
                                  ? `FULL (${bookedCount}/${occ.capacity})`
                                  : `${bookedCount} / ${occ.capacity} Booked`}
                              </Badge>
                              <ClassBookingBreakdown
                                memberCount={occ.member_booking_count}
                                trialCount={occ.trial_booking_count}
                              />
                            </td>

                            {/* Waitlist */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {waitlistCount > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-xs font-bold gap-1 px-2 py-0.5 inline-flex items-center"
                                >
                                  <Users className="size-2.5 shrink-0" />
                                  <span>{waitlistCount} Waitlist</span>
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  0 / {occ.waitlist_capacity || 0}
                                </span>
                              )}
                            </td>

                            {/* Session Status */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold px-2 py-0.5 inline-flex items-center gap-1 ${
                                  isCancelled
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40"
                                    : isDeactivated
                                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40"
                                      : isInProgress
                                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40 animate-pulse"
                                        : isCompleted
                                          ? "bg-muted text-muted-foreground border-border"
                                          : occ.status === "OPEN"
                                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                            : "bg-muted text-muted-foreground border-border"
                                }`}
                              >
                                {isCancelled && <Ban className="size-2.5 text-rose-500 shrink-0" />}
                                {isDeactivated && (
                                  <XCircle className="size-2.5 text-amber-500 shrink-0" />
                                )}
                                {isInProgress && (
                                  <Clock className="size-2.5 text-blue-500 shrink-0" />
                                )}
                                {isCompleted && (
                                  <CheckCircle2 className="size-2.5 text-muted-foreground shrink-0" />
                                )}
                                <span>{occ.status || "SCHEDULED"}</span>
                              </Badge>
                            </td>

                            {/* Actions */}
                            <td
                              className="py-3 px-4 text-right whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div
                                className="flex items-center justify-end gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAttendanceModalOccurrence(occ);
                                  }}
                                  className="h-7 px-2.5 text-xs font-semibold gap-1 shadow-2xs bg-primary text-primary-foreground hover:bg-primary/90"
                                  title="View class details, assigned trainer, workout format, video, and roster"
                                >
                                  <Users className="size-3" />
                                  <span>Details</span>
                                </Button>

                                {canEdit && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOccurrence(occ);
                                      setTrainerError(null);
                                      setIsAssignTrainerOpen(true);
                                    }}
                                    className="h-7 px-2 text-xs"
                                    title="Assign or reassign trainers"
                                  >
                                    Assign
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVideoOccurrence(occ);
                                    setIsAssignVideoOpen(true);
                                  }}
                                  className="h-7 px-2 text-xs gap-1 border-primary/20 text-primary hover:bg-primary/10"
                                  title="Assign or change workout video"
                                >
                                  <Film className="size-3" />
                                  <span>Video</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* ==================== CARDS VIEW ==================== */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOccurrences.map((occ) => {
                  const matchedTpl = templates.find((t) => t.id === occ.class_template);
                  const categoryName = occ.category_name || matchedTpl?.category_name;
                  const categoryCode = occ.category_code || matchedTpl?.category_code;
                  const programName = occ.program_name || matchedTpl?.program_name;

                  const isCompleted = occ.status === "COMPLETED";
                  const isCancelled = occ.status === "CANCELLED";
                  const isDeactivated = occ.status === "DEACTIVATED";
                  const isInProgress = occ.status === "IN_PROGRESS";

                  const isCheckedIn =
                    !isCancelled &&
                    !isDeactivated &&
                    Boolean(
                      occ.trainer_checked_in ||
                      occ.trainer_check_in_details?.checked_in ||
                      (occ.trainers && occ.trainers.some((t: any) => t.status === "CONFIRMED")) ||
                      (occ.assigned_trainers &&
                        occ.assigned_trainers.some((t: any) => t.status === "CONFIRMED")),
                    );

                  const allTrainers =
                    isCancelled || isDeactivated
                      ? []
                      : [...(occ.trainers || []), ...(occ.assigned_trainers || [])].filter(
                          (t: any) => t.status !== "CANCELLED",
                        );
                  const hasTrainer = allTrainers.length > 0;

                  const startTimeFormatted = occ.start_time
                    ? formatTime12h(occ.start_time)
                    : occ.start_at
                      ? formatTime12h(occ.start_at)
                      : "";
                  const endTimeFormatted = occ.end_time
                    ? formatTime12h(occ.end_time)
                    : occ.end_at
                      ? formatTime12h(occ.end_at)
                      : "";

                  const bookedCount = occ.booking_count ?? 0;
                  const waitlistCount = occ.waitlist_count ?? 0;

                  return (
                    <div
                      key={occ.id}
                      className={`bg-card border rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all shadow-xs ${
                        isCancelled
                          ? "border-rose-500/40 bg-rose-500/[0.03] dark:bg-rose-950/20"
                          : isDeactivated
                            ? "border-amber-500/40 bg-amber-500/[0.03] dark:bg-amber-950/20"
                            : isInProgress
                              ? "border-blue-500/40 bg-blue-500/[0.03] dark:bg-blue-950/20"
                              : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {categoryName && (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-2 py-0.5 ${getCategoryBadgeStyle(categoryName, categoryCode)}`}
                                >
                                  {categoryName}
                                </Badge>
                              )}
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                {occ.delivery_mode}
                              </span>
                            </div>
                            <h3 className="text-base font-semibold text-foreground mt-2">
                              {occ.template_name || occ.class_name || "Class Session"}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <MapPin className="size-3 text-primary shrink-0" />
                              <span className="font-medium text-foreground/80">
                                {occ.branch_name || "Branch Session"}
                              </span>
                              {programName && (
                                <span className="text-[11px] text-muted-foreground">
                                  · {programName}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 ${
                                isCancelled
                                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                  : isDeactivated
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                    : isInProgress
                                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 animate-pulse"
                                      : isCompleted
                                        ? "bg-muted text-muted-foreground border border-border"
                                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              {isCancelled && <Ban className="size-2.5 text-rose-500" />}
                              {isDeactivated && <XCircle className="size-2.5 text-amber-500" />}
                              {isInProgress && <Clock className="size-2.5 text-blue-500" />}
                              {occ.status}
                            </span>
                            {isCheckedIn ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1"
                              >
                                <CheckCircle2 className="size-2.5" /> Checked In
                              </Badge>
                            ) : hasTrainer ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1"
                              >
                                <Clock className="size-2.5" /> Pending Check-in
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-muted-foreground bg-muted/40"
                              >
                                Unassigned
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="size-3.5 text-primary shrink-0" />
                            <span className="font-semibold text-foreground">
                              {formatOccurrenceDate(occ.occurrence_date, occ.start_at)} ·{" "}
                              {startTimeFormatted} – {endTimeFormatted}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50">
                            <span className="font-semibold text-foreground">
                              Bookings:{" "}
                              <strong className="text-primary">
                                {bookedCount} / {occ.capacity}
                              </strong>
                            </span>
                            <span className="font-semibold text-foreground">
                              Waitlist:{" "}
                              <strong
                                className={
                                  waitlistCount > 0 ? "text-purple-600" : "text-muted-foreground"
                                }
                              >
                                {waitlistCount}
                              </strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <UserCheck className="size-3.5 text-muted-foreground shrink-0" />
                            <span>
                              Trainers:{" "}
                              {hasTrainer
                                ? allTrainers
                                    .map(
                                      (t: any) =>
                                        `${t.trainer_name || "Trainer"} (${t.trainer_role || "Lead"})`,
                                    )
                                    .join(", ")
                                : "Unassigned"}
                            </span>
                          </div>
                          {(occ as any).active_content && (
                            <div className="flex items-center gap-2">
                              <Sparkles className="size-3.5 text-primary shrink-0" />
                              <span>
                                Workout Content:{" "}
                                <span className="font-semibold text-foreground">
                                  {(occ as any).active_content.title}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-5 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
                        <Button
                          size="sm"
                          onClick={() => setAttendanceModalOccurrence(occ)}
                          className="flex-1 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                          title="View class details, assigned trainer, workout format, video, and roster"
                        >
                          <Users className="size-3.5" />
                          <span>Details</span>
                        </Button>
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOccurrence(occ);
                              setTrainerError(null);
                              setIsAssignTrainerOpen(true);
                            }}
                            className="text-xs"
                          >
                            Assign Trainer
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVideoOccurrence(occ);
                            setIsAssignVideoOpen(true);
                          }}
                          className="text-xs gap-1 border-primary/20 text-primary hover:bg-primary/10"
                          title="Assign or change workout video"
                        >
                          <Film className="size-3" />
                          <span>Video</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            assignContentMutation.mutate(occ.id);
                          }}
                          disabled={assignContentMutation.isPending}
                          className="text-xs"
                        >
                          Rotate
                        </Button>
                        {canCancel && (
                          <div
                            className="flex items-center gap-1.5 ml-auto"
                            onClick={(e) => e.stopPropagation()}
                            title={
                              isCompleted
                                ? "Class session completed"
                                : isCancelled || isDeactivated
                                  ? "Class is Cancelled — Toggle to reactivate"
                                  : "Class is Active — Toggle to cancel"
                            }
                          >
                            <span
                              className={cn(
                                "text-[11px] font-semibold",
                                isCancelled
                                  ? "text-rose-600 dark:text-rose-400"
                                  : isDeactivated
                                    ? "text-amber-600 dark:text-amber-400"
                                    : isCompleted
                                      ? "text-muted-foreground"
                                      : "text-emerald-600 dark:text-emerald-400",
                              )}
                            >
                              {isCancelled
                                ? "Cancelled"
                                : isDeactivated
                                  ? "Deactivated"
                                  : isCompleted
                                    ? "Completed"
                                    : "Active"}
                            </span>
                            <Switch
                              checked={!isCancelled && !isDeactivated}
                              disabled={isCompleted || restoringOccId === occ.id}
                              onCheckedChange={(checked) => {
                                if (!checked) {
                                  setCancellingOccurrence(occ);
                                  setIsCancelModalOpen(true);
                                } else {
                                  handleRestoreOccurrenceSlot(occ);
                                }
                              }}
                              className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-rose-500/80 cursor-pointer"
                              aria-label="Toggle class status"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sessions Pagination Controls */}
            {!loadingOccurrences && totalSessionsCount > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card px-4 py-3 rounded-xl border border-border shadow-xs">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Showing{" "}
                    <span className="font-semibold text-foreground">
                      {Math.min((sessionsPage - 1) * sessionsPageSize + 1, totalSessionsCount)}
                    </span>
                    –
                    <span className="font-semibold text-foreground">
                      {Math.min(sessionsPage * sessionsPageSize, totalSessionsCount)}
                    </span>{" "}
                    of <span className="font-semibold text-foreground">{totalSessionsCount}</span>{" "}
                    sessions
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span>Per page:</span>
                    <select
                      value={sessionsPageSize}
                      onChange={(e) => {
                        setSessionsPageSize(Number(e.target.value));
                        setSessionsPage(1);
                      }}
                      className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {[10, 20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSessionsPage((p) => Math.max(1, p - 1))}
                    disabled={sessionsPage <= 1 || loadingOccurrences}
                    className="h-7 px-2.5 text-xs gap-1"
                  >
                    <ChevronLeft className="size-3.5" />
                    Prev
                  </Button>
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: Math.min(5, totalSessionsPages) }, (_, idx) => {
                      let pageNum = idx + 1;
                      if (totalSessionsPages > 5) {
                        const start = Math.max(
                          1,
                          Math.min(sessionsPage - 2, totalSessionsPages - 4),
                        );
                        pageNum = start + idx;
                      }
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setSessionsPage(pageNum)}
                          className={`h-7 min-w-[28px] px-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                            sessionsPage === pageNum
                              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSessionsPage((p) => Math.min(totalSessionsPages, p + 1))}
                    disabled={sessionsPage >= totalSessionsPages || loadingOccurrences}
                    className="h-7 px-2.5 text-xs gap-1"
                  >
                    Next
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: CONTENT STUDIO (Exposed from Sessions) */}
        {primaryTab === "sessions" && showContentStudio && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border rounded-xl shadow-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="size-4 text-primary" />
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Content Studio</h4>
                  <p className="text-xs text-muted-foreground">
                    Workout instructional media, rotation engines, and class mapping.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowContentStudio(false)}
                className="text-xs"
              >
                Back to Sessions
              </Button>
            </div>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3">
              <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground block">
                  NO_REPEAT_UNTIL_EXHAUSTED Engine
                </span>
                Content rotation strictly serves workout media and session plans in deterministic
                sequence by display order. Items repeat only after the complete pool for a class
                template has been exhausted.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search content by title or description..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>

            {loadingContent ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading Content Studio items...
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 sm:p-12 text-center shadow-xs">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Video className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  No Content Items Registered
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                  Upload workout playlists, video instructions, and workout cards for the Content
                  Studio.
                </p>
                {canCreate && (
                  <Button size="sm" onClick={() => setIsCreateContentOpen(true)}>
                    <Plus className="size-3.5 mr-1" /> Add Content Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContent.map((item) => (
                  <div
                    key={item.id}
                    className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-muted-foreground">
                          Order #{item.display_order}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                          {item.content_type}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground mt-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span>Status: {item.status}</span>
                      {item.external_url && (
                        <a
                          href={item.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <Play className="w-3 h-3" /> Stream Source
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </PageBody>

      {/* CREATE / EDIT CLASS CATEGORY MODAL */}
      <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Class Category" : "Create Class Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div>
              <Label className="mb-1 block">Name *</Label>
              <Input
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Enter category name..."
              />
            </div>
            <div>
              <Label className="mb-1 block">Description</Label>
              <textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Enter description..."
                className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Display Order</Label>
                <Input
                  type="number"
                  value={categoryForm.display_order}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, display_order: e.target.value })
                  }
                  placeholder="e.g. 1"
                />
              </div>
              <div>
                <Label className="mb-1 block">Status</Label>
                <select
                  value={categoryForm.status}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, status: e.target.value as any })
                  }
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Status...</option>
                  {(metadata?.statuses || [])
                    .filter(
                      (s: ClassesMetadataOption<string>) =>
                        s.value === "ACTIVE" || s.value === "INACTIVE",
                    )
                    .map((s: ClassesMetadataOption<string>) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateCategoryOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveCategoryMutation.mutate(categoryForm)}
              disabled={!categoryForm.name || saveCategoryMutation.isPending}
            >
              {saveCategoryMutation.isPending ? "Saving..." : "Save Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE / EDIT CLASS TEMPLATE MODAL */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Class Template" : "Create Class Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            {/* BASIC SECTION */}
            <div className="border-b border-border pb-3">
              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2 text-primary">
                Basic Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1 block">Template Name *</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g. Sweat Mobility, Sweat Total"
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Class Category *</Label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => {
                      const catId = e.target.value;
                      const cat = categories.find((c) => c.id === catId);
                      setTemplateForm((prev) => ({
                        ...prev,
                        category: catId,
                        name: prev.name.trim() ? prev.name : cat ? cat.name : "",
                      }));
                    }}
                    className="w-full h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block">Program</Label>
                  <select
                    value={templateForm.program}
                    onChange={(e) => setTemplateForm({ ...templateForm, program: e.target.value })}
                    className="w-full h-8 bg-background border border-border rounded-lg px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">No Program Bound</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <Label className="mb-1 block">Description</Label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, description: e.target.value })
                  }
                  placeholder="Template description..."
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[50px]"
                />
              </div>

              {/* Cover Image Upload */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="block text-xs font-semibold">Cover Image</Label>
                  {templateForm.image_url && (
                    <button
                      type="button"
                      onClick={() => setTemplateForm((prev) => ({ ...prev, image_url: "" }))}
                      className="text-[11px] text-rose-500 hover:text-rose-600 font-medium transition-colors"
                    >
                      Remove Image
                    </button>
                  )}
                </div>

                {templateForm.image_url ? (
                  <div className="relative rounded-xl border border-border overflow-hidden bg-muted/20 group h-36">
                    <img
                      src={templateForm.image_url}
                      alt="Template Cover"
                      className="w-full h-full object-cover"
                    />
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer gap-2 text-white text-xs font-semibold">
                      <Upload className="size-4" />
                      <span>Change Image</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setTemplateForm((prev) => ({
                                ...prev,
                                image_url: String(event.target?.result || ""),
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer text-muted-foreground hover:text-foreground">
                    <div className="p-2.5 rounded-full bg-background border border-border text-primary shadow-2xs">
                      <Upload className="size-4" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-semibold text-primary">
                        Click to upload cover image
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        PNG, JPG, or WEBP from your device
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setTemplateForm((prev) => ({
                              ...prev,
                              image_url: String(event.target?.result || ""),
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* DEFAULT SESSION SETTINGS */}
            <div className="border-b border-border pb-3">
              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2 text-primary">
                Default Session Settings
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="mb-1 block">Duration (min)</Label>
                  <Input
                    type="number"
                    value={templateForm.default_duration_minutes}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, default_duration_minutes: e.target.value })
                    }
                    placeholder="e.g. 60"
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Booking Cap (Total Capacity)</Label>
                  <Input
                    type="number"
                    value={templateForm.default_capacity}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, default_capacity: e.target.value })
                    }
                    placeholder="e.g. 20 (Total studio capacity)"
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Trial Cap</Label>
                  <Input
                    type="number"
                    value={templateForm.default_trial_capacity}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, default_trial_capacity: e.target.value })
                    }
                    placeholder="e.g. 4 (Max trial spots)"
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Waitlist Cap</Label>
                  <Input
                    type="number"
                    value={templateForm.default_waitlist_capacity}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        default_waitlist_capacity: e.target.value,
                      })
                    }
                    placeholder="e.g. 5"
                  />
                </div>
              </div>

              {/* BRANCH-WISE CAPACITY CONFIGURATION */}
              <div className="border-b border-border pb-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-primary">
                      Branch-wise Studio Capacity Setup
                    </h4>
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                      Reformer Beds & Space per Branch
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Different studio branches have different reformer beds and room setups. Configure
                  branch-specific booking capacities below. If left blank, the branch uses the
                  general default capacity ({templateForm.default_capacity || 20}) set above.
                </p>

                <div className="space-y-2">
                  {branches.map((b) => {
                    const bItem = templateForm.branch_capacities?.find(
                      (bc) => bc.branch_id === b.id,
                    ) || {
                      branch_id: b.id,
                      branch_name: b.name,
                      is_enabled: true,
                      capacity_override: "",
                      trial_capacity_override: "",
                      waitlist_capacity_override: "",
                    };

                    const updateBranchItem = (patch: Partial<typeof bItem>) => {
                      const existingIdx = (templateForm.branch_capacities || []).findIndex(
                        (bc) => bc.branch_id === b.id,
                      );
                      let updated = [...(templateForm.branch_capacities || [])];
                      if (existingIdx >= 0) {
                        updated[existingIdx] = { ...updated[existingIdx], ...patch } as any;
                      } else {
                        updated.push({ ...bItem, ...patch } as any);
                      }
                      setTemplateForm({ ...templateForm, branch_capacities: updated });
                    };

                    return (
                      <div
                        key={b.id}
                        className={`p-2.5 rounded-lg border transition-all ${
                          bItem.is_enabled
                            ? "bg-muted/30 border-border"
                            : "bg-muted/10 border-border/40 opacity-60"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`branch-avail-${b.id}`}
                              checked={bItem.is_enabled}
                              onChange={(e) => updateBranchItem({ is_enabled: e.target.checked })}
                              className="rounded border-border text-primary focus:ring-primary size-3.5"
                            />
                            <label
                              htmlFor={`branch-avail-${b.id}`}
                              className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
                            >
                              <Building2 className="size-3 text-muted-foreground" />
                              {b.name}
                            </label>
                          </div>

                          {bItem.is_enabled && (
                            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                              <div>
                                <span className="text-[10px] text-muted-foreground block mb-0.5">
                                  Beds / Booking Cap
                                </span>
                                <Input
                                  type="number"
                                  className="h-7 text-xs w-full sm:w-28 bg-background"
                                  value={bItem.capacity_override}
                                  onChange={(e) =>
                                    updateBranchItem({ capacity_override: e.target.value })
                                  }
                                  placeholder={`Default (${templateForm.default_capacity || 20})`}
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground block mb-0.5">
                                  Trial Cap
                                </span>
                                <Input
                                  type="number"
                                  className="h-7 text-xs w-full sm:w-24 bg-background"
                                  value={bItem.trial_capacity_override}
                                  onChange={(e) =>
                                    updateBranchItem({ trial_capacity_override: e.target.value })
                                  }
                                  placeholder={`Default (${templateForm.default_trial_capacity || 0})`}
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground block mb-0.5">
                                  Waitlist
                                </span>
                                <Input
                                  type="number"
                                  className="h-7 text-xs w-full sm:w-24 bg-background"
                                  value={bItem.waitlist_capacity_override}
                                  onChange={(e) =>
                                    updateBranchItem({ waitlist_capacity_override: e.target.value })
                                  }
                                  placeholder={`Default (${templateForm.default_waitlist_capacity || 0})`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* BOOKING RULE FLAGS */}
            <div className="border-b border-border pb-3">
              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2 text-primary">
                Booking Rule Flags
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={templateForm.allow_booking}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, allow_booking: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  <span>Allow Booking</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={templateForm.allow_trial}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, allow_trial: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  <span>Allow Trial</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={templateForm.allow_waitlist}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, allow_waitlist: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  <span>Allow Waitlist</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={templateForm.allow_reschedule}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, allow_reschedule: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  <span>Allow Reschedule</span>
                </label>
              </div>
            </div>

            {/* DELIVERY & STATUS */}
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block">Delivery Mode</Label>
                  <select
                    value={templateForm.default_delivery_mode}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        default_delivery_mode: e.target.value as any,
                      })
                    }
                    className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Delivery Mode...</option>
                    {(metadata?.delivery_modes || []).map(
                      (m: ClassesMetadataOption<DeliveryMode>) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block">Status</Label>
                  <select
                    value={templateForm.status}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, status: e.target.value as any })
                    }
                    className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Status...</option>
                    {(metadata?.statuses || []).map((s: ClassesMetadataOption<string>) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveTemplateMutation.mutate(templateForm)}
              disabled={
                !templateForm.category ||
                !templateForm.name.trim() ||
                saveTemplateMutation.isPending
              }
            >
              {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE / EDIT RECURRING RULE MODAL */}
      <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
        <DialogContent
          className={`w-[calc(100vw-1.5rem)] ${
            editingRule ? "sm:max-w-xl" : "sm:max-w-5xl"
          } max-h-[94vh] overflow-y-auto p-0 border border-border shadow-2xl rounded-2xl bg-card`}
        >
          {/* STICKY MODAL HEADER */}
          <div className="px-6 py-4 border-b border-border bg-card sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Calendar className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-bold text-foreground">
                    {editingRule
                      ? "Edit Recurring Schedule Rule"
                      : "Create Recurring Schedule Rules"}
                  </DialogTitle>
                  {!editingRule && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Multi-Branch & Multi-Template
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {editingRule
                    ? "Update timings, branch operating schedule, or capacity overrides."
                    : "Configure class templates and time slots across branches, preview sessions, and assign trainers."}
                </p>
              </div>
            </div>

            {/* STEPPER (Only shown when creating new rules) */}
            {!editingRule && (
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setRuleModalStep(1)}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                    ruleModalStep === 1
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground cursor-pointer"
                  }`}
                >
                  <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    1
                  </span>
                  <span>Configure Schedule</span>
                </button>
                <ChevronRight className="size-3.5 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) {
                      setPreviewOccurrences(calculatePreviewOccurrences());
                      setRuleModalStep(2);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                    ruleModalStep === 2
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground cursor-pointer"
                  }`}
                >
                  <span className="size-4 rounded-full bg-muted text-foreground text-[10px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <span>Preview & Review</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary text-primary-foreground font-bold ml-0.5">
                    {calculatePreviewOccurrences().length}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* MODAL BODY */}
          <div className="p-6 space-y-6">
            {ruleError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Schedule Rule Validation Notice</p>
                  <p className="text-[11px] leading-relaxed">{ruleError}</p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 1: CONFIGURE SCHEDULE (OR EDITING SINGLE RULE)                       */}
            {/* ========================================================================= */}
            {(ruleModalStep === 1 || editingRule) && (
              <div className="space-y-6">
                {/* 1. SELECT TARGET STUDIO BRANCHES (AT TOP) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-bold text-xs flex items-center gap-2">
                        <span className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">
                          1
                        </span>
                        <span>Select Target Studio Branches *</span>
                      </Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Operating windows dynamically synchronized with Administration → Location.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-primary/10 text-primary border border-primary/20">
                        {ruleForm.branches.length} of {branches.length} Selected
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = branches.map((b) => b.id);
                          setRuleForm((prev) => ({
                            ...prev,
                            branches: allIds,
                            branch: allIds[0] || prev.branch,
                          }));
                        }}
                        className="text-[11px] font-semibold text-primary hover:underline cursor-pointer ml-1"
                      >
                        Select All
                      </button>
                      <span className="text-muted-foreground text-[10px]">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRuleForm((prev) => ({
                            ...prev,
                            branches: [],
                            branch: "",
                          }));
                        }}
                        className="text-[11px] font-semibold text-muted-foreground hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Branch Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {branches.map((b) => {
                      const isSelected = ruleForm.branches.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setRuleForm((prev) => {
                              const newBranches = isSelected
                                ? prev.branches.filter((id) => id !== b.id)
                                : [...prev.branches, b.id];
                              return {
                                ...prev,
                                branches: newBranches,
                                branch: newBranches[0] || "",
                              };
                            });
                          }}
                          className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer relative space-y-1.5 ${
                            isSelected
                              ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30"
                              : "bg-card border-border hover:border-primary/40 hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground truncate pr-2" title={b.name}>
                              {b.name}
                            </span>
                            <div
                              className={`size-4 rounded flex items-center justify-center border text-[9px] font-bold ${
                                isSelected
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-muted-foreground/40 bg-background"
                              }`}
                            >
                              {isSelected && "✓"}
                            </div>
                          </div>
                          {(() => {
                            const bDetails = getBranchOperatingDetails(b.id);
                            return (
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span title="Configured in Administration → Location">🕒 {bDetails.label}</span>
                                <span className={bDetails.isConfigured ? "text-emerald-600 font-semibold bg-emerald-500/10 px-1.5 py-0.2 rounded" : "text-amber-600 font-semibold bg-amber-500/10 px-1.5 py-0.2 rounded"}>
                                  {bDetails.isConfigured ? "OPERATIONAL" : "CONFIGURED"}
                                </span>
                              </div>
                            );
                          })()}
                        </button>
                      );
                    })}
                  </div>

                  {/* Combined Operating Window Banner */}
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Clock className="size-3.5 text-primary" />
                      <span>{getCombinedOperatingWindowSummary().text}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        ✓ {getCombinedOperatingWindowSummary().daysText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. CONFIGURE CLASS TEMPLATES & TIME SLOTS */}
                <div className="space-y-4 pt-2 border-t border-border/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-bold text-xs flex items-center gap-2">
                        <span className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">
                          2
                        </span>
                        <span>Configure Class Templates & Time Slots</span>
                      </Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Each template independently configures its own days of the week, duration, and multiple time slots.
                      </p>
                    </div>
                    {!editingRule && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={addTemplateBlock}
                        className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs"
                      >
                        <Plus className="size-3.5" />
                        <span>Add Another Template</span>
                      </Button>
                    )}
                  </div>

                  {/* Template Blocks List */}
                  <div className="space-y-4">
                    {templateBlocks.map((block, bIdx) => {
                      const selTpl = templates.find((t) => t.id === block.class_template);
                      const catName =
                        selTpl?.category_name ||
                        categories.find((c) => c.id === selTpl?.category)?.name ||
                        "General";
                      const eligibleTrainers = getEligibleTrainersForCategory(
                        selTpl?.category,
                        catName
                      );

                      return (
                        <div
                          key={block.uid || bIdx}
                          className="bg-card p-4 rounded-xl border border-border shadow-xs space-y-4 relative"
                        >
                          {/* Block Header */}
                          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase">
                                #{bIdx + 1} Class Template Setup
                              </span>
                              {catName && (
                                <span className="text-[10px] font-semibold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded">
                                  {catName}
                                </span>
                              )}
                            </div>
                            {templateBlocks.length > 1 && !editingRule && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTemplateBlock(block.uid)}
                                className="h-6 text-[10px] text-rose-500 hover:bg-rose-500/10 px-2 gap-1 cursor-pointer"
                              >
                                <Trash2 className="size-3" />
                                <span>Remove Template</span>
                              </Button>
                            )}
                          </div>

                          {/* Template Dropdown & Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2 space-y-1">
                              <Label className="text-[11px] font-medium text-foreground">
                                Class Template (Active from Class Setup) *
                              </Label>
                              <select
                                value={block.class_template}
                                onChange={(e) => {
                                  const newTplId = e.target.value;
                                  const tplObj = templates.find((t) => t.id === newTplId);
                                  const dur = tplObj?.default_duration_minutes || 60;
                                  // auto-adjust first slot end time
                                  const updatedSlots = block.time_slots.map((s) => {
                                    if (!s.start_time) return s;
                                    const parts = s.start_time.split(":");
                                    const h = parseInt(parts[0] || "0", 10);
                                    const m = parseInt(parts[1] || "0", 10);
                                    const endTotalM = Math.min(1439, h * 60 + m + dur);
                                    const eh = Math.floor(endTotalM / 60) % 24;
                                    const em = endTotalM % 60;
                                    return {
                                      ...s,
                                      end_time: `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`,
                                    };
                                  });
                                  updateTemplateBlock(block.uid, {
                                    class_template: newTplId,
                                    time_slots: updatedSlots,
                                  });
                                }}
                                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                              >
                                <option value="">Select Template</option>
                                {templates
                                  .filter(
                                    (t) =>
                                      (t.status || "").toUpperCase() === "ACTIVE" ||
                                      (!t.status && (t as any).is_active !== false) ||
                                      (editingRule && block.class_template === t.id)
                                  )
                                  .map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name} ({t.default_duration_minutes} mins |{" "}
                                      {t.default_capacity} Capacity)
                                    </option>
                                  ))}
                              </select>
                            </div>

                            {/* Dynamic Duration & Capacity Badges */}
                            <div className="flex flex-col justify-end">
                              {selTpl ? (
                                <div className="p-2 bg-muted/30 rounded-lg border border-border text-[11px] flex items-center justify-between gap-1">
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="size-3 text-primary" />
                                    <span>Duration: <strong className="text-foreground">{selTpl.default_duration_minutes}m</strong></span>
                                  </span>
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Users className="size-3 text-primary" />
                                    <span>Cap: <strong className="text-foreground">{selTpl.default_capacity}</strong></span>
                                  </span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-muted-foreground italic p-2 bg-muted/20 rounded-lg border border-border">
                                  Select a template to view duration & capacity
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Days of Week Selector */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-[11px] font-medium text-foreground">
                                Select Days of Week *
                              </Label>
                              <span className="text-[10px] text-muted-foreground">
                                Click day to toggle
                              </span>
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {[
                                { num: 1, label: "Mon" },
                                { num: 2, label: "Tue" },
                                { num: 3, label: "Wed" },
                                { num: 4, label: "Thu" },
                                { num: 5, label: "Fri" },
                                { num: 6, label: "Sat" },
                                { num: 7, label: "Sun" },
                              ].map((d) => {
                                const isSelected = block.days_of_week.includes(d.num);
                                return (
                                  <button
                                    key={d.num}
                                    type="button"
                                    onClick={() => {
                                      const next = isSelected
                                        ? block.days_of_week.filter((x) => x !== d.num)
                                        : [...block.days_of_week, d.num].sort();
                                      updateTemplateBlock(block.uid, { days_of_week: next });
                                    }}
                                    className={`py-1.5 px-1 flex flex-col items-center justify-center rounded-lg border transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-slate-900 text-white dark:bg-primary dark:text-primary-foreground border-slate-900 font-semibold shadow-2xs"
                                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                                    }`}
                                  >
                                    <span className="text-xs font-semibold">{d.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Time Slots Configurator */}
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-[11px] font-medium text-foreground">
                                Time Slots ({block.time_slots.length} configured)
                              </Label>
                              <button
                                type="button"
                                onClick={() => addSlotToBlock(block.uid)}
                                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="size-3" />
                                <span>Add Time Slot</span>
                              </button>
                            </div>

                            <div className="space-y-2">
                              {block.time_slots.map((slot, sIdx) => {
                                const isInvalid = Boolean(
                                  slot.start_time &&
                                    slot.end_time &&
                                    slot.end_time <= slot.start_time
                                );

                                return (
                                  <div
                                    key={slot.id || sIdx}
                                    className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-3 text-xs ${
                                      isInvalid
                                        ? "border-rose-400 bg-rose-500/5"
                                        : "border-border/80 bg-muted/20"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground border border-border">
                                        Slot #{sIdx + 1}
                                      </span>
                                      <input
                                        type="time"
                                        value={slot.start_time}
                                        onChange={(e) =>
                                          updateSlotInBlock(block.uid, sIdx, "start_time", e.target.value)
                                        }
                                        className="p-1 text-xs border border-border rounded bg-background font-medium text-foreground"
                                      />
                                      <span className="text-muted-foreground">to</span>
                                      <input
                                        type="time"
                                        value={slot.end_time}
                                        onChange={(e) =>
                                          updateSlotInBlock(block.uid, sIdx, "end_time", e.target.value)
                                        }
                                        className="p-1 text-xs border border-border rounded bg-background font-medium text-foreground"
                                      />
                                      {slot.start_time && slot.end_time && !isInvalid && (
                                        <span className="text-[11px] font-semibold text-primary ml-1">
                                          ({formatTime12h(slot.start_time)} – {formatTime12h(slot.end_time)})
                                        </span>
                                      )}
                                    </div>

                                    {block.time_slots.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeSlotFromBlock(block.uid, sIdx)}
                                        className="text-muted-foreground hover:text-rose-500 p-1 cursor-pointer"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Category-Filtered Default Trainer Selection (Optional) */}
                          <div className="p-2.5 rounded-lg border border-purple-500/20 bg-purple-500/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                <Users className="size-3.5 text-purple-600" />
                                <span>Default Lead Trainer for {catName}</span>
                                <span className="text-[9px] bg-purple-500/10 text-purple-600 px-1.5 py-0.2 rounded font-semibold">
                                  Filtered for {catName}
                                </span>
                              </span>
                              <p className="text-[10px] text-muted-foreground">
                                Optional: Can also be assigned or changed individually in Step 2 (Preview).
                              </p>
                            </div>
                            <select
                              value={block.default_trainer || ""}
                              onChange={(e) =>
                                updateTemplateBlock(block.uid, { default_trainer: e.target.value })
                              }
                              className="text-xs font-medium p-1.5 rounded-lg border border-border bg-background text-foreground"
                            >
                              <option value="">-- No Default Trainer --</option>
                              {eligibleTrainers.map((tr: any) => {
                                const trId = tr.id || tr.trainer_profile_id;
                                const trName =
                                  tr.full_name || tr.trainer_name || tr.name || tr.employee_name;
                                return (
                                  <option key={trId} value={trId}>
                                    {trName} ({tr.trainer_code || "Trainer"})
                                    {tr.can_teach_all_specialties ? " ★ All Specialties" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. GENERATE CLASS SLOTS IMMEDIATELY SECTION */}
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="rule_auto_gen"
                      checked={ruleForm.auto_generate_slots}
                      onChange={(e) =>
                        setRuleForm({ ...ruleForm, auto_generate_slots: e.target.checked })
                      }
                      className="mt-0.5 rounded border-border text-primary focus:ring-primary size-4 cursor-pointer"
                    />
                    <div className="flex-1 text-xs">
                      <label
                        htmlFor="rule_auto_gen"
                        className="font-bold text-foreground cursor-pointer block"
                      >
                        Generate Class Slots Immediately
                      </label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Automatically calculates and generates individual class occurrences across all selected branches and configured templates for this date window.
                      </p>
                    </div>
                  </div>

                  {ruleForm.auto_generate_slots && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 pl-6">
                      <div>
                        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                          Generate From Date *
                        </Label>
                        <Input
                          type="date"
                          value={ruleForm.generate_from_date}
                          onChange={(e) =>
                            setRuleForm({
                              ...ruleForm,
                              generate_from_date: e.target.value,
                              valid_from: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                          Generate To Date *
                        </Label>
                        <Input
                          type="date"
                          value={ruleForm.generate_to_date}
                          onChange={(e) =>
                            setRuleForm({
                              ...ruleForm,
                              generate_to_date: e.target.value,
                              valid_until: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 2: MANDATORY PREVIEW & REVIEW TAB                                     */}
            {/* ========================================================================= */}
            {ruleModalStep === 2 && !editingRule && (
              <div className="space-y-4">
                {/* Notice Banner */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <div>
                      <strong className="text-foreground font-semibold">
                        Mandatory Schedule Review (No DB Writes Yet)
                      </strong>
                      <p className="text-[11px] text-muted-foreground">
                        Inspect every class session that will be generated. Assign trainers, review timings, or remove specific dates below.
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    Preview Mode
                  </span>
                </div>

                {/* Summary Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-muted/30 rounded-xl border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Total Sessions
                    </span>
                    <span className="text-lg font-black text-primary">
                      {previewOccurrences.length}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      To create in calendar
                    </span>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-xl border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Master Plan
                    </span>
                    <span className="text-lg font-black text-foreground">
                      1 Master Plan
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {ruleForm.branches.length * templateBlocks.length * (templateBlocks[0]?.time_slots.length || 1)} relational rules
                    </span>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-xl border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Branches
                    </span>
                    <span className="text-lg font-black text-foreground">
                      {ruleForm.branches.length}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Targeted studios
                    </span>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        Layout View
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {previewViewMode === "WEEK" ? "Week View" : "Table View"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setPreviewViewMode("WEEK")}
                        className={`p-1 rounded ${
                          previewViewMode === "WEEK"
                            ? "bg-background shadow-xs text-primary"
                            : "text-muted-foreground"
                        }`}
                        title="Week-wise Grid View"
                      >
                        <LayoutGrid className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewViewMode("TABLE")}
                        className={`p-1 rounded ${
                          previewViewMode === "TABLE"
                            ? "bg-background shadow-xs text-primary"
                            : "text-muted-foreground"
                        }`}
                        title="Table List View"
                      >
                        <LayoutList className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filters Toolbar */}
                <div className="p-3 bg-card rounded-xl border border-border flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="size-3.5 text-muted-foreground" />
                    <select
                      value={previewFilterBranch}
                      onChange={(e) => setPreviewFilterBranch(e.target.value)}
                      className="text-xs p-1.5 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="ALL">All Branches</option>
                      {branches
                        .filter((b) => ruleForm.branches.includes(b.id))
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>

                    <select
                      value={previewFilterTemplate}
                      onChange={(e) => setPreviewFilterTemplate(e.target.value)}
                      className="text-xs p-1.5 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="ALL">All Class Templates</option>
                      {templateBlocks.map((tb) => {
                        const tpl = templates.find((t) => t.id === tb.class_template);
                        return (
                          <option key={tb.uid} value={tb.class_template}>
                            {tpl?.name || "Template"}
                          </option>
                        );
                      })}
                    </select>

                    <select
                      value={previewFilterDay}
                      onChange={(e) => setPreviewFilterDay(e.target.value)}
                      className="text-xs p-1.5 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="ALL">All Days of Week</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                      <option value="7">Sunday</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Search class, branch, time..."
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground w-40 sm:w-48"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewFilterBranch("ALL");
                      setPreviewFilterTemplate("ALL");
                      setPreviewFilterDay("ALL");
                      setPreviewFilterTrainer("ALL");
                      setPreviewSearch("");
                    }}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>

                {/* Filtered Occurrences Calculation */}
                {(() => {
                  const filteredList = previewOccurrences.filter((occ) => {
                    if (previewFilterBranch !== "ALL" && occ.branchId !== previewFilterBranch)
                      return false;
                    if (
                      previewFilterTemplate !== "ALL" &&
                      occ.templateId !== previewFilterTemplate
                    )
                      return false;
                    if (
                      previewFilterDay !== "ALL" &&
                      String(occ.dayNum) !== previewFilterDay
                    )
                      return false;
                    if (
                      previewFilterTrainer !== "ALL" &&
                      occ.trainerId !== previewFilterTrainer
                    )
                      return false;
                    if (previewSearch.trim()) {
                      const q = previewSearch.toLowerCase();
                      const match =
                        occ.templateName.toLowerCase().includes(q) ||
                        occ.branchName.toLowerCase().includes(q) ||
                        occ.startTime.toLowerCase().includes(q) ||
                        occ.date.toLowerCase().includes(q);
                      if (!match) return false;
                    }
                    return true;
                  });

                  // WEEK-WISE VIEW
                  if (previewViewMode === "WEEK") {
                    const fromBase = new Date(
                      ruleForm.generate_from_date || ruleForm.valid_from || new Date().toISOString()
                    );
                    const weekStartDate = new Date(fromBase);
                    weekStartDate.setDate(weekStartDate.getDate() + previewWeekOffset * 7);

                    const daysCols = [1, 2, 3, 4, 5, 6, 7].map((isoDay) => {
                      const d = new Date(weekStartDate);
                      const currentDay = d.getDay() === 0 ? 7 : d.getDay();
                      const diff = isoDay - currentDay;
                      d.setDate(d.getDate() + diff);
                      const dIso = d.toISOString().split("T")[0] || "";
                      const sessionsThisDay = filteredList.filter((o) => o.date === dIso);
                      const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                      return {
                        isoDay,
                        label: dayLabels[isoDay - 1],
                        dateIso: dIso,
                        sessions: sessionsThisDay,
                      };
                    });

                    return (
                      <div className="space-y-3">
                        {/* Week Navigator */}
                        <div className="flex items-center justify-between px-1 text-xs">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewWeekOffset((prev) => Math.max(0, prev - 1))}
                              disabled={previewWeekOffset <= 0}
                              className="h-7 w-7 p-0"
                            >
                              <ChevronLeft className="size-3.5" />
                            </Button>
                            <span className="font-bold text-foreground">
                              Week {previewWeekOffset + 1}: {daysCols[0]?.dateIso} to {daysCols[6]?.dateIso}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewWeekOffset((prev) => prev + 1)}
                              className="h-7 w-7 p-0"
                            >
                              <ChevronRight className="size-3.5" />
                            </Button>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            Showing classes scheduled for this week (Capacity from Class Setup)
                          </span>
                        </div>

                        {/* 7 Columns Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                          {daysCols.map((col) => (
                            <div
                              key={col.isoDay}
                              className="bg-muted/20 rounded-xl border border-border p-2 space-y-2 min-h-[220px]"
                            >
                              <div className="text-center pb-1.5 border-b border-border/60">
                                <span className="text-xs font-bold text-foreground block">
                                  {col.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  {col.dateIso.slice(5)}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {col.sessions.map((s) => {
                                  const eligible = getEligibleTrainersForCategory(
                                    s.templateCategoryId,
                                    s.templateCategoryName
                                  );

                                  return (
                                    <div
                                      key={s.id}
                                      className="p-2 bg-card rounded-lg border border-border shadow-2xs hover:border-primary/40 transition-all space-y-1 text-xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-foreground text-[10px]">
                                          {formatTime12h(s.startTime)}
                                        </span>
                                        <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-primary/10 text-primary">
                                          {s.templateName.split(" ")[1] || s.templateName}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span className="truncate max-w-[80px]" title={s.branchName}>
                                          {s.branchName.replace("Sweat ", "")}
                                        </span>
                                        <span>{s.templateCapacity} cap</span>
                                      </div>

                                      {/* Category-Filtered Trainer Dropdown */}
                                      <div className="pt-1 border-t border-border/40">
                                        <select
                                          value={s.trainerId || ""}
                                          onChange={(e) => {
                                            const newTrId = e.target.value;
                                            const trObj = trainers.find(
                                              (t: any) =>
                                                (t.id || t.trainer_profile_id) === newTrId
                                            );
                                            const trName = trObj
                                              ? trObj.full_name ||
                                                trObj.trainer_name ||
                                                trObj.name
                                              : "";
                                            setPreviewOccurrences((prev) =>
                                              prev.map((occ) =>
                                                occ.id === s.id
                                                  ? { ...occ, trainerId: newTrId, trainerName: trName }
                                                  : occ
                                              )
                                            );
                                          }}
                                          className="w-full text-[10px] font-medium p-1 rounded border border-border bg-background text-foreground"
                                        >
                                          <option value="">-- Trainer --</option>
                                          {eligible.map((tr: any) => {
                                            const tId = tr.id || tr.trainer_profile_id;
                                            const tName =
                                              tr.full_name ||
                                              tr.trainer_name ||
                                              tr.name ||
                                              tr.employee_name;
                                            return (
                                              <option key={tId} value={tId}>
                                                {tName}
                                              </option>
                                            );
                                          })}
                                        </select>
                                      </div>
                                    </div>
                                  );
                                })}

                                {col.sessions.length === 0 && (
                                  <div className="text-center py-6 text-[10px] text-muted-foreground/60 italic">
                                    No classes
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // TABLE LIST VIEW
                  return (
                    <div className="rounded-xl border border-border overflow-hidden bg-card">
                      <div className="max-h-[380px] overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-muted/50 sticky top-0 border-b border-border text-[11px] font-semibold text-muted-foreground">
                            <tr>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Day</th>
                              <th className="py-2.5 px-3">Time</th>
                              <th className="py-2.5 px-3">Class Template</th>
                              <th className="py-2.5 px-3">Branch</th>
                              <th className="py-2.5 px-3">Capacity</th>
                              <th className="py-2.5 px-3">Assigned Trainer</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {filteredList.map((occ) => {
                              const eligible = getEligibleTrainersForCategory(
                                occ.templateCategoryId,
                                occ.templateCategoryName
                              );

                              return (
                                <tr key={occ.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="py-2 px-3 font-semibold text-foreground">
                                    {occ.date}
                                  </td>
                                  <td className="py-2 px-3 text-muted-foreground font-medium">
                                    {occ.dayName}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-[11px]">
                                    {formatTime12h(occ.startTime)} – {formatTime12h(occ.endTime)}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="font-semibold text-foreground block">
                                      {occ.templateName}
                                    </span>
                                    <span className="text-[10px] text-purple-600 bg-purple-500/10 px-1.5 py-0.2 rounded font-medium">
                                      {occ.templateCategoryName}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-muted-foreground font-medium">
                                    {occ.branchName}
                                  </td>
                                  <td className="py-2 px-3 font-semibold text-foreground">
                                    {occ.templateCapacity} cap
                                  </td>
                                  <td className="py-2 px-3">
                                    <select
                                      value={occ.trainerId || ""}
                                      onChange={(e) => {
                                        const newTrId = e.target.value;
                                        const trObj = trainers.find(
                                          (t: any) =>
                                            (t.id || t.trainer_profile_id) === newTrId
                                        );
                                        const trName = trObj
                                          ? trObj.full_name ||
                                            trObj.trainer_name ||
                                            trObj.name
                                          : "";
                                        setPreviewOccurrences((prev) =>
                                          prev.map((o) =>
                                            o.id === occ.id
                                              ? { ...o, trainerId: newTrId, trainerName: trName }
                                              : o
                                          )
                                        );
                                      }}
                                      className="text-xs p-1 rounded border border-border bg-background text-foreground"
                                    >
                                      <option value="">-- Unassigned --</option>
                                      {eligible.map((tr: any) => {
                                        const tId = tr.id || tr.trainer_profile_id;
                                        const tName =
                                          tr.full_name ||
                                          tr.trainer_name ||
                                          tr.name ||
                                          tr.employee_name;
                                        return (
                                          <option key={tId} value={tId}>
                                            {tName}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPreviewOccurrences((prev) =>
                                          prev.filter((o) => o.id !== occ.id)
                                        );
                                      }}
                                      className="text-muted-foreground hover:text-rose-500 p-1 cursor-pointer"
                                      title="Remove this date session"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}

                            {filteredList.length === 0 && (
                              <tr>
                                <td
                                  colSpan={8}
                                  className="text-center py-8 text-xs text-muted-foreground italic"
                                >
                                  No class sessions match the selected filters.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* STICKY MODAL FOOTER */}
          <div className="px-6 py-3.5 border-t border-border bg-card sticky bottom-0 z-30 flex items-center justify-between gap-3">
            <div>
              {ruleModalStep === 2 && !editingRule ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRuleModalStep(1)}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Back to Configuration</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateRuleOpen(false)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
              )}
            </div>

            <div>
              {editingRule ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveRuleMutation.mutate(ruleForm)}
                  disabled={saveRuleMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold"
                >
                  {saveRuleMutation.isPending ? "Updating Rule..." : "Update Recurring Rule"}
                </Button>
              ) : ruleModalStep === 1 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (validateStep1()) {
                      const occs = calculatePreviewOccurrences();
                      setPreviewOccurrences(occs);
                      setRuleModalStep(2);
                    }
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-xs"
                >
                  <span>
                    Next: Preview & Review Schedule ({calculatePreviewOccurrences().length} Sessions)
                  </span>
                  <ChevronRight className="size-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveRuleMutation.mutate(ruleForm)}
                  disabled={saveRuleMutation.isPending || previewOccurrences.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 shadow-md shadow-emerald-600/20"
                >
                  <CheckCircle2 className="size-4" />
                  <span>
                    {saveRuleMutation.isPending
                      ? "Generating Schedule..."
                      : `Confirm & Generate All Classes (${previewOccurrences.length} Sessions)`}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* NATIVE SUCCESS CONFIRMATION MODAL */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-md p-6 border border-border shadow-2xl rounded-2xl bg-card space-y-4">
          <div className="text-center space-y-2">
            <div className="size-14 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="size-7" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Schedule Generated Successfully!
            </DialogTitle>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your multi-branch recurring schedule rules have been saved and all calendar sessions were created.
            </p>
          </div>

          {/* Breakdown Stats */}
          <div className="p-4 bg-muted/30 rounded-xl border border-border grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Total Classes
              </span>
              <strong className="text-base font-black text-primary">
                {successDetails.sessionsCount} Sessions
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Database Rules
              </span>
              <strong className="text-base font-black text-foreground">
                {successDetails.rulesCount} Rules Saved
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Studios Targeted
              </span>
              <strong className="font-semibold text-foreground">
                {successDetails.branchesCount} Branches
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Trainers Assigned
              </span>
              <strong className="font-semibold text-emerald-600">
                {successDetails.trainersCount} Assigned
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSuccessModalOpen(false)}
              className="flex-1 text-xs font-semibold"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setIsSuccessModalOpen(false);
                setActiveTab("sessions");
              }}
              className="flex-1 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <span>View in Class Sessions Tab</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* GENERATE OCCURRENCES MODAL */}
      <Dialog open={isGenerateOccurrencesOpen} onOpenChange={setIsGenerateOccurrencesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Class Occurrences</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <p className="text-xs text-muted-foreground">
              Rule:{" "}
              <strong className="text-foreground">
                {selectedRuleForGen?.class_name || selectedRuleForGen?.template_name}
              </strong>{" "}
              at <strong className="text-foreground">{selectedRuleForGen?.branch_name}</strong>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">From Date</Label>
                <Input
                  type="date"
                  value={genFromDate}
                  onChange={(e) => setGenFromDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block">To Date</Label>
                <Input
                  type="date"
                  value={genToDate}
                  onChange={(e) => setGenToDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsGenerateOccurrencesOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => generateOccurrencesMutation.mutate()}
              disabled={!genFromDate || !genToDate || generateOccurrencesMutation.isPending}
            >
              {generateOccurrencesMutation.isPending ? "Generating..." : "Generate Sessions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: RECURRING RULE AUDIT LOG */}
      {auditRule && (
        <Dialog open={Boolean(auditRule)} onOpenChange={(open) => !open && setAuditRule(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                <span>
                  Audit Trail — {auditRule.class_name || auditRule.template_name || "Schedule Rule"}
                </span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chronological record of who modified this schedule rule and when.
              </p>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              {isRuleAuditLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-muted/40 rounded-xl border border-border/50 animate-pulse"
                    />
                  ))}
                </div>
              ) : ruleAuditEvents.length === 0 ? (
                <div className="p-8 text-center bg-card border border-dashed border-border/80 rounded-xl">
                  <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No audit events recorded yet for this schedule rule.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ruleAuditEvents.map((evt: any) => {
                    const actionRaw = evt.action || evt.action_code || evt.event_type || "";
                    const actionTitle =
                      actionRaw
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (c: string) => c.toUpperCase()) ||
                      "Schedule Rule Updated";
                    const isCreate = actionRaw.toUpperCase().includes("CREATE");
                    const actorDisplay =
                      evt.actor_email || evt.actor_name || evt.actor || "Administrator";
                    const data = evt.after_data || evt.metadata || {};

                    const formatDays = (days: any): string => {
                      if (!days) return "";
                      if (Array.isArray(days)) {
                        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                        return days
                          .map((d) => (typeof d === "number" ? dayNames[d - 1] || d : d))
                          .join(", ");
                      }
                      return String(days);
                    };

                    return (
                      <div
                        key={evt.id}
                        className="p-3.5 bg-card border border-border/70 rounded-xl space-y-2 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`size-2 rounded-full shrink-0 ${isCreate ? "bg-emerald-500" : "bg-primary"}`}
                            />
                            <span className="font-semibold text-foreground text-xs sm:text-sm">
                              {actionTitle}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {new Date(
                              evt.created_at || evt.occurred_at || evt.timestamp,
                            ).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-muted-foreground text-[11px] flex-wrap gap-1">
                          <span>
                            Modified by:{" "}
                            <strong className="text-foreground font-medium">{actorDisplay}</strong>
                          </span>
                          {evt.ip_address && (
                            <span className="text-muted-foreground/60">IP: {evt.ip_address}</span>
                          )}
                        </div>

                        {evt.event_description && (
                          <div className="p-2.5 bg-muted/40 rounded-lg text-xs text-foreground/90 leading-relaxed border border-border/40">
                            {evt.event_description}
                          </div>
                        )}

                        {/* Client-friendly attribute summary badges with ZERO raw code/JSON */}
                        {data && typeof data === "object" && Object.keys(data).length > 0 && (
                          <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
                            {data.status && (
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                                  data.status === "ACTIVE"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-muted text-muted-foreground border-border"
                                }`}
                              >
                                Status: {data.status}
                              </span>
                            )}
                            {data.days && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                                Active Days: {formatDays(data.days)}
                              </span>
                            )}
                            {(data.time_window || (data.start_time && data.end_time)) && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-foreground border border-border/60 font-mono">
                                Time Window:{" "}
                                {data.time_window || `${data.start_time} – ${data.end_time}`}
                              </span>
                            )}
                            {data.capacity_override && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-foreground border border-border/60">
                                Capacity: {data.capacity_override}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setAuditRule(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* SCHEDULE ONE-OFF OCCURRENCE MODAL */}
      <Dialog open={isCreateOccurrenceOpen} onOpenChange={setIsCreateOccurrenceOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-xl md:max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Calendar className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Schedule One-Off Class Session
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure session schedule, operating window, and capacity
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1 min-h-0">
            {occurrenceError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{occurrenceError}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="mb-1.5 block font-medium">Class Template *</Label>
                <select
                  value={occurrenceForm.class_template}
                  onChange={(e) => {
                    const val = e.target.value;
                    const tpl = templates.find((t) => t.id === val);
                    setOccurrenceForm((prev) => {
                      const next = {
                        ...prev,
                        class_template: val,
                        delivery_mode:
                          tpl?.default_delivery_mode || prev.delivery_mode || "OFFLINE",
                      };
                      if (next.start_time && tpl?.default_duration_minutes) {
                        const parts = next.start_time.split(":");
                        const h = parseInt(parts[0] || "0", 10);
                        const m = parseInt(parts[1] || "0", 10);
                        const endM = h * 60 + m + tpl.default_duration_minutes;
                        const eh = Math.floor(endM / 60) % 24;
                        const em = endM % 60;
                        next.end_time = `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`;
                      }
                      if (next.branch && tpl) {
                        const bAvail = tpl.branch_availabilities?.find(
                          (a: any) => a.branch === next.branch,
                        );
                        if (bAvail?.capacity_override != null) {
                          next.capacity = String(bAvail.capacity_override);
                        } else if (tpl.default_capacity != null) {
                          next.capacity = String(tpl.default_capacity);
                        }
                        if (bAvail?.trial_capacity_override != null) {
                          next.trial_capacity = String(bAvail.trial_capacity_override);
                        } else if (tpl.default_trial_capacity != null) {
                          next.trial_capacity = String(tpl.default_trial_capacity);
                        }
                        if (bAvail?.waitlist_capacity_override != null) {
                          next.waitlist_capacity = String(bAvail.waitlist_capacity_override);
                        } else if (tpl.default_waitlist_capacity != null) {
                          next.waitlist_capacity = String(tpl.default_waitlist_capacity);
                        }
                      }
                      return next;
                    });
                  }}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Template</option>
                  {templates
                    .filter(
                      (t) =>
                        (t.status || "").toUpperCase() === "ACTIVE" ||
                        (!t.status && (t as any).is_active !== false),
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block font-medium">Branch *</Label>
                <select
                  value={occurrenceForm.branch}
                  onChange={(e) => {
                    const branchId = e.target.value;
                    setOccurrenceForm((prev) => {
                      const next = { ...prev, branch: branchId };
                      if (next.class_template) {
                        const tpl = templates.find((t) => t.id === next.class_template);
                        if (tpl) {
                          const bAvail = tpl.branch_availabilities?.find(
                            (a: any) => a.branch === branchId,
                          );
                          if (bAvail?.capacity_override != null) {
                            next.capacity = String(bAvail.capacity_override);
                          } else if (tpl.default_capacity != null) {
                            next.capacity = String(tpl.default_capacity);
                          }
                          if (bAvail?.trial_capacity_override != null) {
                            next.trial_capacity = String(bAvail.trial_capacity_override);
                          } else if (tpl.default_trial_capacity != null) {
                            next.trial_capacity = String(tpl.default_trial_capacity);
                          }
                          if (bAvail?.waitlist_capacity_override != null) {
                            next.waitlist_capacity = String(bAvail.waitlist_capacity_override);
                          } else if (tpl.default_waitlist_capacity != null) {
                            next.waitlist_capacity = String(tpl.default_waitlist_capacity);
                          }
                        }
                      }
                      return next;
                    });
                  }}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const selectedTpl = templates.find((t) => t.id === occurrenceForm.class_template);
              const branchAvail = selectedTpl?.branch_availabilities?.find(
                (a: any) => a.branch === occurrenceForm.branch,
              );
              const effectiveCap =
                branchAvail?.capacity_override != null
                  ? branchAvail.capacity_override
                  : selectedTpl?.default_capacity;
              return selectedTpl ? (
                <div className="p-2.5 bg-primary/5 rounded-xl border border-primary/20 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-primary" />
                    <span className="font-semibold text-foreground">
                      Duration:{" "}
                      <span className="text-primary">
                        {selectedTpl.default_duration_minutes} mins
                      </span>
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      (Auto-fetched from {selectedTpl.name})
                    </span>
                  </div>
                  {occurrenceForm.branch && effectiveCap != null && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Building2 className="size-3 text-primary" />
                      <span className="text-muted-foreground">Studio Capacity:</span>
                      <strong className="text-primary font-semibold">{effectiveCap} beds</strong>
                      {branchAvail?.capacity_override != null ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">
                          Branch Override
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                          Template Default
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : null;
            })()}

            <div>
              <Label className="mb-1.5 block font-medium">Session Date *</Label>
              <Input
                type="date"
                value={occurrenceForm.occurrence_date}
                onChange={(e) =>
                  setOccurrenceForm({ ...occurrenceForm, occurrence_date: e.target.value })
                }
                className="bg-background text-xs"
              />
              {/* Dynamic Status / Operating Window / Holiday Feedback */}
              {occurrenceForm.branch && occurrenceForm.occurrence_date && (
                <div
                  className={`mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                    !occurrenceSchedule.isOpen
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 font-medium"
                      : occurrenceSchedule.isException
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium"
                        : "bg-primary/5 border-primary/20 text-primary font-medium"
                  }`}
                >
                  {!occurrenceSchedule.isOpen ? (
                    <AlertTriangle className="size-4 shrink-0" />
                  ) : occurrenceSchedule.isException ? (
                    <Info className="size-4 shrink-0" />
                  ) : (
                    <Clock className="size-4 shrink-0" />
                  )}
                  <span>{occurrenceSchedule.statusText}</span>
                </div>
              )}
            </div>

            {/* TIME SELECTORS CONNECTED TO DYNAMIC BRANCH OPERATING WINDOW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="mb-1.5 block font-medium">Start Time (Branch Local) *</Label>
                <BranchScheduleTimePicker
                  value={occurrenceForm.start_time}
                  onChange={(val) => {
                    const selTpl = templates.find((t) => t.id === occurrenceForm.class_template);
                    const dur = selTpl?.default_duration_minutes || 60;
                    const parts = val.split(":");
                    const h = parseInt(parts[0] || "0", 10);
                    const m = parseInt(parts[1] || "0", 10);
                    const endM = h * 60 + m + dur;
                    const eh = Math.floor(endM / 60) % 24;
                    const em = endM % 60;
                    const autoEnd = `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`;

                    setOccurrenceForm((prev) => ({
                      ...prev,
                      start_time: val,
                      end_time: autoEnd,
                    }));
                  }}
                  minTime={occurrenceSchedule.minTime}
                  maxTime={occurrenceSchedule.maxTime}
                  operatingWindowText={occurrenceSchedule.statusText}
                  label="Session Start Time"
                  disabled={!occurrenceForm.branch || !occurrenceSchedule.isOpen}
                />
              </div>
              <div>
                <Label className="mb-1.5 block font-medium">End Time (Branch Local) *</Label>
                <BranchScheduleTimePicker
                  value={occurrenceForm.end_time}
                  onChange={(val) => setOccurrenceForm({ ...occurrenceForm, end_time: val })}
                  minTime={occurrenceForm.start_time || occurrenceSchedule.minTime}
                  maxTime={occurrenceSchedule.maxTime}
                  operatingWindowText={occurrenceSchedule.statusText}
                  label="Session End Time"
                  isEndTime={true}
                  startTime={occurrenceForm.start_time}
                  disabled={!occurrenceForm.branch || !occurrenceSchedule.isOpen}
                />
              </div>
            </div>

            {/* TIME LOGIC VALIDATION FEEDBACK */}
            {occurrenceForm.start_time &&
              occurrenceForm.end_time &&
              occurrenceForm.end_time <= occurrenceForm.start_time && (
                <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                  <AlertCircle className="size-3" />
                  End Time ({formatTime12h(occurrenceForm.end_time)}) must be strictly later than
                  Start Time ({formatTime12h(occurrenceForm.start_time)}).
                </p>
              )}

            {(() => {
              const selectedTpl = templates.find((t) => t.id === occurrenceForm.class_template);
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="mb-1.5 block font-medium">Capacity</Label>
                      <Input
                        type="number"
                        value={occurrenceForm.capacity}
                        onChange={(e) =>
                          setOccurrenceForm({ ...occurrenceForm, capacity: e.target.value })
                        }
                        placeholder={
                          selectedTpl ? `Default (${selectedTpl.default_capacity})` : "Default"
                        }
                        className="bg-background text-xs"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block font-medium">Trial Cap</Label>
                      <Input
                        type="number"
                        value={occurrenceForm.trial_capacity}
                        onChange={(e) =>
                          setOccurrenceForm({ ...occurrenceForm, trial_capacity: e.target.value })
                        }
                        placeholder={
                          selectedTpl ? `Default (${selectedTpl.default_trial_capacity})` : "0"
                        }
                        className="bg-background text-xs"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block font-medium">Waitlist Cap</Label>
                      <Input
                        type="number"
                        value={occurrenceForm.waitlist_capacity}
                        onChange={(e) =>
                          setOccurrenceForm({
                            ...occurrenceForm,
                            waitlist_capacity: e.target.value,
                          })
                        }
                        placeholder={
                          selectedTpl
                            ? `Default (${selectedTpl.default_waitlist_capacity})`
                            : "Default"
                        }
                        className="bg-background text-xs"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block font-medium">Delivery Mode</Label>
                      <select
                        value={occurrenceForm.delivery_mode || "OFFLINE"}
                        onChange={(e) =>
                          setOccurrenceForm({
                            ...occurrenceForm,
                            delivery_mode: e.target.value as any,
                          })
                        }
                        className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9"
                      >
                        {(metadata?.delivery_modes || []).map(
                          (m: ClassesMetadataOption<DeliveryMode>) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Label className="mb-1.5 block font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Film className="size-3.5 text-primary" />
                        <span>Class Workout Video</span>
                      </span>
                      <span className="text-2xs text-muted-foreground font-normal">
                        Auto-syncs by class date or select a specific flow
                      </span>
                    </Label>
                    <select
                      value={occurrenceForm.video_id || "AUTO"}
                      onChange={(e) =>
                        setOccurrenceForm({ ...occurrenceForm, video_id: e.target.value })
                      }
                      className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9"
                    >
                      <option value="AUTO">
                        ✨ Auto-Sync from Daily WOD Library (Recommended)
                      </option>
                      <option value="NONE">No Workout Video</option>
                      {(availableVideosForCreate?.results || []).map((vid: any) => (
                        <option key={vid.id} value={vid.id}>
                          {vid.title} {vid.category_code ? `(${vid.category_code})` : ""} -{" "}
                          {vid.date || "WOD"}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              );
            })()}
          </div>

          <DialogFooter className="px-6 py-3.5 border-t border-border/60 bg-muted/20 shrink-0 gap-2 sm:gap-3 flex items-center justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOccurrenceOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createOccurrenceMutation.mutate(occurrenceForm)}
              disabled={
                !occurrenceForm.class_template ||
                !occurrenceForm.branch ||
                !occurrenceForm.occurrence_date ||
                !occurrenceForm.start_time ||
                !occurrenceForm.end_time ||
                !occurrenceSchedule.isOpen ||
                occurrenceForm.end_time <= occurrenceForm.start_time ||
                createOccurrenceMutation.isPending
              }
              className="px-4 font-semibold"
            >
              {createOccurrenceMutation.isPending ? "Verifying..." : "Schedule Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ASSIGN TRAINER MODAL */}
      <AssignTrainerModal
        occurrence={selectedOccurrence}
        isOpen={isAssignTrainerOpen && !!selectedOccurrence}
        onClose={() => {
          setIsAssignTrainerOpen(false);
          setSelectedOccurrence(null);
        }}
        onSuccess={() => {
          refetchOccurrences();
        }}
      />

      {/* BRANCH AVAILABILITY MODAL */}
      <Dialog
        open={isBranchAvailOpen && !!selectedTemplateForAvail}
        onOpenChange={setIsBranchAvailOpen}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Branch Availability: {selectedTemplateForAvail?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2.5">Branch</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Cap Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {branchAvailabilities.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-muted-foreground">
                        Available at all branches (no specific branch restrictions defined)
                      </td>
                    </tr>
                  ) : (
                    branchAvailabilities.map((ba) => (
                      <tr key={ba.id}>
                        <td className="p-2.5 font-medium">{ba.branch_name || ba.branch}</td>
                        <td className="p-2.5">{ba.status}</td>
                        <td className="p-2.5">{ba.capacity_override || "Default"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {canEdit && (
              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
                <h5 className="font-semibold text-foreground text-xs">
                  Add / Override Branch Availability
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="mb-1 block">Branch</Label>
                    <select
                      value={branchAvailForm.branch}
                      onChange={(e) =>
                        setBranchAvailForm({ ...branchAvailForm, branch: e.target.value })
                      }
                      className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select Branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Status</Label>
                    <select
                      value={branchAvailForm.status}
                      onChange={(e) =>
                        setBranchAvailForm({ ...branchAvailForm, status: e.target.value as any })
                      }
                      className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {(metadata?.branch_avail_statuses || []).map(
                        (s: ClassesMetadataOption<string>) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => createBranchAvailMutation.mutate(branchAvailForm)}
                  disabled={!branchAvailForm.branch || createBranchAvailMutation.isPending}
                  className="w-full text-xs"
                >
                  Save Availability
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBranchAvailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLASS PRICING MODAL */}
      <Dialog open={isPricingOpen && !!selectedTemplateForPricing} onOpenChange={setIsPricingOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Class Pricing: {selectedTemplateForPricing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2.5">Branch</th>
                    <th className="p-2.5">Price</th>
                    <th className="p-2.5">Effective</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {classPrices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No standalone pricing configured (Access covered via Packages)
                      </td>
                    </tr>
                  ) : (
                    classPrices.map((cp) => (
                      <tr key={cp.id}>
                        <td className="p-2.5">{cp.branch_name || "All Branches"}</td>
                        <td className="p-2.5 font-semibold">
                          {cp.currency} {cp.price} (+
                          {Math.round(parseFloat(String(cp.tax_percent || 0)))}%)
                        </td>
                        <td className="p-2.5">{cp.effective_from}</td>
                        <td className="p-2.5">{cp.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {canEdit && (
              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
                <h5 className="font-semibold text-foreground text-xs">
                  Add Standalone / Pay-Per-Use Price
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="mb-1 block">Branch (Optional)</Label>
                    <select
                      value={pricingForm.branch}
                      onChange={(e) => setPricingForm({ ...pricingForm, branch: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Price</Label>
                    <Input
                      type="number"
                      value={pricingForm.price}
                      onChange={(e) => setPricingForm({ ...pricingForm, price: e.target.value })}
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => createPricingMutation.mutate(pricingForm)}
                  disabled={!pricingForm.price || createPricingMutation.isPending}
                  className="w-full text-xs"
                >
                  Save Price
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPricingOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE CONTENT ITEM MODAL */}
      <Dialog open={isCreateContentOpen} onOpenChange={setIsCreateContentOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register Content Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div>
              <Label className="mb-1 block">Title *</Label>
              <Input
                type="text"
                value={contentForm.title}
                onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
                placeholder="e.g. Mobility Warm-up Series 1"
              />
            </div>
            <div>
              <Label className="mb-1 block">Content Type</Label>
              <select
                value={contentForm.content_type}
                onChange={(e) =>
                  setContentForm({ ...contentForm, content_type: e.target.value as any })
                }
                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {(metadata?.content_types || []).map((c: ClassesMetadataOption<string>) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block">External URL / Stream Link</Label>
              <Input
                type="text"
                value={contentForm.external_url}
                onChange={(e) => setContentForm({ ...contentForm, external_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label className="mb-1 block">Description</Label>
              <textarea
                value={contentForm.description}
                onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })}
                placeholder="Workout details..."
                className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[50px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block">Display Order</Label>
                <Input
                  type="number"
                  value={contentForm.display_order}
                  onChange={(e) =>
                    setContentForm({ ...contentForm, display_order: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div>
                <Label className="mb-1 block">Status</Label>
                <select
                  value={contentForm.status}
                  onChange={(e) =>
                    setContentForm({ ...contentForm, status: e.target.value as any })
                  }
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {(metadata?.statuses || [])
                    .filter(
                      (s: ClassesMetadataOption<string>) =>
                        s.value === "ACTIVE" || s.value === "INACTIVE",
                    )
                    .map((s: ClassesMetadataOption<string>) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateContentOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveContentMutation.mutate(contentForm)}
              disabled={!contentForm.title || saveContentMutation.isPending}
            >
              {saveContentMutation.isPending ? "Saving..." : "Register Content"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MAP CONTENT ITEM MODAL */}
      <Dialog open={isCreateMappingOpen} onOpenChange={setIsCreateMappingOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map Content Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div>
              <Label className="mb-1 block">Content Item *</Label>
              <select
                value={mappingForm.content_item}
                onChange={(e) => setMappingForm({ ...mappingForm, content_item: e.target.value })}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select Content Item</option>
                {contentItems.map((ci) => (
                  <option key={ci.id} value={ci.id}>
                    {ci.title} (#{ci.display_order})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block">Class Template (Optional)</Label>
              <select
                value={mappingForm.class_template}
                onChange={(e) => setMappingForm({ ...mappingForm, class_template: e.target.value })}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Any / None</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.status === "INACTIVE" ? " (Inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block">Class Category (Optional)</Label>
              <select
                value={mappingForm.class_category}
                onChange={(e) => setMappingForm({ ...mappingForm, class_category: e.target.value })}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Any / None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block">Delivery Mode (Optional)</Label>
              <select
                value={mappingForm.delivery_mode}
                onChange={(e) =>
                  setMappingForm({ ...mappingForm, delivery_mode: e.target.value as any })
                }
                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Modes</option>
                {(metadata?.delivery_modes || []).map((m: ClassesMetadataOption<DeliveryMode>) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateMappingOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMappingMutation.mutate(mappingForm)}
              disabled={!mappingForm.content_item || saveMappingMutation.isPending}
            >
              {saveMappingMutation.isPending ? "Mapping..." : "Save Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Universal Excel Import Wizard Modal */}
      <ExcelImportWizardModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        defaultEntityType="CLASS_SCHEDULE"
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["class-occurrences"] });
          queryClient.invalidateQueries({ queryKey: ["class-schedule-rules"] });
          queryClient.invalidateQueries({ queryKey: ["class-categories"] });
          queryClient.invalidateQueries({ queryKey: ["class-templates"] });
          queryClient.invalidateQueries({ queryKey: ["calendar-occurrences"] });
          toast.success("Classes schedule updated from Excel!");
        }}
      />

      {/* Scan Pass — Check In / Out Modal */}
      {scanOccurrence && (
        <ClassPassScanModal
          open={Boolean(scanOccurrence)}
          onOpenChange={(open) => !open && setScanOccurrence(null)}
          occurrenceId={scanOccurrence.id}
          className={
            scanOccurrence.template_name ||
            scanOccurrence.class_name ||
            "Class"
          }
          classDate={scanOccurrence.occurrence_date}
        />
      )}

      {/* Edit Class Slot Modal */}
      <Dialog
        open={Boolean(editOccurrence)}
        onOpenChange={(open) => !open && setEditOccurrence(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4 text-primary" />
              <span>Edit Class Slot</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Update schedule time, assigned trainer, capacity, and workout video URL for{" "}
              <strong className="text-foreground">
                {editOccurrence?.template_name || editOccurrence?.class_name || "Class"}
              </strong>
              .
            </p>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            {/* Date & Times */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Date</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Start Time</Label>
                <Input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">End Time</Label>
                <Input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
              </div>
            </div>

            {/* Assigned Trainer */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Assigned Trainer</Label>
              <select
                value={editTrainerId}
                onChange={(e) => setEditTrainerId(e.target.value)}
                className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                <option value="">-- No Trainer Assigned --</option>
                {trainers.map((tr: any) => {
                  const trId = tr.id || tr.trainer_profile_id;
                  const trName =
                    tr.trainer_name || tr.full_name || tr.name || tr.employee_name || "Trainer";
                  return (
                    <option key={trId} value={trId}>
                      {trName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Capacity & Status */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Capacity (Max Bookings)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Slot Status</Label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-medium"
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="OPEN">Open for Booking</option>
                  <option value="FULL">Capacity Reached / Full</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Workout Video & Content Studio Integration */}
            <div className="space-y-3 p-3.5 rounded-xl border border-primary/25 bg-primary/5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold flex items-center gap-1.5 text-foreground">
                  <Video className="size-3.5 text-primary" />
                  <span>Workout Video URL</span>
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  YouTube, Vimeo, MP4
                </span>
              </div>
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=... or direct video link"
                value={editVideoUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditVideoUrl(val);

                  // Auto-detect if this video exists in Content Studio (WOD Library)
                  if (val.trim()) {
                    const normYt = (url: string) => {
                      const m = url.match(
                        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
                      );
                      return m ? m[1] : url.trim().toLowerCase();
                    };
                    const searchKey = normYt(val);
                    const matchedVid = (availableVideosForCreate?.results || []).find((v: any) => {
                      if (!v.video_url) return false;
                      return (
                        normYt(v.video_url) === searchKey ||
                        v.video_url.toLowerCase().includes(searchKey)
                      );
                    });

                    if (matchedVid) {
                      if (matchedVid.targeted_muscles && editMuscles.length === 0) {
                        const mList = Array.isArray(matchedVid.targeted_muscles)
                          ? matchedVid.targeted_muscles
                          : typeof matchedVid.targeted_muscles === "string"
                            ? matchedVid.targeted_muscles
                                .split(/[,|&/]/)
                                .map((s: string) => s.trim())
                                .filter(Boolean)
                            : [];
                        setEditMuscles(mList);
                      }
                      if (matchedVid.equipment_required && editEquipment.length === 0) {
                        const eList = Array.isArray(matchedVid.equipment_required)
                          ? matchedVid.equipment_required
                          : typeof matchedVid.equipment_required === "string"
                            ? matchedVid.equipment_required
                                .split(/[,+/&|]/)
                                .map((s: string) => s.trim())
                                .filter(Boolean)
                            : [];
                        setEditEquipment(eList);
                      }
                    }
                  }
                }}
                className="h-8 text-xs bg-background"
              />

              {/* Match detection banner */}
              {(() => {
                if (!editVideoUrl.trim()) return null;
                const normYt = (url: string) => {
                  const m = url.match(
                    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
                  );
                  return m ? m[1] : url.trim().toLowerCase();
                };
                const searchKey = normYt(editVideoUrl);
                const matchedVid = (availableVideosForCreate?.results || []).find((v: any) => {
                  if (!v.video_url) return false;
                  return (
                    normYt(v.video_url) === searchKey ||
                    v.video_url.toLowerCase().includes(searchKey)
                  );
                });

                if (matchedVid) {
                  return (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Matched in Content Studio: {matchedVid.title}</span>
                      </div>
                      <div className="text-[10px] opacity-90 flex flex-wrap gap-x-3 gap-y-1">
                        <span>
                          <strong>Muscles:</strong> {matchedVid.targeted_muscles || "None"}
                        </span>
                        <span>
                          <strong>Equipment:</strong>{" "}
                          {matchedVid.equipment_required || "None (Bodyweight)"}
                        </span>
                      </div>
                    </div>
                  );
                }
                return (
                  <p className="text-[10px] text-muted-foreground">
                    Video not yet in Content Studio. It will be <strong>auto-registered</strong>{" "}
                    with the muscle and equipment tags specified below.
                  </p>
                );
              })()}

              {/* Multi-Tag Autocomplete Inputs with WOD Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <TagAutocompleteInput
                  label="Targeted Muscles / Working"
                  placeholder="e.g. Core, Glutes, Abs"
                  selectedTags={editMuscles}
                  onChange={setEditMuscles}
                  suggestions={availableTagsData?.muscles || []}
                  badgeColorClass="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"
                />
                <TagAutocompleteInput
                  label="Equipment Needed (or blank for Bodyweight)"
                  placeholder="e.g. Reformer, Box, Dumbbells"
                  selectedTags={editEquipment}
                  onChange={setEditEquipment}
                  suggestions={availableTagsData?.equipment || []}
                  badgeColorClass="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setEditOccurrence(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSavingEdit}
              onClick={handleSaveSlotEdit}
              className="gap-1.5 text-xs font-semibold"
            >
              {isSavingEdit ? (
                <RefreshCw className="size-3 animate-spin" />
              ) : (
                <Save className="size-3" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance & Bookings Modal */}
      <ClassAttendanceModal
        occurrence={attendanceModalOccurrence}
        isOpen={!!attendanceModalOccurrence}
        onClose={() => {
          setAttendanceModalOccurrence(null);
          refetchOccurrences();
        }}
      />

      {/* Class Cancellation & Deactivation Modal */}
      <CancelClassModal
        occurrence={cancellingOccurrence}
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancellingOccurrence(null);
        }}
        onSuccess={() => {
          refetchOccurrences();
        }}
      />

      {/* Assign Workout Video Modal */}
      <AssignWorkoutVideoModal
        occurrence={selectedVideoOccurrence}
        isOpen={isAssignVideoOpen}
        onClose={() => {
          setIsAssignVideoOpen(false);
          setSelectedVideoOccurrence(null);
        }}
      />
    </div>
  );
};
export default ClassesWorkspace;
