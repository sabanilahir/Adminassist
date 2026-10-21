import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Lock, MessageSquare } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface CommentListProps {
  comments: Comment[];
  currentUserId: string;
  currentUserRole: string;
  isAgent: boolean;
}

export function CommentList({
  comments,
  currentUserId,
  currentUserRole,
  isAgent,
}: CommentListProps) {
  const visibleComments = comments.filter(
    (comment) => !comment.isInternal || isAgent
  );

  if (visibleComments.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No comments yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleComments.map((comment) => {
        const isOwnComment = comment.user.id === currentUserId;
        const isStaff = comment.user.role === "AGENT" || comment.user.role === "ADMIN";

        return (
          <div
            key={comment.id}
            className={`bg-card rounded-lg border p-4 ${
              comment.isInternal ? "border-amber-500/30 bg-amber-500/5" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{comment.user.name}</span>
                  {isStaff && (
                    <Badge variant="secondary" className="text-xs">
                      {comment.user.role}
                    </Badge>
                  )}
                </div>
                {comment.isInternal && (
                  <Badge variant="warning" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Internal
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
          </div>
        );
      })}
    </div>
  );
}