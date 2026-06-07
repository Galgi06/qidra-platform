import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
  user?: {
    id?: string;
  };
};

const markReadSchema = z.object({
  all: z.boolean().optional(),
  id: z.string().optional()
});

export async function GET() {
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        bodyEn: true,
        bodyRu: true,
        createdAt: true,
        href: true,
        id: true,
        readAt: true,
        titleEn: true,
        titleRu: true,
        type: true
      }
    }),
    prisma.notification.count({
      where: {
        readAt: null,
        userId
      }
    })
  ]);

  return NextResponse.json({
    notifications: notifications.map((notification) => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() ?? null
    })),
    unreadCount
  });
}

export async function PATCH(request: NextRequest) {
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = markReadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success || (!parsed.data.all && !parsed.data.id)) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  if (parsed.data.all) {
    await prisma.notification.updateMany({
      where: {
        readAt: null,
        userId
      },
      data: { readAt: new Date() }
    });
  } else if (parsed.data.id) {
    await prisma.notification.updateMany({
      where: {
        id: parsed.data.id,
        userId
      },
      data: { readAt: new Date() }
    });
  }

  return NextResponse.json({ message: "OK" });
}
