import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContractList } from "./contract-list";

export default async function ContractsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/");

  const contracts = await prisma.contract.findMany({
    include: {
      customer: true,
      projectManager: { select: { id: true, name: true } },
      pics: { select: { id: true, name: true } },
      _count: { select: { tickets: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <ContractList initialContracts={contracts} />;
}
