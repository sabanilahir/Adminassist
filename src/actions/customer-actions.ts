"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateCustomerCode } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function getCustomers() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    include: {
      contracts: {
        include: {
          projectManager: { select: { id: true, name: true, email: true } },
          pics: { select: { id: true, name: true, email: true } }
        }
      }
    },
    orderBy: { name: "asc" }
  });
  return customers;
}