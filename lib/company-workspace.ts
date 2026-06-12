import { OrganizationAnalyticsEventType, OrganizationLeadStatus, OrganizationMemberRole, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { isOrganizationSchemaUnavailable } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/file-storage";

export function sanitizeCompanyFileName(fileName: string) {
  const parsed = path.parse(fileName);
  const base = parsed.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
  const extension = parsed.ext.toLowerCase();

  return `${base}${extension}`;
}

export async function saveOrganizationFile(file: File, organizationId: string) {
  const safeName = sanitizeCompanyFileName(file.name);
  const storedName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const type = file.type || "application/octet-stream";

  const storagePath = await saveUploadedFile({
    contentType: type,
    directory: `organizations/${organizationId}`,
    file,
    storedName
  });

  return {
    name: file.name,
    size: file.size,
    storagePath,
    type
  };
}

export async function recordOrganizationEvent({
  metadata,
  organizationId,
  path,
  projectId,
  type,
  userId
}: {
  metadata?: Prisma.InputJsonValue;
  organizationId: string;
  path?: string;
  projectId?: string | null;
  type: OrganizationAnalyticsEventType;
  userId?: string | null;
}) {
  try {
    await prisma.organizationAnalyticsEvent.create({
      data: {
        metadata,
        organizationId,
        path,
        projectId: projectId || undefined,
        type,
        userId: userId || undefined
      }
    });
  } catch (error) {
    if (isOrganizationSchemaUnavailable(error)) {
      return;
    }

    throw error;
  }
}

export async function createOrganizationLead({
  applicationId,
  investorUserId,
  leadCountry,
  leadEmail,
  leadName,
  leadPhone,
  leadWhatsapp,
  metadata,
  note,
  organizationId,
  projectId,
  requestedAmountUsdt,
  source = "platform_application"
}: {
  applicationId: string;
  investorUserId?: string | null;
  leadCountry?: string;
  leadEmail?: string;
  leadName?: string;
  leadPhone?: string;
  leadWhatsapp?: string;
  metadata?: Prisma.InputJsonValue;
  note?: string;
  organizationId: string;
  projectId?: string | null;
  requestedAmountUsdt?: string;
  source?: string;
}) {
  const lead = await prisma.organizationLead.upsert({
    where: { applicationId },
    update: {
      leadCountry,
      leadEmail,
      leadName,
      leadPhone,
      leadWhatsapp,
      metadata,
      note,
      requestedAmountUsdt,
      status: OrganizationLeadStatus.NEW
    },
    create: {
      applicationId,
      investorUserId: investorUserId || undefined,
      leadCountry,
      leadEmail,
      leadName,
      leadPhone,
      leadWhatsapp,
      metadata,
      note,
      organizationId,
      projectId: projectId || undefined,
      requestedAmountUsdt,
      source
    }
  });

  await recordOrganizationEvent({
    metadata: {
      leadId: lead.id,
      source
    },
    organizationId,
    path: projectId ? `/projects/${projectId}` : "/company/leads",
    projectId,
    type: OrganizationAnalyticsEventType.LEAD_CAPTURED,
    userId: investorUserId || undefined
  });

  return lead;
}

export function inviteRoleOptions() {
  return [OrganizationMemberRole.ADMIN, OrganizationMemberRole.EDITOR, OrganizationMemberRole.ANALYST] as const;
}
