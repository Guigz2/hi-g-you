"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/tasking/Sidebar";

export default function TaskingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const onToggle = () => setMobileOpen(v => !v);
    const onClose = () => setMobileOpen(false);
    window.addEventListener("toggle-sidebar", onToggle as EventListener);
    window.addEventListener("close-sidebar", onClose as EventListener);
    return () => window.removeEventListener("toggle-sidebar", onToggle as EventListener);
    return () => window.removeEventListener("close-sidebar", onClose as EventListener);
  }, []);
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-neutral-950">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 relative">
        {children}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 h-full w-64">
              <div className="h-full" onClick={(e)=>e.stopPropagation()}>
                <Sidebar />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

