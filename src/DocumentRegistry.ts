import fs from "fs";

export interface FileCache {
    source: string;
    mtime: number;
}

/**
 * Manages sources files from the filesystem & currently opened documents
 */
export class DocumentRegistry {

    protected activeFiles: Map<string, string> = new Map();

    protected fileCache: Map<string, FileCache> = new Map();

    /**
     * Open active file
     *
     * @param path
     * @param source
     */

    public openActiveFile(path: string, source: string): void {
        this.activeFiles.set(path, source);
    }

    /**
     * Close active file
     *
     * @param path
     */
    public closeActiveFile(path: string): void {
        this.activeFiles.delete(path);
    }

    /**
     * Delete file from registry
     *
     * @param path
     */
    public deleteFile(path: string): void {
        this.activeFiles.delete(path);
        this.fileCache.delete(path);
    }

    /**
     * Change active file
     *
     * @param path
     */
    public changeActiveFile(path: string, source: string): void {
        this.activeFiles.set(path, source);
    }

    /**
     * Get file source either from active files or from file system
     */
    public async getSource(path: string): Promise<string | undefined> {
        // active files preferred
        if (this.activeFiles.has(path)) {
            return this.activeFiles.get(path);
        }
        try {
            const stat = await new Promise<fs.Stats>((res, rej) =>
                fs.stat(path, (e, stats) => e ? rej(e) : res(stats)));
            const cache = this.fileCache.get(path);
            // if cache available, return it, preventing FS read call
            if (cache && cache.mtime === stat.mtime.getTime()) {
                return cache.source;
            }

            const source = await new Promise<string>((res, rej) =>
                fs.readFile(path, { encoding: "utf8" }, (e, s) => e ? rej(e) : res(s)));
            this.fileCache.set(path, { source, mtime: stat.mtime.getTime() });
            return source;
        } catch {
            return undefined;
        }
    }
}
