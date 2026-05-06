import { prisma } from "@/lib/prisma";
import { ShoppingList } from "@/components/shopping/ShoppingList";
import { AddItemDialog } from "@/components/shopping/AddItemDialog";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const raw = await prisma.shoppingListItem.findMany();

  // needed first (updatedAt desc), then rest (name asc)
  const needed = raw
    .filter((i) => i.isNeeded)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const inStock = raw
    .filter((i) => !i.isNeeded)
    .sort((a, b) => a.name.localeCompare(b.name, "uk"));
  const items = [...needed, ...inStock];

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Закупки</h1>
            {needed.length > 0 && (
              <p className="text-sm text-orange-600 font-medium">
                Треба купити: {needed.length} {needed.length === 1 ? "позиція" : needed.length < 5 ? "позиції" : "позицій"}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 pb-24">
        <ShoppingList items={items} />
      </div>

      {/* Sticky add button */}
      <div className="fixed bottom-20 right-4 z-30">
        <AddItemDialog />
      </div>
    </div>
  );
}
