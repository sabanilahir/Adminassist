"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface CustomerFormProps {
  customer?: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomerForm({ customer, isOpen, onClose, onSuccess }: CustomerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (customer?.id) {
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        company: customer.company || "",
        address: customer.address || "",
      });
    } else {
      setFormData({ name: "", email: "", phone: "", company: "", address: "" });
    }
  }, [isOpen, customer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = customer?.id ? `/api/customers/${customer.id}` : "/api/customers";
    const method = customer?.id ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan customer");

      onSuccess();
      onClose();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {customer?.id ? "Edit Customer" : "Add New Customer"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input 
                required 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input 
                required 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={formData.phone} 
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input 
                value={formData.company} 
                onChange={(e) => setFormData({ ...formData, company: e.target.value })} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input 
              value={formData.address} 
              onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {customer?.id ? "Save Changes" : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}