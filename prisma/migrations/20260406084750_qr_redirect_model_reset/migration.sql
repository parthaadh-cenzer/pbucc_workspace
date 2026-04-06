/*
  Warnings:

  - You are about to drop the `qr_redirects` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "qr_redirects";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "QrRedirect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "utmUrl" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "campaign" TEXT,
    "color" TEXT NOT NULL,
    "scans" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "QrRedirect_slug_key" ON "QrRedirect"("slug");
