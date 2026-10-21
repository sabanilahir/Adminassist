"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/actions/user-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";

export function AddUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", role: "USER" as "USER" | "PIC" | "PROJECT_MANAGER" | "ADMIN", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!formData.password) { setError("Password required"); setLoading(false); return; }
      if (formData.password.length < 6) { setError("Password min 6 chars"); setLoading(false); return; }
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("email", formData.email);
      fd.append("role", formData.role);
      fd.append("password", formData.password);
      const result = await createUser(fd);
      if (result.error) { setError(result.error); setLoading(false); return; }
      setOpen(false);
      setFormData({ name: "", email: "", role: "USER", password: "" });
      router.refresh();
    } catch (err) { setError("Failed to create user"); setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Add User</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-destructive text-center">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="PIC">PIC (Penanggung Jawab)</SelectItem>
                <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}