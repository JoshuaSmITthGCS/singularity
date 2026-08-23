// pm2 process definition for running the Singularity worker on Windows as a
// background service that survives closing the terminal and restarts itself
// on crash/reboot — pm2 is the practical Windows equivalent of the
// worker/deploy/singularity-worker.service systemd unit used on Linux hosts
// (systemd itself doesn't exist on Windows).
//
// Usage (from the repo root, in PowerShell):
//   npm install -g pm2 pm2-windows-startup
//   pm2-startup install
//   pm2 start worker/deploy/windows/ecosystem.config.js
//   pm2 save
//
// Secrets (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// ANTHROPIC_API_KEY) still come from .env.local in the repo root — this file
// only tells pm2 how to launch and supervise the process, it does not
// duplicate them here.
module.exports = {
  apps: [
    {
      name: "singularity-worker",
      cwd: "worker",
      script: "pnpm",
      args: "run dev",
      interpreter: "none",
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 20,
    },
  ],
}
