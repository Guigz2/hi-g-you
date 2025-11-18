"use client";
import { useEffect, useState } from "react";
import { listTrash, restoreFile, restoreFolder, purgeTrash } from "@/app/(app)/cloud/actions";

interface TrashFolder { id: string; name: string; parent_id: string | null; path: string; }
interface TrashFile { id: string; name: string; folder_id: string | null; ext: string; mime: string; size: number; storage_path: string; }

export default function TrashList() {
  const [folders, setFolders] = useState<TrashFolder[]>([]);
  const [files, setFiles] = useState<TrashFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const { folders, files } = await listTrash();
      setFolders(folders as TrashFolder[]);
      setFiles(files as TrashFile[]);
    } catch(e:any){ setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Corbeille</h3>
        <button
          disabled={purging}
          onClick={async () => { if(!confirm("Purger définitivement ?")) return; setPurging(true); try { await purgeTrash(); await load(); } catch(e:any){ setError(e.message);} finally { setPurging(false);} }}
          className="text-xs px-2 py-1 rounded border border-red-600 text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
        >Purger tout</button>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {loading && <p>Chargement...</p>}
      <div>
        <h4 className="font-medium mb-1">Dossiers</h4>
        {folders.length === 0 && <p className="text-gray-500">Aucun dossier supprimé</p>}
        <ul className="space-y-1">
          {folders.map(f => (
            <li key={f.id} className="flex items-center gap-2 px-2 py-1 rounded border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
              <span className="flex-1 truncate" title={f.path}>{f.name}</span>
              <button
                onClick={async () => { try { await restoreFolder(f.id); setFolders(prev => prev.filter(x => x.id !== f.id)); } catch(e:any){ setError(e.message);} }}
                className="text-xs text-green-600 hover:text-green-800"
              >Restaurer</button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="font-medium mb-1">Fichiers</h4>
        {files.length === 0 && <p className="text-gray-500">Aucun fichier supprimé</p>}
        <ul className="space-y-1">
          {files.map(fl => (
            <li key={fl.id} className="flex items-center gap-2 px-2 py-1 rounded border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
              <span className="flex-1 truncate" title={fl.name}>{fl.name}</span>
              <span className="text-xs text-gray-500">{(fl.size/1024).toFixed(1)} KB</span>
              <button
                onClick={async () => { try { await restoreFile(fl.id); setFiles(prev => prev.filter(x => x.id !== fl.id)); } catch(e:any){ setError(e.message);} }}
                className="text-xs text-green-600 hover:text-green-800"
              >Restaurer</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
