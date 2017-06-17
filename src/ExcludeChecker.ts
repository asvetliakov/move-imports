import * as fs from "fs";
import * as path from "path";
import * as micromatch from "micromatch";

export class ExcludeChecker {
    
    /**
     * Globs specified in configuration
     * 
     * @private
     */
    private confGlobs: string[];
    
    /**
     * Globs specified in gitignore
     * 
     * @private
     */
    private gitIgnoreGlobs: string[];
    
    /**
     * Workspace root
     * 
     * @private
     */
    private workspaceRoot: string | undefined;
    
    /**
     * Creates an instance of ExcludeChecker.
     * @param workspaceRoot 
     * @param globs 
     * @param [readGitIgnore=true] 
     */
    public constructor(workspaceRoot: string | undefined, globs: string[], readGitIgnore: boolean = true) {
        this.workspaceRoot = workspaceRoot;
        // normalize configuration globs too
        this.confGlobs = globs.map(this.normalizeExcludeGlob);
        this.gitIgnoreGlobs = [];
        if (workspaceRoot && readGitIgnore && fs.existsSync(path.join(workspaceRoot, ".gitignore"))) {
            try {
                const gitIgnoreLines = fs.readFileSync(path.join(workspaceRoot, ".gitignore"), "utf8").replace(/\r\n/g, "\n").split("\n");;
                for (const line of gitIgnoreLines) {
                    // Skip empty lines
                    if (line.trim() === "") {
                        continue;
                    }
                    // skip comments
                    if (/^\s*#.*/.test(line)) {
                        continue;
                    }
                    this.gitIgnoreGlobs.push(this.normalizeExcludeGlob(line.trim()));
                }
            } catch (e) {
                // ignore
            }
        }
    }
    
    /**
     * Return full list of excluded files globls
     * 
     * @readonly
     */
    public get excludeGlobs(): string[] {
        return [
            ...this.gitIgnoreGlobs,
            ...this.confGlobs
        ];
    }
    
    /**
     * Return true if given file path is excluded either by gitignore or configuration ignore
     * 
     * @param filePath 
     * @returns 
     */
    public isFileExcluded(filePath: string): boolean {
        const relativePath = path.isAbsolute(filePath) ? path.relative(this.workspaceRoot, filePath) : filePath;
        return micromatch.every(relativePath, this.excludeGlobs, { matchBase: true });
    }
    
    /**
     * Convert exclude glob pattern to understand by micromatch.
     * This needed since glob rules in gitignore and in micromatch are different,
     * i.e node_modules must be node_modules/** to work
     * Rules:
     * * Paths without extensions are being treated as directories
     * * "**" will be added to directories without them
     * * Paths with extensions will be leaved as is
     * 
     * @private
     * @param exclude 
     * @returns 
     */
    private normalizeExcludeGlob(exclude: string): string {
        // Skip globs with extension part
        if (/.*\..*/.test(exclude)) {
            return exclude;
        }
        // Skip dir*, dir/*, dir**, dir/**
        if (exclude.endsWith("*")) {
            return exclude;
        }
        return exclude.endsWith("/") ? exclude + "**" : exclude + "/**"
    }

}