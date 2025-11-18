"use client";
import { useEffect, useState } from "react";
import { listFolder, createFolder, trashFolder, renameFolder, moveFolder } from "@/app/(app)/cloud/actions";

interface Node { id: string; name: string; path: string; parent_id: string | null; }

export default function CloudTree({ onSelect }: { onSelect: (id: string | null) => void }) {
  const [rootFolders, setRootFolders] = useState<Node[]>([]);
  const [expanded, setExpanded] = useState<Record<string, Node[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(folderId: string | null) {
    setLoading(true); setError(null);
    try {
      const { folders } = await listFolder(folderId);
      if (folderId === null) setRootFolders(folders);
      else setExpanded(prev => ({ ...prev, [folderId]: folders }));
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  function findNodeById(id: string): Node | null {
    for (const f of rootFolders) if (f.id === id) return f;
    for (const arr of Object.values(expanded)) for (const f of arr) if (f.id === id) return f;
    return null;
  }

  function findNodeByPath(path: string): Node | null {
    const all: Node[] = [...rootFolders, ...Object.values(expanded).flat()];
    return all.find(n => n.path === path) || null;
  }

  useEffect(() => { load(null); }, []);

  const toggle = (id: string) => {
    if (!expanded[id]) load(id); else setExpanded(prev => { const cp = { ...prev }; delete cp[id]; return cp; });
  };

  const handleCreate = async (parentId: string | null) => {
    const name = prompt("Nom du dossier");
    if (!name) return;
    await createFolder(parentId, name);
    await load(parentId);
  };

  const renderLevel = (items: Node[], parentId: string | null, depth: number) => (
    <ul className="ml-2">
      {items.map(f => {
        const isOpen = !!expanded[f.id];
        return (
          <li key={f.id} className="mb-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggle(f.id)}
                className="text-xs px-1 py-0.5 border rounded bg-gray-100 dark:bg-neutral-800"
                aria-label={isOpen ? "Réduire" : "Développer"}
              >{isOpen ? "-" : "+"}</button>
              <button
                onClick={() => onSelect(f.id)}
                className="text-sm hover:underline"
              >{f.name}</button>
              <button
                onClick={() => handleCreate(f.id)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >+dossier</button>
              <button
                onClick={async () => {
                  const newName = prompt("Nouveau nom dossier", f.name);
                  if (!newName) return;
                  try { await renameFolder(f.id, newName); await load(parentId); } catch(e:any){ alert(e.message); }
                }}
                className="text-xs text-yellow-600 hover:text-yellow-700"
                aria-label="Renommer dossier"
              >Ren</button>
              <button
                onClick={async () => {
                  const targetPath = prompt("Chemin parent cible (ex: / ou /Projects)", "/");
                  if (targetPath === null) return;
                  const oldParentId = f.parent_id;
                  try {
                    await moveFolder(f.id, targetPath);
                    // Reload root always (structure may change)
                    await load(null);
                    // Reload old parent if existed
                    if (oldParentId) await load(oldParentId);
                    // Reload new parent if not root
                    if (targetPath !== "/") {
                      const newParentNode = findNodeByPath(targetPath.trim());
                      if (newParentNode) await load(newParentNode.id);
                    }
                  } catch(e:any){ alert(e.message); }
                }}
                className="text-xs text-purple-600 hover:text-purple-700"
                aria-label="Déplacer dossier"
              >Mov</button>
              <button
                onClick={async () => { await trashFolder(f.id); await load(parentId); }}
                className="text-xs text-red-600 hover:text-red-800"
                aria-label="Mettre le dossier à la corbeille"
              >🗑️</button>
            </div>
            {isOpen && expanded[f.id] && renderLevel(expanded[f.id], f.id, depth + 1)}
          </li>
        );
      })}
      <li>
        <button
          onClick={() => handleCreate(parentId)}
          className="text-xs text-green-600 hover:text-green-800"
        >+ nouveau dossier ici</button>
      </li>
    </ul>
  );

  return (
    <div className="text-sm">
      <h3 className="font-semibold mb-2">Dossiers</h3>
      {error && <p className="text-red-600">{error}</p>}
      {loading && <p>Chargement...</p>}
      {renderLevel(rootFolders, null, 0)}
    </div>
  );
}
