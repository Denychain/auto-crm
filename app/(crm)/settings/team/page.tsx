import { prisma } from "@/lib/prisma";
import { deepSerialize } from "@/lib/serialize";
import { Users } from "lucide-react";
import { TeamManager } from "@/components/settings/TeamManager";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const workers = await prisma.worker.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Команда</h1>
        </div>
      </header>
      <div className="flex flex-col gap-6 p-4 pb-10">
        <TeamManager workers={deepSerialize(workers) as never} />
      </div>
    </div>
  );
}
