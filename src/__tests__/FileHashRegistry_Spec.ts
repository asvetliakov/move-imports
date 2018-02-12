import fsMock from "mock-fs";
import { FileHashRegistry } from "../FileHashRegistry";

class TestRegistry extends FileHashRegistry {
    public get hashToFileT(): Map<string, string> { return this.hashToFile; }
    public get fileToHashT(): Map<string, string> { return this.fileToHash; }
}

let registry: TestRegistry;
beforeEach(() => {
    registry = new TestRegistry(false);
});

afterEach(() => {
    fsMock.restore();
});

describe("Calculates a hash for a new file", () => {
    it("For a new file", async () => {
        fsMock({
            "/test.ts": "Some content",
        });

        await registry.calculateHashForNewFile("/test.ts");
        expect(registry.fileToHashT.size).toBe(1);
        expect(registry.hashToFileT.size).toBe(1);
        const hash = registry.fileToHashT.get("/test.ts");
        expect(hash).toBeDefined();
        expect(registry.hashToFileT.get(hash!)).toBe("/test.ts");
    });

    it("For a file with already stored hash replaces path and returns move operation", async () => {
        fsMock({
            "/test.ts": "Some content",
        });
        await registry.calculateHashForNewFile("/test.ts");
        fsMock({
            "/a.ts": "Some content",
        });
        const res = await registry.calculateHashForNewFile("/a.ts");
        expect(res).toBeDefined();
        expect(registry.fileToHashT.size).toBe(1);
        expect(registry.hashToFileT.size).toBe(1);
        const hash = registry.fileToHashT.get("/a.ts");
        expect(hash).toBeDefined();
        expect(registry.hashToFileT.get(hash!)).toBe("/a.ts");
        expect(res).toEqual({
            newPath: "/a.ts",
            oldPath: "/test.ts",
            hash,
        });
    });
});

describe("Replaces hash for the existing file", () => {
    it("does it", async () => {
        fsMock({
            "/test.ts": "Some content",
        });
        await registry.calculateHashForNewFile("/test.ts");
        const oldHash = registry.fileToHashT.get("/test.ts");
        fsMock({
            "/test.ts": "Another content",
        });
        await registry.replaceHashForFile("/test.ts");
        const newHash = registry.fileToHashT.get("/test.ts");
        expect(newHash).toBeDefined();
        expect(oldHash).not.toBe(newHash);

        expect(registry.fileToHashT.size).toBe(1);
        expect(registry.hashToFileT.size).toBe(1);
    });

    it("works when there wasn't existing file", async () => {
        fsMock({
            "/test.ts": "Some content",
        });
        await registry.replaceHashForFile("/test.ts");
        expect(registry.fileToHashT.size).toBe(1);
        expect(registry.hashToFileT.size).toBe(1);
    });
});

it("Deletes hash for the file", async () => {
    fsMock({
        "/test.ts": "Some content",
    });
    await registry.calculateHashForNewFile("/test.ts");
    expect(registry.fileToHashT.size).toBe(1);
    expect(registry.hashToFileT.size).toBe(1);
    await registry.deleteHashForFile("/test.ts");
    expect(registry.fileToHashT.size).toBe(0);
    expect(registry.hashToFileT.size).toBe(0);
});
