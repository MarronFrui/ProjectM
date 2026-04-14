import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const FFMPEG_PATH = "ffmpeg";
const TIMEOUT_SECONDS = 120;
const LOG_FILE = "/home/marron/ProjectM/logs/extract-subtitles.log";

interface SubtitleStream {
    index: number;
    language: string;
    codec: string;
}

function cleanSubtitleText(text: string): string {
    text = text.replace(/<[^>]*>/g, "");
    text = text.replace(/\{[^}]*\}/g, "");
    text = text.replace(/&nbsp;/g, " ");
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/\s+/g, " ");
    return text.trim();
}

function srtToVtt(srtContent: string): string {
    const vttLines: string[] = ["WEBVTT", ""];

    const blocks = srtContent.trim().split(/\n\s*\n/);

    for (const block of blocks) {
        const lines = block.split(/\r?\n/).filter((line: string) => line.length > 0);

        if (lines.length < 2) continue;

        const timestampLine = lines.find((line: string) => /-->/.test(line));
        if (!timestampLine) continue;

        const timestampIndex = lines.indexOf(timestampLine);
        const subtitleLines = lines.slice(timestampIndex + 1);

        const cleanedLines = subtitleLines
        .map(line => cleanSubtitleText(line))
        .filter(line => line.length > 0);

        if (cleanedLines.length === 0) continue;

        const vttTimestamp = timestampLine.replace(/,/g, ".");

        vttLines.push(vttTimestamp);
        vttLines.push(...cleanedLines);
        vttLines.push("");
    }

    return vttLines.join("\n");
}

async function logResult(status: string, file: string, message?: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logLine = `[${timestamp}] [${status}] ${file}${message ? ` - ${message}` : ""}\n`;
    try {
        await fs.appendFile(LOG_FILE, logLine);
    } catch {
        // Silently fail if log can't be written
    }
}

function getEpisodeIdFromFilename(filePath: string): string | null {
    const fileName = path.basename(filePath);
    const match = fileName.match(/[Ss](\d{1,2})[Ee](\d{1,2})/);
    if (match) {
        return `S${String(match[1]).padStart(2, "0")}E${String(match[2]).padStart(2, "0")}`;
    }
    const xMatch = fileName.match(/(\d{1,2})[xX](\d{1,2})/);
    if (xMatch) {
        return `S${String(xMatch[1]).padStart(2, "0")}E${String(xMatch[2]).padStart(2, "0")}`;
    }
    return null;
}

async function findMkvFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const subResults = await findMkvFiles(fullPath);
                results.push(...subResults);
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".mkv")) {
                results.push(fullPath);
            }
        }
    } catch (err) {
        console.error(`Error scanning ${dir}:`, (err as Error).message);
    }
    return results;
}

async function probeSubtitleStreams(mkvPath: string): Promise<SubtitleStream[]> {
    try {
        const { stdout } = await execAsync(
            `timeout ${TIMEOUT_SECONDS} ${FFMPEG_PATH} -i "${mkvPath}" -f null - 2>&1`,
            { shell: true }
        );

        return parseStreamsFromOutput(stdout);
    } catch (err: any) {
        if (err.stdout) {
            return parseStreamsFromOutput(err.stdout);
        }
        return [];
    }
}

