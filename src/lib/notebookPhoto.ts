import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'notebook-photos';

/**
 * Extract the storage path from either a full public URL or a raw path.
 */
export function extractStoragePath(value: string | null | undefined): string | null {
  if (!value) return null;
  const marker = `/${BUCKET}/`;
  const idx = value.indexOf(marker);
  if (idx >= 0) return value.substring(idx + marker.length);
  // Already a path
  return value;
}

/**
 * Resolve a stored notebook photo value (URL or path) into a short-lived signed URL.
 */
export async function getNotebookPhotoSignedUrl(
  value: string | null | undefined,
  expiresIn = 3600
): Promise<string | null> {
  const path = extractStoragePath(value);
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}
