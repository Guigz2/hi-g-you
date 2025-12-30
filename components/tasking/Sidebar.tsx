"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dayjs from "dayjs";
import updateLocale from "dayjs/plugin/updateLocale";
import weekOfYear from "dayjs/plugin/weekOfYear";
import "dayjs/locale/fr";
import { Ticket, List, Table, PieChart, Home } from "lucide-react";
import { Press_Start_2P } from "next/font/google";

dayjs.extend(updateLocale);
dayjs.extend(weekOfYear);
dayjs.locale("fr");
dayjs.updateLocale("fr", { weekStart: 1 });

const pressStart = Press_Start_2P({ subsets: ["latin"], weight: "400" });

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={() => { try { window.dispatchEvent(new CustomEvent("close-sidebar")); } catch {} }}
      className={`${active ? "bg-indigo-100 dark:bg-indigo-900/30" : ""} flex items-center gap-3 px-4 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-neutral-800 transition-colors`}
    >
      <Icon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
      <span className="text-sm">{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const now = dayjs();
  const monthLabel = now.format("MMMM YYYY");
  const weekNumber = now.week();
  const startOfMonth = now.startOf("month");
  const daysInMonth = now.daysInMonth();
  const leading = ((startOfMonth.day() + 6) % 7); // Monday = 0
  const monthDays: dayjs.Dayjs[] = Array.from({ length: daysInMonth }, (_, i) => startOfMonth.add(i, "day"));
  const cells: (dayjs.Dayjs | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...monthDays,
  ];
  // Current ISO-week (Mon..Sun)
  const weekStart = now.day() === 0 ? now.subtract(6, "day") : now.subtract(now.day() - 1, "day");
  const weekDates = Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));
  const isHighlight = (d: dayjs.Dayjs) => weekDates.some(w => w.isSame(d, "day"));
  const highlightColors = [
    "bg-emerald-300", "bg-teal-300", "bg-cyan-300", "bg-sky-300",
    "bg-blue-400", "bg-indigo-400", "bg-violet-400",
  ];
  return (
    <aside className="w-64 border-r bg-white dark:bg-neutral-900 dark:border-neutral-800 flex flex-col sticky top-0 h-screen overflow-y-auto overflow-x-hidden">
      <div className="border-b dark:border-neutral-800">
        <a className="w-64 h-16 bg-[conic-gradient(from_330deg,_#4746FB,_#A2A1FF)] flex items-center justify-center">
          <span className={`${pressStart.className} text-xl text-black`}>
            Tasking App
          </span>
        </a>
      </div>

      <div className="px-4 py-4">
        <div className="text-sm text-gray-900 dark:text-gray-100 mb-1 capitalize text-center">{monthLabel}</div>
        <div className="text-xs text-gray-600 dark:text-gray-300 mb-2 text-center">Semaine {weekNumber}</div>
        <div className="grid grid-cols-7 gap-0 text-xs mb-1">
          {["L","M","M","J","V","S","D"].map((l, i) => (
            <div key={`${l}-${i}`} className="h-5 flex items-center justify-center text-gray-700 dark:text-gray-300">{l}</div>
          ))}
        </div>
        <div className="relative">
          <div className="grid grid-cols-7 gap-0 text-xs">
          {cells.map((d, idx) => {
            if (!d) return <div key={`b-${idx}`} className="h-6" />;
            const inWeek = isHighlight(d);
            const color = inWeek ? highlightColors[d.day() === 0 ? 6 : d.day() - 1] : "bg-gray-100 dark:bg-neutral-800";
            const isToday = d.isSame(now, "day");
            const textClass = inWeek ? "text-black" : "text-gray-800 dark:text-gray-200";
            const rounded = d.day() === 1 ? "rounded-l-sm" : d.day() === 0 ? "rounded-r-sm" : ""; // Mon..Sun
            return (
              <div
                key={d.format("YYYY-MM-DD")}
                className={`h-6 relative flex items-center justify-center ${color} ${rounded}`}
              >
                <span className={`relative z-10 ${textClass}`}>{d.date()}</span>
                {isToday && (
                  <span className="pointer-events-none absolute inset-px rounded-sm border-2 border-black dark:border-white" />
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      <div className="mx-4 border-t border-black dark:border-white" />

      {/* Mobile-only home link */}
      <div className="md:hidden px-4 pt-3">
        <Link
          href="/"
          onClick={() => { try { window.dispatchEvent(new CustomEvent("close-sidebar")); } catch {} }}
          className="flex items-center gap-3 px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-pink-400 to-purple-600 transition-colors"
        >
          <Home className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          <span className="text-sm">Accueil</span>
        </Link>
      </div>

      <nav className="mt-2 px-4 space-y-2">
        <NavItem href="/tasking/create" label="Faire un ticket" icon={Ticket} />
        <NavItem href="/tasking/list" label="Liste" icon={List} />
        <NavItem href="/tasking" label="Tableau" icon={Table} />
        <NavItem href="/tasking/graphics" label="Graphics" icon={PieChart} />
      </nav>
    </aside>
  );
}
