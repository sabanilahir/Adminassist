import { auth } from "@/lib/auth"; // Tambahkan import auth
import { getTickets } from "@/actions/ticket-actions";
import { TicketsTable } from "./tickets-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Ticket } from "lucide-react";

export default async function TicketsListPage() {
  // 1. Ambil data session dan tentukan role
  const session = await auth();
  const userRole = session?.user?.role?.trim().toUpperCase();
  const isPM = userRole === "PROJECT_MANAGER";
  const canCreateTicket = userRole !== "PROJECT_MANAGER" && userRole !== "PIC";

  let tickets: any[] = [];
  
  try {
    tickets = await getTickets();
  } catch (error) {
    console.error("Error loading tickets:", error);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track support tickets
          </p>
        </div>
        
        {/* 2. Sembunyikan tombol New Ticket untuk PM */}
        {canCreateTicket && (
          <Link href="/tickets/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </Link>
        )}
      </div>

      {/* Tickets Table */}
      {tickets.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No tickets yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first support ticket to get started
          </p>
          
          {/* 3. Sembunyikan tombol Create Ticket untuk PM */}
          {!isPM && (
            <Link href="/tickets/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <TicketsTable tickets={tickets} />
      )}
    </div>
  );
}