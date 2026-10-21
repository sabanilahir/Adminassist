"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateTicket } from "@/actions/ticket-actions";
import { Loader2 } from "lucide-react";

export function CloseTicketFormWrapper({ ticketId, onSuccess }: { ticketId: string; onSuccess?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rootCause, setRootCause] = useState("");
  const [resolution, setResolution] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    const result = await updateTicket(ticketId, { status: "RESOLVED", rootCause, resolution, reference });
    if (result?.success) {
      setOpen(false);
      router.refresh();
      onSuccess?.();
    }
    setLoading(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full">Close Ticket</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close Ticket</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Root Cause *</Label>
              <Textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} placeholder="Describe the root cause..." required />
            </div>
            <div className="space-y-2">
              <Label>Resolution *</Label>
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Describe the resolution..." required />
            </div>
            <div className="space-y-2">
              <Label>Reference (URL)</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="https://..." />
            </div>
            <Button onClick={handleSubmit} disabled={loading || !rootCause || !resolution} className="w-full">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Close Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
