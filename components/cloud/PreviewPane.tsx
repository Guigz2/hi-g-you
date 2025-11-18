"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { STORAGE_BUCKET } from "@/lib/storage/config";
import { getFileMeta } from "@/app/(app)/cloud/actions";

interface FileMeta { id: string; name: string; mime: string; size: number; storage_path: string; }

// Version simplifiée: uniquement PDF via iframe.
export default function PreviewPane({ fileId }: { fileId: string | null }) {
  const [file, setFile] = useState<FileMeta | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    let abort = false;
    (async () => {
      setFile(null); setPdfUrl(null); setError(null);
      if (!fileId) return;
      try {
        const meta = await getFileMeta(fileId) as FileMeta;
        if (abort) return;
        setFile(meta);
        if (meta.mime !== "application/pdf") {
          setError("Preview disponible seulement pour les PDF");
          return;
        }
        const { data, error: signErr } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(meta.storage_path, 600);
        if (signErr || !data?.signedUrl) {
          // Fallback: try public URL (works only if bucket is public)
          const pub = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(meta.storage_path);
          if (pub?.data?.publicUrl) {
            if (!abort) setPdfUrl(pub.data.publicUrl);
          } else {
            setError(signErr?.message || "Impossible d'obtenir une URL pour le PDF");
          }
          return;
        }
        if (!abort) setPdfUrl(data.signedUrl);
      } catch (e: any) {
        if (!abort) setError(e.message);
      }
    })();
    return () => { abort = true; };
  }, [fileId, supabase]);

  return (
    <div className="text-sm h-full border rounded p-3 bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 space-y-3 overflow-auto">
      {!fileId && <p>Sélectionnez un fichier PDF.</p>}
      {file && (
        <div className="space-y-1">
          <p className="font-semibold truncate" title={file.name}>{file.name}</p>
          <p className="text-xs text-gray-500">{(file.size/1024).toFixed(1)} KB</p>
        </div>
      )}
      {error && <p className="text-red-600">{error}</p>}
      {fileId && !file && !error && <p>Chargement...</p>}
      {pdfUrl && file && (
        <div className="w-full h-72 border rounded overflow-hidden">
          <iframe src={pdfUrl} width="100%" height="100%" className="border-0" title={file.name} />
        </div>
      )}
    </div>
  );
}
