const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const electronBinary = require("electron");
const env = { ...process.env };

delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, ["."], {
  cwd: projectRoot,
  env,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code === null ? 0 : code);
});

child.on("error", (err) => {
  console.error("Failed to launch Electron:", err);
  process.exit(1);
});
