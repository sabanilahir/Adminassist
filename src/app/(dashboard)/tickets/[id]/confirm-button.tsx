"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateTicket } from "@/actions/ticket-actions";
import { Loader2 } from "lucide-react";

export function ConfirmButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await updateTicket(ticketId, { status: "CONFIRMED" });
    if (result?.success) router.refresh();
    setLoading(false);
  }

  return (
    <Button onClick={handleConfirm} disabled={loading}>
      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      Confirm Resolution
    </Button>
  );
}
