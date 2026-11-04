import { Prisma, ReinvestmentMode } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { executeReinvestment, ReinvestmentError } from "@/lib/reinvestment";

const reinvestmentSchema = z.object({
  amount: z.string().trim().regex(/^\d+(\.\d{1,6})?$/),
  sourceDividendPaymentId: z.string().trim().min(1),
  targetProjectId: z.string().trim().min(1),
  termsAccepted: z.literal("on")
});

type SessionUser = { user?: { id?: string } };

export async function POST(request: NextRequest) {
  const localeRu = request.nextUrl.searchParams.get("lang") !== "en";
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ title: localeRu ? "Нужен вход" : "Sign in required", message: localeRu ? "Войдите в аккаунт." : "Sign in to your account." }, { status: 401 });
  }

  const rateLimit = checkRateLimit({ key: `reinvestment:one-time:${userId}`, limit: 20, request, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(localeRu, rateLimit.retryAfterSeconds);

  const parsed = reinvestmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { title: localeRu ? "Проверьте данные" : "Check the details", message: localeRu ? "Укажите проект, сумму и подтвердите условия." : "Choose a project, enter an amount, and accept the terms." },
      { status: 400 }
    );
  }

  try {
    const result = await executeReinvestment({
      grossAmountUsdt: new Prisma.Decimal(parsed.data.amount),
      mode: ReinvestmentMode.ONE_TIME,
      sourceDividendPaymentId: parsed.data.sourceDividendPaymentId,
      targetProjectId: parsed.data.targetProjectId,
      userId
    });

    return NextResponse.json({
      title: localeRu ? "Реинвест выполнен" : "Reinvestment completed",
      message: localeRu
        ? `${result.investedAmountUsdt.toString()} USDT направлено в выбранный проект.`
        : `${result.investedAmountUsdt.toString()} USDT was directed to the selected project.`,
      redirectTo: `/investor/investments/${result.applicationId}?lang=${localeRu ? "ru" : "en"}`
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { title: localeRu ? "Реинвест не выполнен" : "Reinvestment not completed", message: localeRu ? "Эта дивидендная выплата уже была реинвестирована." : "This dividend payment has already been reinvested." },
        { status: 409 }
      );
    }
    if (!(error instanceof ReinvestmentError)) throw error;
    const responses: Record<string, { status: number; ru: string; en: string }> = {
      already_reinvested: { status: 409, ru: "Эта дивидендная выплата уже была реинвестирована.", en: "This dividend payment has already been reinvested." },
      insufficient_balance: { status: 409, ru: "На доступном балансе уже недостаточно средств для этой операции.", en: "Your available balance is no longer sufficient for this operation." },
      invalid_amount: { status: 400, ru: "Сумма должна быть не меньше 100 USDT и не больше исходной выплаты.", en: "The amount must be at least 100 USDT and no more than the source payment." },
      kyc_required: { status: 403, ru: "Для реинвеста требуется одобренный KYC.", en: "Approved KYC is required for reinvestment." },
      payment_not_found: { status: 404, ru: "Выплаченный дивиденд не найден.", en: "The paid dividend was not found." },
      project_capacity_exceeded: { status: 409, ru: "В проекте недостаточно свободного объёма.", en: "The project does not have enough remaining capacity." },
      project_not_available: { status: 409, ru: "Выбранный проект больше не принимает участие.", en: "The selected project no longer accepts participation." }
    };
    const response = responses[error.code];
    return NextResponse.json({ title: localeRu ? "Реинвест не выполнен" : "Reinvestment not completed", message: localeRu ? response.ru : response.en }, { status: response.status });
  }
}
