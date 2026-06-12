DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrganizationLeadStatus') THEN
    ALTER TYPE "OrganizationLeadStatus" ADD VALUE IF NOT EXISTS 'CONTACT_ATTEMPT';
    ALTER TYPE "OrganizationLeadStatus" ADD VALUE IF NOT EXISTS 'PROPOSAL_SENT';
    ALTER TYPE "OrganizationLeadStatus" ADD VALUE IF NOT EXISTS 'NEGOTIATION';
    ALTER TYPE "OrganizationLeadStatus" ADD VALUE IF NOT EXISTS 'WON';
    ALTER TYPE "OrganizationLeadStatus" ADD VALUE IF NOT EXISTS 'LOST';
  END IF;
END $$;
