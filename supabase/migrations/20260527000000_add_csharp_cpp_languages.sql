-- Add C# and C++ language support to Singularity
-- This migration expands language support from 3 to 5 languages:
-- TypeScript, JavaScript, Java, C#, C++

-- Update assets table to allow C# and C++ as source languages
alter table public.assets
  drop constraint if exists assets_source_language_check;

alter table public.assets
  add constraint assets_source_language_check
  check (source_language in ('typescript', 'javascript', 'java', 'csharp', 'cpp'));

-- Update asset_variants table to allow C# and C++ as target languages
alter table public.asset_variants
  drop constraint if exists asset_variants_target_language_check;

alter table public.asset_variants
  add constraint asset_variants_target_language_check
  check (target_language in ('typescript', 'javascript', 'java', 'csharp', 'cpp'));

-- Update procurements table to allow C# and C++ purchases
alter table public.procurements
  drop constraint if exists procurements_target_language_check;

alter table public.procurements
  add constraint procurements_target_language_check
  check (target_language in ('typescript', 'javascript', 'java', 'csharp', 'cpp'));

-- Create indexes for the new languages
create index if not exists idx_assets_csharp on public.assets (source_language) where source_language = 'csharp';
create index if not exists idx_assets_cpp on public.assets (source_language) where source_language = 'cpp';
create index if not exists idx_variants_csharp on public.asset_variants (target_language) where target_language = 'csharp';
create index if not exists idx_variants_cpp on public.asset_variants (target_language) where target_language = 'cpp';

-- Add comment explaining the language matrix
comment on column public.assets.source_language is 'Supported languages: typescript, javascript, java, csharp (Unity/Godot), cpp (Unreal Engine)';
comment on column public.asset_variants.target_language is 'Target languages for translation: typescript, javascript, java, csharp (Unity/Godot), cpp (Unreal Engine)';
