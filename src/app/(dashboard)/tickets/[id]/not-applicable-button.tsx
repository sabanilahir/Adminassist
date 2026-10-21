"use client";

import { useState } from "react";
import { markTicketNotApplicable } from "@/actions/ticket-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export function NotApplicableButton({ ticketId, userRole }: { ticketId: string, userRole: string }) {
  const [reason, setReason] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Komponen ini akan menghilang secara otomatis jika role BUKAN Project Manager
  if (userRole !== "PROJECT_MANAGER") return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert("Alasan wajib diisi!");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await markTicketNotApplicable(ticketId, reason);
      
      if (result.error) {
        alert(result.error);
      } else {
        setIsOpen(false);
        setReason("");
        router.refresh(); // Memuat ulang data terbaru di halaman
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem saat memperbarui tiket.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
          Mark as Not Applicable
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tandai Tiket Not Applicable</DialogTitle>
          <DialogDescription>
            Aksi ini akan mengubah status tiket. Anda wajib menyertakan alasan atau justifikasi yang jelas untuk atasan terkait keputusan ini.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea 
            placeholder="Jelaskan alasan secara detail di sini..." 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[120px] resize-none"
            disabled={isLoading}
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !reason.trim()}>
            {isLoading ? "Menyimpan..." : "Simpan Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}