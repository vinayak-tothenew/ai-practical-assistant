import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveNodeBinary } from "./ensure-node.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/run-next.mjs <next-command> [args...]");
  process.exit(1);
}

const nodeBinary = await resolveNodeBinary();

const child = spawn(nodeBinary, [nextBin, ...args], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
