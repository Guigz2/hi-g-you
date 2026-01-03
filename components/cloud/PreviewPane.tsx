"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { STORAGE_BUCKET } from "@/lib/storage/config";
import { getFileMeta } from "@/app/(app)/cloud/actions";
import { FileText, Image, Film, Music, File, X, Download, ExternalLink, Info, Maximize2 } from "lucide-react";

interface FileMeta { id: string; name: string; mime: string; size: number; storage_path: string; }

interface DriveDetailsProps {
  fileId: string | null;
  onClose?: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
}

export default function DriveDetails({ fileId, onClose, onExpand, isExpanded = false }: DriveDetailsProps) {
  const [file, setFile] = useState<FileMeta | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    let abort = false;
    (async () => {
      setFile(null); 
      setPreviewUrl(null); 
      setError(null);
      if (!fileId) return;
      
      setLoading(true);
      try {
        const meta = await getFileMeta(fileId) as FileMeta;
        if (abort) return;
        setFile(meta);

        const { data, error: signErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(meta.storage_path, 600);
        
        if (signErr || !data?.signedUrl) {
          const pub = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(meta.storage_path);
          if (pub?.data?.publicUrl) {
            if (!abort) setPreviewUrl(pub.data.publicUrl);
          } else {
            setError(signErr?.message || "Impossible d'obtenir une URL");
          }
          return;
        }
        if (!abort) setPreviewUrl(data.signedUrl);
      } catch (e: any) {
        if (!abort) setError(e.message);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [fileId, supabase]);

  const getFileIcon = (mime: string) => {
    if (mime.startsWith("image/")) return <Image className="w-8 h-8 text-blue-500" />;
    if (mime.startsWith("video/")) return <Film className="w-8 h-8 text-purple-500" />;
    if (mime.startsWith("audio/")) return <Music className="w-8 h-8 text-pink-500" />;
    if (mime.includes("pdf")) return <FileText className="w-8 h-8 text-red-500" />;
    return <File className="w-8 h-8 text-gray-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  };

  if (!fileId) {
    return (
      <aside className="w-80 border-l border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
        <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
          <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Sélectionnez un fichier pour voir les détails</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`${
      isExpanded 
        ? "w-full h-full flex flex-col"
        : "w-80 border-l border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Détails</h2>
        <div className="flex items-center gap-2">
          {onExpand && fileId && !isExpanded && (
            <button
              onClick={onExpand}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Agrandir"
              title="Agrandir l'aperçu"
            >
              <Maximize2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Chargement...</p>
        </div>
      ) : error ? (
        <div className="p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : file ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Preview */}
          <div className={`${
            isExpanded 
              ? "h-[calc(100vh-200px)]" 
              : "aspect-square"
          } bg-gray-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center overflow-hidden`}>
            {file.mime.startsWith("image/") && previewUrl ? (
              <img src={previewUrl} alt={file.name} className="w-full h-full object-contain" />
            ) : file.mime === "application/pdf" && previewUrl ? (
              <iframe src={previewUrl} className="w-full h-full border-0" title={file.name} />
            ) : (
              <div className="flex flex-col items-center gap-2">
                {getFileIcon(file.mime)}
                <span className="text-xs text-gray-500 dark:text-gray-400">Aperçu non disponible</span>
              </div>
            )}
          </div>

          {/* File Name */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 break-words">
              {file.name}
            </h3>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => previewUrl && window.open(previewUrl, "_blank")}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Télécharger
            </button>
            <button
              onClick={() => previewUrl && window.open(previewUrl, "_blank")}
              className="p-2 border border-gray-300 dark:border-neutral-600 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              aria-label="Ouvrir dans un nouvel onglet"
            >
              <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Information */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-neutral-700">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Informations
            </h4>
            
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Type</p>
                <p className="text-gray-900 dark:text-gray-100">{file.mime}</p>
              </div>
              
              <div>
                <p className="text-gray-500 dark:text-gray-400">Taille</p>
                <p className="text-gray-900 dark:text-gray-100">{formatSize(file.size)}</p>
              </div>
              
              <div>
                <p className="text-gray-500 dark:text-gray-400">Propriétaire</p>
                <p className="text-gray-900 dark:text-gray-100">Moi</p>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-neutral-700">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Activité
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Vous avez ouvert ce fichier</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Aujourd'hui</p>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
