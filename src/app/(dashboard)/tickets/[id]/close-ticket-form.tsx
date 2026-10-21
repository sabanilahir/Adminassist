"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";

interface CloseTicketFormProps {
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CloseTicketForm({ ticketId, open, onOpenChange, onSuccess }: CloseTicketFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ rootCause: "", resolution: "", reference: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickets/${ticketId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to close ticket");
        return;
      }

      onOpenChange(false);
      setFormData({ rootCause: "", resolution: "", reference: "" });
      onSuccess?.();
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Close Ticket
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="rootCause">Root Cause *</Label>
            <Textarea id="rootCause" value={formData.rootCause} onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })} placeholder="Explain the root cause..." required rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution">Resolution *</Label>
            <Textarea id="resolution" value={formData.resolution} onChange={(e) => setFormData({ ...formData, resolution: e.target.value })} placeholder="Describe how resolved..." required rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference (Link/Document)</Label>
            <Input id="reference" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="OpenText or Knowledge Base link" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Closing..." : "Close Ticket"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
