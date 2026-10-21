"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { claimTicket } from "@/actions/ticket-actions";
import { Loader2 } from "lucide-react";

export function ClaimButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClaim() {
    setLoading(true);
    const result = await claimTicket(ticketId);
    if (result?.success) router.refresh();
    setLoading(false);
  }

  return (
    <Button onClick={handleClaim} disabled={loading}>
      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      Claim Ticket
    </Button>
  );
}
