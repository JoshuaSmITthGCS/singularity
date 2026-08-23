# Run once, from the repo root, in PowerShell (as the same user who'll be
# logged in normally — not an elevated/admin shell needed for this).
#
# Sets up pm2 to run the Singularity worker as a background process that
# survives closing the terminal, restarts itself if it crashes, and comes
# back automatically after a reboot/login — the Windows equivalent of the
# systemd service used on the Linux deploy path (worker/deploy/setup.sh).
#
# Requires .env.local (with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# ANTHROPIC_API_KEY) to already exist in the repo root, same as running
# `pnpm worker` directly.

Write-Host "Installing pm2 and the Windows startup helper..."
npm install -g pm2 pm2-windows-startup

Write-Host "Registering pm2 to resurrect saved processes on login..."
pm2-startup install

Write-Host "Starting the worker under pm2..."
pm2 start worker/deploy/windows/ecosystem.config.js

Write-Host "Saving the process list so it survives reboots..."
pm2 save

Write-Host ""
Write-Host "Done. Useful commands:"
Write-Host "  pm2 status              - check it's running"
Write-Host "  pm2 logs singularity-worker   - watch live logs"
Write-Host "  pm2 restart singularity-worker - restart after pulling new code"
Write-Host "  pm2 stop singularity-worker    - stop it"
