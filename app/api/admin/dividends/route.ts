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

const allowedReportExtensions = new Set(["pdf", "xls", "xlsx", "csv"]);
const maxReportAttachmentBytes = 25 * 1024 * 1024;

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

  const contentType = request.headers.get("content-type") || "";
  let parsedInput: unknown = null;
  let attachments: File[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    parsedInput = Object.fromEntries(formData.entries());
    attachments = formData
      .getAll("attachments")
      .filter((value): value is File => value instanceof File && value.size > 0);

    const invalidAttachment = attachments.find((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      return !allowedReportExtensions.has(extension) || file.size > maxReportAttachmentBytes;
    });

    if (invalidAttachment) {
      return NextResponse.json(
        {
          title: localeRu ? "Проверьте файлы" : "Check the files",
          message: localeRu
            ? "Для отчётности разрешены только PDF, XLS, XLSX или CSV размером до 25 МБ."
            : "Only PDF, XLS, XLSX, or CSV files up to 25 MB are allowed for reporting."
        },
        { status: 400 }
      );
    }
  } else {
    parsedInput = await request.json().catch(() => null);
  }

  const parsed = dividendActionSchema.safeParse(parsedInput);

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
    attachments,
    data: parsed.data,
    localeRu,
    canAccessProject: async () => true
  });
}
