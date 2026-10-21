import { PrismaClient, Role, Priority, Status } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");

  const adminPass = await bcrypt.hash("admin123", 10);
  const picPass = await bcrypt.hash("pic123", 10);
  const pmPass = await bcrypt.hash("pm123", 10);
  const userPass = await bcrypt.hash("user123", 10);

  // 1. Users
  const admin = await prisma.user.upsert({ 
    where: { email: "admin@helpdesk.com" }, 
    update: {}, 
    create: { name: "System Admin", email: "admin@helpdesk.com", password: adminPass, role: Role.ADMIN } 
  });
  
  const pic1 = await prisma.user.upsert({ 
    where: { email: "pic1@helpdesk.com" }, 
    update: {}, 
    create: { name: "PIC Teknisi 1", email: "pic1@helpdesk.com", password: picPass, role: Role.PIC } 
  });
  
  const pic2 = await prisma.user.upsert({ 
    where: { email: "pic2@helpdesk.com" }, 
    update: {}, 
    create: { name: "PIC Teknisi 2", email: "pic2@helpdesk.com", password: picPass, role: Role.PIC } 
  });
  
  const pm1 = await prisma.user.upsert({ 
    where: { email: "pm1@helpdesk.com" }, 
    update: {}, 
    create: { name: "Project Manager 1", email: "pm1@helpdesk.com", password: pmPass, role: Role.PROJECT_MANAGER } 
  });
  
  const user1 = await prisma.user.upsert({ 
    where: { email: "user1@email.com" }, 
    update: {}, 
    create: { name: "User Test 1", email: "user1@email.com", password: userPass, role: Role.USER } 
  });

  console.log("Users created");

  // 2. Customers
  const cust1 = await prisma.customer.upsert({ 
    where: { email: "finance@acmecorp.com" }, 
    update: {}, 
    create: { customerCode: "CUST-001", name: "PT Acme Corporation", email: "finance@acmecorp.com", phone: "+62-21-555-1234", company: "PT Acme Corporation", address: "Jl. Sudirman No. 123, Jakarta" } 
  });
  
  const cust2 = await prisma.customer.upsert({ 
    where: { email: "it@techsolution.id" }, 
    update: {}, 
    create: { customerCode: "CUST-002", name: "PT Tech Solution", email: "it@techsolution.id", phone: "+62-21-555-5678", company: "PT Tech Solution", address: "Jl. Gatot Subroto No. 456" } 
  });

  console.log("Customers created");

  // 3. Contracts (Deklarasi contract1 dan contract2)
  const contract1 = await prisma.contract.upsert({
    where: { id: "contract-acme-001" },
    update: {},
    create: {
      id: "contract-acme-001",
      contractNumber: "CTR-2026-001",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      contactName: "Budi Santoso",
      correctiveMandays: 20,
      preventiveMandays: 10,
      customerId: cust1.id,
      projectManagerId: pm1.id,
      pics: {
        connect: [{ id: pic1.id }, { id: pic2.id }]
      }
    }
  });

  const contract2 = await prisma.contract.upsert({
    where: { id: "contract-tech-002" },
    update: {},
    create: {
      id: "contract-tech-002",
      contractNumber: "CTR-2026-002",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2027-05-31"),
      contactName: "Siti Aminah",
      correctiveMandays: 50,
      preventiveMandays: 12,
      customerId: cust2.id,
      projectManagerId: pm1.id,
      pics: {
        connect: [{ id: pic2.id }]
      }
    }
  });

  console.log("Contracts created");

  // 4. Categories
  await prisma.category.upsert({ 
    where: { id: "cat-technical" }, 
    update: {}, 
    create: { id: "cat-technical", name: "Technical Issue" } 
  });
  
  await prisma.category.upsert({ 
    where: { id: "cat-billing" }, 
    update: {}, 
    create: { id: "cat-billing", name: "Billing" } 
  });
  
  await prisma.category.upsert({ 
    where: { id: "cat-feature" }, 
    update: {}, 
    create: { id: "cat-feature", name: "Feature Request" } 
  });

  console.log("Categories created");

  // 5. Tickets (Menggunakan variabel contract1.id yang sudah ada)
  await prisma.ticket.upsert({ 
    where: { trackingId: "TKT-001" },
    update: {},
    create: { 
      trackingId: "TKT-001", 
      title: "Payment failed", 
      description: "Payment failed but amount deducted", 
      status: Status.IN_PROGRESS, 
      priority: Priority.HIGH, 
      userId: user1.id, 
      contractId: contract1.id, 
      customerId: cust1.id,
      categoryId: "cat-billing" 
    } 
  });

  console.log("Tickets created");
  console.log("Seeding completed!");
}

main().catch(console.error).finally(() => prisma.$disconnect());