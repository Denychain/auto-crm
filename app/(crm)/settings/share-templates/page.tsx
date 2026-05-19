import { prisma } from "@/lib/prisma";
import { deepSerialize } from "@/lib/serialize";
import { LayoutTemplate } from "lucide-react";
import { ShareTemplatesManager } from "@/components/settings/ShareTemplatesManager";

export const dynamic = "force-dynamic";

export default async function ShareTemplatesPage() {
  const templates = await prisma.shareTemplate.findMany({
    include: { rules: true },
    orderBy: [{ sortOrder: "asc" }],
  });

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="size-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Шаблони розподілу</h1>
        </div>
      </header>
      <div className="flex flex-col gap-6 p-4 pb-10">
        <ShareTemplatesManager templates={deepSerialize(templates) as never} />
      </div>
    </div>
  );
}
