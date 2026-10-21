"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Loader2, Edit2, FolderTree } from "lucide-react";

interface CategoryFormProps {
  mode?: "create" | "edit";
  category?: {
    id: string;
    name: string;
  };
  onSuccess?: () => void;
}

export function CategoryForm({ mode = "create", category, onSuccess }: CategoryFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    try {
      let response;
      let data;

      if (mode === "edit" && category) {
        response = await fetch(`/api/categories/${category.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
      } else {
        response = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
      }

      data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save category");
      } else {
        setOpen(false);
        if (onSuccess) onSuccess();
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {mode === "edit" && category ? (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Edit2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              {mode === "create" ? "Add New Category" : "Edit Category"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter category name"
                defaultValue={category?.name || ""}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : mode === "create" ? (
                  "Create Category"
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
