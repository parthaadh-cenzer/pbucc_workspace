const fs = require("fs");
const path = require("path");

function fail(message) {
  console.error(`[Prisma Verify] ${message}`);
  process.exit(1);
}

function requireMatch(content, regex, message) {
  if (!regex.test(content)) {
    fail(message);
  }
}

const root = process.cwd();
const schemaPath = path.join(root, "prisma", "schema.prisma");
const lockPath = path.join(root, "prisma", "migrations", "migration_lock.toml");

if (!fs.existsSync(schemaPath)) {
  fail("Missing prisma/schema.prisma");
}

if (!fs.existsSync(lockPath)) {
  fail("Missing prisma/migrations/migration_lock.toml");
}

const schema = fs.readFileSync(schemaPath, "utf8");
const lock = fs.readFileSync(lockPath, "utf8");

requireMatch(schema, /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"postgresql"/m, "Datasource db provider must be postgresql.");
requireMatch(schema, /url\s*=\s*env\("DATABASE_URL"\)/m, "Datasource db must use env(\"DATABASE_URL\").");
requireMatch(schema, /directUrl\s*=\s*env\("DIRECT_URL"\)/m, "Datasource db must use env(\"DIRECT_URL\").");

if (/provider\s*=\s*"sqlite"/m.test(schema)) {
  fail("sqlite provider detected in prisma/schema.prisma.");
}

if (/provider\s*=\s*"sqlite"/m.test(lock)) {
  fail("sqlite provider detected in migration_lock.toml.");
}

requireMatch(lock, /provider\s*=\s*"postgresql"/m, "Migration lock provider must be postgresql.");

console.info("[Prisma Verify] PostgreSQL datasource and migration lock verified.");
