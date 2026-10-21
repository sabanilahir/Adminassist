"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Plus,
  ExternalLink,
  Mail,
  Phone,
  User,
  Search,
  Eye,
  Building2,
  Calendar,
} from "lucide-react";
import { ContractForm } from "./_components/contract-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ContractListProps {
  initialContracts: any[];
}

export function ContractList({ initialContracts }: ContractListProps) {
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [detailContract, setDetailContract] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleOpenCreate = () => {
    setSelectedContract(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (contract: any) => {
    setSelectedContract(contract);
    setIsFormOpen(true);
  };

  const handleSuccess = () => {
    setIsFormOpen(false);
    setSelectedContract(null);
    router.refresh();
  };

  // Fungsi helper untuk mengecek status expired
  const getContractStatus = (endDate: string | null) => {
    if (!endDate) return { label: "Active", isExpired: false };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    if (end < today) {
      return { label: "Expired", isExpired: true };
    }
    return { label: "Active", isExpired: false };
  };

  // Helper untuk mengekstrak array documentUrls (dengan fallback ke documentUrl lama)
  const getContractDocs = (contract: any): string[] => {
    if (contract?.documentUrls && Array.isArray(contract.documentUrls) && contract.documentUrls.length > 0) {
      return contract.documentUrls;
    }
    if (contract?.documentUrl) {
      return [contract.documentUrl];
    }
    return [];
  };

  const filteredContracts = initialContracts.filter((contract) => {
    const query = searchQuery.toLowerCase();
    const contractNum = contract.contractNumber?.toLowerCase() || "";
    const customerName = contract.customer?.name?.toLowerCase() || "";
    const contactName = contract.contactName?.toLowerCase() || "";
    const contactEmail = contract.contactEmail?.toLowerCase() || "";

    return (
      contractNum.includes(query) ||
      customerName.includes(query) ||
      contactName.includes(query) ||
      contactEmail.includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contracts</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer contracts, mandays, periods, and status
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Contract
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by contract no, customer, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ContractForm
        contract={selectedContract}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleSuccess}
      />

      {/* Modal View Detail Contract */}
      <Dialog open={!!detailContract} onOpenChange={(open) => !open && setDetailContract(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Contract Details
              </span>
              {/* Badge Status di Modal */}
              {(() => {
                const status = getContractStatus(detailContract?.endDate);
                return (
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      status.isExpired
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : "bg-green-500/10 text-green-500 border border-green-500/20"
                    }`}
                  >
                    {status.label}
                  </span>
                );
              })()}
            </DialogTitle>
          </DialogHeader>

          {detailContract && (
            <div className="space-y-4 text-sm">
              <div className="bg-muted/40 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract Number:</span>
                  <span className="font-bold">{detailContract.contractNumber || "No Number"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">{detailContract.customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company Email:</span>
                  <span>{detailContract.customer?.email || "-"}</span>
                </div>
              </div>

              {/* Periode Tanggal Kontrak */}
              <div className="border p-3 rounded-lg space-y-1.5 bg-muted/20">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Contract Period
                </h4>
                <div className="flex justify-between font-medium pt-1">
                  <span>
                    Start Date:{" "}
                    {detailContract.startDate
                      ? new Date(detailContract.startDate).toLocaleDateString()
                      : "-"}
                  </span>
                  <span>
                    End Date:{" "}
                    {detailContract.endDate
                      ? new Date(detailContract.endDate).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </div>

              {/* Info PIC Kontrak */}
              <div className="border p-3 rounded-lg space-y-2">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Client Contact Person
                </h4>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {detailContract.contactName || "No Contact Name"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{detailContract.contactEmail || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{detailContract.contactPhone || "-"}</span>
                </div>
              </div>

              {/* Info Mandays */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 p-3 rounded-lg border">
                  <span className="text-muted-foreground block text-xs font-semibold mb-1">
                    Corrective Mandays
                  </span>
                  <span className="text-lg font-bold">
                    {detailContract.usedCorrective || 0} / {detailContract.correctiveMandays || 0}
                  </span>{" "}
                  Used
                </div>
                <div className="bg-muted/30 p-3 rounded-lg border">
                  <span className="text-muted-foreground block text-xs font-semibold mb-1">
                    Preventive Mandays
                  </span>
                  <span className="text-lg font-bold">
                    {detailContract.usedPreventive || 0} / {detailContract.preventiveMandays || 0}
                  </span>{" "}
                  Used
                </div>
              </div>

              {/* Tim Internal */}
              <div className="space-y-2 pt-2 border-t">
                <div>
                  <span className="text-muted-foreground text-xs block">Project Manager:</span>
                  <span className="font-medium">{detailContract.projectManager?.name || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Internal PICs:</span>
                  <span className="font-medium">
                    {detailContract.pics?.map((p: any) => p.name).join(", ") || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Total Tickets Linked:</span>
                  <span className="font-medium">{detailContract._count?.tickets || 0} Tickets</span>
                </div>
              </div>

              {/* Multiple Documents View pada Modal */}
              {getContractDocs(detailContract).length > 0 && (
                <div className="pt-2 space-y-2 border-t">
                  <span className="text-xs font-semibold text-muted-foreground uppercase block">
                    Attached Contract Documents ({getContractDocs(detailContract).length}):
                  </span>
                  <div className="space-y-1.5">
                    {getContractDocs(detailContract).map((docUrl, idx) => {
                      const fileName = docUrl.split("/").pop() || `Document ${idx + 1}`;
                      return (
                        <a key={idx} href={docUrl} target="_blank" rel="noreferrer" className="block">
                          <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                            <ExternalLink className="h-3.5 w-3.5 mr-2 shrink-0 text-muted-foreground" />
                            <span className="truncate">{fileName}</span>
                          </Button>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetailContract(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daftar Kontrak */}
      <div className="grid gap-4">
        {filteredContracts.map((contract) => {
          const status = getContractStatus(contract.endDate);
          const docs = getContractDocs(contract);

          return (
            <div key={contract.id} className="bg-card rounded-lg border p-4 shadow-sm space-y-4">
              <div className="flex items-start justify-between border-b pb-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">
                        {contract.contractNumber || "No Contract Number"}
                      </h3>
                      {/* Badge Status pada Kartu */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                          status.isExpired
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-green-500/10 text-green-500 border border-green-500/20"
                        }`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-primary flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3.5 w-3.5" /> {contract.customer?.name}
                    </p>
                  </div>
                </div>

                <Button variant="ghost" size="sm" onClick={() => setDetailContract(contract)}>
                  <Eye className="h-4 w-4 mr-1.5" /> View Detail
                </Button>
              </div>

              {/* Periode Tanggal Kontrak pada Kartu */}
              {(contract.startDate || contract.endDate) && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/30 px-3 py-1.5 rounded">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Period:</span>
                  <span className="font-medium text-foreground">
                    {contract.startDate
                      ? new Date(contract.startDate).toLocaleDateString()
                      : "N/A"}{" "}
                    {" — "}{" "}
                    {contract.endDate
                      ? new Date(contract.endDate).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              )}

              {/* Informasi Penanggung Jawab Spesifik Kontrak */}
              {(contract.contactName || contract.contactEmail || contract.contactPhone) && (
                <div className="bg-muted/40 p-3 rounded-md text-xs space-y-1 border">
                  <span className="font-semibold text-muted-foreground block mb-1">
                    Contract Contact Person:
                  </span>
                  <div className="font-medium text-sm flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {contract.contactName || "-"}
                  </div>
                  <div className="flex flex-wrap gap-x-4 text-muted-foreground pt-0.5">
                    {contract.contactEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {contract.contactEmail}
                      </span>
                    )}
                    {contract.contactPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {contract.contactPhone}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-muted/30 p-2 rounded">
                  <span className="text-muted-foreground block text-xs font-semibold mb-1">
                    Corrective Mandays
                  </span>
                  <span className="font-medium">
                    {contract.usedCorrective || 0} / {contract.correctiveMandays || 0}
                  </span>{" "}
                  Used
                </div>
                <div className="bg-muted/30 p-2 rounded">
                  <span className="text-muted-foreground block text-xs font-semibold mb-1">
                    Preventive Mandays
                  </span>
                  <span className="font-medium">
                    {contract.usedPreventive || 0} / {contract.preventiveMandays || 0}
                  </span>{" "}
                  Used
                </div>
                <div className="p-2">
                  <span className="text-muted-foreground block text-xs font-semibold mb-1">
                    Project Manager
                  </span>
                  {contract.projectManager?.name || "-"}
                </div>
                <div className="p-2">
                  <span className="text-muted-foreground block text-xs font-semibold mb-1">
                    PICs
                  </span>
                  {contract.pics?.map((p: any) => p.name).join(", ") || "-"}
                </div>
              </div>

              {/* Baris Tombol Aksi & Multiple Documents Preview */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(contract)}>
                  Edit Contract
                </Button>

                {docs.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    {docs.map((docUrl, idx) => {
                      const fileName = docUrl.split("/").pop() || `Doc ${idx + 1}`;
                      return (
                        <a key={idx} href={docUrl} target="_blank" rel="noreferrer">
                          <Button variant="secondary" size="sm" className="text-xs">
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            {docs.length > 1 ? `Doc ${idx + 1}` : "View Document"}
                          </Button>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredContracts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No contracts found</p>
          </div>
        )}
      </div>
    </div>
  );
}