import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";

const MEDIA_PATH = "/mnt/media";

const VIDEO_EXTENSIONS = [".mkv", ".avi", ".mov", ".webm"];

interface ConversionResult {
    file: string;
    success: boolean;
    error?: string;
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

function convertVideo(inputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const dir = path.dirname(inputPath);
        const baseName = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(dir, `${baseName}.mp4`);

        const ffmpeg = spawn("ffmpeg", [
            "-i",
            inputPath,
            "-c:v",
            "h264_qsv",
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
        });

        ffmpeg.on("close", async (code) => {
            if (code !== 0) {
                reject(new Error(`ffmpeg failed with code ${code}`));
                return;
            }

            try {
                await fs.unlink(inputPath);
                resolve();
            } catch (err) {
                reject(new Error(`Failed to delete original: ${err}`));
            }
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
    let completed = 0;

    for (const file of files) {
        const relativePath = path.relative(MEDIA_PATH, file);
        completed++;
        const percent = Math.round((completed / files.length) * 100);

        console.log(`[${percent}%] Converting: ${relativePath}`);

        try {
            await convertVideo(file);
            results.push({ file: relativePath, success: true });
            console.log(`  ✅ Done: ${relativePath}`);
        } catch (err) {
            results.push({
                file: relativePath,
                success: false,
                error: err instanceof Error ? err.message : "Unknown error",
            });
            console.log(
                `  ❌ Failed: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
        }
    }

    console.log("\n=== Summary ===");
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
        `Total: ${files.length} | ✅ Success: ${successCount} | ❌ Failed: ${failCount}`,
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
