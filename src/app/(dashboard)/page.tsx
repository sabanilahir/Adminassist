import { auth } from "@/lib/auth";
import { getDashboardStats, getTickets } from "@/actions/ticket-actions";
import { prisma } from "@/lib/prisma";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { ContractSearch } from "@/components/dashboard/contract-search";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Ticket, CheckCircle, Clock, AlertCircle, Plus, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  // Pastikan ambil role, bersihkan spasi (trim), dan jadikan huruf besar
  const userRole = session.user?.role?.trim().toUpperCase();
  const isPM = userRole === "PROJECT_MANAGER";
  const isPIC = userRole === "PIC";
  const canCreateTicket = userRole !== "PROJECT_MANAGER" && userRole !== "PIC";
  

  let stats: any = { 
    totalTickets: 0, 
    openTickets: 0, 
    resolvedTickets: 0, 
    newTickets: 0, 
    highPriorityTickets: 0, 
    chartData: { statusData: [], priorityData: [], customerData: [] } 
  };
  let recentTickets: any[] = [];
  let contracts: any[] = [];

try {
  stats = await getDashboardStats();
  recentTickets = (await getTickets()).slice(0, 5);
  
  // 2. Gunakan isPM atau isPIC untuk filter kontrak
  contracts = await prisma.contract.findMany({
    where: isPM 
      ? { projectManagerId: session.user?.id } 
      : isPIC 
      ? { pics: { some: { id: session.user?.id } } } 
      : undefined,
    include: {
      customer: { select: { id: true, name: true, company: true } },
      // Sertakan relasi tickets untuk perhitungan mandays PIC
      tickets: {
        where: isPIC ? { assignedToId: session.user?.id } : undefined,
        select: {
          mandaysSpent: true,
          mandaysType: true,
          mandaysCategory: true,
          assignedToId: true,
        }
      }
    },
    orderBy: { contractNumber: "asc" }
  });
} catch (error) {
  console.error("Error loading dashboard:", error);
}
  // try {
  //   stats = await getDashboardStats();
  //   recentTickets = (await getTickets()).slice(0, 5);
    
  //   // 2. Gunakan isPM untuk filter kontrak
  //   contracts = await prisma.contract.findMany({
  //     where: isPM ? { projectManagerId: session.user?.id } : undefined,
  //     include: {
  //       customer: { select: { id: true, name: true, company: true } }
  //     },
  //     orderBy: { contractNumber: "asc" }
  //   });
  // } catch (error) {
  //   console.error("Error loading dashboard:", error);
  // }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "danger" | "info" | "secondary" | "outline"> = {
      NEW: "info", 
      IN_PROGRESS: "warning", 
      WAITING_REPLY: "secondary", 
      REPLIED: "success", 
      ON_HOLD: "danger", 
      RESOLVED: "success",
      CLOSED: "secondary",
      NOT_APPLICABLE: "outline",
    };
    return variants[status] || "secondary";
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "success" | "warning" | "danger"> = {
      LOW: "success", 
      MEDIUM: "warning", 
      HIGH: "danger",
    };
    return variants[priority] || "secondary";
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {session.user?.name}</p>
          {/* --- TAMBAHKAN KODE INI SEMENTARA UNTUK DEBUGGING --- */}
          {/* <div className="mt-2 p-2 bg-red-100 text-red-800 rounded text-sm font-mono border border-red-300">
            DEBUG ROLE: "{session.user?.role || "UNDEFINED"}"
          </div> */}
          {/* --------------------------------------------------- */}
        </div>
        
        {/* 3. Gunakan !isPM untuk menyembunyikan tombol dengan lebih pasti */}
        {canCreateTicket && (
          <Link href="/tickets/new">
            <Button><Plus className="h-4 w-4 mr-2" />New Ticket</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Tickets" value={stats.totalTickets} icon={Ticket} variant="default" />
        <StatsCard title="Open Tickets" value={stats.openTickets} icon={Clock} variant="warning" />
        <StatsCard title="Resolved" value={stats.resolvedTickets} icon={CheckCircle} variant="success" />
        <StatsCard title="High Priority" value={stats.highPriorityTickets} icon={AlertCircle} variant="danger" />
      </div>

      <DashboardCharts data={stats.chartData} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Monitoring Kuota Mandays Kontrak</h2>
        </div>
        <ContractSearch contracts={contracts} />
      </div>

      <div className="bg-card rounded-lg border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Recent Tickets</h2>
          <Link href="/tickets">
            <Button variant="ghost" size="sm">View All<ArrowRight className="h-4 w-4 ml-2" /></Button>
          </Link>
        </div>
        
        {recentTickets.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tickets yet</h3>
            <p className="text-muted-foreground mb-4">Create your first support ticket to get started</p>
            
            {/* 4. Terapkan juga di sini */}
            {!isPM && (
              <Link href="/tickets/new">
                <Button><Plus className="h-4 w-4 mr-2" />Create Ticket</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentTickets.map((ticket) => (
              <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground">{ticket.trackingId}</span>
                    <Badge variant={getStatusBadge(ticket.status)}>{ticket.status.replace("_", " ")}</Badge>
                    <Badge variant={getPriorityBadge(ticket.priority)}>{ticket.priority}</Badge>
                  </div>
                  <h3 className="font-medium mt-1 truncate">{ticket.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{ticket.category?.name || "Uncategorized"} • {formatDate(ticket.createdAt)}</p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium">{ticket.user.name}</p>
                    {ticket.assignedTo && <p className="text-xs text-muted-foreground">Assigned to {ticket.assignedTo.name}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}