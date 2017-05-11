import * as vscode from "vscode";
import * as nodePath from "path";
import * as fs from "fs";
import { Indexer, Reference } from './Indexer';
import { DuplicateContentError } from './DuplicateContentError';
import { Configuration } from './Configuration';

export class Plugin implements vscode.Disposable {
    /**
     * Configuration object
     * 
     * @private
     */
    private configuration: Configuration;
    
    /**
     * Indexer
     * 
     * @private
     */
    private indexer: Indexer;
    
    /**
     * File watchers
     * 
     * @private
     */
    private watchers: vscode.FileSystemWatcher[] = [];
    
    /**
     * First index flag
     * 
     * @private
     */
    private indexed: boolean = false;
    
    /**
     * Creates an instance of Plugin.
     * @param configuration 
     */
    public constructor(configuration: Configuration) {
        this.configuration = configuration;
        this.indexer = new Indexer(configuration.expressionReferences, configuration.useCreationDateForFileHash);
        this.watchers = this.configuration.extensions.map(ext => vscode.workspace.createFileSystemWatcher(`**/*.${ext}`));
        for (const watcher of this.watchers) {
            watcher.onDidChange(this.onDidChange, this);
            watcher.onDidCreate(this.onDidCreate, this);
            watcher.onDidDelete(this.onDidDelete, this);
        }
    }
    
    /**
     * Init & Index files in project
     * 
     * @returns 
     */
    public async init(): Promise<void> {
        const excludedRegexp = this.configuration.excludedRegexp ? new RegExp(this.configuration.excludedRegexp) : undefined;
        const filesWithSameContent: string[] = [];
        await Promise.all(this.configuration.extensions.map(async ext => {
            const files = await vscode.workspace.findFiles(`**/*.${ext}`, "**/node_modules/**", 100000)
            for (const file of files) {
                if (excludedRegexp && excludedRegexp.test(file.fsPath)) {
                    continue;
                }
                try {
                    this.indexer.indexFile(file.fsPath);
                } catch (e) {
                    if (e instanceof DuplicateContentError) {
                        filesWithSameContent.push(file.fsPath);
                        if (filesWithSameContent.indexOf(e.duplicatedFile) === -1) {
                            filesWithSameContent.push(e.duplicatedFile);
                        }
                    } else {
                        console.error(`Unable to index file: ${file.fsPath}, error: ${e.message}`);
                    }
                }
            }
        }))
        this.indexed = true;
        if (filesWithSameContent.length > 0) {
            await this.askToOpenMatchingFiles(filesWithSameContent);
        }
    }

    /**
     * Free
     */
    public dispose() {
        for (const watcher of this.watchers) {
            watcher.dispose();
        }
    }
    
    /**
     * File content was changed. Either external change / content change after editing
     * 
     * @protected
     * @param uri 
     * @returns 
     */
    protected onDidChange(uri: vscode.Uri): void {
        if (!this.indexed) {
            return;
        }
        const excludedRegexp = this.configuration.excludedRegexp ? new RegExp(this.configuration.excludedRegexp) : undefined;
        if (excludedRegexp && excludedRegexp.test(uri.fsPath)) {
            return;
        }
        try {
            this.indexer.indexFile(uri.fsPath);
        } catch (e) {
            if (e instanceof DuplicateContentError) {
                this.askToOpenMatchingFiles([uri.fsPath, e.duplicatedFile]);
            }
        }
    }
    
