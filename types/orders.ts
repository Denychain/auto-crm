import type { Prisma } from "@prisma/client";

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    client: true;
    vehicle: true;
    works: true;
    parts: true;
  };
}>;

export type FullOrder = Prisma.OrderGetPayload<{
  include: {
    client: true;
    vehicle: true;
    works: true;
    parts: true;
    photos: true;
    workerShares: true;
  };
}>;
