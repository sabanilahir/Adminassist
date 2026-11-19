"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Plus,
  Search,
  Bell,
  Home,
} from "lucide-react";

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

// Kamus breadcrumbs untuk pemetaan route ke label manusiawi
function getBreadcrumbs(pathname: string) {
  if (pathname === "/") {
    return [{ label: "Dashboard", href: "/" }];
  }

  const crumbs: { label: string; href?: string }[] = [{ label: "Home", href: "/" }];

  if (pathname.startsWith("/tickets")) {
    crumbs.push({ label: "Tickets", href: "/tickets" });
    if (pathname === "/tickets/new") {
      crumbs.push({ label: "Buat Tiket Baru" });
    } else if (pathname.startsWith("/tickets/") && pathname.split("/").length > 2) {
      crumbs.push({ label: "Detail Tiket" });
    }
  } else if (pathname.startsWith("/sla")) {
    crumbs.push({ label: "SLA Policy", href: "/sla" });
  } else if (pathname.startsWith("/inbox")) {
    crumbs.push({ label: "Inbox", href: "/inbox" });
  } else if (pathname.startsWith("/reports")) {
    crumbs.push({ label: "Reports", href: "/reports" });
  } else if (pathname.startsWith("/admin")) {
    crumbs.push({ label: "Admin" });
    if (pathname.startsWith("/admin/users")) {
      crumbs.push({ label: "Users", href: "/admin/users" });
    } else if (pathname.startsWith("/admin/customers")) {
      crumbs.push({ label: "Customers", href: "/admin/customers" });
    } else if (pathname.startsWith("/admin/contracts")) {
      crumbs.push({ label: "Contracts", href: "/admin/contracts" });
    } else if (pathname.startsWith("/admin/categories")) {
      crumbs.push({ label: "Categories", href: "/admin/categories" });
    } else if (pathname.startsWith("/admin/settings")) {
      crumbs.push({ label: "Settings", href: "/admin/settings" });
      if (pathname.includes("/branding")) {
        crumbs.push({ label: "Branding & Logo" });
      } else if (pathname.includes("/azure")) {
        crumbs.push({ label: "Azure 365" });
      } else if (pathname.includes("/notifications")) {
        crumbs.push({ label: "Notifications" });
      } else if (pathname.includes("/sla")) {
        crumbs.push({ label: "SLA" });
      }
    }
  }

  return crumbs;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = user?.role || "";
  const crumbs = getBreadcrumbs(pathname);

  // Role permissions
  const canCreateTicket = role === "ADMIN_TICKET" || role === "ADMIN";
  const canSearch = ["ADMIN", "ADMIN_TICKET", "PROJECT_MANAGER", "PIC"].includes(role);

  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K untuk fokus ke pencarian
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/tickets?search=${encodeURIComponent(searchQuery.trim())}`);
  }

  // Ambil inisial nama user
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "US";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-6 gap-4">
        {/* ZONA KIRI: Dynamic Breadcrumbs Navigasi */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <div key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />}
                {isLast ? (
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {crumb.label}
                  </span>
                ) : crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-500">{crumb.label}</span>
                )}
              </div>
            );
          })}
        </nav>

        {/* ZONA TENGAH: Quick Search Bar Tiket (Hanya untuk Role Internal) */}
        {canSearch ? (
          <form
            onSubmit={handleSearchSubmit}
            className="relative hidden md:flex items-center w-64 lg:w-80"
          >
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari tiket (ID, subjek)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-14 rounded-md bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
            />
            <kbd className="absolute right-2 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 pointer-events-none select-none">
              Ctrl K
            </kbd>
          </form>
        ) : (
          <div className="flex-1" />
        )}

        {/* ZONA KANAN: Aksi Cepat & Utilitas Profil Pengguna */}
        <div className="flex items-center gap-3">
          {/* Tombol Buat Tiket Baru (Strictly ONE primary action - Khusus ADMIN & ADMIN_TICKET) */}
          {canCreateTicket && (
            <Link href="/tickets/new">
              <Button
                size="sm"
                className="h-8 px-3 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 shadow-none"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Tiket Baru
              </Button>
            </Link>
          )}

          {/* Lonceng Notifikasi */}
          <Link
            href={role === "PIC" || role === "PROJECT_MANAGER" ? "/inbox" : "/tickets"}
            className="relative p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Pusat Notifikasi"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </Link>

          {/* Garis Pemisah Tipis */}
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Theme Toggle (Terang/Gelap) */}
          <ThemeToggle />

          {/* Garis Pemisah Tipis */}
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Profil User Ringkas */}
          {user && (
            <div className="flex items-center gap-2 pl-1">
              <div
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] flex items-center justify-center select-none"
                title={user.name || "User"}
              >
                {userInitials}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-tight max-w-[120px] truncate">
                  {user.name}
                </span>
                <span className="font-mono text-[10px] text-slate-500 leading-tight">
                  {role}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
