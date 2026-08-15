-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "cardNetwork" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);
