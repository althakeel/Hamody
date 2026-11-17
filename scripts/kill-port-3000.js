const { execFileSync } = require("child_process");

const port = process.argv[2] || "3000";
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  console.error("Port must be an integer between 1 and 65535.");
  process.exit(1);
}

try {
  const windows = process.platform === "win32";
  let output;
  try {
    output = windows
      ? execFileSync("netstat", ["-ano"], { encoding: "utf8" })
      : execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" });
  } catch (error) {
    // lsof returns 1 when no process is listening.
    if (!windows && error.status === 1 && !String(error.stderr || "").trim()) {
      output = "";
    } else {
      throw error;
    }
  }
  const pids = new Set();
  for (const line of output.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    const pid = windows
      ? (parts[0] === "TCP" && parts[1]?.endsWith(`:${port}`) && parts[3] === "LISTENING" ? parts[4] : null)
      : parts[0];
    if (pid && /^\d+$/.test(pid) && Number(pid) > 0) pids.add(Number(pid));
  }
  if (!pids.size) console.log(`No process is listening on port ${port}.`);
  for (const pid of pids) {
    if (windows) execFileSync("taskkill", ["/PID", String(pid), "/F"], { stdio: "inherit" });
    else process.kill(pid, "SIGTERM");
    console.log(`Stopped process ${pid} on port ${port}.`);
  }
} catch (error) {
  console.error(`Failed to stop the process on port ${port}: ${error.message}`);
  process.exit(1);
}
