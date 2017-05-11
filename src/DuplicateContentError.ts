/**
 * Duplicated content error
 * 
 * @export
 */
export class DuplicateContentError extends Error {
    /**
     * File path of file which has duplicated content
     */
    public duplicatedFile: string;
    public constructor(duplicatedFilePath: string) {
        super("Found files with duplicated content");
        this.duplicatedFile = duplicatedFilePath;
    }
}
