"use client";
import { useState, Suspense } from "react";
import CloudTree from "@/components/cloud/CloudTree";
import FileList from "@/components/cloud/FileList";
import UploadDropzone from "@/components/cloud/UploadDropzone";
import PreviewPane from "@/components/cloud/PreviewPane";
import TagPanel from "@/components/cloud/TagPanel";
import TrashList from "@/components/cloud/TrashList";
import SearchPanel from "@/components/cloud/SearchPanel";
export default function CloudPage() {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Cloud Fichiers</h1>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => { setShowTrash(false); setShowSearch(false); }}
          className={`text-xs px-2 py-1 rounded border ${(!showTrash && !showSearch) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'} `}
        >Fichiers</button>
        <button
          onClick={() => { setShowTrash(true); setShowSearch(false); }}
          className={`text-xs px-2 py-1 rounded border ${showTrash ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'} `}
        >Corbeille</button>
        <button
          onClick={() => { setShowSearch(true); setShowTrash(false); }}
          className={`text-xs px-2 py-1 rounded border ${showSearch ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'} `}
        >Recherche</button>
      </div>
      <Suspense fallback={<p>Chargement interface…</p>}>
        {showTrash ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_300px_250px]">
            <div className="border rounded p-3 bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700">
              <TrashList />
            </div>
            <PreviewPane fileId={selectedFile} />
            <div className="hidden xl:block border rounded p-3 bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700">
              <TagPanel fileId={selectedFile} />
            </div>
          </div>
        ) : showSearch ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_300px_250px]">
            <div className="border rounded p-3 bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700">
              <SearchPanel onSelect={(fid) => setSelectedFile(fid)} />
            </div>
            <PreviewPane fileId={selectedFile} />
            <div className="hidden xl:block border rounded p-3 bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700">
              <TagPanel fileId={selectedFile} />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[250px_1fr_300px] xl:grid-cols-[250px_1fr_300px_250px]">
            <div className="border rounded p-3 bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700">
              <CloudTree onSelect={(id) => { setCurrentFolder(id); }} />
            </div>
            <div className="space-y-4">
              <UploadDropzone folderId={currentFolder} onUploaded={() => setRefreshKey(k => k+1)} />
              <div key={refreshKey} className="border rounded p-3 bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700">
                <FileList folderId={currentFolder} onSelect={(fileId) => setSelectedFile(fileId)} />
              </div>
            </div>
            <PreviewPane fileId={selectedFile} />
            <div className="hidden xl:block border rounded p-3 bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700">
              <TagPanel fileId={selectedFile} />
            </div>
          </div>
        )}
      </Suspense>
    </div>
  );
}
