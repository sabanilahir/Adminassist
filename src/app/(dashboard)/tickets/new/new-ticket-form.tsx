"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowLeft, Loader2, UserCircle, Check, ChevronsUpDown, FileText, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function NewTicketForm({ categories }: { categories: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [customers, setCustomers] = useState<any[]>([]);
  const [availableContracts, setAvailableContracts] = useState<any[]>([]);
  
  // Form State
  const [cust, setCust] = useState("");
  const [contract, setContract] = useState("");
  const [autoPm, setAutoPm] = useState<{ id: string; name: string } | null>(null);
  const [category, setCategory] = useState("");
  const [otherDescription, setOtherDescription] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  
  // Tanggal Pelaporan (Default hari ini) & Nama Pelapor (Default contactName kontrak)
  const [reportedAt, setReportedAt] = useState(() => new Date().toISOString().split("T")[0]);
  const [reporterName, setReporterName] = useState("");
  
  // UI State
  const [openCust, setOpenCust] = useState(false);
  const [openContract, setOpenContract] = useState(false);
  const [modal, setModal] = useState(false);
  
  // New Customer State
  const [newC, setNewC] = useState({ name: "", email: "", phone: "", company: "" });
  const [creating, setCreating] = useState(false);

  // Pastikan kategori "Others" selalu ada dalam daftar pilihan
  const categoryList = useMemo(() => {
    const list = Array.isArray(categories) ? [...categories] : [];
    const hasOthers = list.some(c => c.name?.toLowerCase() === "others");
    if (!hasOthers) {
      list.push({ id: "cat-others", name: "Others" });
    }
    return list;
  }, [categories]);

  const isOthersCategory = useMemo(() => {
    const catObj = categoryList.find(c => c.id === category);
    return catObj?.name?.toLowerCase() === "others";
  }, [category, categoryList]);

  useEffect(() => { 
    fetch("/api/customers")
      .then(r => r.json())
      .then((d: any) => { if (Array.isArray(d)) setCustomers(d); })
      .catch(() => {}); 
  }, []);

  function onCustChange(id: string) { 
    setCust(id); 
    setContract(""); 
    setAutoPm(null);
    setReporterName("");
    const selectedCustomer = customers.find(x => x.id === id); 
    setAvailableContracts(selectedCustomer?.contracts || []); 
  }

  function onContractChange(id: string) {
    setContract(id);
    const selectedContract = availableContracts.find(c => c.id === id);
    setAutoPm(selectedContract?.projectManager || null);
    // Jadikan default adalah nama contact person dari customer berdasarkan kontrak
    if (selectedContract?.contactName) {
      setReporterName(selectedContract.contactName);
    }
  }

  async function createC(e: React.FormEvent) {
    e.preventDefault(); setCreating(true);
    try {
      const r = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newC) });
      if (r.ok) { 
        const created = await r.json(); 
        setCustomers([...customers, created]); 
        onCustChange(created.id); 
        setModal(false); 
      }
    } catch (ex) { console.error(ex); }
    setCreating(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !desc || !cust || !contract) return;
    if (isOthersCategory && !otherDescription.trim()) {
      alert("Harap isi deskripsi khusus untuk kategori Others.");
      return;
    }
    setLoading(true);
    try {
      const finalDescription = isOthersCategory && otherDescription.trim()
        ? `${desc}\n\n[Kategori Lainnya / Others]:\n${otherDescription.trim()}`
        : desc;

      const payload = { 
        title, 
        description: finalDescription, 
        customerId: cust, 
        contractId: contract,
        agentId: autoPm?.id || undefined, // Set PM sebagai technical assign
        categoryId: category || undefined, 
        priority: "MEDIUM", // Priority otomatis diset default MEDIUM tanpa ditampilkan di form
        reporterName: reporterName.trim() || undefined,
        reportedAt: reportedAt ? new Date(reportedAt).toISOString() : new Date().toISOString()
      };
      
      const r = await fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) router.push("/tickets");
    } catch (ex) { console.error(ex); }
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Link href="/tickets" className="flex items-center text-muted-foreground"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
      <h1 className="text-3xl font-bold">Create Ticket</h1>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
          {/* SEARCHABLE CUSTOMER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Customer *</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setModal(true)} className="h-auto p-0 text-primary"><UserCircle className="h-4 w-4 mr-1" />New Customer</Button>
            </div>
            <Popover open={openCust} onOpenChange={setOpenCust}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openCust} className="w-full justify-between">
                  {cust ? customers.find((c) => c.id === cust)?.name : "Search customer..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Search customer..." />
                  <CommandList>
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      {customers.map((c) => (
                        <CommandItem key={c.id} value={c.name} onSelect={() => { onCustChange(c.id); setOpenCust(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", cust === c.id ? "opacity-100" : "opacity-0")} />
                          {c.name} ({c.customerCode})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* SEARCHABLE CONTRACT */}
          <div className="space-y-2">
            <Label>Contract *</Label>
            <Popover open={openContract} onOpenChange={setOpenContract}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openContract} disabled={!cust} className="w-full justify-between">
                  {contract ? availableContracts.find((c) => c.id === contract)?.contractNumber : (cust ? "Search contract..." : "Select customer first")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Search contract..." />
                  <CommandList>
                    <CommandEmpty>No contract found.</CommandEmpty>
                    <CommandGroup>
                      {availableContracts.map((c) => (
                        <CommandItem key={c.id} value={c.contractNumber || "No Number"} onSelect={() => { onContractChange(c.id); setOpenContract(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", contract === c.id ? "opacity-100" : "opacity-0")} />
                          <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                          {c.contractNumber || "No Contract Number"}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* PM INDICATOR */}
          {autoPm && (
            <div className="text-xs text-muted-foreground bg-background p-2.5 rounded border flex items-center justify-between">
              <span>Assigned Project Manager:</span>
              <span className="font-semibold text-foreground">{autoPm.name}</span>
            </div>
          )}
        </div>

        {/* INPUT TANGGAL PELAPORAN & NAMA PELAPOR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" /> Tanggal Pelaporan *
            </Label>
            <Input 
              type="date" 
              value={reportedAt} 
              onChange={e => setReportedAt(e.target.value)} 
              required 
            />
            <p className="text-[11px] text-muted-foreground">Default hari ini, sesuaikan jika laporan diterima tanggal sebelumnya.</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-muted-foreground" /> Nama Pelapor
            </Label>
            <Input 
              placeholder="Nama kontak person pelapor" 
              value={reporterName} 
              onChange={e => setReporterName(e.target.value)} 
            />
            <p className="text-[11px] text-muted-foreground">Otomatis terisi dari contact person kontrak, dapat diubah jika berbeda.</p>
          </div>
        </div>

        <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} required /></div>
        <div className="space-y-2"><Label>Description *</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={5} required /></div>
        
        {/* JENIS / KATEGORI TIKET */}
        <div className="space-y-2">
          <Label>Jenis / Kategori Tiket</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih Jenis / Kategori Tiket" />
            </SelectTrigger>
            <SelectContent>
              {categoryList.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* FIELD DESKRIPSI KATEGORI OTHERS JIKA DIPILIH */}
        {isOthersCategory && (
          <div className="space-y-2 p-3 bg-muted/40 rounded-md border border-dashed border-primary/50 animate-in fade-in duration-200">
            <Label className="text-primary font-semibold text-sm">
              Deskripsi Kategori Others *
            </Label>
            <Textarea 
              placeholder="Jelaskan secara spesifik kategori / jenis kendala yang dimaksud..."
              value={otherDescription}
              onChange={e => setOtherDescription(e.target.value)}
              rows={3}
              required
            />
            <p className="text-[11px] text-muted-foreground">Keterangan ini akan disertakan dalam detail deskripsi tiket.</p>
          </div>
        )}

        <Button type="submit" disabled={loading || !contract} className="w-full">{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Ticket</Button>
      </form>

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent>
          <DialogTitle>Register Customer</DialogTitle>
          <form onSubmit={createC} className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={newC.name} onChange={e => setNewC({...newC, name: e.target.value})} required /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={newC.email} onChange={e => setNewC({...newC, email: e.target.value})} required /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={newC.phone} onChange={e => setNewC({...newC, phone: e.target.value})} /></div>
            <div className="space-y-2"><Label>Company</Label><Input value={newC.company} onChange={e => setNewC({...newC, company: e.target.value})} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
