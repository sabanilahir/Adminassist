import { auth } from "@/lib/auth";
import { getCategories } from "@/actions/category-actions";
import { NewTicketForm } from "./new-ticket-form";

export default async function NewTicketPage() {
  const session = await auth();
  const isAgent = session?.user?.role === "AGENT" || session?.user?.role === "ADMIN";
  
  let categories: any[] = [];
  
  try {
    categories = await getCategories();
  } catch (error) {
    console.error("Error loading categories:", error);
  }

  return <NewTicketForm categories={categories} isAgent={isAgent} />;
}
