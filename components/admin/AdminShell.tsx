"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { Menu } from "lucide-react";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* La print (facturi) rămâne doar conținutul paginii. */}
      <div className="contents print:hidden">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      </div>

      <div className="lg:pl-64 print:pl-0">
        <div className="contents print:hidden">
          <TopBar onMenuClick={() => setMobileOpen(true)} />
        </div>
        <main className="p-4 sm:p-6 lg:p-8 print:p-0">{children}</main>
      </div>

      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Deschide meniu"
        className="fixed bottom-6 right-6 z-30 print:hidden flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
    </div>
  );
}
