import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const DEFAULT_SOURCE = "/mnt/f/Movies";
const DEFAULT_SERVER = "/mnt/media";
const SSH_HOST = process.env.SSH_HOST || "192.168.5.67";
const SSH_USER = "marron";
const SSH_SOCKET = `/tmp/ssh-${SSH_HOST}-${Date.now()}.sock`;
const LOG_FILE = "/home/marron/ProjectM/logs/sync-subtitles.log";

function sshCmd(cmd: string): string {
    return `ssh -S "${SSH_SOCKET}" ${SSH_USER}@${SSH_HOST} ${cmd}`;
}

function rsyncCmd(flag: string, source: string, dest: string): string {
    const sshOpt = `ssh -S "${SSH_SOCKET}"`;
    return `rsync -av --update ${flag} -e "${sshOpt}" "${source}/" "${SSH_USER}@${SSH_HOST}:${dest}/"`;
}

async function logResult(status: string, relPath: string, message?: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logLine = `[${timestamp}] [${status}] ${relPath}${message ? ` - ${message}` : ""}\n`;
    try {
        await fs.appendFile(LOG_FILE, logLine);
    } catch {}
}

async function findSubsDirs(root: string): Promise<string[]> {
    const results: string[] = [];
    try {
        const entries = await fs.readdir(root, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(root, entry.name);
            if (entry.isDirectory()) {
                if (entry.name.toLowerCase() === "subs") {
                    results.push(fullPath);
                } else {
                    const subResults = await findSubsDirs(fullPath);
                    results.push(...subResults);
                }
            }
        }
    } catch (err) {
        console.error(`Error scanning ${root}:`, (err as Error).message);
    }
    return results;
}

async function openSshConnection(): Promise<void> {
    console.log("Establishing SSH connection (you will be prompted once)...");
    await execAsync(`ssh -M -S "${SSH_SOCKET}" -fN ${SSH_USER}@${SSH_HOST}`);
}

async function closeSshConnection(): Promise<void> {
    try {
        await execAsync(`ssh -S "${SSH_SOCKET}" -O exit ${SSH_USER}@${SSH_HOST}`);
    } catch {}
}

async function filterExistingDirs(serverPaths: string[]): Promise<Set<number>> {
    if (serverPaths.length === 0) return new Set();

    const cmds = serverPaths.map((p, i) => `test -d '${path.dirname(p)}' && echo "1:${i}" || echo "0:${i}"`);
    try {
        const { stdout } = await execAsync(sshCmd(`"${cmds.join('; ')}"`));
        const existing = new Set<number>();
        for (const line of stdout.trim().split("\n")) {
            const [ok, idx] = line.split(":");
            if (ok === "1") existing.add(parseInt(idx));
        }
        return existing;
    } catch {
        return new Set();
    }
}

async function syncSubsFolder(
    sourceSubs: string,
    serverSubs: string,
    relPath: string,
    apply: boolean,
): Promise<boolean> {
    const prefix = apply ? "  " : "  [DRY-RUN]";

    if (apply) {
        await execAsync(sshCmd(`"mkdir -p '${serverSubs}'"`));
    }

    const flag = apply ? "" : "--dry-run";
    const cmd = rsyncCmd(flag, sourceSubs, serverSubs);

    try {
        const { stdout, stderr } = await execAsync(cmd);

        const lines = (stdout || stderr || "").split("\n").filter(l => l && !l.startsWith("sending") && !l.startsWith("sent") && !l.startsWith("total") && !l.startsWith("receiving"));

        const transferred = lines.length;
        if (transferred > 0) {
            console.log(`${prefix} [OK] ${relPath} — ${transferred} file(s)${apply ? " synced" : " would sync"}`);
            await logResult(apply ? "SYNCED" : "DRY-RUN", relPath, `${transferred} file(s)`);
        } else {
            console.log(`${prefix} [UP-TO-DATE] ${relPath}`);
            await logResult("UP-TO-DATE", relPath);
        }
        return true;
    } catch (err) {
        console.log(`${prefix} [FAIL] ${relPath}: ${(err as Error).message}`);
        await logResult("ERROR", relPath, (err as Error).message);
        return false;
    }
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const apply = args.includes("--apply");

    let sourceDir = DEFAULT_SOURCE;
    let serverDir = DEFAULT_SERVER;

    const sourceIdx = args.indexOf("--source");
    if (sourceIdx !== -1 && sourceIdx + 1 < args.length) {
        sourceDir = args[sourceIdx + 1];
    }
    const serverIdx = args.indexOf("--server");
    if (serverIdx !== -1 && serverIdx + 1 < args.length) {
        serverDir = args[serverIdx + 1];
    }

    await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });

    console.log(`\nSource: ${sourceDir}`);
    console.log(`Server: ${serverDir}`);
    console.log(`Mode: ${apply ? "APPLY (will rsync)" : "DRY-RUN (preview only, add --apply to sync)"}\n`);

    try {
        await fs.access(sourceDir);
    } catch {
        console.error(`Source directory does not exist: ${sourceDir}`);
        process.exit(1);
    }

    const subsDirs = await findSubsDirs(sourceDir);
    console.log(`Found ${subsDirs.length} subs/ folder(s)\n`);

    if (subsDirs.length === 0) {
        console.log("No subs/ folders found.");
        return;
    }

    await openSshConnection();

    try {
        console.log("Checking remote server directories...");

        const serverPaths = subsDirs.map(s => path.join(serverDir, path.relative(sourceDir, s)));
        const existing = await filterExistingDirs(serverPaths);

        console.log(`Found ${existing.size} folder(s) with existing server path\n`);

        let syncedCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < subsDirs.length; i++) {
            const sourceSubs = subsDirs[i];
            const relToSource = path.relative(sourceDir, sourceSubs);
            const serverSubs = serverPaths[i];

            console.log(`[${i + 1}/${subsDirs.length}] ${relToSource}`);

            if (!existing.has(i)) {
                console.log(`  [SKIP] media not on server`);
                await logResult("SKIP", relToSource, "Media not on server");
                skippedCount++;
                continue;
            }

            const ok = await syncSubsFolder(
                sourceSubs, serverSubs, relToSource, apply,
            );

            if (ok) {
                syncedCount++;
            } else {
                skippedCount++;
            }
        }

        console.log(`\n========================================`);
        console.log(`Done!`);
        console.log(`Processed: ${syncedCount}/${subsDirs.length} folder(s)`);
        console.log(`Skipped: ${skippedCount}`);
        console.log(`========================================\n`);
    } finally {
        await closeSshConnection();
    }
}

main().catch(console.error);
