"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Building2, Search } from "lucide-react";
import { CustomerForm } from "./_components/form";

interface CustomerListProps {
  initialCustomers: any[];
}

export function CustomerList({ initialCustomers }: CustomerListProps) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleOpenCreate = () => {
    setSelectedCustomer(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const handleSuccess = () => {
    setIsFormOpen(false);
    setSelectedCustomer(null);
    router.refresh();
  };

  // Filter customer berdasarkan nama, email, perusahaan, atau telepon secara real-time
  const filteredCustomers = initialCustomers.filter((customer) => {
    const query = searchQuery.toLowerCase();
    const name = customer.name?.toLowerCase() || "";
    const email = customer.email?.toLowerCase() || "";
    const company = customer.company?.toLowerCase() || "";
    const phone = customer.phone?.toLowerCase() || "";

    return name.includes(query) || email.includes(query) || company.includes(query) || phone.includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage client profiles and information</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </Button>
      </div>

      {/* Baris Pencarian (Search Input) */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email, company, or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <CustomerForm 
        customer={selectedCustomer} 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={handleSuccess} 
      />

      <div className="grid gap-4">
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="bg-card rounded-lg border p-4 shadow-sm flex justify-between items-center">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-bold text-lg">{customer.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {customer.email} • {customer.company || "No Company"} • {customer.phone || "No Phone"}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(customer)}>
              <Edit2 className="h-4 w-4 mr-2" /> Edit
            </Button>
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No customers found</p>
          </div>
        )}
      </div>
    </div>
  );
}