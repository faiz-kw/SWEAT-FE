import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Film,
  Video,
  Search,
  Check,
  X,
  Play,
  Trash2,
  Sparkles,
  Calendar,
  Layers,
  Dumbbell,
  Target,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { classesApi } from '@/api/endpoints/classesApi';
import { ClassOccurrence } from '../../types/classes';
import { SecureWorkoutPlayer } from './SecureWorkoutPlayer';
import { formatOccurrenceDate, formatTime12h } from '@/utils/dateTimeUtils';

interface AssignWorkoutVideoModalProps {
  occurrence: ClassOccurrence | null;
  isOpen: boolean;
  onClose: () => void;
  onAssigned?: () => void;
}

export const AssignWorkoutVideoModal: React.FC<AssignWorkoutVideoModalProps> = ({
  occurrence,
  isOpen,
  onClose,
  onAssigned,
}) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [previewingVideoId, setPreviewingVideoId] = useState<string | null>(null);

  // 1. Fetch currently assigned video for this occurrence
  const { data: currentVideoData, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ['class-occurrence-video-stream', occurrence?.id],
    queryFn: () => (occurrence?.id ? classesApi.getTrainerClassVideo(occurrence.id) : null),
    enabled: isOpen && !!occurrence?.id,
  });

  // 2. Fetch live active class categories from tenant backend
  const { data: tenantCategories = [] } = useQuery({
    queryKey: ['tenant-class-categories-active'],
    queryFn: () => classesApi.getCategories({ status: 'ACTIVE' }),
    enabled: isOpen,
    staleTime: 1000 * 60 * 15,
  });

  // 3. Fetch available videos from library
  const { data: availableVideosResponse, isLoading: isLoadingVideos } = useQuery({
    queryKey: ['available-workout-videos', selectedCategory, searchQuery],
    queryFn: () =>
      classesApi.getAvailableWorkoutVideos({
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
        limit: 150,
      }),
    enabled: isOpen,
  });

  const availableVideos = availableVideosResponse?.results || [];

  // 3. Mutation to assign or unassign video
  const assignMutation = useMutation({
    mutationFn: async (videoId: string | null) => {
      if (!occurrence?.id) throw new Error('No class occurrence selected');
      return classesApi.assignOccurrenceVideo(occurrence.id, videoId);
    },
    onSuccess: (data, videoId) => {
      if (!videoId) {
        queryClient.setQueryData(['class-occurrence-video-stream', occurrence?.id], null);
      }
      queryClient.invalidateQueries({ queryKey: ['class-occurrence-video-stream', occurrence?.id] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrence-detail', occurrence?.id] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrences-today'] });
      queryClient.invalidateQueries({ queryKey: ['class-occurrences-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['classes-calendar'] });
      if (videoId) {
        toast.success(data?.message || 'Workout video successfully assigned to class session!');
      } else {
        toast.success('Workout video removed from class session.');
      }
      onAssigned?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to update video assignment');
    },
  });

  const handleSelectVideo = (video: any) => {
    assignMutation.mutate(video.id);
  };

  const handleRemoveVideo = () => {
    assignMutation.mutate(null);
  };

  if (!occurrence) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <span>Assign Class Workout Video</span>
                <Badge variant="outline" className="text-2xs font-semibold bg-primary/5 text-primary border-primary/20">
                  WOD Content Library
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {occurrence.template_name || occurrence.class_name || 'Class Session'} &bull;{' '}
                {occurrence.occurrence_date ? formatOccurrenceDate(occurrence.occurrence_date) : ''} (
                {occurrence.start_at ? formatTime12h(occurrence.start_at.substring(11, 16)) : ''}) &bull;{' '}
                {occurrence.branch_name || 'Studio'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Current Video Section */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-primary" /> Current Video Status
              </span>
              {currentVideoData?.video_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveVideo}
                  disabled={assignMutation.isPending}
                  className="h-6 text-2xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2 gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Remove Video
                </Button>
              )}
            </div>

            {currentVideoData?.video_url ? (
              <div className="bg-card p-3 rounded-lg border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground truncate">
                      {currentVideoData.movement_title || currentVideoData.class_name}
                    </span>
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold">
                      Assigned
                    </Badge>
                  </div>
                  {currentVideoData.targeted_muscles && currentVideoData.targeted_muscles.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                      <span className="font-medium text-foreground">Muscles:</span>
                      {currentVideoData.targeted_muscles.map((m: string, idx: number) => (
                        <span key={idx} className="bg-muted px-1.5 py-0.5 rounded text-2xs">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                  {currentVideoData.equipment_required && currentVideoData.equipment_required.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                      <span className="font-medium text-foreground">Equipment:</span>
                      {currentVideoData.equipment_required.map((e: string, idx: number) => (
                        <span key={idx} className="bg-primary/5 text-primary px-1.5 py-0.5 rounded text-2xs">
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {currentVideoData.embed_player_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPreviewingVideoId(
                        previewingVideoId === currentVideoData.occurrence_id ? null : currentVideoData.occurrence_id
                      )
                    }
                    className="h-7 text-xs gap-1 shrink-0 font-medium border-primary/30 text-primary"
                  >
                    <Play className="w-3 h-3" />
                    <span>{previewingVideoId === currentVideoData.occurrence_id ? 'Hide Player' : 'Preview Video'}</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="bg-card/50 p-3 rounded-lg border border-dashed border-border text-center py-4">
                <p className="text-xs text-muted-foreground">No video currently attached to this session.</p>
                <p className="text-2xs text-muted-foreground/75 mt-0.5">
                  Select a workout flow below to enable in-studio playback for trainers and members.
                </p>
              </div>
            )}

            {previewingVideoId === currentVideoData?.occurrence_id && currentVideoData?.embed_player_url && (
              <div className="pt-2 animate-in fade-in duration-200">
                <SecureWorkoutPlayer
                  embedUrl={currentVideoData.embed_player_url}
                  title={currentVideoData.movement_title || "Current Workout Video"}
                />
              </div>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search by video title, targeted muscles, equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 bg-background"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-background border border-border rounded-md px-3 py-2 text-foreground font-medium h-9"
            >
              <option value="ALL">All Categories</option>
              {tenantCategories.map((cat) => (
                <option key={cat.id || cat.code} value={cat.code || cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Available Videos List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-2xs text-muted-foreground font-semibold px-1">
              <span>AVAILABLE WORKOUT VIDEOS ({availableVideos.length})</span>
              <span>Click any video to assign</span>
            </div>

            {isLoadingVideos ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                <span className="text-xs">Loading workout videos from library...</span>
              </div>
            ) : availableVideos.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-foreground">No matching workout videos found</p>
                <p className="text-2xs text-muted-foreground mt-0.5">
                  Try clearing your search filters or upload videos via the WOD Content Library.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {availableVideos.map((vid: any) => {
                  const isCurrent = currentVideoData?.video_url === vid.video_url;
                  const isPreviewing = previewingVideoId === vid.id;

                  return (
                    <div
                      key={vid.id}
                      className={`p-3 rounded-lg border transition-all flex flex-col justify-between gap-2.5 ${
                        isCurrent
                          ? 'bg-primary/5 border-primary/40 shadow-xs'
                          : 'bg-card border-border hover:border-primary/30 hover:bg-muted/20'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-xs font-bold text-foreground line-clamp-1" title={vid.title}>
                            {vid.title}
                          </h5>
                          {vid.category_code && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase shrink-0">
                              {vid.category_code}
                            </Badge>
                          )}
                        </div>

                        {/* Targeted Muscles & Equipment */}
                        <div className="space-y-1">
                          {vid.targeted_muscles && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground line-clamp-1">
                              <Target className="w-2.5 h-2.5 text-primary shrink-0" />
                              <span className="truncate">{vid.targeted_muscles}</span>
                            </div>
                          )}
                          {vid.equipment_required && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground line-clamp-1">
                              <Dumbbell className="w-2.5 h-2.5 text-primary shrink-0" />
                              <span className="truncate">{vid.equipment_required}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Video Player Preview if active */}
                      {isPreviewing && vid.embed_url && (
                        <div className="pt-1">
                          <SecureWorkoutPlayer embedUrl={vid.embed_url} title={vid.title} />
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/60">
                        {vid.embed_url ? (
                          <button
                            type="button"
                            onClick={() => setPreviewingVideoId(isPreviewing ? null : vid.id)}
                            className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                          >
                            <Play className="w-2.5 h-2.5" />
                            <span>{isPreviewing ? 'Hide' : 'Preview'}</span>
                          </button>
                        ) : (
                          <span />
                        )}

                        <Button
                          size="sm"
                          variant={isCurrent ? 'secondary' : 'default'}
                          onClick={() => handleSelectVideo(vid)}
                          disabled={assignMutation.isPending || isCurrent}
                          className="h-6 text-2xs gap-1 font-semibold"
                        >
                          {isCurrent ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" /> Active
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3" /> Select Video
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-card flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
