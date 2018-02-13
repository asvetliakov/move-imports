import fsMock from "mock-fs";
import { DocumentRegistry, FileCache } from "../DocumentRegistry";

class TestDocumentRegistry extends DocumentRegistry {
    public get activeFilesT(): Map<string, string> {
        return this.activeFiles;
    }
    public get fileCacheT(): Map<string, FileCache> {
        return this.fileCache;
    }
}

let registry: TestDocumentRegistry;

beforeEach(() => {
    registry = new TestDocumentRegistry();
});

it("Opens active file", () => {
    registry.openActiveFile("test.ts", "abc");
    expect(registry.activeFilesT.get("test.ts")).toBe("abc");
});

it("Closes active file", () => {
    registry.openActiveFile("test.ts", "abc");
    registry.closeActiveFile("test.ts");
    expect(registry.activeFilesT.get("test.ts")).toBeUndefined();
});

it("Changes active file", () => {
    registry.openActiveFile("test.ts", "abc");
    registry.changeActiveFile("test.ts", "efg");
    expect(registry.activeFilesT.get("test.ts")).toBe("efg");
});

describe("getSource", () => {
    afterEach(() => {
        fsMock.restore();
    });

    it("Prefers active file from FS file for the same path", async () => {
        fsMock({
            "/test.ts": "FS file",
        });
        registry.openActiveFile("/test.ts", "Active file");

        expect(await registry.getSource("/test.ts")).toBe("Active file");
    });

    it("Return source from the file system", async () => {
        fsMock({
            "/test.ts": fsMock.file({
                content: "First",
                mtime: new Date(2017, 10, 10, 3, 3, 3, 3),
            }),
        });
        expect(await registry.getSource("/test.ts")).toBe("First");
    });

    it("Returns source from the cache if mtime wasn't changed for the file", async () => {
        fsMock({
            "/test.ts": fsMock.file({
                content: "First",
                mtime: new Date(2017, 10, 10, 3, 3, 3, 3),
            }),
        });
        await registry.getSource("/test.ts");
        fsMock({
            "/test.ts": fsMock.file({
                content: "Second",
                mtime: new Date(2017, 10, 10, 3, 3, 3, 3),
            }),
        });
        expect(await registry.getSource("/test.ts")).toBe("First");

        fsMock({
            "/test.ts": fsMock.file({
                content: "Third",
                mtime: new Date(2017, 10, 10, 3, 3, 3, 4),
            }),
        });
        expect(await registry.getSource("/test.ts")).toBe("Third");
    });

    it("Returns undefined if file is not available", async () => {
        fsMock({});
        expect(await registry.getSource("/test.ts")).toBeUndefined();
    });
});

it("Deletes file", async () => {
    fsMock({
        "/test.ts": "Some content",
    });
    // load file to the cache
    await registry.getSource("/test.ts");
    registry.openActiveFile("/test.ts", "Another");
    registry.deleteFile("/test.ts");
    expect(registry.activeFilesT.size).toBe(0);
    expect(registry.fileCacheT.size).toBe(0);

    fsMock.restore();
});
