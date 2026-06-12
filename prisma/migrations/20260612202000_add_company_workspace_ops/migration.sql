CREATE TYPE "OrganizationLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED');
CREATE TYPE "OrganizationAnalyticsEventType" AS ENUM ('COMPANY_PAGE_VIEW', 'PROJECT_PAGE_VIEW', 'LEAD_CAPTURED');

ALTER TABLE "OrganizationDocument" ADD COLUMN "note" TEXT;

CREATE TABLE "OrganizationInvite" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" "OrganizationMemberRole" NOT NULL DEFAULT 'EDITOR',
  "token" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationLead" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "investorUserId" TEXT,
  "applicationId" TEXT,
  "status" "OrganizationLeadStatus" NOT NULL DEFAULT 'NEW',
  "source" TEXT NOT NULL DEFAULT 'platform_application',
  "leadName" TEXT,
  "leadEmail" TEXT,
  "leadPhone" TEXT,
  "leadCountry" TEXT,
  "leadWhatsapp" TEXT,
  "requestedAmountUsdt" DECIMAL(18,6),
  "note" TEXT,
  "metadata" JSONB,
  "contactedAt" TIMESTAMP(3),
  "qualifiedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationAnalyticsEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "userId" TEXT,
  "type" "OrganizationAnalyticsEventType" NOT NULL,
  "path" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationInvite_token_key" ON "OrganizationInvite"("token");
CREATE UNIQUE INDEX "OrganizationLead_applicationId_key" ON "OrganizationLead"("applicationId");
CREATE INDEX "OrganizationInvite_organizationId_acceptedAt_idx" ON "OrganizationInvite"("organizationId", "acceptedAt");
CREATE INDEX "OrganizationInvite_email_acceptedAt_idx" ON "OrganizationInvite"("email", "acceptedAt");
CREATE INDEX "OrganizationLead_organizationId_status_createdAt_idx" ON "OrganizationLead"("organizationId", "status", "createdAt");
CREATE INDEX "OrganizationLead_projectId_createdAt_idx" ON "OrganizationLead"("projectId", "createdAt");
CREATE INDEX "OrganizationLead_investorUserId_idx" ON "OrganizationLead"("investorUserId");
CREATE INDEX "OrganizationAnalyticsEvent_organizationId_type_createdAt_idx" ON "OrganizationAnalyticsEvent"("organizationId", "type", "createdAt");
CREATE INDEX "OrganizationAnalyticsEvent_projectId_type_createdAt_idx" ON "OrganizationAnalyticsEvent"("projectId", "type", "createdAt");
CREATE INDEX "OrganizationAnalyticsEvent_userId_createdAt_idx" ON "OrganizationAnalyticsEvent"("userId", "createdAt");

ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationLead" ADD CONSTRAINT "OrganizationLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationLead" ADD CONSTRAINT "OrganizationLead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationLead" ADD CONSTRAINT "OrganizationLead_investorUserId_fkey" FOREIGN KEY ("investorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationAnalyticsEvent" ADD CONSTRAINT "OrganizationAnalyticsEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationAnalyticsEvent" ADD CONSTRAINT "OrganizationAnalyticsEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationAnalyticsEvent" ADD CONSTRAINT "OrganizationAnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
