-- CreateTable
CREATE TABLE "RaffleWinner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "member_id" TEXT NOT NULL,
    "drawn_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "drawn_by_id" TEXT NOT NULL,
    CONSTRAINT "RaffleWinner_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RaffleWinner_drawn_by_id_fkey" FOREIGN KEY ("drawn_by_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RaffleWinner_member_id_idx" ON "RaffleWinner"("member_id");
CREATE INDEX "RaffleWinner_drawn_at_idx" ON "RaffleWinner"("drawn_at");
