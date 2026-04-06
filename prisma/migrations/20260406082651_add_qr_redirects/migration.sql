-- CreateTable
CREATE TABLE "qr_redirects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "utm_url" TEXT NOT NULL,
    "current_destination_url" TEXT NOT NULL,
    "campaign" TEXT,
    "color" TEXT NOT NULL,
    "scan_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "qr_redirects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "qr_redirects_slug_key" ON "qr_redirects"("slug");

-- CreateIndex
CREATE INDEX "qr_redirects_user_id_created_at_idx" ON "qr_redirects"("user_id", "created_at");
