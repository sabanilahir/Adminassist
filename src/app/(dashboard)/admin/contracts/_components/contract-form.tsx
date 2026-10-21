"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X, FileText, Trash2, Upload } from "lucide-react";

export function ContractForm({ contract, onSuccess, isOpen, onClose }: any) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [pms, setPms] = useState<any[]>([]);
  const [pics, setPics] = useState<any[]>([]);

  const [form, setForm] = useState({
    customerId: "", 
    contractNumber: "", 
    correctiveMandays: 0,
    preventiveMandays: 0,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    startDate: "",
    endDate: "",
  });

  // State Array untuk mendukung Banyak Dokumen
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  
  const [selectedPm, setSelectedPm] = useState("");
  const [selectedPics, setSelectedPics] = useState<string[]>([]);

  const isShow = isOpen !== undefined ? isOpen : internalOpen;
  const handleClose = () => {
    if (onClose) onClose();
    setInternalOpen(false);
  };
  const handleOpen = () => {
    setInternalOpen(true);
  };

  useEffect(() => {
    if (!isShow && !contract?.id) return;
    Promise.all([
      fetch("/api/customers").then(r => r.json()),
      fetch("/api/users?role=PROJECT_MANAGER").then(r => r.json()),
      fetch("/api/users?role=PIC").then(r => r.json()),
    ]).then(([c, u, p]) => {
      setCustomers(Array.isArray(c) ? c : []);
      setPms(Array.isArray(u) ? u : []);
      setPics(Array.isArray(p) ? p : []);
      
      if (contract?.id) {
        setForm({
          customerId: contract.customerId || "",
          contractNumber: contract.contractNumber || "",
          correctiveMandays: contract.correctiveMandays || 0,
          preventiveMandays: contract.preventiveMandays || 0,
          contactName: contract.contactName || "",
          contactEmail: contract.contactEmail || "",
          contactPhone: contract.contactPhone || "",
          startDate: contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : "",
          endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : "",
        });

        // Tangani data dokumen lama (array documentUrls atau fallback string documentUrl)
        const docs = contract.documentUrls?.length 
          ? contract.documentUrls 
          : (contract.documentUrl ? [contract.documentUrl] : []);
        setDocumentUrls(docs);

        setSelectedPm(contract.projectManagerId || "");
        setSelectedPics(contract.pics?.map((p: any) => p.id) || []);
      } else {
        setForm({
          customerId: "",
          contractNumber: "",
          correctiveMandays: 0,
          preventiveMandays: 0,
          contactName: "",
          contactEmail: "",
          contactPhone: "",
          startDate: "",
          endDate: "",
        });
        setDocumentUrls([]);
        setSelectedPm("");
        setSelectedPics([]);
      }
    });
  }, [isShow, contract?.id]);

  // Handler Upload Multiple Files
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadData = new FormData();
    Array.from(files).forEach((file) => {
      uploadData.append("files", file); // Kirim sebagai 'files'
    });

    try {
      setUploading(true);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      if (res.ok) {
        const data = await res.json();
        // Asumsi API mengembalikan { urls: ["/uploads/file1.pdf", ...] } atau { url: "..." }
        const newUrls = data.urls || (data.url ? [data.url] : []);
        setDocumentUrls((prev) => [...prev, ...newUrls]);
      } else {
        alert("Gagal mengunggah dokumen.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Terjadi kesalahan saat mengunggah file.");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset input file agar dapat memilih file yang sama lagi jika perlu
    }
  }

  // Handler Hapus Dokumen tertentu dari daftar
  function handleRemoveDocument(indexToRemove: number) {
    setDocumentUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = contract?.id ? "/api/contracts/" + contract.id : "/api/contracts";
    const res = await fetch(url, {
      method: contract?.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        ...form, 
        documentUrls, // Kirimkan array documentUrls ke API
        projectManagerId: selectedPm, 
        picIds: selectedPics 
      }),
    });
    
    if (res.ok) { 
      handleClose(); 
      onSuccess?.(); 
      router.refresh(); 
    } else {
      alert("Gagal menyimpan kontrak.");
    }
    setLoading(false);
  }

  if (isOpen === undefined) {
    if (!internalOpen && !contract?.id) return <Button onClick={handleOpen}>New Contract</Button>;
    if (contract?.id && !internalOpen) return <Button variant="outline" size="sm" onClick={handleOpen}>Edit</Button>;
  }

  if (!isShow) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{contract?.id ? "Edit Contract" : "New Contract"}</h2>
          <button onClick={handleClose} className="p-1 hover:bg-accent rounded"><X className="h-5 w-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <select 
                value={form.customerId} 
                onChange={e => setForm({...form, customerId: e.target.value})} 
                className="w-full p-2 border rounded bg-background text-foreground" 
                required
              >
                <option value="">Select Customer</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Contract Number</Label>
              <Input 
                value={form.contractNumber} 
                onChange={e => setForm({...form, contractNumber: e.target.value})} 
                placeholder="CONTRACT-001" 
              />
            </div>
          </div>

          {/* Periode Tanggal Kontrak */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input 
                type="date"
                value={form.startDate} 
                onChange={e => setForm({...form, startDate: e.target.value})} 
                className="dark:[color-scheme:dark]"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input 
                type="date"
                value={form.endDate} 
                onChange={e => setForm({...form, endDate: e.target.value})} 
                className="dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Informasi Contact Person / PIC Klien Spesifik Kontrak */}
          <div className="border p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Client Contact Person (PIC Kontrak)</h3>
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input 
                value={form.contactName} 
                onChange={e => setForm({...form, contactName: e.target.value})} 
                placeholder="Nama penanggung jawab di klien" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input 
                  type="email"
                  value={form.contactEmail} 
                  onChange={e => setForm({...form, contactEmail: e.target.value})} 
                  placeholder="email@client.com" 
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input 
                  value={form.contactPhone} 
                  onChange={e => setForm({...form, contactPhone: e.target.value})} 
                  placeholder="08123456789" 
                />
              </div>
            </div>
          </div>

          {/* Mandays */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Corrective Mandays</Label>
              <Input 
                type="number" 
                value={form.correctiveMandays} 
                onChange={e => setForm({...form, correctiveMandays: parseFloat(e.target.value) || 0})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Preventive Mandays</Label>
              <Input 
                type="number" 
                value={form.preventiveMandays} 
                onChange={e => setForm({...form, preventiveMandays: parseFloat(e.target.value) || 0})} 
              />
            </div>
          </div>

          {/* Multiple Upload Document Files */}
          <div className="space-y-2">
            <Label>Contract Documents (Multiple Files Allowed)</Label>
            <div className="flex items-center gap-2">
              <Input 
                type="file" 
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg"
                className="dark:[color-scheme:dark] cursor-pointer"
                onChange={handleFileUpload}
                disabled={uploading || loading}
              />
              {uploading && <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />}
            </div>

            {/* List Dokumen Terlampir */}
            {documentUrls.length > 0 && (
              <div className="mt-3 space-y-2 border p-3 rounded-md bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Dokumen Terlampir ({documentUrls.length}):
                </p>
                <div className="space-y-1.5">
                  {documentUrls.map((url, idx) => {
                    const fileName = url.split("/").pop() || `Document ${idx + 1}`;
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-background border text-xs">
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-1.5 text-primary hover:underline font-medium truncate max-w-[380px]"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{fileName}</span>
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDocument(idx)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-4">
            <div className="space-y-2">
              <Label>Project Manager</Label>
              <select 
                value={selectedPm} 
                onChange={e => setSelectedPm(e.target.value)} 
                className="w-full p-2 border rounded bg-background text-foreground"
              >
                <option value="">Select PM</option>
                {pms.map((pm: any) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label className="block">Internal PICs (Multiple)</Label>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1">
                {pics.map((pic: any) => (
                  <label key={pic.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent">
                    <input 
                      type="checkbox" 
                      checked={selectedPics.includes(pic.id)} 
                      onChange={(e) => {
                        if (e.target.checked) setSelectedPics([...selectedPics, pic.id]);
                        else setSelectedPics(selectedPics.filter(id => id !== pic.id));
                      }} 
                    />
                    <span className="text-sm">{pic.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {contract?.id ? "Update Contract" : "Create Contract"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}