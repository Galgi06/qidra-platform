import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sendEmail, getAppBaseUrl } from "@/lib/email";
import { isStrongPassword, passwordPolicyDescription } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createRawToken, expiresInMinutes, hashToken } from "@/lib/tokens";

const registerSchema = z.object({
  accountType: z.enum(["investor", "company"]).default("investor"),
  companyCountry: z.string().trim().max(120).optional(),
  companyName: z.string().trim().max(180).optional(),
  companyRole: z.string().trim().max(120).optional(),
  companySlug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  inviteToken: z.string().trim().max(255).optional(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().max(128).refine(isStrongPassword)
}).superRefine((data, ctx) => {
  if (data.accountType === "company" && !data.inviteToken) {
    if (!data.companyName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companyName"], message: "company_name_required" });
    if (!data.companySlug) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companySlug"], message: "company_slug_required" });
    if (!data.companyCountry) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companyCountry"], message: "company_country_required" });
  }
});

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте данные" : "Check the details",
        message: localeRu
          ? `Заполните имя, корректный email и пароль. Для компании также укажите название, slug и страну регистрации. ${passwordPolicyDescription.ru}`
          : `Enter a name, valid email, and password. For a company account, also provide company name, slug, and registration country. ${passwordPolicyDescription.en}`
      },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const invite = parsed.data.inviteToken
    ? await prisma.organizationInvite.findUnique({
        where: { token: parsed.data.inviteToken },
        include: { organization: true }
      })
    : null;

  if (parsed.data.inviteToken && (!invite || invite.acceptedAt || invite.expiresAt < new Date())) {
    return NextResponse.json(
      {
        title: localeRu ? "Приглашение недействительно" : "Invitation is invalid",
        message: localeRu ? "Ссылка приглашения устарела или уже использована." : "The invitation link has expired or was already used."
      },
      { status: 410 }
    );
  }

  if (invite && invite.email.toLowerCase() !== email) {
    return NextResponse.json(
      {
        title: localeRu ? "Email не совпадает" : "Email mismatch",
        message: localeRu ? "Используйте email, на который было отправлено приглашение в компанию." : "Use the email address that received the company invitation."
      },
      { status: 409 }
    );
  }

  const rateLimit = checkRateLimit({
    key: `auth:register:${email}`,
    limit: 5,
    request,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(localeRu, rateLimit.retryAfterSeconds);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (!invite && parsed.data.accountType === "company" && parsed.data.companySlug) {
    const existingOrganization = await prisma.organization.findUnique({ where: { publicSlug: parsed.data.companySlug } });
    if (existingOrganization) {
      return NextResponse.json(
        {
          title: localeRu ? "Slug компании уже занят" : "Company slug is taken",
          message: localeRu ? "Выберите другой публичный адрес компании." : "Choose another public company address."
        },
        { status: 409 }
      );
    }
  }

  if (existingUser?.emailVerified) {
    return NextResponse.json(
      {
        title: localeRu ? "Аккаунт уже существует" : "Account already exists",
        message: localeRu ? "Пользователь с этим email уже зарегистрирован. Войдите или восстановите пароль." : "A user with this email is already registered. Sign in or reset your password."
      },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const identifier = `email-verify:${email}`;
  const verifyUrl = new URL("/auth/verify-email", getAppBaseUrl());
  verifyUrl.searchParams.set("email", email);
  verifyUrl.searchParams.set("token", rawToken);
  verifyUrl.searchParams.set("lang", localeRu ? "ru" : "en");

  await prisma.$transaction(async (tx) => {
    if (existingUser) {
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          name: parsed.data.name,
          passwordHash
        }
      });

      if (invite) {
        await tx.organizationMember.upsert({
          where: {
            organizationId_userId: {
              organizationId: invite.organizationId,
              userId: existingUser.id
            }
          },
          update: { role: invite.role },
          create: {
            organizationId: invite.organizationId,
            role: invite.role,
            userId: existingUser.id
          }
        });

        await tx.organizationInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() }
        });
      } else if (parsed.data.accountType === "company" && parsed.data.companyName && parsed.data.companySlug) {
        const existingMembership = await tx.organizationMember.findFirst({
          where: { userId: existingUser.id },
          select: { id: true }
        });

        if (!existingMembership) {
          const organization = await tx.organization.create({
            data: {
              contactEmail: email,
              country: parsed.data.companyCountry,
              displayName: parsed.data.companyName,
              founderId: existingUser.id,
              legalName: parsed.data.companyName,
              publicSlug: parsed.data.companySlug,
              representativeName: parsed.data.name,
              representativeRole: parsed.data.companyRole,
              status: "DRAFT",
              verificationData: {
                onboardingSource: "company_sign_up",
                registeredAt: new Date().toISOString()
              }
            }
          });

          await tx.organizationMember.create({
            data: {
              organizationId: organization.id,
              role: "OWNER",
              userId: existingUser.id
            }
          });
        }
      }
    } else {
      const createdUser = await tx.user.create({
        data: {
          email,
          name: parsed.data.name,
          passwordHash,
          investorProfile: { create: {} },
          wallet: { create: {} }
        }
      });

      if (invite) {
        await tx.organizationMember.create({
          data: {
            organizationId: invite.organizationId,
            role: invite.role,
            userId: createdUser.id
          }
        });

        await tx.organizationInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() }
        });
      } else if (parsed.data.accountType === "company" && parsed.data.companyName && parsed.data.companySlug) {
        const organization = await tx.organization.create({
          data: {
            contactEmail: email,
            country: parsed.data.companyCountry,
            displayName: parsed.data.companyName,
            founderId: createdUser.id,
            legalName: parsed.data.companyName,
            publicSlug: parsed.data.companySlug,
            representativeName: parsed.data.name,
            representativeRole: parsed.data.companyRole,
            status: "DRAFT",
            verificationData: {
              onboardingSource: "company_sign_up",
              registeredAt: new Date().toISOString()
            }
          }
        });

        await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            role: "OWNER",
            userId: createdUser.id
          }
        });
      }
    }

    await tx.verificationToken.deleteMany({ where: { identifier } });
    await tx.verificationToken.create({
      data: {
        identifier,
        token: tokenHash,
        expires: expiresInMinutes(15)
      }
    });
  });

  await sendEmail({
    to: email,
    subject: localeRu ? "Подтвердите email в Qidra" : "Confirm your Qidra email",
    text: localeRu
      ? `Регистрация в Qidra почти завершена. Подтвердите электронную почту в течение 15 минут по ссылке: ${verifyUrl.toString()}`
      : `Your Qidra registration is almost complete. Confirm your email within 15 minutes using this link: ${verifyUrl.toString()}`,
    html: localeRu
      ? `<p>Регистрация в Qidra почти завершена.</p><p>Ссылка действует 15 минут.</p><p><a href="${verifyUrl.toString()}">Подтвердить электронную почту</a></p>`
      : `<p>Your Qidra registration is almost complete.</p><p>The link is valid for 15 minutes.</p><p><a href="${verifyUrl.toString()}">Confirm email</a></p>`
  });

  return NextResponse.json({
    title: invite ? (localeRu ? "Приглашение принято" : "Invitation accepted") : localeRu ? "Регистрация прошла успешно" : "Registration successful",
    message:
      invite
        ? localeRu
          ? "Аккаунт создан. После подтверждения email вы получите доступ к кабинету компании."
          : "Your account was created. After email confirmation you will get access to the company workspace."
        : parsed.data.accountType === "company"
        ? localeRu
          ? "Компания создана в черновике. Подтвердите email, затем заполните профиль компании и загрузите документы."
          : "The company was created as a draft. Confirm your email, then complete the company profile and upload documents."
        : localeRu
          ? "Проверьте свой электронный адрес и подтвердите электронную почту. Ссылка действует 15 минут."
          : "Check your email address and confirm your account. The link is valid for 15 minutes."
  });
}
