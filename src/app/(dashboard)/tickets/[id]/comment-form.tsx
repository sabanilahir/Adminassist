"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

interface CommentFormProps {
  ticketId: string;
  isAgent: boolean;
}

export function CommentForm({ ticketId, isAgent }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("content", content);
    formData.append("isInternal", isInternal.toString());

    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          isInternal,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to add comment");
      } else {
        setContent("");
        setIsInternal(false);
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-sm font-semibold mb-4">Add a comment</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            isAgent
              ? "Add a public reply or internal note..."
              : "Add a reply to the ticket..."
          }
          className="min-h-[120px]"
        />

        <div className="flex items-center justify-between">
          {isAgent && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isInternal}
                onCheckedChange={(checked) => setIsInternal(checked as boolean)}
              />
              <span className="text-muted-foreground">Internal note (only visible to staff)</span>
            </label>
          )}

          <Button type="submit" disabled={loading || !content.trim()} className="ml-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Post Comment"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}