    /**
     * New file created.
     * Notes:
     * 1) Renaming single file -> vscode calls onDidCreate() then onDidDelete()
     * 2) Renaming folder -> vscode calls only onDidCreate() for new files
     * 
     * @protected
     * @param uri 
     * @returns 
     */
    protected async onDidCreate(uri: vscode.Uri): Promise<void> {
        if (!this.indexed) {
            return;
        }
        const newPath = uri.fsPath;
        const excludedRegexp = this.configuration.excludedRegexp ? new RegExp(this.configuration.excludedRegexp) : undefined;
        if (excludedRegexp && excludedRegexp.test(newPath)) {
            return;
        }
        if (this.indexer.isMovedPath(newPath)) {
            const references = this.indexer.updateAndGetReferences(newPath);
            if (references && references.length > 0) {
                const confirmed = await this.askForReferenceConfirmation(newPath, references.length);
                if (confirmed) {
                    // create text edits
                    const workspaceEdit = new vscode.WorkspaceEdit();
                    const sortedReferences: { [key: string]: Reference[] } = {};
                    for (const ref of references) {
                        if (!sortedReferences[ref.sourceFilePath]) {
                            sortedReferences[ref.sourceFilePath] = [];
                        }
                        sortedReferences[ref.sourceFilePath].push(ref);
                    }
                    for (const filePath of Object.keys(sortedReferences)) {
                        // We may rename directory and there are references inside this directory. In this case the filePath will be invalid
                        // so just skip it. For these paths the new onDidCreate() event must come and they'll be handled
                        if (!fs.existsSync(filePath)) {
                            continue;
                        }
                        const uri = vscode.Uri.file(filePath);
                        const edits = sortedReferences[filePath].map(ref => {
                            let newRelative = nodePath.relative(nodePath.dirname(ref.sourceFilePath),
                                ref.hasExtensionInReference ? newPath : nodePath.join(nodePath.dirname(newPath), nodePath.basename(newPath, nodePath.extname(newPath))));
                            // If newRelative will point to the same directory then ./ will be dropped, add it again
                            if (!newRelative.startsWith("./") && !newRelative.startsWith("../")) {
                                newRelative = `./${newRelative}`;
                            }
                            // character +(-) 1 for preserving '"`
                            return vscode.TextEdit.replace(new vscode.Range(ref.start.line, ref.start.character + 1, ref.end.line, ref.end.character - 1), newRelative);
                        });
                        workspaceEdit.set(uri, edits);
                    }
                    try {
                        await vscode.workspace.applyEdit(workspaceEdit);
                    } catch (e) {
                        console.log(`Unable to apply workspace edit, error: ${e.message}`);
                    }
                }
            }
        } else {
            // new file
            try {
                this.indexer.indexFile(uri.fsPath);
            } catch (e) {
                if (e instanceof DuplicateContentError) {
                    if (this.configuration.warnAboutSameContentFiles) {
                        this.askToOpenMatchingFiles([uri.fsPath, e.duplicatedFile]);
                    }
                } else {
                    console.error(`Unable to index file: ${uri.fsPath}, error: ${e.message}`);
                }
            }
        }
    }
    
    /**
     * File was deleted
     * 
     * @protected
     * @param uri 
     * @returns 
     */
    protected onDidDelete(uri: vscode.Uri): void {
        if (!this.indexed) {
            return;
        }
        const excludedRegexp = this.configuration.excludedRegexp ? new RegExp(this.configuration.excludedRegexp) : undefined;
        if (excludedRegexp && excludedRegexp.test(uri.fsPath)) {
            return;
        }
        this.indexer.cleanPath(uri.fsPath);
    }
    
    /**
     * Display "same content found" message and ask user to open these files
     * 
     * @private
     * @param files 
     * @returns 
     */
    private async askToOpenMatchingFiles(files: string[]): Promise<void> {
        if (!this.configuration.warnAboutSameContentFiles) {
            return;
        }
        const tooMuchDocs = files.length > 10;
        const openItem: vscode.MessageItem = {
            title: tooMuchDocs ? "View file paths" : "Open These Files"
        };
        const res = await vscode.window.showWarningMessage(`Files (${files.length}) with same content were found. Moving/Renaming these files may lead to unexpected edits.` +
            `Consider to add unique content to these files or exclude them`,
            { modal: false }, openItem
        );
        if (res && res === openItem) {
            if (tooMuchDocs) {
                const content = files.join("\n");
                const doc = await vscode.workspace.openTextDocument({ content: content, language: "text" });
                vscode.window.showTextDocument(doc);
            } else {
                // Open files
                for (const file of files) {
                    const doc = await vscode.workspace.openTextDocument(file);
                    vscode.window.showTextDocument(doc);
                }
            }
        }
    }
    
    /**
     * Ask for editing
     * 
     * @private
     * @param fileName 
     * @param referencesCount 
     * @returns 
     */
    private async askForReferenceConfirmation(fileName: string, referencesCount: number): Promise<boolean> {
        if (!this.configuration.confirmMoveReferences) {
            return true;
        }
        const confirm: vscode.MessageItem = {
            title: "Yes"
        };
        const reject: vscode.MessageItem = {
            title: "No",
            isCloseAffordance: true
        };
        const res = await vscode.window.showInformationMessage(`Update ${referencesCount} references for file: ${fileName}?`, { modal: false }, confirm, reject);
        return (res && res === confirm) ? true : false;
    }
}