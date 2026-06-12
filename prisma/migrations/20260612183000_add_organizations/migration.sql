CREATE TYPE "OrganizationMemberRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'ANALYST');
CREATE TYPE "OrganizationStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'REJECTED');

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "founderId" TEXT NOT NULL,
  "publicSlug" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "typeLabel" TEXT,
  "country" TEXT,
  "city" TEXT,
  "website" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "overview" TEXT,
  "valueProposition" TEXT,
  "targetAudience" TEXT,
  "productSummary" TEXT,
  "logoUrl" TEXT,
  "heroImageUrl" TEXT,
  "status" "OrganizationStatus" NOT NULL DEFAULT 'DRAFT',
  "representativeName" TEXT,
  "representativeRole" TEXT,
  "verificationData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "OrganizationMemberRole" NOT NULL DEFAULT 'EDITOR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationDocument" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "kind" "DocumentKind" NOT NULL DEFAULT 'COMPLIANCE',
  "fileUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationDocument_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Project" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ProjectSubmission" ADD COLUMN "organizationId" TEXT;

CREATE UNIQUE INDEX "Organization_publicSlug_key" ON "Organization"("publicSlug");
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX "Organization_founderId_idx" ON "Organization"("founderId");
CREATE INDEX "Organization_status_idx" ON "Organization"("status");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE INDEX "OrganizationDocument_organizationId_idx" ON "OrganizationDocument"("organizationId");
CREATE INDEX "ProjectSubmission_organizationId_idx" ON "ProjectSubmission"("organizationId");

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationDocument" ADD CONSTRAINT "OrganizationDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
