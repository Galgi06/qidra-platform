ALTER TABLE "Project"
ADD COLUMN "propertyData" JSONB;

ALTER TABLE "ProjectSubmission"
ADD COLUMN "propertyData" JSONB;

ALTER TABLE "InvestmentApplication"
ADD COLUMN "contactDetails" JSONB;
