import { prisma } from "./prisma";
import { calcOrderTotal } from "./utils";
import { DREAM_FUND_PERCENT } from "./constants";

export async function handleOrderClosed(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { works: true, parts: true },
  });
  if (!order) return;

  const total = calcOrderTotal(order.works, order.parts);
  const contribution = total * DREAM_FUND_PERCENT;
  if (contribution <= 0) return;

  // Find oldest active fund where currentAmount < targetAmount
  const funds = await prisma.dreamFund.findMany({
    orderBy: { createdAt: "asc" },
  });

  const fund = funds.find(
    (f) => Number(f.currentAmount) < Number(f.targetAmount)
  );
  if (!fund) return;

  await prisma.dreamFund.update({
    where: { id: fund.id },
    data: { currentAmount: { increment: contribution } },
  });
}
