-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Member" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "member_id" TEXT NOT NULL,
    "queue_number" INTEGER NOT NULL,
    "checkin_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkin_by_id" TEXT NOT NULL,
    "checkout_at" DATETIME,
    "checkout_by_id" TEXT,
    "checkout_number_given" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Correct',
    CONSTRAINT "Attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_checkin_by_id_fkey" FOREIGN KEY ("checkin_by_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_checkout_by_id_fkey" FOREIGN KEY ("checkout_by_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL DEFAULT 'USCC-MPC Event'
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Member_usccmpc_id_key" ON "Member"("usccmpc_id");

-- CreateIndex
CREATE INDEX "Member_firstName_idx" ON "Member"("firstName");

-- CreateIndex
CREATE INDEX "Member_lastName_idx" ON "Member"("lastName");

-- CreateIndex
CREATE INDEX "Member_usccmpc_id_idx" ON "Member"("usccmpc_id");

-- CreateIndex
CREATE INDEX "Attendance_member_id_idx" ON "Attendance"("member_id");

-- CreateIndex
CREATE INDEX "Attendance_queue_number_idx" ON "Attendance"("queue_number");
