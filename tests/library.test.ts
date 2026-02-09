import { describe, it, expect, beforeEach } from "vitest";
import { rm, mkdir } from "node:fs/promises";
import { generatePlay } from "../src/generator/play-generator.js";
import { PlayLibrary } from "../src/library/play-library.js";

const TEST_DIR = "data/test-plays";

describe("Play Library", () => {
  let library: PlayLibrary;

  beforeEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
    await mkdir(TEST_DIR, { recursive: true });
    library = new PlayLibrary(TEST_DIR);
  });

  it("saves and loads a play", async () => {
    const play = generatePlay("QB throws to WR on a slant");
    await library.save(play);
    const loaded = await library.load(play.id, play.version);

    expect(loaded.id).toBe(play.id);
    expect(loaded.name).toBe(play.name);
    expect(loaded.steps).toEqual(play.steps);
  });

  it("lists saved plays", async () => {
    const play1 = generatePlay("First play");
    const play2 = generatePlay("Second play");
    await library.save(play1);
    await library.save(play2);

    const list = await library.list();
    expect(list.length).toBe(2);
  });

  it("creates new versions", async () => {
    const play = generatePlay("Evolving play");
    await library.save(play);

    const v2 = await library.newVersion(play);
    expect(v2.version).toBe(2);
    expect(v2.id).toBe(play.id);

    const versions = await library.getVersions(play.id);
    expect(versions).toEqual([1, 2]);
  });

  it("loads latest version", async () => {
    const play = generatePlay("Versioned play");
    await library.save(play);
    const v2 = await library.newVersion(play);
    await library.newVersion(v2);

    const latest = await library.loadLatest(play.id);
    expect(latest.version).toBe(3);
  });

  it("duplicates a play with new id", async () => {
    const play = generatePlay("Original play");
    await library.save(play);

    const copy = await library.duplicate(play.id, play.version);
    expect(copy.id).not.toBe(play.id);
    expect(copy.name).toContain("(copy)");
    expect(copy.version).toBe(1);
    expect(copy.steps).toEqual(play.steps);
  });

  it("throws when loading non-existent play", async () => {
    await expect(library.loadLatest("nonexistent")).rejects.toThrow("Play not found");
  });
});
