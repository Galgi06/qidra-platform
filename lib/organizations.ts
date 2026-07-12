import { OrganizationLeadStatus, OrganizationMemberRole, OrganizationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";

export function companyStatusLabel(status: OrganizationStatus, locale: Locale) {
  const labels: Record<OrganizationStatus, Record<Locale, string>> = {
    DRAFT: { ru: "Черновик", en: "Draft" },
    REVIEW: { ru: "На проверке", en: "In review" },
    APPROVED: { ru: "Одобрено", en: "Approved" },
    REJECTED: { ru: "Нужны правки", en: "Needs updates" }
  };
  return labels[status][locale];
}

export function companyMemberRoleLabel(role: OrganizationMemberRole, locale: Locale) {
  const labels: Record<OrganizationMemberRole, Record<Locale, string>> = {
    OWNER: { ru: "Владелец", en: "Owner" },
    ADMIN: { ru: "Администратор", en: "Admin" },
    EDITOR: { ru: "Редактор", en: "Editor" },
    ANALYST: { ru: "Аналитик", en: "Analyst" }
  };
  return labels[role][locale];
}

export function companyLeadStatusLabel(status: OrganizationLeadStatus, locale: Locale) {
  const labels: Record<OrganizationLeadStatus, Record<Locale, string>> = {
    NEW: { ru: "Новый", en: "New" },
    CONTACT_ATTEMPT: { ru: "Первичный контакт", en: "Contact attempt" },
    CONTACTED: { ru: "В работе", en: "Contacted" },
    QUALIFIED: { ru: "Квалифицирован", en: "Qualified" },
    PROPOSAL_SENT: { ru: "Отправлено предложение", en: "Proposal sent" },
    NEGOTIATION: { ru: "Переговоры", en: "Negotiation" },
    WON: { ru: "Успешно закрыт", en: "Won" },
    LOST: { ru: "Потерян", en: "Lost" },
    CLOSED: { ru: "Закрыт", en: "Closed" }
  };

  return labels[status][locale];
}

export function canManageCompanyTeam(role: OrganizationMemberRole) {
  return role === OrganizationMemberRole.OWNER || role === OrganizationMemberRole.ADMIN;
}

export function canManageCompanyLeads(role: OrganizationMemberRole) {
  return role === OrganizationMemberRole.OWNER || role === OrganizationMemberRole.ADMIN || role === OrganizationMemberRole.EDITOR;
}

export function canManageCompanyDividends(role: OrganizationMemberRole) {
  return role === OrganizationMemberRole.OWNER || role === OrganizationMemberRole.ADMIN;
}

export function isOrganizationSchemaUnavailable(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError && ["P1001", "P2021", "P2022"].includes(error.code))
  );
}

export async function getPrimaryOrganizationForUser(userId: string) {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                projects: true,
                projectSubmissions: true
              }
            }
          }
        }
      }
    });

    const membership = sortOrganizationMemberships(memberships)[0] ?? null;

    return membership?.organization ?? null;
  } catch (error) {
    if (isOrganizationSchemaUnavailable(error)) {
      return null;
    }

    throw error;
  }
}

export async function getOrganizationMembership(userId: string, organizationId?: string | null) {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId,
        ...(organizationId ? { organizationId } : {})
      },
      include: {
        organization: {
          include: {
            documents: true,
            _count: {
              select: {
                members: true,
                projects: true,
                projectSubmissions: true
              }
            }
          }
        }
      }
    });

    const membership = sortOrganizationMemberships(memberships)[0] ?? null;

    return membership;
  } catch (error) {
    if (isOrganizationSchemaUnavailable(error)) {
      return null;
    }

    throw error;
  }
}

export async function getOrganizationMemberships(userId: string) {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            documents: true,
            _count: {
              select: {
                members: true,
                projects: true,
                projectSubmissions: true
              }
            }
          }
        }
      }
    });

    return sortOrganizationMemberships(memberships);
  } catch (error) {
    if (isOrganizationSchemaUnavailable(error)) {
      return [];
    }

    throw error;
  }
}

function sortOrganizationMemberships<
  T extends {
    createdAt: Date;
    role: OrganizationMemberRole;
    organization: {
      status: OrganizationStatus;
      _count?: {
        projects?: number;
        projectSubmissions?: number;
      };
    };
  }
>(memberships: T[]) {
  const rolePriority: Record<OrganizationMemberRole, number> = {
    OWNER: 0,
    ADMIN: 1,
    EDITOR: 2,
    ANALYST: 3
  };
  const statusPriority: Record<OrganizationStatus, number> = {
    APPROVED: 0,
    REVIEW: 1,
    DRAFT: 2,
    REJECTED: 3
  };

  return [...memberships].sort((left, right) => {
    const leftProjectWeight = (left.organization._count?.projects ?? 0) + (left.organization._count?.projectSubmissions ?? 0);
    const rightProjectWeight = (right.organization._count?.projects ?? 0) + (right.organization._count?.projectSubmissions ?? 0);

    if (leftProjectWeight !== rightProjectWeight) {
      return rightProjectWeight - leftProjectWeight;
    }

    const leftStatus = statusPriority[left.organization.status];
    const rightStatus = statusPriority[right.organization.status];

    if (leftStatus !== rightStatus) {
      return leftStatus - rightStatus;
    }

    const leftRole = rolePriority[left.role];
    const rightRole = rolePriority[right.role];

    if (leftRole !== rightRole) {
      return leftRole - rightRole;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });
}

export function companyHomeNextStep(status: OrganizationStatus, locale: Locale) {
  if (status === OrganizationStatus.APPROVED) {
    return {
      buttonLabel: locale === "ru" ? "Создать листинг" : "Create listing",
      href: "/investor/projects/new",
      text: locale === "ru" ? "Профиль компании одобрен. Можно публиковать продукты и принимать лиды." : "The company profile is approved. You can publish listings and accept leads.",
      title: locale === "ru" ? "Компания готова к публикации" : "Company ready to publish"
    };
  }

  if (status === OrganizationStatus.REVIEW) {
    return {
      buttonLabel: locale === "ru" ? "Открыть профиль компании" : "Open company profile",
      href: "/company/profile",
      text: locale === "ru" ? "Проверяем профиль, представителя и документы. В это время можно доработать контент страницы компании." : "We are reviewing the profile, representative, and documents. You can refine the public company page meanwhile.",
      title: locale === "ru" ? "Профиль компании на проверке" : "Company profile in review"
    };
  }

  if (status === OrganizationStatus.REJECTED) {
    return {
      buttonLabel: locale === "ru" ? "Исправить профиль" : "Update profile",
      href: "/company/profile",
      text: locale === "ru" ? "Нужны обновления в профиле компании или документах перед публикацией." : "The company profile or documents need updates before publication.",
      title: locale === "ru" ? "Нужны правки" : "Updates needed"
    };
  }

  return {
    buttonLabel: locale === "ru" ? "Заполнить профиль компании" : "Complete company profile",
    href: "/company/profile",
    text: locale === "ru" ? "Добавьте позиционирование компании, представителя, документы и первый продукт." : "Add company positioning, representative details, documents, and your first product.",
    title: locale === "ru" ? "Завершите onboarding компании" : "Complete company onboarding"
  };
}
