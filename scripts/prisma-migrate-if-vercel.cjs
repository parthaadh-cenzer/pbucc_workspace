const { spawnSync } = require("child_process");

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";

if (!isVercel) {
  console.info("[Prisma Deploy] VERCEL env not detected. Skipping prisma migrate deploy.");
  process.exit(0);
}

console.info("[Prisma Deploy] VERCEL detected. Running prisma migrate deploy.");

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
  shell: false,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
