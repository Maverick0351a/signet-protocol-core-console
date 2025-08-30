import fs from 'fs';

export default async function() {
  const pidFile = '.core-api-pid';
  if (fs.existsSync(pidFile)) {
    const pid = parseInt(fs.readFileSync(pidFile,'utf-8'),10);
    if (!isNaN(pid)) {
      try { process.kill(pid); } catch {}
    }
    fs.unlinkSync(pidFile);
  }
}