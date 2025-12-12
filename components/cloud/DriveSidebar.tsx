"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Home, Users, Clock, Trash2, Cloud } from "lucide-react";
import { createFolder } from "@/app/(app)/cloud/actions";

interface DriveSidebarProps {
  currentView: "drive" | "shared" | "recent" | "trash";
  onViewChange: (view: "drive" | "shared" | "recent" | "trash") => void;
  currentFolder: string | null;
  onFolderCreated: () => void;
}

export default function DriveSidebar({ 
  currentView, 
  onViewChange, 
  currentFolder,
  onFolderCreated
}: DriveSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleNewFolder = async () => {
    const name = prompt("Nom du nouveau dossier :");
    if (!name) return;
    
    setIsCreating(true);
    try {
      await createFolder(currentFolder, name);
      onFolderCreated();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsCreating(false);
    }
  };

  const menuItems = [
    { id: "drive" as const, label: "Mon Drive", icon: Home, color: "text-blue-600" },
    { id: "trash" as const, label: "Corbeille", icon: Trash2, color: "text-gray-600" },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col h-full">
      {/* New Button */}
      <div className="p-4">
        <div className="relative group">
          <button
            onClick={handleNewFolder}
            disabled={isCreating}
            className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-50"
          >
            <Plus className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-700 dark:text-gray-200">
              Nouveau
            </span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-4 px-4 py-2 rounded-full transition-colors ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                      : "hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-blue-600 dark:text-blue-400" : item.color}`} />
                  <span className="text-sm">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Home Link - Bottom */}
      <div className="p-4 border-t border-gray-200 dark:border-neutral-700">
        <Link
          href="/"
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all font-medium"
        >
          <Home className="w-5 h-5" />
          <span>Retour à l'accueil</span>
        </Link>
      </div>
    </aside>
  );
}
