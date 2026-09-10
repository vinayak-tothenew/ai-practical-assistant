import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PORT ?? "3000";

function killPortWindows(portNumber) {
  try {
    const output = execSync(`netstat -ano | findstr :${portNumber}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    const pids = new Set();
    for (const line of output.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) {
        continue;
      }

      const pid = line.trim().split(/\s+/).at(-1);
      if (pid && /^\d+$/.test(pid) && pid !== "0") {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      console.log(`Stopped process on port ${portNumber} (PID ${pid}).`);
    }
  } catch {
    // Port is free.
  }
}

function killPortUnix(portNumber) {
  try {
    execSync(`lsof -ti:${portNumber} | xargs kill -9`, { stdio: "ignore" });
    console.log(`Stopped process on port ${portNumber}.`);
  } catch {
    // Port is free.
  }
}

function killProjectNodeProcesses() {
  const escapedRoot = root.replace(/\\/g, "\\\\");

  if (process.platform === "win32") {
    try {
      execSync(
        `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"name='node.exe'\\" | Where-Object { $_.CommandLine -like '*${escapedRoot}*' -and $_.ProcessId -ne ${process.pid} } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`,
        { stdio: "ignore" },
      );
      console.log("Stopped stale Next.js processes for this project.");
    } catch {
      // No matching processes.
    }
    return;
  }

  try {
    execSync(`pkill -f "${root}"`, { stdio: "ignore" });
    console.log("Stopped stale Next.js processes for this project.");
  } catch {
    // No matching processes.
  }
}

async function removeNextLock() {
  const lockPath = path.join(root, ".next", "lock");
  if (existsSync(lockPath)) {
    await rm(lockPath, { force: true });
    console.log("Removed stale .next/lock file.");
  }
}

killProjectNodeProcesses();

if (process.platform === "win32") {
  killPortWindows(port);
} else {
  killPortUnix(port);
}

await removeNextLock();
