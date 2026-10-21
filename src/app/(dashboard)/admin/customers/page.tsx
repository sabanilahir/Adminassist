import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Sesuaikan path auth project kamu
import { redirect } from "next/navigation";
import { CustomerList } from "./customer-list";

export default async function CustomersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6">
      <CustomerList initialCustomers={customers} />
    </div>
  );
}