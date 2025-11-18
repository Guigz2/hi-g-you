"use client";
import { useState, useCallback } from "react";
import { uploadMetadata } from "@/app/(app)/cloud/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { STORAGE_BUCKET } from "@/lib/storage/config";

interface Props { folderId: string | null; onUploaded: () => void; }

export default function UploadDropzone({ folderId, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const supabase = createSupabaseBrowserClient();

  const handleFiles = useCallback(async (files: FileList) => {
    setError(null);
    for (const file of Array.from(files)) {
      try {
        // Insert metadata (gets final renamed name & path)
        const meta = await uploadMetadata(folderId, file.name, file.type, file.size);
        // Upload to storage bucket
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(meta.storagePath, file, { upsert: false });
        if (upErr) throw new Error(upErr.message);
      } catch (e: any) {
        setError(e.message);
      }
    }
    setProgress(null);
    onUploaded();
  }, [folderId, supabase, onUploaded]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragging(false);
        if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
      }}
      className={`border-2 border-dashed rounded p-4 text-sm transition ${dragging ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-neutral-900'}`}
    >
      <p className="mb-2">Glissez vos fichiers ici ou sélectionnez&nbsp;:</p>
      <input
        type="file"
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="text-xs"
      />
      {progress !== null && <p className="mt-2">Upload: {progress}%</p>}
      {error && <p className="mt-2 text-red-600">Erreur: {error}</p>}
    </div>
  );
}
