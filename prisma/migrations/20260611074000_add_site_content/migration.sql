CREATE TABLE "SiteContent" (
    "key" TEXT NOT NULL,
    "homeContent" JSONB,
    "footerContent" JSONB,
    "legalContent" JSONB,
    "faqContent" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("key")
);
