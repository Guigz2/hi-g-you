"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Press_Start_2P } from "next/font/google";

const pressStart = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
});

export default function BudgetHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const items = [
    { href: "/budget/transactions", label: "Dépenses", color: "red" },
    { href: "/budget/credit", label: "Crédits", color: "green" },
    { href: "/budget/mensualite", label: "Mensualité", color: "blue" },
    { href: "/budget/finances", label: "Finances", color: "orange" }, 
  ];

  const colorBase: Record<string, string> = {
    blue: "bg-blue-500 hover:bg-blue-700",
    red: "bg-red-500 hover:bg-red-700",
    green: "bg-green-500 hover:bg-green-700",
    gray: "bg-gray-500 hover:bg-gray-700",
    orange: "bg-orange-500 hover:bg-orange-700",
  };
  const colorActive: Record<string, string> = {
    blue: "bg-blue-700 border-2 border-black",
    red: "bg-red-700 border-2 border-black",
    green: "bg-green-700 border-2 border-black",
    gray: "bg-gray-700 border-2 border-black",
    orange: "bg-orange-700 border-2 border-black",
  };

  const linkClass = (href: string, color: string) => {
    const active = pathname === href;
    return `text-white px-4 py-2 rounded-md ${active ? colorActive[color] : colorBase[color]}`;
  };
  
  return (
    <header className="w-full bg-white dark:bg-neutral-900 shadow-md fixed top-0 left-0 z-50">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            {/* Bouton de retour */}
            <Link href="/" className="h-14 w-14 flex items-center justify-center bg-[conic-gradient(from_330deg,_#FFA236,_#FFD18A)] rounded-md border border-black text-black shadow-md transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600" aria-label="Accueil">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" aria-label="Accueil">
                <path d="M22 22L2 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M2 11L6.06296 7.74968M22 11L13.8741 4.49931C12.7784 3.62279 11.2216 3.62279 10.1259 4.49931L9.34398 5.12486" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M15.5 5.5V3.5C15.5 3.22386 15.7239 3 16 3H18.5C18.7761 3 19 3.22386 19 3.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M4 22V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M20 9.5V13.5M20 22V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M15 22V17C15 15.5858 15 14.8787 14.5607 14.4393C14.1213 14 13.4142 14 12 14C10.5858 14 9.87868 14 9.43934 14.4393M9 22V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 9.5C14 10.6046 13.1046 11.5 12 11.5C10.8954 11.5 10 10.6046 10 9.5C10 8.39543 10.8954 7.5 12 7.5C13.1046 7.5 14 8.39543 14 9.5Z" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </Link>
            
            {/* Titre */}
            <div className="w-64 h-14 bg-[conic-gradient(from_330deg,_#FFA236,_#FFD18A)] flex items-center justify-center rounded-md shadow-lg border border-black">
              <h1 className={`${pressStart.className} text-xl text-black`}>
                Budget App
              </h1>
            </div>
            {/* Bouton Menu Mobile */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden w-14 h-14 flex items-center justify-center bg-[conic-gradient(from_330deg,_#FFA236,_#FFD18A)] rounded-md border border-black text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 shadow-md transition-transform active:scale-95"
              aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {isOpen ? <X size={32} /> : <Menu size={32} />}
            </button>

            {/* Navigation Desktop */}
            <nav className={`hidden lg:flex space-x-6 text-lg ${isOpen ? 'hidden' : 'flex'}`}>
              {items.map(it => (
                <Link key={it.href} href={it.href} className={linkClass(it.href, it.color)}>
                  {it.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Menu Mobile */}
          {isOpen && (
            <div className="lg:hidden absolute top-20 left-0 w-full bg-white dark:bg-neutral-900 shadow-md py-4 flex flex-col items-stretch space-y-2">
              {items.map(it => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setIsOpen(false)}
                  className={`${linkClass(it.href, it.color)} w-full text-center`}
                >
                  {it.label}
                </Link>
              ))}
            </div>
          )}
        </header>
  );
}
