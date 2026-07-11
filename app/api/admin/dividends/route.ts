import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessAdmin } from "@/lib/auth";
import { dividendActionSchema, executeDividendAction } from "@/lib/dividend-actions";
import { authOptions } from "@/lib/next-auth";

type SessionUser = {
  user?: {
    id?: string;
    role?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Начисления доступны только администратору." : "Dividend operations are only available to administrators."
      },
      { status: 403 }
    );
  }

  const parsed = dividendActionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте данные" : "Check the data",
        message: localeRu ? "Заполните период, суммы и подтверждение действия." : "Fill in the period, amounts and confirmation."
      },
      { status: 400 }
    );
  }

  return executeDividendAction({
    actorId: session?.user?.id,
    data: parsed.data,
    localeRu,
    canAccessProject: async () => true
  });
}
