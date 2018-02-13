import fs from "fs";
// tslint:disable-next-line:no-submodule-imports
import MD5 from "md5-file/promise";

export interface MoveOperation {
    newPath: string;
    oldPath: string;
    hash: string;
}

export class FileHashRegistry {
    /**
     * Md5 map -> file path map
     */
    protected hashToFile: Map<string, string> = new Map();
    /**
     * File path -> md5 hash map
     */
    protected fileToHash: Map<string, string> = new Map();
    /**
     * Prepend file's birthtime to content hash
     */
    protected useBirthtimeForContentHash: boolean;

    /**
     * @constructor
     * @param useBirthtime
     */
    public constructor(useBirthtime: boolean = false) {
        this.useBirthtimeForContentHash = useBirthtime;
    }

    /**
     * Clear all hashes
     */
    public clear(): void {
        this.hashToFile.clear();
        this.fileToHash.clear();
    }

    /**
     * Calculate the hash for new file. Must be called after creating the file in the FS.
     * This may be caused by move/rename operation - in this case the method can return MoveOperation
     *
     * @param path
     */
    public async calculateHashForNewFile(path: string): Promise<MoveOperation | undefined> {
        try {
            const newHash = await this.createHash(path);
            const oldPath = this.hashToFile.get(newHash);

            if (oldPath) {
                // Treat as move operation
                // set new path
                this.hashToFile.set(newHash, path);
                // delete old path
                this.fileToHash.delete(oldPath);
                this.fileToHash.set(path, newHash);
                return {
                    newPath: path,
                    oldPath,
                    hash: newHash,
                };
            } else {
                this.hashToFile.set(newHash, path);
                this.fileToHash.set(path, newHash);
                return undefined;
            }
        } catch {
            return undefined;
        }
    }

    /**
     * Replace hash for the existing file
     *
     * @param path
     */
    public async replaceHashForFile(path: string): Promise<void> {
        try {
            const newHash = await this.createHash(path);
            const oldHash = this.fileToHash.get(path);
            if (oldHash) {
                // remove old hash from mapping
                this.hashToFile.delete(oldHash);
            }
            this.fileToHash.set(path, newHash);
            this.hashToFile.set(newHash, path);
        } catch {
            // ignore
        }
    }

    /**
     * Delete hash for the file
     *
     * @param path
     */
    public async deleteHashForFile(path: string): Promise<void> {
        const hash = this.fileToHash.get(path);
        if (hash) {
            this.hashToFile.delete(hash);
        }
        this.fileToHash.delete(path);
    }

    /**
     * Return all files with given prefix, usually prefix will be workspace root
     *
     * @param prefix
     * @returns
     */
    public getAllFilesWithPrefix(prefix: string): string[] {
        return [...this.fileToHash.keys()].filter(f => f.startsWith(prefix));
    }

    /**
     * Calculate hash for the given path
     *
     * @param path
     */
    private async createHash(path: string): Promise<string> {
        const hash = await MD5(path);
        if (this.useBirthtimeForContentHash) {
            const stat = await new Promise<fs.Stats>((res, rej) => fs.stat(path, (e, stats) => e ? rej(e) : res(stats)));
            return `${stat.birthtime.getTime()} - ${hash}`;
        }
        return hash;
    }
}
