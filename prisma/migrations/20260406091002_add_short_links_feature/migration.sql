-- CreateTable
CREATE TABLE "ShortLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortUrl" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "campaign" TEXT,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ShortLink_domain_slug_key" ON "ShortLink"("domain", "slug");
