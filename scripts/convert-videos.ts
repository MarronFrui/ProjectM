import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

const MEDIA_PATH = "/mnt/media";
const VIDEO_EXTENSIONS = [".mkv", ".avi", ".mov", ".webm"];
const CONCURRENT = 2;

const BROWSER_VIDEO_CODECS = ['h264', 'vp9', 'av1'];
const BROWSER_AUDIO_CODECS = ['aac', 'mp3', 'opus'];
const LOG_FILE = "/home/marron/ProjectM/logs/conversion.log";

interface ConversionResult {
    file: string;
    success: boolean;
    skipped?: boolean;
    error?: string;
}

async function logResult(status: 'SUCCESS' | 'SKIPPED' | 'ERROR', file: string, message?: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logLine = `[${timestamp}] [${status}] ${file}${message ? ` - ${message}` : ''}\n`;
    try {
        await fs.appendFile(LOG_FILE, logLine);
        console.log(`  📝 Logged: [${status}] ${file}`);
    } catch (err) {
        console.error(`  ⚠️  Failed to write log: ${err}`);
    }
}

async function findVideoFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            const subResults = await findVideoFiles(fullPath);
            results.push(...subResults);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (VIDEO_EXTENSIONS.includes(ext)) {
                results.push(fullPath);
            }
        }
    }

    return results;
}

async function needsConversion(inputPath: string): Promise<boolean> {
    try {
        const { stdout } = await execAsync(
            `ffprobe -v quiet -print_format json -show_streams "${inputPath}"`
        );
        const data = JSON.parse(stdout);

        const videoStream = data.streams.find(
            (s: any) => s.codec_type === "video"
        );
        const audioStream = data.streams.find(
            (s: any) => s.codec_type === "audio"
        );

        const isVideoCompatible = BROWSER_VIDEO_CODECS.includes(videoStream?.codec_name);
        const isAudioCompatible = BROWSER_AUDIO_CODECS.includes(audioStream?.codec_name);

        if (isVideoCompatible && isAudioCompatible) {
            await logResult('SKIPPED', path.basename(inputPath), `Video: ${videoStream?.codec_name}, Audio: ${audioStream?.codec_name} - Browser compatible`);
            return false;
        }

        return true;
    } catch (err) {
        console.error(`  ⚠️  ffprobe failed for ${path.basename(inputPath)}: ${err}`);
        return true;
    }
}

function convertVideo(inputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const dir = path.dirname(inputPath);
        const baseName = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(dir, `${baseName}.mp4`);

        const ffmpeg = spawn("ffmpeg", [
            "-threads",
            "4", // Half cores for parallel processing
            "-i",
            inputPath,
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            "-y",
            outputPath,
        ]);

        let stderr = "";

        ffmpeg.stderr.on("data", (data) => {
            stderr += data.toString();
            // Parse progress line like "time=00:02:15.67"
            const match = data
                .toString()
                .match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
            if (match) {
                process.stdout.write(`\r  ⏳ Time: ${match[1]}`);
            }
        });

        ffmpeg.on("close", async (code) => {
            process.stdout.write("\n");

            if (code !== 0) {
                // Delete incomplete .mp4 file on failure
                try {
                    await fs.unlink(outputPath);
                    console.log(`  🗑️  Deleted incomplete: ${path.basename(outputPath)}`);
                } catch {}

                // Log error
                await logResult('ERROR', path.basename(inputPath), `ffmpeg failed with code ${code}`);

                reject(new Error(`ffmpeg failed with code ${code}`));
                return;
            }

            // Log success
            await logResult('SUCCESS', path.basename(inputPath), 'Converted to MP4');

            // Delete original .mkv after successful conversion
            try {
                await fs.unlink(inputPath);
                console.log(`  🗑️  Deleted original: ${path.basename(inputPath)}`);
            } catch (err) {
                console.error(`  ⚠️  Failed to delete original: ${err}`);
            }

            resolve();
        });

        ffmpeg.on("error", (err) => {
            reject(err);
        });
    });
}

async function main() {
    console.log("🔍 Scanning for video files in", MEDIA_PATH);

    const files = await findVideoFiles(MEDIA_PATH);

    if (files.length === 0) {
        console.log("No video files to convert.");
        return;
    }

    console.log(`Found ${files.length} file(s) to convert\n`);

    const results: ConversionResult[] = [];
    let totalProcessed = 0;

    // Process files in batches
    for (let i = 0; i < files.length; i += CONCURRENT) {
        const batch = files.slice(i, i + CONCURRENT);
        console.log(
            `\n=== Batch ${Math.floor(i / CONCURRENT) + 1}/${Math.ceil(files.length / CONCURRENT)} ===`
        );

        const batchPromises = batch.map(async (file) => {
            const relativePath = path.relative(MEDIA_PATH, file);
            totalProcessed++;
            const fileNum = i + batch.indexOf(file) + 1;

            // Check if conversion is needed
            console.log(`[${fileNum}/${files.length}] Checking: ${relativePath}`);

            const needs = await needsConversion(file);

            if (!needs) {
                console.log(`  ⏭️  Skipped (already H.264/AAC): ${relativePath}`);
                return { file: relativePath, success: true, skipped: true };
            }

            console.log(`[${fileNum}/${files.length}] Converting: ${relativePath}`);

            try {
                await convertVideo(file);
                console.log(`  ✅ Done: ${relativePath}`);
                return { file: relativePath, success: true };
            } catch (err) {
                const error =
                    err instanceof Error ? err.message : "Unknown error";
                console.log(`  ❌ Failed: ${error}`);
                return { file: relativePath, success: false, error };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    console.log("\n=== Summary ===");
    const successCount = results.filter((r) => r.success && !r.skipped).length;
    const skippedCount = results.filter((r) => r.skipped).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
        `Total: ${files.length} | ✅ Converted: ${successCount} | ⏭️  Skipped: ${skippedCount} | ❌ Failed: ${failCount}`
    );

    if (failCount > 0) {
        console.log("\nFailed files:");
        results
            .filter((r) => !r.success)
            .forEach((r) => {
                console.log(`  - ${r.file}: ${r.error}`);
            });
    }
}

main().catch(console.error);