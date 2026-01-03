"use client";
import { useEffect, useState } from "react";
import { listFolder, trashFile, renameFile, getDownloadUrl, getFolderBreadcrumb, setFolderColor, trashMultipleFiles, trashMultipleFolders, renameFolder, moveFile, moveFolder } from "@/app/(app)/cloud/actions";
import { FileText, Image, Film, Music, File, Folder, MoreVertical, Download, Edit2, Trash2, Move, ChevronRight, Palette, X } from "lucide-react";

interface FileMeta { 
  id: string; 
  name: string; 
  ext: string; 
  mime: string; 
  size: number; 
  is_trashed: boolean; 
}

interface FolderMeta { 
  id: string; 
  name: string; 
  path: string; 
  color?: string | null;
}

interface DriveFileListProps {
  folderId: string | null;
  onSelect?: (fileId: string) => void;
  viewMode: "grid" | "list";
  onFolderClick?: (folderId: string) => void;
}

export default function DriveFileList({ folderId, onSelect, viewMode, onFolderClick }: DriveFileListProps) {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [folders, setFolders] = useState<FolderMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fileId: string } | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ id: string | null; name: string }>>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState<"files" | "folders" | "mixed">("files");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [lastClickTime, setLastClickTime] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true); 
      setError(null);
      try {
        const [data, breadcrumbData] = await Promise.all([
          listFolder(folderId),
          folderId ? getFolderBreadcrumb(folderId) : Promise.resolve([{ id: null, name: "Mon Drive" }])
        ]);
        setFiles(data.files as FileMeta[]);
        setFolders(data.folders as FolderMeta[]);
        setBreadcrumb(breadcrumbData);
      } catch (e: any) { 
        setError(e.message); 
      } finally { 
        setLoading(false); 
      }
    };
    load();
  }, [folderId]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const getFileIcon = (mime: string, ext: string) => {
    if (mime.startsWith("image/")) return <Image className="w-5 h-5 text-blue-500" />;
    if (mime.startsWith("video/")) return <Film className="w-5 h-5 text-purple-500" />;
    if (mime.startsWith("audio/")) return <Music className="w-5 h-5 text-pink-500" />;
    if (mime.includes("pdf") || ext === "pdf") return <FileText className="w-5 h-5 text-red-500" />;
    if (mime.includes("text") || ["txt", "md"].includes(ext)) return <FileText className="w-5 h-5 text-gray-500" />;
    return <File className="w-5 h-5 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString("fr-FR");
  };

  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, fileId });
  };

  const handleDownload = async (fileId: string) => {
    try {
      const { url } = await getDownloadUrl(fileId);
      window.open(url, "_blank");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRename = async (fileId: string, currentName: string) => {
    const newName = prompt("Nouveau nom:", currentName);
    if (!newName || newName === currentName) return;
    try {
      await renameFile(fileId, newName);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, name: newName } : f));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleTrash = async (fileId: string) => {
    if (!confirm("Déplacer vers la corbeille ?")) return;
    try {
      await trashFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Selection handlers
  const toggleSelection = (id: string, type: "file" | "folder") => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      
      // Determine selection type
      if (newSet.size === 0) {
        setSelectedType("files");
      } else {
        const selectedFiles = Array.from(newSet).filter(id => files.some(f => f.id === id));
        const selectedFolders = Array.from(newSet).filter(id => folders.some(f => f.id === id));
        if (selectedFiles.length > 0 && selectedFolders.length > 0) {
          setSelectedType("mixed");
        } else if (selectedFolders.length > 0) {
          setSelectedType("folders");
        } else {
          setSelectedType("files");
        }
      }
      
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setSelectedType("files");
  };

  // Batch actions
  const handleBatchDownload = async () => {
    const fileIds = Array.from(selectedItems).filter(id => files.some(f => f.id === id));
    for (const fileId of fileIds) {
      try {
        const { url } = await getDownloadUrl(fileId);
        window.open(url, "_blank");
      } catch (e: any) {
        console.error(e);
      }
    }
  };

  const handleBatchMove = async () => {
    const targetPath = prompt("Chemin du dossier de destination (ex: / ou /Documents):", "/");
    if (targetPath === null) return;
    
    try {
      const fileIds = Array.from(selectedItems).filter(id => files.some(f => f.id === id));
      const folderIds = Array.from(selectedItems).filter(id => folders.some(f => f.id === id));
      
      for (const fileId of fileIds) {
        await moveFile(fileId, targetPath);
      }
      for (const folderId of folderIds) {
        await moveFolder(folderId, targetPath);
      }
      
      setFiles(prev => prev.filter(f => !fileIds.includes(f.id)));
      setFolders(prev => prev.filter(f => !folderIds.includes(f.id)));
      clearSelection();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`Déplacer ${selectedItems.size} élément(s) vers la corbeille ?`)) return;
    
    try {
      const fileIds = Array.from(selectedItems).filter(id => files.some(f => f.id === id));
      const folderIds = Array.from(selectedItems).filter(id => folders.some(f => f.id === id));
      
      if (fileIds.length > 0) {
        await trashMultipleFiles(fileIds);
        setFiles(prev => prev.filter(f => !fileIds.includes(f.id)));
      }
      if (folderIds.length > 0) {
        await trashMultipleFolders(folderIds);
        setFolders(prev => prev.filter(f => !folderIds.includes(f.id)));
      }
      
      clearSelection();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleBatchColor = async (color: string | null) => {
    const folderIds = Array.from(selectedItems).filter(id => folders.some(f => f.id === id));
    
    try {
      for (const folderId of folderIds) {
        await setFolderColor(folderId, color);
      }
      setFolders(prev => prev.map(f => folderIds.includes(f.id) ? { ...f, color } : f));
      setShowColorPicker(false);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSingleRename = async () => {
    if (selectedItems.size !== 1) return;
    const id = Array.from(selectedItems)[0];
    const isFile = files.some(f => f.id === id);
    const isFolder = folders.some(f => f.id === id);
    
    if (isFile) {
      const file = files.find(f => f.id === id);
      if (!file) return;
      const newName = prompt("Nouveau nom:", file.name);
      if (!newName || newName === file.name) return;
      try {
        await renameFile(id, newName);
        setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
        clearSelection();
      } catch (e: any) {
        setError(e.message);
      }
    } else if (isFolder) {
      const folder = folders.find(f => f.id === id);
      if (!folder) return;
      const newName = prompt("Nouveau nom:", folder.name);
      if (!newName || newName === folder.name) return;
      try {
        await renameFolder(id, newName);
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
        clearSelection();
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  const handleFolderClick = (folderId: string) => {
    const now = Date.now();
    const lastClick = lastClickTime[folderId] || 0;
    const timeDiff = now - lastClick;

    if (timeDiff < 300 && lastClick > 0) {
      // Double-clic : ouvrir le dossier
      clearSelection();
      onFolderClick?.(folderId);
      // Réinitialiser le timer pour ce dossier
      const newTimes = { ...lastClickTime };
      delete newTimes[folderId];
      setLastClickTime(newTimes);
    } else {
      // Simple clic : sélectionner ou désélectionner
      toggleSelection(folderId, "folder");
      setLastClickTime({ ...lastClickTime, [folderId]: now });
    }
  };

  const folderColors = [
    { name: "Aucune", value: null },
    { name: "Rouge", value: "#ef4444" },
    { name: "Orange", value: "#f97316" },
    { name: "Jaune", value: "#eab308" },
    { name: "Vert", value: "#22c55e" },
    { name: "Bleu", value: "#3b82f6" },
    { name: "Violet", value: "#a855f7" },
    { name: "Rose", value: "#ec4899" },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Chargement...</div>
    </div>;
  }

  if (error) {
    return <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded">
      {error}
    </div>;
  }

  // Grid View
  if (viewMode === "grid") {
    return (
      <div className="p-6">
        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            {breadcrumb.map((crumb, index) => (
              <div key={crumb.id || "root"} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    clearSelection();
                    onFolderClick?.(crumb.id!);
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                >
                  {crumb.name}
                </button>
                {index < breadcrumb.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Bar Container - Always takes up space */}
        <div className="mb-4 min-h-[72px]">
          {selectedItems.size > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={clearSelection}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  aria-label="Désélectionner tout"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedItems.size} sélectionné(s)
                </span>
                {selectedItems.size === 1 && (
                  <button
                    onClick={handleSingleRename}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded text-sm transition-colors"
                    title="Renommer"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Renommer</span>
                  </button>
                )}
                {selectedType === "files" && (
                  <button
                    onClick={handleBatchDownload}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded text-sm transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Télécharger</span>
                  </button>
                )}
                <button
                  onClick={handleBatchMove}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded text-sm transition-colors"
                  title="Déplacer"
                >
                  <Move className="w-4 h-4" />
                  <span className="hidden sm:inline">Déplacer</span>
                </button>
                {(selectedType === "folders" || selectedType === "mixed") && (
                  <div className="relative">
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded text-sm transition-colors"
                      title="Colorer"
                    >
                      <Palette className="w-4 h-4" />
                      <span className="hidden sm:inline">Colorer</span>
                    </button>
                    {showColorPicker && (
                      <div className="absolute top-full mt-2 right-0 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg p-3 z-50 min-w-[180px]">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Choisir une couleur</p>
                        <div className="grid grid-cols-4 gap-2">
                          {folderColors.map((color) => (
                            <button
                              key={color.name}
                              onClick={() => handleBatchColor(color.value)}
                              className="w-8 h-8 rounded border-2 border-gray-300 dark:border-neutral-600 hover:scale-110 transition-transform flex items-center justify-center"
                              style={{ backgroundColor: color.value || "#e5e7eb" }}
                              title={color.name}
                            >
                              {!color.value && <span className="text-xs text-gray-500">∅</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Supprimer</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {folders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Dossiers</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  className="group relative flex flex-col items-center p-4 rounded-lg border-2 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  style={{ 
                    borderColor: selectedItems.has(folder.id) ? "#3b82f6" : "transparent",
                    backgroundColor: folder.color ? `${folder.color}15` : undefined
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.has(folder.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelection(folder.id, "folder");
                    }}
                    className="absolute top-2 left-2 w-4 h-4 cursor-pointer"
                  />
                  <button
                    onClick={() => handleFolderClick(folder.id)}
                    className="flex flex-col items-center w-full"
                  >
                    <Folder 
                      className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform" 
                      style={{ color: folder.color || undefined }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 text-center truncate w-full">
                      {folder.name}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length === 0 && folders.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Folder className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Aucun fichier ou dossier</p>
          </div>
        ) : (
          <>
            {files.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Fichiers</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {files.map(file => (
                    <div
                      key={file.id}
                      onContextMenu={(e) => handleContextMenu(e, file.id)}
                      className="group relative border-2 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-white dark:bg-neutral-800"
                      style={{ 
                        borderColor: selectedItems.has(file.id) ? "#3b82f6" : "#e5e7eb"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.has(file.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelection(file.id, "file");
                        }}
                        className="absolute top-2 left-2 w-4 h-4 cursor-pointer z-10"
                      />
                      <div 
                        className="flex flex-col items-center"
                        onClick={() => {
                          clearSelection();
                          onSelect?.(file.id);
                        }}
                      >
                        <div className="w-12 h-12 mb-2 flex items-center justify-center">
                          {getFileIcon(file.mime, file.ext)}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 text-center truncate w-full" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, file.id);
                        }}
                        className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 min-w-[180px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const file = files.find(f => f.id === contextMenu.fileId);
              if (!file) return null;
              
              return (
                <>
                  <button
                    onClick={() => handleDownload(file.id)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </button>
                  <button
                    onClick={() => handleRename(file.id, file.name)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <Edit2 className="w-4 h-4" />
                    Renommer
                  </button>
                  <button
                    onClick={() => handleTrash(file.id)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 text-sm text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  // List View
  return (
    <div className="p-6">
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-2 mb-4 text-sm">
          {breadcrumb.map((crumb, index) => (
            <div key={crumb.id || "root"} className="flex items-center gap-2">
              <button
                onClick={() => onFolderClick?.(crumb.id!)}
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
              >
                {crumb.name}
              </button>
              {index < breadcrumb.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Bar Container - Always takes up space */}
      <div className="mb-4 min-h-[72px]">
        {selectedItems.size > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedItems.size === 1 && (
              <button
                onClick={handleSingleRename}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded text-sm transition-colors"
                title="Renommer"
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">Renommer</span>
              </button>
            )}
            {selectedType === "files" && (
              <button
                onClick={handleBatchDownload}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded text-sm transition-colors"
                title="Télécharger"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Télécharger</span>
              </button>
            )}
            <button
              onClick={handleBatchMove}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded text-sm transition-colors"
              title="Déplacer"
            >
              <Move className="w-4 h-4" />
              <span className="hidden sm:inline">Déplacer</span>
            </button>
            {(selectedType === "folders" || selectedType === "mixed") && (
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded text-sm transition-colors"
                  title="Colorer"
                >
                  <Palette className="w-4 h-4" />
                  <span className="hidden sm:inline">Colorer</span>
                </button>
                {showColorPicker && (
                  <div className="absolute top-full mt-2 right-0 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg p-3 z-50 min-w-[180px]">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Choisir une couleur</p>
                    <div className="grid grid-cols-4 gap-2">
                      {folderColors.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => handleBatchColor(color.value)}
                          className="w-8 h-8 rounded border-2 border-gray-300 dark:border-neutral-600 hover:scale-110 transition-transform flex items-center justify-center"
                          style={{ backgroundColor: color.value || "#e5e7eb" }}
                          title={color.name}
                        >
                          {!color.value && <span className="text-xs text-gray-500">∅</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Supprimer</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedItems.size} élément(s) sélectionné(s)
            </span>
            <button
              onClick={clearSelection}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              aria-label="Désélectionner tout"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        )}
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-neutral-700 text-left text-sm text-gray-600 dark:text-gray-400">
            <th className="pb-2 font-medium w-8"></th>
            <th className="pb-2 font-medium">Nom</th>
            <th className="pb-2 font-medium hidden sm:table-cell">Propriétaire</th>
            <th className="pb-2 font-medium hidden md:table-cell">Dernière modification</th>
            <th className="pb-2 font-medium">Taille</th>
            <th className="pb-2 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {folders.map(folder => (
            <tr
              key={folder.id}
              className="border-b border-gray-100 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
              style={{ 
                backgroundColor: selectedItems.has(folder.id) ? "#dbeafe" : folder.color ? `${folder.color}15` : undefined
              }}
            >
              <td className="py-3 pl-2">
                <input
                  type="checkbox"
                  checked={selectedItems.has(folder.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelection(folder.id, "folder");
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
              </td>
              <td className="py-3" onClick={() => handleFolderClick(folder.id)}>
                <div className="flex items-center gap-3">
                  <Folder 
                    className="w-5 h-5" 
                    style={{ color: folder.color || undefined }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{folder.name}</span>
                </div>
              </td>
              <td className="py-3 text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">Moi</td>
              <td className="py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">-</td>
              <td className="py-3 text-sm text-gray-600 dark:text-gray-400">-</td>
              <td className="py-3"></td>
            </tr>
          ))}
          {files.map(file => (
            <tr
              key={file.id}
              onContextMenu={(e) => handleContextMenu(e, file.id)}
              className="border-b border-gray-100 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
              style={{ 
                backgroundColor: selectedItems.has(file.id) ? "#dbeafe" : undefined
              }}
            >
              <td className="py-3 pl-2">
                <input
                  type="checkbox"
                  checked={selectedItems.has(file.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelection(file.id, "file");
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
              </td>
              <td className="py-3" onClick={() => {
                clearSelection();
                onSelect?.(file.id);
              }}>
                <div className="flex items-center gap-3">
                  {getFileIcon(file.mime, file.ext)}
                  <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                </div>
              </td>
              <td className="py-3 text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">Moi</td>
              <td className="py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                {formatDate(new Date().toISOString())}
              </td>
              <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                {formatFileSize(file.size)}
              </td>
              <td className="py-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, file.id);
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-neutral-700"
                >
                  <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {files.length === 0 && folders.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <Folder className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Aucun fichier ou dossier</p>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const file = files.find(f => f.id === contextMenu.fileId);
            if (!file) return null;
            
            return (
              <>
                <button
                  onClick={() => handleDownload(file.id)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 text-sm text-gray-700 dark:text-gray-300"
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </button>
                <button
                  onClick={() => handleRename(file.id, file.name)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 text-sm text-gray-700 dark:text-gray-300"
                >
                  <Edit2 className="w-4 h-4" />
                  Renommer
                </button>
                <button
                  onClick={() => handleTrash(file.id)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 text-sm text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
