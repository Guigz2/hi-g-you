"use client";
import { useEffect, useState } from "react";
import { listFolder, trashFile, renameFile, moveFile, getDownloadUrl } from "@/app/(app)/cloud/actions";

interface FileMeta { id: string; name: string; ext: string; mime: string; size: number; is_trashed: boolean; }
interface FolderMeta { id: string; name: string; path: string; }

export default function FileList({ folderId, onSelect }: { folderId: string | null; onSelect?: (fileId: string) => void }) {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTrash, setPendingTrash] = useState<string | null>(null);

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
            <button
              onClick={() => onSelect && onSelect(f.id)}
              className="flex-1 text-left truncate hover:underline"
              title={f.name}
            >{f.name}</button>
            <span className="text-xs text-gray-500">{(f.size/1024).toFixed(1)} KB</span>
            <button
              onClick={async () => {
                try {
                  const { url } = await getDownloadUrl(f.id);
                  // Trigger download in a new tab to avoid navigation
                  window.open(url, "_blank");
                } catch (e: any) {
                  setError(e.message);
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-800"
              aria-label="Télécharger"
              title="Télécharger"
            >⬇</button>
            <button
              onClick={async () => {
                const newName = prompt("Nouveau nom fichier", f.name);
                if (!newName) return;
                try { await renameFile(f.id, newName); setFiles(prev => prev.map(x => x.id === f.id ? { ...x, name: newName } : x)); } catch(e:any){ setError(e.message); }
              }}
              className="text-xs text-yellow-600 hover:text-yellow-700"
              aria-label="Renommer fichier"
            >Ren</button>
            <button
              onClick={async () => {
                const targetPath = prompt("Chemin dossier cible (ex: / ou /Docs)", "/");
                if (targetPath === null) return;
                try { await moveFile(f.id, targetPath); setFiles(prev => prev.filter(x => x.id !== f.id)); } catch(e:any){ setError(e.message); }
              }}
              className="text-xs text-purple-600 hover:text-purple-700"
              aria-label="Déplacer fichier"
            >Mov</button>
            <button
              disabled={pendingTrash === f.id}
              onClick={async () => {
                setPendingTrash(f.id);
                try { await trashFile(f.id); setFiles(prev => prev.filter(x => x.id !== f.id)); } catch(e:any){ setError(e.message); }
                finally { setPendingTrash(null); }
              }}
              className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
              aria-label="Mettre à la corbeille"
            >🗑️</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
