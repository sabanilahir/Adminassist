import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCategories } from "@/actions/category-actions";
import { Badge } from "@/components/ui/badge";
import { CategoryForm } from "./_components/category-form";
import { FolderTree } from "lucide-react";

export default async function AdminCategoriesPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  let categories: any[] = [];
  try {
    categories = await getCategories();
  } catch (error) {
    console.error("Error loading categories:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage support ticket categories</p>
        </div>
        <CategoryForm mode="create" />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-12 px-4 text-left text-sm font-medium">Name</th>
              <th className="h-12 px-4 text-center text-sm font-medium">Tickets</th>
              <th className="h-12 px-4 text-center text-sm font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-b hover:bg-accent/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <FolderTree className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{category.name}</span>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <Badge variant="secondary">{category._count?.tickets || 0}</Badge>
                </td>
                <td className="p-4 text-center">
                  <CategoryForm mode="edit" category={category} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {categories.length === 0 && (
          <div className="p-12 text-center">
            <FolderTree className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No categories yet</h3>
            <p className="text-muted-foreground">Add your first category to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}