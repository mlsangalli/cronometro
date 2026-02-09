import { readFile, writeFile, readdir, mkdir, copyFile } from "node:fs/promises";
import { join } from "node:path";
import type { Play } from "../schema/play.js";
import { PlaySchema } from "../schema/play.js";

const DEFAULT_DATA_DIR = "data/plays";

export class PlayLibrary {
  private dataDir: string;

  constructor(dataDir: string = DEFAULT_DATA_DIR) {
    this.dataDir = dataDir;
  }

  async init(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
  }

  private filePath(id: string, version: number): string {
    return join(this.dataDir, `${id}_v${version}.json`);
  }

  /** Save a play (creates new file based on id + version). */
  async save(play: Play): Promise<string> {
    await this.init();
    const path = this.filePath(play.id, play.version);
    await writeFile(path, JSON.stringify(play, null, 2), "utf-8");
    return path;
  }

  /** Load a specific version of a play. */
  async load(id: string, version: number): Promise<Play> {
    const path = this.filePath(id, version);
    const raw = await readFile(path, "utf-8");
    const data = JSON.parse(raw);
    return PlaySchema.parse(data);
  }

  /** Load the latest version of a play by scanning files. */
  async loadLatest(id: string): Promise<Play> {
    await this.init();
    const files = await readdir(this.dataDir);
    const versions = files
      .filter((f) => f.startsWith(`${id}_v`) && f.endsWith(".json"))
      .map((f) => {
        const match = f.match(/_v(\d+)\.json$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((v) => v > 0)
      .sort((a, b) => b - a);

    if (versions.length === 0) {
      throw new Error(`Play not found: ${id}`);
    }
    return this.load(id, versions[0]);
  }

  /** List all plays (latest version only). */
  async list(): Promise<Array<{ id: string; name: string; version: number; sport: string }>> {
    await this.init();
    const files = await readdir(this.dataDir);
    const playFiles = files.filter((f) => f.endsWith(".json"));

    // Group by id, keep latest
    const latest = new Map<string, { version: number; file: string }>();
    for (const file of playFiles) {
      const match = file.match(/^(.+)_v(\d+)\.json$/);
      if (!match) continue;
      const [, id, vStr] = match;
      const version = parseInt(vStr, 10);
      const existing = latest.get(id);
      if (!existing || version > existing.version) {
        latest.set(id, { version, file });
      }
    }

    const results: Array<{ id: string; name: string; version: number; sport: string }> = [];
    for (const [id, { version, file }] of latest) {
      try {
        const raw = await readFile(join(this.dataDir, file), "utf-8");
        const data = JSON.parse(raw);
        results.push({ id, name: data.name ?? "Unnamed", version, sport: data.sport ?? "unknown" });
      } catch {
        results.push({ id, name: "Unnamed", version, sport: "unknown" });
      }
    }

    return results;
  }

  /** Duplicate a play with a new id. */
  async duplicate(sourceId: string, sourceVersion: number): Promise<Play> {
    const source = await this.load(sourceId, sourceVersion);
    const { nanoid } = await import("nanoid");
    const now = new Date().toISOString();
    const newPlay: Play = {
      ...source,
      id: nanoid(12),
      version: 1,
      name: `${source.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    };
    await this.save(newPlay);
    return newPlay;
  }

  /** Create a new version of an existing play. */
  async newVersion(play: Play): Promise<Play> {
    const now = new Date().toISOString();
    const updated: Play = {
      ...play,
      version: play.version + 1,
      updatedAt: now,
    };
    await this.save(updated);
    return updated;
  }

  /** Get version history for a play. */
  async getVersions(id: string): Promise<number[]> {
    await this.init();
    const files = await readdir(this.dataDir);
    return files
      .filter((f) => f.startsWith(`${id}_v`) && f.endsWith(".json"))
      .map((f) => {
        const match = f.match(/_v(\d+)\.json$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
  }
}
