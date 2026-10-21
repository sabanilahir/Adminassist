import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, ArrowRight, Clock, CheckCircle } from "lucide-react";

export default async function InboxPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isPic = session.user.role === "PIC";

  // 1. Ambil data tiket dasar berdasarkan penugasan / kontrak
  // Ditambahkan kondisi status: { notIn: ["REJECTED", "CLOSED"] }
  const rawTickets = await prisma.ticket.findMany({
    where: {
      status: {
        notIn: ["REJECTED", "CLOSED"], // <-- Pengecualian tiket REJECTED dan CLOSED dari Inbox
      },
      OR: [
        { assignedToId: session.user.id }, // Tiket yang sudah di-assign ke user yang login
        {
          assignedToId: null, // Tiket baru (pool) yang belum di-assign
          contract: {
            OR: [
              { projectManagerId: session.user.id }, // Jika user adalah PM di kontrak ini
              { pics: { some: { id: session.user.id } } }, // Jika user adalah PIC di kontrak ini
            ],
          },
        },
      ],
    },
    include: {
      customer: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Filter di JavaScript agar aman dari error relasi Prisma
  const tickets = rawTickets.filter((ticket) => {
    // Sembunyikan secara permanen tiket berstatus REJECTED
    if (ticket.status === "REJECTED") return false;

    if (!isPic) return true; // Jika bukan PIC (misal PM), tampilkan sisanya

    const categoryName = ticket.category?.name?.toLowerCase() || "";
    const isFeatureRequest = categoryName.includes("feature request");
    const isNewOrNotApplicable = ticket.status === "NEW" || ticket.status === "NOT_APPLICABLE";

    // Jika kategori Feature Request dan statusnya NEW atau NOT_APPLICABLE, sembunyikan dari PIC
    if (isFeatureRequest && isNewOrNotApplicable) {
      return false;
    }

    return true;
  });

  // 3. Statistik hitungan counter di kartu atas
  const stats = {
    baru: tickets.filter(
      (t) => (t.status === "NEW" || !t.assignedToId) && t.status !== "REJECTED"
    ).length,
    progress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
    resolved: tickets.filter(
      (t) =>
        t.status === "RESOLVED" ||
        t.status === "CONFIRMED" ||
        t.status === "CLOSED"
    ).length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Inbox className="h-8 w-8" /> My Inbox
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Baru / Unassigned
            </span>
            <Badge variant="secondary">{stats.baru}</Badge>
          </div>
          <div className="text-3xl font-bold mt-2">{stats.baru}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              In Progress
            </span>
            <Badge variant="secondary">{stats.progress}</Badge>
          </div>
          <div className="text-3xl font-bold mt-2">{stats.progress}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Resolved / Closed
            </span>
            <Badge variant="secondary">{stats.resolved}</Badge>
          </div>
          <div className="text-3xl font-bold mt-2">{stats.resolved}</div>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Tiket Saya & Pool Kontrak</h2>
        {tickets.length === 0 ? (
          <Card className="p-8 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Tidak ada tiket baru di kontrak Anda atau yang ditugaskan kepada Anda.
            </p>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
              <Card
                className={`p-4 hover:bg-accent/50 transition-colors cursor-pointer mb-3 ${
                  ticket.status === "RESOLVED" ? "opacity-75 bg-muted/20" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          ticket.priority === "HIGH"
                            ? "destructive"
                            : ticket.priority === "MEDIUM"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {ticket.priority}
                      </Badge>

                      <Badge
                        variant="outline"
                        className={`
                        ${
                          ticket.status === "RESOLVED" ||
                          ticket.status === "CLOSED"
                            ? "text-green-600 border-green-300 bg-green-50"
                            : ""
                        }
                        ${
                          ticket.status === "IN_PROGRESS"
                            ? "text-blue-600 border-blue-300 bg-blue-50"
                            : ""
                        }
                        ${
                          ticket.status === "NEW"
                            ? "text-purple-600 border-purple-300 bg-purple-50"
                            : ""
                        }
                        ${
                          ticket.status === "REJECTED"
                            ? "text-red-600 border-red-300 bg-red-50 font-bold"
                            : ""
                        }
                        ${
                          ticket.status === "NOT_APPLICABLE"
                            ? "text-gray-600 border-gray-300 bg-gray-100"
                            : ""
                        }
                      `}
                      >
                        {ticket.status.replace(/_/g, " ")}
                      </Badge>

                      {!ticket.assignedToId ? (
                        <Badge
                          variant="outline"
                          className="text-amber-600 border-amber-200 bg-amber-50"
                        >
                          Needs Claim
                        </Badge>
                      ) : (
                        <Badge variant="outline">Assigned</Badge>
                      )}
                    </div>

                    <h3
                      className={`font-medium mt-1 ${
                        ticket.status === "RESOLVED"
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {ticket.title}
                    </h3>

                    <p className="text-sm text-muted-foreground">
                      {ticket.customer?.name || "Tanpa Customer"} -{" "}
                      {ticket.category?.name || "Tanpa Kategori"}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(ticket.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}

                      {ticket.status === "RESOLVED" && (
                        <span className="flex items-center gap-1 text-green-600 font-medium ml-2">
                          <CheckCircle className="h-3 w-3" /> Selesai
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}