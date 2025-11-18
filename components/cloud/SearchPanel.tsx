"use client";
import { useEffect, useState, useRef } from "react";
import { searchFiles, listTags } from "@/app/(app)/cloud/actions";

interface Tag { id: string; name: string; color: string; }
interface FileResult { id: string; name: string; ext: string; mime: string; size: number; folder_id: string | null; tags: Tag[]; }

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

export default function SearchPanel({ onSelect }: { onSelect: (fileId: string) => void }) {
  const [query, setQuery] = useState("");
  const [mimeFilter, setMimeFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [results, setResults] = useState<FileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => { try { const t = await listTags(); setAllTags(t as Tag[]); } catch(e:any){ setError(e.message);} })();
  }, []);

  async function performSearch() {
    setLoading(true); setError(null);
    try {
      const files = await searchFiles({ q: query, tagIds: selectedTags, mimePrefix: mimeFilter || null, limit: 100 });
      setResults(files as FileResult[]);
    } catch(e:any){ setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { performSearch(); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, mimeFilter, selectedTags]);

  function toggleTag(id: string) {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  return (
    <div className="text-sm space-y-4">
      <h3 className="font-semibold">Recherche</h3>
      <div className="grid gap-2 md:grid-cols-3">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Nom fichier..."
          className="border px-2 py-1 rounded bg-white dark:bg-neutral-800 dark:text-gray-100 border-gray-300 dark:border-neutral-600"
        />
        <input
          value={mimeFilter}
          onChange={e => setMimeFilter(e.target.value)}
          placeholder="MIME prefix ex: image/"
          className="border px-2 py-1 rounded bg-white dark:bg-neutral-800 dark:text-gray-100 border-gray-300 dark:border-neutral-600"
        />
        <div className="flex items-center gap-2 flex-wrap">
          {allTags.map(t => (
            <button
              key={t.id}
              onClick={() => toggleTag(t.id)}
              className={`px-2 py-0.5 text-xs border rounded transition ${colorClasses[t.color] || ''} ${selectedTags.includes(t.id) ? 'ring-2 ring-blue-500' : ''}`}
            >{t.name}</button>
          ))}
        </div>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {loading && <p>Recherche...</p>}
      {!loading && results.length === 0 && query && <p className="text-gray-500">Aucun résultat</p>}
      <ul className="space-y-1">
        {results.map(r => (
          <li key={r.id} className="flex flex-col gap-1 border rounded p-2 bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <button
                onClick={() => onSelect(r.id)}
                className="font-medium truncate text-left hover:underline"
                title={r.name}
              >{r.name}</button>
              <span className="text-xs text-gray-500">{(r.size/1024).toFixed(1)} KB</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {r.tags.map(t => (
                <span key={t.id} className={`px-2 py-0.5 text-xs border rounded ${colorClasses[t.color] || ''}`}>{t.name}</span>
              ))}
            </div>
            {r.mime && <p className="text-[10px] text-gray-500">{r.mime}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
