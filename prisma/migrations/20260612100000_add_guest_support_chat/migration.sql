-- CreateTable
CREATE TABLE "GuestSupportThread" (
    "id" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contact" TEXT,
    "subject" TEXT,
    "status" "SupportThreadStatus" NOT NULL DEFAULT 'OPEN',
    "queue" "SupportQueue" NOT NULL DEFAULT 'TECH_SUPPORT',
    "assignedToId" TEXT,
    "lastGuestMessageAt" TIMESTAMP(3),
    "lastManagerMessageAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestSupportThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestSupportMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderKind" TEXT NOT NULL,
    "senderName" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestSupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestSupportThread_publicToken_key" ON "GuestSupportThread"("publicToken");

-- CreateIndex
CREATE INDEX "GuestSupportThread_assignedToId_idx" ON "GuestSupportThread"("assignedToId");

-- CreateIndex
CREATE INDEX "GuestSupportThread_email_idx" ON "GuestSupportThread"("email");

-- CreateIndex
CREATE INDEX "GuestSupportThread_queue_idx" ON "GuestSupportThread"("queue");

-- CreateIndex
CREATE INDEX "GuestSupportThread_status_idx" ON "GuestSupportThread"("status");

-- CreateIndex
CREATE INDEX "GuestSupportMessage_createdAt_idx" ON "GuestSupportMessage"("createdAt");

-- CreateIndex
CREATE INDEX "GuestSupportMessage_threadId_idx" ON "GuestSupportMessage"("threadId");

-- AddForeignKey
ALTER TABLE "GuestSupportThread" ADD CONSTRAINT "GuestSupportThread_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestSupportMessage" ADD CONSTRAINT "GuestSupportMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "GuestSupportThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
