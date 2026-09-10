import { chmodSync, createWriteStream, existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const toolsDir = path.join(root, ".tools");
const PORTABLE_NODE_VERSION = "22.23.2";

function getSystemNodeMajor() {
  const [major] = process.versions.node.split(".").map(Number);
  return major;
}

function getPortableNodeDir() {
  const platform = process.platform;
  const arch = process.arch === "x64" ? "x64" : process.arch;

  if (platform === "win32") {
    return path.join(toolsDir, `node-v${PORTABLE_NODE_VERSION}-win-${arch}`);
  }

  if (platform === "darwin") {
    return path.join(toolsDir, `node-v${PORTABLE_NODE_VERSION}-darwin-${arch}`);
  }

  return path.join(toolsDir, `node-v${PORTABLE_NODE_VERSION}-linux-${arch}`);
}

function getNodeBinary(nodeDir) {
  if (process.platform === "win32") {
    return path.join(nodeDir, "node.exe");
  }

  return path.join(nodeDir, "bin", "node");
}

async function downloadFile(url, destination) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  await pipeline(response.body, createWriteStream(destination));
}

async function extractZip(zipPath, destination) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  await mkdir(destination, { recursive: true });
  await execFileAsync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`,
    ],
    { stdio: "inherit" },
  );
}

async function ensurePortableNode() {
  const nodeDir = getPortableNodeDir();
  const nodeBinary = getNodeBinary(nodeDir);

  if (existsSync(nodeBinary)) {
    return nodeBinary;
  }

  const platform = process.platform;
  const arch = process.arch === "x64" ? "x64" : process.arch;
  let archiveName = "";
  let downloadUrl = "";

  if (platform === "win32") {
    archiveName = `node-v${PORTABLE_NODE_VERSION}-win-${arch}.zip`;
    downloadUrl = `https://nodejs.org/dist/v${PORTABLE_NODE_VERSION}/${archiveName}`;
  } else if (platform === "darwin") {
    archiveName = `node-v${PORTABLE_NODE_VERSION}-darwin-${arch}.tar.gz`;
    downloadUrl = `https://nodejs.org/dist/v${PORTABLE_NODE_VERSION}/${archiveName}`;
  } else {
    archiveName = `node-v${PORTABLE_NODE_VERSION}-linux-${arch}.tar.gz`;
    downloadUrl = `https://nodejs.org/dist/v${PORTABLE_NODE_VERSION}/${archiveName}`;
  }

  await mkdir(toolsDir, { recursive: true });
  const archivePath = path.join(toolsDir, archiveName);

  console.log(
    `Downloading portable Node.js ${PORTABLE_NODE_VERSION} (fixes Next.js compile issues on Node 24+)...`,
  );
  console.log(downloadUrl);

  await downloadFile(downloadUrl, archivePath);

  const extractRoot = path.join(toolsDir, "extract");
  await rm(extractRoot, { recursive: true, force: true });
  await mkdir(extractRoot, { recursive: true });

  if (archiveName.endsWith(".zip")) {
    await extractZip(archivePath, extractRoot);
  } else {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    await execFileAsync("tar", ["-xzf", archivePath, "-C", extractRoot], {
      stdio: "inherit",
    });
  }

  const extractedDir = path.join(
    extractRoot,
    archiveName.replace(/\.(zip|tar\.gz)$/, ""),
  );

  await rm(nodeDir, { recursive: true, force: true });
  await cp(extractedDir, nodeDir, { recursive: true });
  await rm(extractRoot, { recursive: true, force: true });
  await rm(archivePath, { force: true });

  if (platform !== "win32") {
    chmodSync(nodeBinary, 0o755);
  }

  console.log(`Portable Node.js installed at ${nodeDir}`);
  return nodeBinary;
}

export async function resolveNodeBinary() {
  const major = getSystemNodeMajor();

  if (major < 24) {
    return process.execPath;
  }

  console.warn(
    `System Node.js ${process.versions.node} can hang Next.js compiles. Using portable Node ${PORTABLE_NODE_VERSION}.`,
  );

  return await ensurePortableNode();
}