function parseStreamsFromOutput(output: string): SubtitleStream[] {
    const streams: SubtitleStream[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
        const match = line.match(/Stream #0:(\d+)\(([a-z]{3})\):.*Subtitle: (\w+)/i);
        if (match) {
            streams.push({
                index: parseInt(match[1]),
                language: match[2].toLowerCase(),
                codec: match[3].toLowerCase(),
            });
        }
    }

    return streams;
}

async function extractSubtitle(mkvPath: string, streamIndex: number, outputSrtPath: string): Promise<boolean> {
    try {
        await execAsync(
            `timeout ${TIMEOUT_SECONDS} ${FFMPEG_PATH} -i "${mkvPath}" -map "0:${streamIndex}" -y "${outputSrtPath}" 2>&1`,
            { shell: true }
        );
        return true;
    } catch (err: any) {
        if (err.code === 124) {
            return false;
        }
        if (err.stdout && err.stdout.includes("matches no streams")) {
            return false;
        }
        return true;
    }
}

function showFileProgress(filename: string, current: number, total: number): void {
    const percent = Math.round((current / total) * 100);
    const filledBars = Math.max(0, Math.min(20, Math.round(percent / 5)));
    const emptyBars = 20 - filledBars;
    const bar = "█".repeat(filledBars) + "░".repeat(emptyBars);

    process.stdout.write(`\r[${bar}] ${String(percent).padStart(3)}% (${current}/${total}) ${filename.substring(0, 50)}`);
}

function clearProgressLine(): void {
    process.stdout.write("\r" + " ".repeat(120) + "\r");
}

async function processMkvFile(mkvPath: string, fileIndex: number, totalFiles: number): Promise<number> {
    const baseName = path.basename(mkvPath, path.extname(mkvPath));
    const mkvDir = path.dirname(mkvPath);
    const subsDir = path.join(mkvDir, "subs");

    console.log(`[${fileIndex}/${totalFiles}] Processing: ${baseName}...`);

    const streams = await probeSubtitleStreams(mkvPath);

    if (streams.length === 0) {
        console.log(`  [SKIP] No subtitle streams found`);
        await logResult("SKIP", baseName, "No subtitle streams found");
        return 0;
    }

    console.log(`  Found ${streams.length} subtitle stream(s)`);

    try {
        await fs.access(subsDir);
    } catch {
        await fs.mkdir(subsDir, { recursive: true });
    }

    const episodeId = getEpisodeIdFromFilename(mkvPath);
    const usedLanguages: Map<string, number> = new Map();
    let extractedCount = 0;

    for (let i = 0; i < streams.length; i++) {
        const stream = streams[i];
        showFileProgress(baseName, i + 1, streams.length);

        const lang = stream.language;
        const count = usedLanguages.get(lang) || 0;
        usedLanguages.set(lang, count + 1);

        let outputFileName: string;
        if (episodeId) {
            outputFileName = count === 0
                ? `${episodeId}_${lang}.vtt`
                : `${episodeId}_${lang}_${count + 1}.vtt`;
        } else {
            outputFileName = count === 0
                ? `${lang}.vtt`
                : `${lang}_${count + 1}.vtt`;
        }

        const outputVttPath = path.join(subsDir, outputFileName);

        try {
            await fs.access(outputVttPath);
            console.log(`  [SKIP] ${outputFileName} (already exists)`);
            continue;
        } catch {}

        const tempSrtPath = path.join(mkvDir, `temp_${Date.now()}.srt`);

        const success = await extractSubtitle(mkvPath, stream.index, tempSrtPath);

        if (!success) {
            try {
                await fs.unlink(tempSrtPath);
            } catch {}
            continue;
        }

        try {
            const srtContent = await fs.readFile(tempSrtPath, "utf-8");
            const vttContent = srtToVtt(srtContent);

            if (vttContent.split("\n").length <= 2) {
                await fs.unlink(tempSrtPath);
                continue;
            }

            await fs.writeFile(outputVttPath, vttContent);
            await fs.unlink(tempSrtPath);
            extractedCount++;
            console.log(`  [OK] ${outputFileName}`);
            await logResult("SUCCESS", baseName, `Extracted: ${outputFileName}`);
        } catch (err) {
            try {
                await fs.unlink(tempSrtPath);
            } catch {}
            console.log(`  [FAIL] ${outputFileName}: ${(err as Error).message}`);
            await logResult("ERROR", baseName, `Failed: ${outputFileName} - ${(err as Error).message}`);
        }
    }

    clearProgressLine();

    if (extractedCount > 0) {
        console.log(`  Done: ${extractedCount} subtitle(s) extracted\n`);
    } else {
        console.log(`  Done: 0 subtitle(s) extracted\n`);
    }

    return extractedCount;
}

async function main(): Promise<void> {
    const targetDir = process.argv[2];

    if (!targetDir) {
        console.log("Usage: npx tsx scripts/extract-subtitles.ts <folder>");
        console.log("Example: npx tsx scripts/extract-subtitles.ts \"/mnt/f/Movies\"");
        process.exit(1);
    }

    console.log(`\nScanning for MKV files in: ${targetDir}`);

    const mkvFiles = await findMkvFiles(targetDir);
    console.log(`Found ${mkvFiles.length} MKV file(s)\n`);

    if (mkvFiles.length === 0) {
        console.log("No MKV files found.");
        return;
    }

    let totalExtracted = 0;
    let totalSkipped = 0;

    for (let i = 0; i < mkvFiles.length; i++) {
        const mkvPath = mkvFiles[i];
        const count = await processMkvFile(mkvPath, i + 1, mkvFiles.length);
        if (count > 0) {
            totalExtracted += count;
        } else {
            totalSkipped++;
        }
    }

    console.log(`\n========================================`);
    console.log(`Done!`);
    console.log(`Extracted: ${totalExtracted} subtitle(s)`);
    console.log(`Skipped: ${totalSkipped} file(s)`);
    console.log(`========================================\n`);
}

main().catch(console.error);
