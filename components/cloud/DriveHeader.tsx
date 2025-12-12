"use client";
import { useState } from "react";
import { Search, Settings, HelpCircle, Grid3x3, List } from "lucide-react";

interface DriveHeaderProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onSearch: (query: string) => void;
}

export default function DriveHeader({ viewMode, onViewModeChange, onSearch }: DriveHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <header className="h-16 border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center px-4 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">☁</span>
        </div>
        <h1 className="text-xl font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
          Drive
        </h1>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans Drive"
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-neutral-800 border-none rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-neutral-700 transition-all"
          />
        </div>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* View Toggle */}
        <button
          onClick={() => onViewModeChange("list")}
          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors ${
            viewMode === "list" ? "bg-gray-200 dark:bg-neutral-700" : ""
          }`}
          aria-label="Vue liste"
          title="Vue liste"
        >
          <List className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          onClick={() => onViewModeChange("grid")}
          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors ${
            viewMode === "grid" ? "bg-gray-200 dark:bg-neutral-700" : ""
          }`}
          aria-label="Vue grille"
          title="Vue grille"
        >
          <Grid3x3 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Help */}
        <button
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors hidden sm:block"
          aria-label="Aide"
          title="Aide"
        >
          <HelpCircle className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Settings */}
        <button
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Paramètres"
          title="Paramètres"
        >
          <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>
    </header>
  );
}
