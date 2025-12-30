"use client";
import { useEffect, useState } from "react";
import { listFolder } from "../../app/(app)/cloud/actions";

interface Node { id: string; name: string; path: string; parent_id: string | null; }
interface FileMeta { id: string; name: string; ext: string; mime: string; size: number; is_trashed: boolean; }

interface CloudTreeProps {
  onSelect: (folderId: string | null) => void;
  onSelectFile?: (fileId: string) => void;
  expandedIds?: string[];
  onToggleExpand?: (id: string, isOpen: boolean) => void;
  refreshTrigger?: number;
}

interface ExpandedEntry { folders: Node[]; files: FileMeta[]; }

export default function CloudTree({ onSelect, onSelectFile, expandedIds, onToggleExpand, refreshTrigger }: CloudTreeProps) {
  const [rootFolders, setRootFolders] = useState<Node[]>([]);
  const [rootFiles, setRootFiles] = useState<FileMeta[]>([]);
  const [expanded, setExpanded] = useState<Record<string, ExpandedEntry>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyMap, setEmptyMap] = useState<Record<string, boolean>>({});

  async function load(folderId: string | null) {
    setLoading(true); setError(null);
    try {
      const { folders, files } = await listFolder(folderId);
      if (folderId === null) {
        setRootFolders(folders);
        setRootFiles(files);
        // Prefetch emptiness for root folders
        prefetchEmptiness(folders);
      } else {
        setExpanded(prev => ({ ...prev, [folderId]: { folders, files } }));
        // Prefetch emptiness for newly loaded child folders
        prefetchEmptiness(folders);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  // Removed folder action helpers; CloudTree now only lists and expands.

  useEffect(() => { load(null); }, []);

  // When external expandedIds changes, ensure their children are loaded
  useEffect(() => {
    if (!expandedIds) return;
    for (const id of expandedIds) {
      if (id && !expanded[id]) load(id);
    }
  }, [expandedIds]);

  // On refreshTrigger, reload root & reload currently expanded external ids
  useEffect(() => {
    if (refreshTrigger === undefined) return;
    load(null);
    if (expandedIds) {
      for (const id of expandedIds) if (id) load(id);
    }
  }, [refreshTrigger]);

  const toggle = (id: string) => {
    if (!expanded[id]) {
      load(id);
      onToggleExpand && onToggleExpand(id, true);
    } else {
      setExpanded(prev => { const cp = { ...prev }; delete cp[id]; return cp; });
      onToggleExpand && onToggleExpand(id, false);
    }
  };

  async function prefetchEmptiness(folders: Node[]) {
    const targets = folders.filter(f => emptyMap[f.id] === undefined);
    if (targets.length === 0) return;
    // Fetch in sequence to avoid overwhelming; could be parallel with Promise.all
    const updates: Record<string, boolean> = {};
    for (const f of targets) {
      try {
        const { folders: subFolders, files: subFiles } = await listFolder(f.id);
        updates[f.id] = (subFolders.length === 0 && subFiles.length === 0);
      } catch {
        // On error assume not empty to keep '>' icon
        updates[f.id] = false;
      }
    }
    setEmptyMap(prev => ({ ...prev, ...updates }));
  }

  // Creation/rem   oval/rename/move handled outside; keep component minimal.

  const renderLevel = (entries: Node[], parentId: string | null, depth: number) => (
    <ul className="ml-2">
      {entries.map(folder => {
        const exp = expanded[folder.id];
        const isOpen = !!exp;
        return (
          <li key={folder.id} className="mb-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggle(folder.id)}
                className="text-xs px-1 py-0.5 border rounded bg-gray-100 dark:bg-neutral-800"
                aria-label={isOpen ? "Réduire" : "Développer"}
              >{isOpen ? (exp && exp.folders.length === 0 && exp.files.length === 0 ? "." : "v") : (emptyMap[folder.id] ? "." : ">")}</button>
              <button
                onClick={() => onSelect(folder.id)}
                className="text-sm hover:underline"
              >{folder.name}</button>
            </div>
            {isOpen && exp && (
              <div className="ml-4 mt-1">
                {exp.folders.length > 0 && renderLevel(exp.folders, folder.id, depth + 1)}
                {exp.files.length > 0 && (
                  <ul className="mt-1">
                    {exp.files.map(file => (
                      <li key={file.id} className="flex items-center gap-1 text-xs px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-neutral-800">
                        <button
                          onClick={() => onSelectFile && onSelectFile(file.id)}
                          className="truncate text-left flex-1"
                          title={file.name}
                        >{file.name}</button>
                        <span className="text-[10px] text-gray-500">{(file.size/1024).toFixed(1)}KB</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="text-sm">
      <h3 className="font-semibold mb-2">Dossiers</h3>
      {error && <p className="text-red-600">{error}</p>}
      {loading && <p>Chargement...</p>}
      {renderLevel(rootFolders, null, 0)}
      {rootFiles.length > 0 && (
        <div className="mt-2 ml-2">
          <ul>
            {rootFiles.map(f => (
              <li key={f.id} className="flex items-center gap-1 text-xs px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-neutral-800">
                <button
                  onClick={() => onSelectFile && onSelectFile(f.id)}
                  className="truncate text-left flex-1"
                  title={f.name}
                >{f.name}</button>
                <span className="text-[10px] text-gray-500">{(f.size/1024).toFixed(1)}KB</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
