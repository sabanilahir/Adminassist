"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  Users,
  FileText,
  UserCircle,
  List,
  Inbox,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const role = session?.user?.role;

  const menuItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["USER", "PIC", "PROJECT_MANAGER", "ADMIN"] },
    { href: "/tickets", label: "Tickets", icon: Ticket, roles: ["ADMIN"] },
    { href: "/inbox", label: "Inbox", icon: Inbox, roles: ["PIC", "PROJECT_MANAGER"] },
    { href: "/reports", label: "Reports", icon: FileText, roles: ["ADMIN", "PROJECT_MANAGER"] },
    { href: "/admin/users", label: "Users", icon: Users, roles: ["ADMIN"] },
    { href: "/admin/customers", label: "Customers", icon: UserCircle, roles: ["ADMIN"] },
    { href: "/admin/contracts", label: "Contracts", icon: ClipboardList, roles: ["ADMIN"] },
    { href: "/admin/categories", label: "Categories", icon: List, roles: ["ADMIN"] },
  ];

  const settingsItems = [
    { href: "/admin/settings", label: "OAuth", icon: Settings, roles: ["ADMIN"], exact: true },
    { href: "/admin/settings/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN"], exact: false },
  ];

  // Filter menu berdasarkan role
  const filteredMenu = menuItems.filter((item) => item.roles.includes(role || ""));
  const filteredSettings = settingsItems.filter((item) => item.roles.includes(role || ""));
  
  // Pisahkan menu utama dan menu admin
  const mainMenu = filteredMenu.filter((item) => !item.href.startsWith("/admin"));
  const managementItems = filteredMenu.filter((item) => item.href.startsWith("/admin"));

  // Fungsi cek active state
  const isItemActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-card border-r h-screen transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header / Collapse Toggle */}
      <div className={cn("flex items-center h-14 px-4 border-b", collapsed ? "justify-center" : "justify-end")}>
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Main Menu */}
        {mainMenu.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Management Section */}
        {managementItems.length > 0 && (
          <div className="pt-4 mt-4 border-t">
            {!collapsed && (
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase mb-2">
                Management
              </p>
            )}
            {managementItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-0"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* Settings Section */}
        {filteredSettings.length > 0 && (
          <div className="pt-4 mt-4 border-t">
            {!collapsed && (
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase mb-2">
                Settings
              </p>
            )}
            {filteredSettings.map((item) => {
              const isActive = isItemActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-0"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* User Info & Sign Out Footer */}
      <div className="p-3 border-t">
        {session?.user && !collapsed && (
          <div className="mb-3 px-1">
            <p className="text-sm font-medium truncate">{session.user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            <Badge className="mt-1 text-[10px] px-2 py-0">{role}</Badge>
          </div>
        )}

        <Button
          variant="ghost"
          className={cn(
            "w-full text-muted-foreground hover:text-foreground",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}