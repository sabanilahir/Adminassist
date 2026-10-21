"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, Search, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function DownloadPdfButton({ contracts: propContracts = [] }: { contracts?: any[] }) {
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<any[]>(propContracts);
  
  useEffect(() => {
    setContracts(propContracts);
  }, [propContracts]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContractId, setSelectedContractId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [selectedStatus, setSelectedStatus] = useState("RESOLVED_CLOSED");
  
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredContracts = contracts.filter((c: any) => {
    const query = searchQuery.toLowerCase();
    const contractNo = c.contractNumber?.toLowerCase() || "";
    const customerName = c.customer?.company?.toLowerCase() || c.customer?.name?.toLowerCase() || "";
    const contactName = c.contactName?.toLowerCase() || "";
    
    return contractNo.includes(query) || customerName.includes(query) || contactName.includes(query);
  });

  const activeContract = contracts.find((c: any) => c.id === selectedContractId);

  async function handleDownload() {
    if (!selectedContractId) {
      alert("Silakan cari dan pilih kontrak terlebih dahulu!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tickets");
      if (!res.ok) throw new Error("Gagal mengambil data dari server tiket.");

      const text = await res.text();
      const tickets = text ? JSON.parse(text) : [];
      
      if (!Array.isArray(tickets)) return;

      const reportTickets = tickets.filter((t: any) => {
        // --- LOGIKA FILTER STATUS ---
        if (selectedStatus === "ALL") {
          // Jika "ALL", lewati filter status (tampilkan semua status)
        } else if (selectedStatus === "RESOLVED_CLOSED") {
          if (t.status !== "RESOLVED" && t.status !== "CLOSED") return false;
        } else {
          if (t.status !== selectedStatus) return false;
        }

        const targetDate = t.resolvedAt || t.createdAt;
        if (targetDate) {
          const ticketMonth = new Date(targetDate).toISOString().slice(0, 7);
          if (ticketMonth !== selectedMonth) return false;
        }

        if (t.contractId !== selectedContractId) {
          return false;
        }

        return true;
      });

      // --- Cek jika data row kosong ---
      if (reportTickets.length === 0) {
        alert("Data tidak ditemukan");
        setLoading(false);
        return;
      }

      // --- PERHITUNGAN AKURAT BERDASARKAN mandaysType & mandaysSpent ---
      const totalMandaysSpent = reportTickets.reduce((acc: number, t: any) => {
        const val = Number(t.mandaysSpent || 0);
        const type = t.mandaysType || "MANDAYS";

        const mandaysEquivalent = type === "HOURS" ? val / 8 : val;
        return acc + mandaysEquivalent;
      }, 0);

      const formattedMandaysSpent = Number(totalMandaysSpent.toFixed(2));
      const totalHoursSpent = Number((totalMandaysSpent * 8).toFixed(1));

      const correctiveTotal = activeContract ? Number(activeContract.correctiveMandays || 0) : 0;
      const correctiveAvailable = Math.max(0, correctiveTotal - formattedMandaysSpent);

      const doc = new jsPDF("landscape", "mm", "a4");

      // --- HEADER LAPORAN ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("MONTHLY MAINTENANCE & ACTIVITY REPORT", 14, 15);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Periode Bulan: ${selectedMonth}`, 14, 21);
      doc.text(`Kontrak: ${activeContract?.contractNumber || "-"}`, 14, 26);
      doc.text(`Customer: ${activeContract?.customer?.company || activeContract?.customer?.name || "-"}`, 14, 31);
      doc.text(`Status Filter: ${selectedStatus}`, 14, 36);
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 41);

      // --- TABEL DATA AKTIVITAS ---
      const tableData = reportTickets.map((t: any, index: number) => {
        const val = Number(t.mandaysSpent || 0);
        const type = t.mandaysType || "MANDAYS";

        const hours = type === "HOURS" ? val : val * 8;
        const md = type === "HOURS" ? Number((val / 8).toFixed(2)) : val;

        return [
          index + 1,
          t.customer?.company || t.customer?.name || "-",
          t.title || "-",
          t.category?.name || "-",
          t.description || "-",
          t.createdAt ? new Date(t.createdAt).toLocaleDateString('id-ID') : "-",
          t.user?.name || "-",
          t.assignedTo?.name || "-",
          t.rootCause || "-",
          t.resolution || "-",
          `${hours} Jam (~${md} MD)`,
          t.resolvedAt ? new Date(t.resolvedAt).toLocaleDateString('id-ID') : "-",
          t.status
        ];
      });

      autoTable(doc, {
        startY: 46,
        head: [[
          "No", "Customer", "Problem Name", "Category", "Description", 
          "Incident Date", "Pelapor", "Engineer", "Root Cause Analysis", "Resolution", "Lama Pengerjaan", "Closed Date", "Status"
        ]],
        body: tableData,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      let finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 120;

      // --- SUMMARY MANDAYS QUOTA BLOCK ---
      if (finalY > 150) {
        doc.addPage();
        finalY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("MANDAYS QUOTA SUMMARY (1 MD = 8 Hours)", 14, finalY);

      const summaryData = [
        ["Total Terpakai (Periode Ini)", `${totalHoursSpent} Jam (~${formattedMandaysSpent} MD)`],
        ["Total Kuota Mandays Kontrak", `${correctiveTotal * 8} Jam (${correctiveTotal} MD)`],
        ["Sisa Kuota Mandays Tersedia", `${Number((correctiveAvailable * 8).toFixed(1))} Jam (~${correctiveAvailable} MD)`]
      ];

      autoTable(doc, {
        startY: finalY + 4,
        head: [["Keterangan", "Jumlah"]],
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [52, 73, 94], textColor: 255 },
        columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 60, fontStyle: 'bold' } }
      });

      // --- BLOK TANDA TANGAN ---
      let signatureY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : finalY + 30;
      
      if (signatureY > 165) {
        doc.addPage();
        signatureY = 25;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const pmAgName = activeContract?.projectManager?.name || "Project Manager AG";
      const clientContactName = activeContract?.contactName || "Penanggung Jawab Client";

      doc.text("Disusun Oleh,", 14, signatureY);
      doc.text("Project Manager AG", 14, signatureY + 5);
      doc.text(`( ${pmAgName} )`, 14, signatureY + 30);

      doc.text("Disetujui Oleh,", 210, signatureY);
      doc.text("Penanggung Jawab (Client PIC)", 210, signatureY + 5);
      doc.text(`( ${clientContactName} )`, 210, signatureY + 30);

      doc.save(`Monthly-Service-Report-${selectedMonth}.pdf`);
    } catch (error) {
      console.error("Gagal mendownload PDF:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Pilih Bulan Laporan</Label>
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5 relative" ref={dropdownRef}>
          <Label className="text-xs font-medium text-muted-foreground">Cari Kontrak / Customer</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Ketik nama customer / no kontrak..."
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
                if (!e.target.value) setSelectedContractId("");
              }}
              className="w-full h-10 pl-9 pr-8 rounded-md border border-input bg-background text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedContractId("");
                  setIsDropdownOpen(false);
                }}
                className="absolute right-2.5 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {isDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full bg-popover text-popover-foreground rounded-md border shadow-lg max-h-60 overflow-auto">
              {filteredContracts.length > 0 ? (
                filteredContracts.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedContractId(c.id);
                      setSearchQuery(`${c.contractNumber} - ${c.customer?.company || c.customer?.name}`);
                      setIsDropdownOpen(false);
                    }}
                    className="px-3 py-2.5 text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground border-b last:border-none transition-colors"
                  >
                    <div className="font-semibold text-foreground">{c.contractNumber}</div>
                    <div className="text-muted-foreground">{c.customer?.company || c.customer?.name}</div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                      PIC: {c.contactName || "-"}
                    </div>
                    <div className="text-[10px] text-purple-600 dark:text-purple-400">
                      PM: {c.projectManager?.name || "-"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-3 text-xs text-muted-foreground text-center">Kontrak tidak ditemukan</div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Filter Status Tiket</Label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Pilih Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status (Semua)</SelectItem> {/* <-- Opsi ALL ditambahkan */}
              <SelectItem value="RESOLVED_CLOSED">Resolved & Closed (Default)</SelectItem>
              <SelectItem value="RESOLVED">Resolved Only</SelectItem>
              <SelectItem value="CLOSED">Closed Only</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="NOT_APPLICABLE">Not Applicable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleDownload} disabled={loading || !selectedContractId} className="w-full bg-red-600 hover:bg-red-700 text-white h-10 mt-2 font-medium">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
        Download Filtered PDF Report
      </Button>
    </div>
  );
}