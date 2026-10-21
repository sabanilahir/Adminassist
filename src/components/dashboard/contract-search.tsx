"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, FileText, Search } from "lucide-react";

export function ContractSearch({ contracts }: { contracts: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter kontrak berdasarkan nomor kontrak atau nama perusahaan customer
  const filteredContracts = contracts.filter((contract) => {
    const query = searchQuery.toLowerCase();
    const contractNo = contract.contractNumber?.toLowerCase() || "";
    const customerName = contract.customer?.company?.toLowerCase() || contract.customer?.name?.toLowerCase() || "";
    return contractNo.includes(query) || customerName.includes(query);
  });

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari berdasarkan nomor kontrak atau customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-background"
        />
      </div>

      {/* Grid List Kontrak */}
      {filteredContracts.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Tidak ada kontrak yang sesuai dengan pencarian &quot;{searchQuery}&quot;.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContracts.map((contract) => {
            const availCorrective = Math.max(0, contract.correctiveMandays - contract.usedCorrective);
            const availPreventive = Math.max(0, contract.preventiveMandays - contract.usedPreventive);

            return (
              <Card key={contract.id} className="p-5 space-y-4 shadow-sm hover:shadow transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {contract.customer?.company || contract.customer?.name || "Customer"}
                    </span>
                    <h3 className="font-bold text-lg mt-0.5 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" /> {contract.contractNumber}
                    </h3>
                  </div>
                </div>

                {/* Corrective Quota */}
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Corrective Maintenance</span>
                    <span className="text-amber-600 font-semibold">{contract.usedCorrective} / {contract.correctiveMandays} MD</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex justify-between">
                    <span>Tersedia:</span>
                    <span className="font-bold text-green-600">{availCorrective} MD</span>
                  </div>
                </div>

                {/* Preventive Quota */}
                <div className="space-y-1 bg-muted/30 p-2.5 rounded-md">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Preventive Maintenance</span>
                    <span className="text-blue-600 font-semibold">{contract.usedPreventive} / {contract.preventiveMandays} MD</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex justify-between">
                    <span>Tersedia:</span>
                    <span className="font-bold text-green-600">{availPreventive} MD</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}