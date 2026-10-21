"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { updateTicket, claimTicket } from "@/actions/ticket-actions";
import { Loader2 } from "lucide-react";
import { NotApplicableButton } from "./not-applicable-button";

export function TicketActions({ ticket, session }: { ticket: any; session: any }) {
  const router = useRouter();
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [assignedToId, setAssignedToId] = useState(ticket.assignedToId || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const isPM = session?.user?.role === "PROJECT_MANAGER";
  const isPIC = session?.user?.role === "PIC";
  const canClaim = isPIC && !ticket.assignedToId;

  async function handleClaim() {
    setClaiming(true);
    const result = await claimTicket(ticket.id);
    if (result?.success) router.refresh();
    setClaiming(false);
  }

  async function handleSave() {
    setSaving(true);
    const data: any = {};
    if (status !== ticket.status) data.status = status;
    if (priority !== ticket.priority) data.priority = priority;
    if (isPM && assignedToId && assignedToId !== ticket.assignedToId) data.assignedToId = assignedToId || null;
    const result = await updateTicket(ticket.id, data);
    if (result?.success) router.refresh();
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {canClaim && (
          <Button onClick={handleClaim} disabled={claiming} className="w-full">
            {claiming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Claim Ticket
          </Button>
        )}
        {ticket.assignedTo && (
          <div className="text-sm"><span className="text-muted-foreground">Assigned to:</span> <Badge variant="outline">{ticket.assignedTo.name}</Badge></div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="WAITING_REPLY">Waiting Reply</SelectItem>
              <SelectItem value="REPLIED">Replied</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
              {/* NOT_APPLICABLE dihapus dari sini agar wajib lewat modal khusus PM */}
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isPM && ticket.customer?.pics && ticket.customer.pics.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Assign to PIC</label>
            <Select value={assignedToId} onValueChange={setAssignedToId}>
              <SelectTrigger><SelectValue placeholder="Select PIC" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {ticket.customer.pics.map((pic: any) => (
                  <SelectItem key={pic.id} value={pic.id}>{pic.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>

        {/* Tombol khusus PM untuk mengisi alasan Not Applicable */}
        {isPM && (
          <div className="pt-2 border-t">
            <NotApplicableButton ticketId={ticket.id} userRole={session?.user?.role} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}