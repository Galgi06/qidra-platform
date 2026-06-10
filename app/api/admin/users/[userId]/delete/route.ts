import { InvestmentStatus, Prisma, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const deleteSchema = z.object({
  confirmation: z.string().trim(),
  email: z.string().trim().email(),
  reason: z.string().trim().min(12).max(800)
});

type SessionUser = {
  user?: {
    id?: string;
    role?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (session?.user?.role !== Role.SUPER_ADMIN || !session.user.id) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен главный администратор" : "Super administrator required",
        message: localeRu ? "Полное удаление участника доступно только главному администратору." : "Permanent participant deletion is only available to a super administrator."
      },
      { status: 403 }
    );
  }

  const { userId } = await params;

  if (userId === session.user.id) {
    return NextResponse.json(
      {
        title: localeRu ? "Нельзя удалить себя" : "Cannot delete yourself",
        message: localeRu ? "Для безопасности собственный аккаунт нельзя удалить из этой формы." : "For safety, your own account cannot be deleted from this form."
      },
      { status: 400 }
    );
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        fieldErrors: parsed.error.flatten().fieldErrors,
        title: localeRu ? "Проверьте форму" : "Check the form",
        message:
          localeRu
            ? "Введите email участника, причину не короче 12 символов и подтверждение DELETE."
            : "Enter the participant email, a reason of at least 12 characters and DELETE confirmation."
      },
      { status: 400 }
    );
  }

  if (parsed.data.confirmation !== "DELETE") {
    return NextResponse.json(
      {
        fieldErrors: {
          confirmation: localeRu ? "Введите DELETE, чтобы подтвердить полное удаление." : "Enter DELETE to confirm permanent deletion."
        },
        title: localeRu ? "Нужно подтверждение" : "Confirmation required",
        message: localeRu ? "Подтверждение должно быть ровно DELETE." : "The confirmation must be exactly DELETE."
      },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      investments: {
        select: {
          amountUsdt: true,
          id: true,
          projectId: true,
          status: true
        }
      },
      wallet: {
        include: {
          transactions: {
            select: {
              amountUsdt: true,
              id: true,
              status: true,
              txHash: true,
              type: true
            }
          }
        }
      },
      _count: {
        select: {
          accounts: true,
          dividendPayments: true,
          investments: true,
          kycApplications: true,
          notifications: true,
          projectSubmissions: true,
          sessions: true,
          supportThreads: true
        }
      }
    }
  });

  if (!targetUser) {
    return NextResponse.json(
      {
        title: localeRu ? "Участник не найден" : "Participant not found",
        message: localeRu ? "Обновите страницу и выберите участника из списка." : "Refresh the page and choose a participant from the list."
      },
      { status: 404 }
    );
  }

  if (parsed.data.email.toLowerCase() !== targetUser.email.toLowerCase()) {
    return NextResponse.json(
      {
        fieldErrors: {
          email: localeRu ? "Email должен совпадать с удаляемым участником." : "The email must match the participant being deleted."
        },
        title: localeRu ? "Email не совпадает" : "Email does not match",
        message: localeRu ? "Введите email именно этой карточки участника." : "Enter the email from this participant card."
      },
      { status: 400 }
    );
  }

  if (targetUser.role !== Role.INVESTOR) {
    return NextResponse.json(
      {
        title: localeRu ? "Можно удалить только участника" : "Participants only",
        message:
          localeRu
            ? "Аккаунты сотрудников не удаляются этой формой. Сначала используйте отдельную административную процедуру."
            : "Staff accounts are not deleted by this form. Use a separate administrative procedure first."
      },
      { status: 409 }
    );
  }

  const confirmedByProject = new Map<string, Prisma.Decimal>();

  for (const investment of targetUser.investments) {
    if (investment.status !== InvestmentStatus.CONFIRMED) continue;
    const previous = confirmedByProject.get(investment.projectId) ?? new Prisma.Decimal(0);
    confirmedByProject.set(investment.projectId, previous.plus(investment.amountUsdt));
  }

  await prisma.$transaction(async (tx) => {
    for (const [projectId, amount] of confirmedByProject.entries()) {
      const project = await tx.project.findUnique({
        where: { id: projectId },
        select: { fundedUsdt: true }
      });

      if (!project) continue;

      const recalculatedFunded = project.fundedUsdt.minus(amount);

      await tx.project.update({
        where: { id: projectId },
        data: {
          fundedUsdt: recalculatedFunded.isNegative() ? new Prisma.Decimal(0) : recalculatedFunded
        }
      });
    }

    await tx.adminAuditLog.create({
      data: {
        actorId: session.user?.id,
        action: "user.delete.permanent",
        entityId: targetUser.id,
        entityType: "User",
        payload: {
          confirmedInvestmentsRemovedByProject: Object.fromEntries(Array.from(confirmedByProject.entries()).map(([projectId, amount]) => [projectId, amount.toString()])),
          counts: targetUser._count,
          reason: parsed.data.reason,
          targetEmail: targetUser.email,
          targetId: targetUser.id,
          targetName: targetUser.name,
          walletTransactionsRemoved: targetUser.wallet?.transactions.length ?? 0
        }
      }
    });

    await tx.user.delete({
      where: { id: targetUser.id }
    });
  });

  return NextResponse.json({
    redirectTo: `/admin/users?lang=${localeRu ? "ru" : "en"}`,
    title: localeRu ? "Участник удалён полностью" : "Participant permanently deleted",
    message:
      localeRu
        ? "Участник, его история, кошелёк, заявки и платежи удалены. Суммы проектов пересчитаны."
        : "The participant, history, wallet, applications and payments were removed. Project totals were recalculated.",
    tone: "warning"
  });
}
