"use client";
import { useEffect, useState } from "react";
import { listTags, createTag, updateTag, deleteTag, getFileWithTags, assignTag, removeTag } from "@/app/(app)/cloud/actions";

interface Tag { id: string; name: string; color: string; }
interface FileData { id: string; name: string; tags: Tag[]; }

const colorClasses: Record<string,string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 border-blue-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 border-green-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 border-red-300",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 border-yellow-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 border-purple-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 border-pink-300",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 border-indigo-300",
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 border-gray-300",
};

export default function TagPanel({ fileId }: { fileId: string | null }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [file, setFile] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>("blue");

  async function loadAll() {
    setError(null);
    try {
      const t = await listTags();
      setTags(t as Tag[]);
      if (fileId) {
        const f = await getFileWithTags(fileId);
        setFile({
          ...f,
          tags: f?.tags ? f.tags.flat() : []
        } as FileData);
      } else {
        setFile(null);
      }
    } catch(e:any){ setError(e.message); }
  }

  useEffect(() => { loadAll(); }, [fileId]);

  const fileTagIds = new Set((file?.tags || []).map(t => t.id));

  return (
    <div className="text-sm space-y-3">
      <h3 className="font-semibold">Tags</h3>
      {error && <p className="text-red-600">{error}</p>}
      <div className="space-y-2">
        <button
          onClick={() => setCreating(c => !c)}
          className="text-xs px-2 py-1 rounded border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
        >{creating ? 'Annuler' : 'Nouveau tag'}</button>
        {creating && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const name = (form.elements.namedItem('name') as HTMLInputElement).value;
              try { await createTag(name, selectedColor); form.reset(); setCreating(false); await loadAll(); } catch(e:any){ setError(e.message); }
            }}
            className="space-y-3"
          >
            <input name="name" placeholder="Nom" className="w-full border px-2 py-1 rounded bg-white dark:bg-neutral-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 border-gray-300 dark:border-neutral-600" />
            <div className="space-y-1">
              <p className="text-xs text-gray-600 dark:text-gray-300">Couleur:</p>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(colorClasses).map(c => (
                  <label key={c} className={`cursor-pointer flex items-center justify-center rounded border px-2 py-1 text-xs font-medium transition focus:outline-none ${colorClasses[c]} ${selectedColor===c? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-neutral-900':''}`}> 
                    <input
                      type="radio"
                      name="color-radio"
                      value={c}
                      className="sr-only"
                      checked={selectedColor===c}
                      onChange={() => setSelectedColor(c)}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="text-xs px-2 py-1 rounded border border-green-600 text-green-600 hover:bg-green-600 hover:text-white">Créer</button>
          </form>
        )}
      </div>
      <div className="space-y-1">
        {tags.length === 0 && <p className="text-gray-500">Aucun tag</p>}
        <ul className="space-y-1">
          {tags.map(t => (
            <li key={t.id} className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs border rounded ${colorClasses[t.color] || ''}`}>{t.name}</span>
              <button
                onClick={async () => {
                  if (!fileId) return;
                  try { await assignTag(fileId, t.id); await loadAll(); } catch(e:any){ setError(e.message); }
                }}
                disabled={!fileId || fileTagIds.has(t.id)}
                className="text-xs text-blue-600 disabled:opacity-40"
              >+fichier</button>
              <button
                onClick={async () => {
                  if (!fileId || !fileTagIds.has(t.id)) return;
                  try { await removeTag(fileId, t.id); await loadAll(); } catch(e:any){ setError(e.message); }
                }}
                disabled={!fileId || !fileTagIds.has(t.id)}
                className="text-xs text-yellow-600 disabled:opacity-40"
              >retirer</button>
              <button
                onClick={async () => {
                  const newName = prompt('Renommer tag', t.name);
                  if (!newName) return;
                  const newColor = prompt('Couleur (blue,green,red,...)', t.color) || t.color;
                  try { await updateTag(t.id, newName, newColor); await loadAll(); } catch(e:any){ setError(e.message); }
                }}
                className="text-xs text-purple-600"
              >edit</button>
              <button
                onClick={async () => { if(!confirm('Supprimer tag ?')) return; try { await deleteTag(t.id); await loadAll(); } catch(e:any){ setError(e.message); } }}
                className="text-xs text-red-600"
              >x</button>
            </li>
          ))}
        </ul>
      </div>
      {file && (
        <div className="space-y-1">
          <h4 className="font-medium">Tags du fichier</h4>
          {file.tags.length === 0 && <p className="text-gray-500">Aucun tag associé</p>}
          <div className="flex flex-wrap gap-1">
            {file.tags.map(t => (
              <span key={t.id} className={`px-2 py-0.5 text-xs border rounded ${colorClasses[t.color] || ''}`}>{t.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
