import { useEffect, useState } from 'react';
import { getNotebookPhotoSignedUrl } from '@/lib/notebookPhoto';

interface NotebookPhotoProps {
  value: string | null | undefined;
  alt?: string;
  className?: string;
  onClick?: () => void;
  fallback?: React.ReactNode;
}

/**
 * Renders a notebook photo by resolving the stored value (path or legacy URL)
 * to a short-lived signed URL from the private bucket.
 */
export default function NotebookPhoto({ value, alt = 'Foto', className, onClick, fallback = null }: NotebookPhotoProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) { setSrc(null); return; }
    getNotebookPhotoSignedUrl(value).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => { cancelled = true; };
  }, [value]);

  if (!src) return <>{fallback}</>;
  return <img src={src} alt={alt} className={className} onClick={onClick} />;
}
