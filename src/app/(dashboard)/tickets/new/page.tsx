import { getCategories } from "@/actions/category-actions";
import { NewTicketForm } from "./new-ticket-form";

export default async function NewTicketPage() {
  let categories: any[] = [];
  
  try {
    categories = await getCategories();
  } catch (error) {
    console.error("Error loading categories:", error);
  }

  return <NewTicketForm categories={categories} />;
}
