export interface CMSBanner {
  id: string;
  organization?: string;
  branch?: string | null;
  branch_name?: string;
  title: string;
  subtitle?: string;
  placement: 'HOME_HERO' | 'HOME_PROMO' | 'CATEGORY_HEADER' | 'OFFERS_SLIDER';
  placement_display?: string;
  media_type: 'IMAGE' | 'VIDEO';
  media_url: string;
  thumbnail_url?: string;
  link_type: 'NONE' | 'CATEGORY' | 'PACKAGE' | 'BOOKING' | 'EXTERNAL_URL' | 'SCREEN';
  link_target?: string;
  display_order: number;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProgramCategoryMedia {
  id: string;
  organization?: string;
  program_category?: string | null;
  program_category_name?: string;
  class_category?: string | null;
  class_category_name?: string;
  category_name: string;
  category_code?: string;
  tagline?: string;
  icon_url: string;
  banner_url: string;
  content_description?: string;
  video_url?: string;
  showcase_images?: string[];
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CMSMediaAsset {
  id: string;
  organization?: string;
  title: string;
  description?: string;
  media_type: 'IMAGE' | 'AUDIO' | 'VIDEO';
  media_url: string;
  thumbnail_url?: string;
  duration_seconds?: number | null;
  file_size_bytes?: number | null;
  mime_type?: string;
  tags?: string[];
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
  uploaded_by_name?: string;
}
