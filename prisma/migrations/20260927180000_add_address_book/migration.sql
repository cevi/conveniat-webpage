-- CreateTable
CREATE TABLE "AddressBookEntry" (
    "ownerId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AddressBookEntry_pkey" PRIMARY KEY ("ownerId","contactId")
);

-- AddForeignKey
ALTER TABLE "AddressBookEntry" ADD CONSTRAINT "AddressBookEntry_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddressBookEntry" ADD CONSTRAINT "AddressBookEntry_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

