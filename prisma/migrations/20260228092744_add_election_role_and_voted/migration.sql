-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usccmpc_id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "suffix" TEXT,
    "membership_type" TEXT NOT NULL,
    "email1" TEXT,
    "email2" TEXT,
    "contactNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "voted" BOOLEAN NOT NULL DEFAULT false,
    "voted_at" DATETIME
);
INSERT INTO "new_Member" ("contactNumber", "createdAt", "email1", "email2", "firstName", "id", "lastName", "membership_type", "middleName", "suffix", "updatedAt", "usccmpc_id") SELECT "contactNumber", "createdAt", "email1", "email2", "firstName", "id", "lastName", "membership_type", "middleName", "suffix", "updatedAt", "usccmpc_id" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE UNIQUE INDEX "Member_usccmpc_id_key" ON "Member"("usccmpc_id");
CREATE INDEX "Member_firstName_idx" ON "Member"("firstName");
CREATE INDEX "Member_lastName_idx" ON "Member"("lastName");
CREATE INDEX "Member_usccmpc_id_idx" ON "Member"("usccmpc_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
