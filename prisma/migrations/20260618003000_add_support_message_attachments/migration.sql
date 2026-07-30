ALTER TABLE "SupportMessage"
ADD COLUMN IF NOT EXISTS "attachments" JSONB;

ALTER TABLE "GuestSupportMessage"
ADD COLUMN IF NOT EXISTS "attachments" JSONB;
