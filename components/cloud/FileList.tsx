"use client";
import { useEffect, useState } from "react";
import { listFolder } from "../../app/(app)/cloud/actions";

interface FileMeta { id: string; name: string; ext: string; mime: string; size: number; is_trashed: boolean; }

export default function FileList({ folderId, selectedFiles = [], onToggleFile }: { folderId: string | null; selectedFiles?: string[]; onToggleFile?: (fileId: string) => void }) {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Removed action buttons and global download listener for simplified view.

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const { files } = await listFolder(folderId);
        setFiles(files as FileMeta[]);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    };
    load();
  }, [folderId]);

  return (
    <div className="text-sm">
      <h3 className="font-semibold mb-2">Fichiers</h3>
      {error && <p className="text-red-600">{error}</p>}
      {loading && <p>Chargement...</p>}
      {files.length === 0 && !loading && <p className="text-gray-500">Aucun fichier</p>}
      <ul className="space-y-1">
        {files.map(f => (
          <li key={f.id} className="flex items-center gap-2 px-2 py-1 rounded border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <input
              type="checkbox"
              checked={selectedFiles.includes(f.id)}
              onChange={() => onToggleFile && onToggleFile(f.id)}
              className="h-3 w-3 accent-blue-600" aria-label="Sélection fichier" />
            <button
              onClick={() => onToggleFile && onToggleFile(f.id)}
              className="flex-1 text-left truncate hover:underline"
              title={f.name}
            >{f.name}</button>
            <span className="text-xs text-gray-500">{(f.size/1024).toFixed(1)} KB</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
