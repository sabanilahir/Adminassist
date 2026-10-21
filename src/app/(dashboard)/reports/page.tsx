import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/actions/ticket-actions";
import { prisma } from "@/lib/prisma";
import { DownloadPdfButton } from "@/components/download-pdf-button";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import Link from "next/link";

export default async function ReportsPage() {
  const session = await auth();

  if (!session) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Please sign in to access reports.</p>
      </div>
    );
  }

  const role = session.user.role;
  const userId = session.user.id;

  // Batasi halaman ini hanya untuk PROJECT_MANAGER dan ADMIN
  if (role !== "PROJECT_MANAGER" && role !== "ADMIN") {
    redirect("/dashboard");
  }

  let stats: any = {
    totalTickets: 0,
    newTickets: 0,
    notApplicableTickets: 0,
    resolvedTickets: 0,
    highPriorityTickets: 0,
  };

  let allowedContracts: any[] = [];

  try {
    stats = await getDashboardStats();

    // Ambil kontrak sesuai role: PM hanya kontrak yang dia handle, Admin semua kontrak
   allowedContracts = await prisma.contract.findMany({
  where: role === "PROJECT_MANAGER" ? { projectManagerId: userId } : {},
  select: {
    id: true,
    contractNumber: true,
    contactName: true,
    customer: { select: { id: true, name: true, company: true } },
    pics: { select: { id: true, name: true } },
    projectManager: { select: { id: true, name: true } }, // <-- Tambahkan baris ini
  },
  orderBy: { contractNumber: "asc" },
});
  } catch (error) {
    console.error("Error loading reports:", error);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate and download ticket reports
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Total Tickets</p>
          <p className="text-3xl font-bold mt-1">{stats.totalTickets}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">New</p>
          <p className="text-3xl font-bold mt-1 text-blue-500">{stats.newTickets}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Not Applicable</p>
          <p className="text-3xl font-bold mt-1 text-muted-foreground">{stats.notApplicableTickets}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Resolved</p>
          <p className="text-3xl font-bold mt-1 text-green-500">{stats.resolvedTickets}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">High Priority</p>
          <p className="text-3xl font-bold mt-1 text-red-500">{stats.highPriorityTickets}</p>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <FileText className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">PDF Report</h3>
              <p className="text-sm text-muted-foreground">
                Download ticket report as PDF document
              </p>
            </div>
          </div>
          {/* Kirim daftar kontrak yang diizinkan ke komponen PDF button */}
          <DownloadPdfButton contracts={allowedContracts} />
        </div>
      </div>

      {/* Report Info */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="font-semibold mb-2">About Reports</h3>
        <p className="text-sm text-muted-foreground">
          <strong>PDF Report:</strong> Professional document with summary statistics and 
          complete ticket listing. Easy to print and share.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          For filtered reports, please use the{" "}
          <Link href="/tickets" className="text-primary hover:underline">
            Tickets page
          </Link>{" "}
          to filter data before viewing.
        </p>
      </div>
    </div>
  );
}