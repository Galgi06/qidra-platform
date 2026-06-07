import { Prisma, Role, type PrismaClient } from "@prisma/client";

export type NotificationCopy = {
  titleRu: string;
  titleEn: string;
  bodyRu: string;
  bodyEn: string;
  type?: string;
  href?: string;
};

type NotificationWriter = Prisma.TransactionClient | PrismaClient;

export async function createUserNotification(
  db: NotificationWriter,
  {
    actorId,
    bodyEn,
    bodyRu,
    href,
    titleEn,
    titleRu,
    type = "system",
    userId
  }: NotificationCopy & {
    actorId?: string | null;
    userId: string;
  }
) {
  return db.notification.create({
    data: {
      actorId: actorId ?? undefined,
      bodyEn,
      bodyRu,
      href,
      titleEn,
      titleRu,
      type,
      userId
    }
  });
}

export async function createParticipantBroadcast(
  db: NotificationWriter,
  {
    actorId,
    bodyEn,
    bodyRu,
    href,
    titleEn,
    titleRu,
    type = "broadcast"
  }: NotificationCopy & {
    actorId?: string | null;
  }
) {
  const participants = await db.user.findMany({
    where: { blockedAt: null, role: Role.INVESTOR },
    select: { id: true }
  });

  if (!participants.length) {
    return 0;
  }

  await db.notification.createMany({
    data: participants.map((participant) => ({
      actorId: actorId ?? undefined,
      bodyEn,
      bodyRu,
      href,
      titleEn,
      titleRu,
      type,
      userId: participant.id
    }))
  });

  return participants.length;
}
