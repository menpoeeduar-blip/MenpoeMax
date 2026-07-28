import { spawnSync } from "child_process";

const run = spawnSync("node", ["audit-features.mjs"], { encoding: "utf8" });
const lines = run.stdout.split("\n");
const inactiveLines = lines.filter(l => l.includes("❌"));
console.log("Inactive Features count:", inactiveLines.length);
inactiveLines.forEach(l => console.log(l));
