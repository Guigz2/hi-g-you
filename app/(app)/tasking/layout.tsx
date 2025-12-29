import Sidebar from "@/components/tasking/Sidebar";
import TopBar from "@/components/tasking/TopBar";

export default function TaskingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-neutral-950">
      <Sidebar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

