"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Loader2, X } from "lucide-react";

interface EditUserButtonProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function EditUserButton({ user }: EditUserButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const payload: any = { name, email, role };
      if (password.trim() !== "") {
        payload.password = password;
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mengupdate user");
      }

      setIsOpen(false);
      setPassword("");
      router.refresh(); // Refresh data pada Server Component
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} title="Edit User">
        <Edit className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-lg border shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold">Edit User</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs text-red-500 bg-red-500/10 rounded-md">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
                    <SelectItem value="PIC">PIC</SelectItem>
                    <SelectItem value="USER">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password Baru (Opsional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Kosongkan jika tidak ingin mengubah password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}