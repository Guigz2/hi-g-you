"use client";
import { useState } from "react";
import DriveHeader from "@/components/cloud/DriveHeader";
import DriveSidebar from "@/components/cloud/DriveSidebar";
import DriveFileList from "@/components/cloud/DriveFileList";
import DriveDetails from "@/components/cloud/PreviewPane";
import UploadDropzone from "@/components/cloud/UploadDropzone";
import TrashList from "@/components/cloud/TrashList";
import SearchPanel from "@/components/cloud/SearchPanel";

export default function CloudPage() {
  const [currentView, setCurrentView] = useState<"drive" | "shared" | "recent" | "trash">("drive");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const handleFolderCreated = () => {
    setRefreshKey(k => k + 1);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setCurrentView("drive"); // Switch to drive view for search
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-neutral-900">
      {/* Header */}
      <DriveHeader 
        viewMode={viewMode} 
        onViewModeChange={setViewMode}
        onSearch={handleSearch}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <DriveSidebar 
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view);
            setSelectedFile(null);
          }}
          currentFolder={currentFolder}
          onFolderCreated={handleFolderCreated}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-auto bg-white dark:bg-neutral-900">
          {currentView === "trash" ? (
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Corbeille
              </h2>
              <TrashList />
            </div>
          ) : searchQuery.trim() ? (
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Résultats pour "{searchQuery}"
              </h2>
              <SearchPanel onSelect={setSelectedFile} />
            </div>
          ) : (
            <>
              {/* Upload Area */}
              <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
                <UploadDropzone 
                  folderId={currentFolder} 
                  onUploaded={handleFolderCreated}
                />
              </div>

              {/* File List */}
              <div key={refreshKey}>
                <DriveFileList 
                  folderId={currentFolder}
                  viewMode={viewMode}
                  onSelect={setSelectedFile}
                  onFolderClick={setCurrentFolder}
                />
              </div>
            </>
          )}
        </main>

        {/* Details Panel */}
        {currentView !== "trash" && (
          <DriveDetails 
            fileId={selectedFile}
            onClose={() => setSelectedFile(null)}
          />
        )}
      </div>
    </div>
  );
}
