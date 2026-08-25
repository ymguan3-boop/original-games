import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const buildRoot = resolve(root, ".build");
const builtAssets = resolve(buildRoot, "assets");
const publicAssets = resolve(root, "assets");

await rm(publicAssets, { recursive: true, force: true });
await mkdir(publicAssets, { recursive: true });
await cp(builtAssets, publicAssets, { recursive: true });
await cp(resolve(buildRoot, "dev.html"), resolve(root, "index.html"));

console.log("GitHub Pages files updated: index.html + assets/");

