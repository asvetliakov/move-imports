import fs from "fs";
import ignore from "ignore";
import path from "path";

// because interface is not exported
interface Ignore {
    add(pattern: string | Ignore | string[] | Ignore[]): Ignore;
    filter(paths: string[]): Ignore;
    createFilter(): (path: string) => Ignore;
    ignores(pathname: string): boolean;
}

export class ExcludeChecker {
    /**
     * Globs specified in gitignore, normalized
     */
    private gitIgnoreGlobs: string[] = [];

    /**
     * Workspace root
     */
    private workspaceRoot: string;

    /**
     * Ignore globs specified in configuration
     */
    private confGlobs: string[] = [];

    /**
     * Ignore instance
     */
    private ignore: Ignore;

    /**
     * Creates an instance of ExcludeChecker.
     *
     * @param workspaceRoot
     * @param confGlobs
     * @param readGitIgnore
     */
    public constructor(workspaceRoot: string, confGlobs: string[]) {
        this.workspaceRoot = workspaceRoot;
        this.confGlobs = confGlobs;
        this.ignore = ignore().add(confGlobs);
    }

    /**
     * Read git ignore file
     */
    public async readGitIgnoreExcludes(): Promise<void> {
        try {
            const lines = await new Promise<string>((res, rej) =>
                fs.readFile(path.resolve(this.workspaceRoot, ".gitignore"), "utf8", (e, data) => e ? rej(e) : res(data)),
            );
            for (const line of lines.replace(/\r\n/g, "\n").split("\n")) {
                // Skip empty lines
                if (line.trim() === "") {
                    continue;
                }
                // skip comments
                if (/^\s*#.*/.test(line)) {
                    continue;
                }
                this.gitIgnoreGlobs.push(line.trim());
            }
            if (this.gitIgnoreGlobs.length > 0) {
                this.ignore.add(this.gitIgnoreGlobs);
            }
        } catch {
            // ignore for now
        }
    }

    /**
     * Return full list of ignore globs
     *
     * @param inverted
     */
    public getIgnoreGlobs(inverted: boolean = false): string[] {
        const ignores = [...this.confGlobs, ...this.gitIgnoreGlobs];
        return inverted ? ignores.map(i => i.startsWith("!") ? i.substr(1) : "!" + i) : ignores;
    }

    /**
     * Return true if given file path is excluded either by gitignore or configuration ignore
     *
     * @param filePath
     * @returns
     */
    public isFileExcluded(filePath: string): boolean {
        // convert to relative path -> /a/b/c.js -> b/c.js if workspace root is /a, need for ignore
        if (filePath.startsWith(this.workspaceRoot)) {
            filePath = path.relative(this.workspaceRoot, filePath);
        }
        return this.ignore.ignores(filePath);
    }
}
