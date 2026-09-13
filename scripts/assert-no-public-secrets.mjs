import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const secret = process.env.SANITY_API_READ_TOKEN;

// Markdown builds intentionally have no private Sanity credential to inspect.
if (!secret) {
  process.exit(0);
}

if (secret.length < 16) {
  console.error(
    "SANITY_API_READ_TOKEN is too short to scan safely; refusing to validate the build output.",
  );
  process.exit(1);
}

const outputDirectoryUrl = new URL("../dist/", import.meta.url);
const outputDirectory = fileURLToPath(outputDirectoryUrl);
const secretBytes = Buffer.from(secret);
const exposedFiles = [];

async function scanDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await scanDirectory(entryPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const contents = await readFile(entryPath);
    if (contents.includes(secretBytes)) {
      exposedFiles.push(relative(outputDirectory, entryPath));
    }
  }
}

try {
  await scanDirectory(outputDirectory);
} catch (error) {
  if (error?.code === "ENOENT") {
    console.error("Cannot scan build output because dist/ does not exist.");
    process.exit(1);
  }

  throw error;
}

if (exposedFiles.length > 0) {
  console.error(
    `Build output contains SANITY_API_READ_TOKEN in ${exposedFiles.length} file(s):`,
  );
  for (const file of exposedFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}
