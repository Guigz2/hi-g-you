"use client";
import Link from "next/link";
import { Home, Menu } from "lucide-react";

export default function TopBarSimple({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-neutral-900 border-b dark:border-neutral-800">
      <div className="flex items-center h-16">
        <button
          type="button"
          className="md:hidden w-16 h-16 flex items-center justify-center"
          onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-8 h-8" />
        </button>
        <Link href="/" className="hidden md:flex w-16 h-16 items-center justify-center">
          <Home className="w-10 h-10" />
        </Link>
        <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800 mx-2" />
        
        <div className="px-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </div>
      </div>
    </div>
  );
}
