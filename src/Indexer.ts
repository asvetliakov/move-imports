import * as fs from "fs";
import * as nodePath from "path";
import * as MD5File from "md5-file";
import * as ts from "typescript";
import { DuplicateContentError } from './DuplicateContentError';

export interface LineAndCharacter {
    line: number;
    character: number;
}

export interface Reference {
    /**
     * Source file path
     */
    sourceFilePath: string;
    /**
     * Reference file path
     */
    referenceFilePath: string;
    /**
     * True if reference has file extensions
     */
    hasExtensionInReference: boolean;
    /**
     * True if reference is the reference to directory (i.e. import * a from "./dir").
     * In this case the referenceFilePath will be directory + index.{ts, tsx, js, jsx} and this flag set to true
     */
    isDirectoryReference: boolean;
    /**
     * Start position
     */
    start: LineAndCharacter;
    /**
     * End position
     */
    end: LineAndCharacter;
}

export class Indexer {
    /**
     * Map of Md5 hash of file content -> file path
     * 
     * @private
     */
    private hashToFile: { [key: string]: string | undefined } = {};
    
    /**
     * Map of file path -> MD5 hash of the file content
     * 
     * @private
     */
    private fileToHash: { [key: string]: string | undefined } = {};
    
    /**
     * Map file path -> references array
     * 
     * @private
     */
    private fileReferencesMap: { [key: string]: Reference[] | undefined } = {};
    
    /**
     * True to prepend file's birthtime in content hash
     * 
     * @private
     */
    private useBirthtimeForContentHash: boolean = false;
    
    /**
     * Array of expressions to also include when moving module references. Example: require, jest.mock, jest.dontMock, etc...
     * 
     * @private
     */
    private expressionReferences: string[] = [];
    
    /**
     * Creates an instance of Indexer.
     * @param expressionReferences Array of expressions to include when moving module references
     * @param useBirthtimeForContentHash True to use file's birhtime for content hash
     */
    public constructor(expressionReferences: string[], useBirthtimeForContentHash: boolean) {
        this.expressionReferences = expressionReferences;
        this.useBirthtimeForContentHash = useBirthtimeForContentHash;
    }
    
    /**
     * Index file and extract references
     * 
     * @param path Path to file
     * @returns void
     */
    public indexFile(path: string): void {
        if (!fs.existsSync(path)) {
            return;
        }
        const newContentHash = this.calculateHashForPath(path);
        // Check if we have already this hash with different path
        if (this.hashToFile[newContentHash] && this.hashToFile[newContentHash] !== path) {
            throw new DuplicateContentError(this.hashToFile[newContentHash]);
        }

        // Delete old mappings for this file if we have
        const oldHash = this.fileToHash[path];
        if (oldHash && this.hashToFile[oldHash]) {
            delete this.hashToFile[oldHash];
        }
        // store new hash <-> file mappings
        this.fileToHash[path] = newContentHash;
        this.hashToFile[newContentHash] = path;
        
        if (this.isPathJSTSLike(path)) {
            const source = fs.readFileSync(path, "utf8");
            const tsSourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
            const references: Reference[] = [];
            
            const firstNode = tsSourceFile.getChildAt(0);
            const parseNode = (node: ts.Node): void => {
                if (node.kind === ts.SyntaxKind.ImportDeclaration || node.kind === ts.SyntaxKind.ExportDeclaration) {
                    // handle all kinds of ES6/TS imports or re-exports
                    if ((node as ts.ImportDeclaration | ts.ExportDeclaration).moduleSpecifier.kind === ts.SyntaxKind.StringLiteral) {
                        const referenceModulePath = ((node as ts.ImportDeclaration).moduleSpecifier as ts.StringLiteral).text;
                        const startLineAndCharacter = ts.getLineAndCharacterOfPosition(tsSourceFile, (node as ts.ImportDeclaration).moduleSpecifier.getStart());
                        const endLineAndCharacter = ts.getLineAndCharacterOfPosition(tsSourceFile, (node as ts.ImportDeclaration).moduleSpecifier.getEnd());
                        if (this.isModulePathRelative(referenceModulePath)) {
                            const referencedPathInfo = this.getFullPathOfReferencedModule(path, referenceModulePath);
                            references.push({
                                start: startLineAndCharacter,
                                end: endLineAndCharacter,
                                sourceFilePath: path,
                                referenceFilePath: referencedPathInfo.path,
                                hasExtensionInReference: referencedPathInfo.hasExtInPath,
                                isDirectoryReference: referencedPathInfo.isDirectory
                            });
                        }
                    }
                } else if (node.kind === ts.SyntaxKind.VariableStatement) {
                    // handle const a = require("b");
                    const stm = node as ts.VariableStatement;
                    // We may have a = require("b"), c = require("d");
                    const processDeclarations = (decl: ts.VariableDeclaration): void => {
                        if (decl.initializer && decl.initializer.kind === ts.SyntaxKind.CallExpression && this.shouldProcessCallExpression(decl.initializer as ts.CallExpression)) {
                            const reference = this.getRelativeReferenceFromCallExpression(decl.initializer as ts.CallExpression);
                            if (reference) {
                                const referencePathInfo = this.getFullPathOfReferencedModule(path, reference.path);
                                references.push({
                                    start: reference.start,
                                    end: reference.end,
                                    sourceFilePath: path,
                                    referenceFilePath: referencePathInfo.path,
                                    hasExtensionInReference: referencePathInfo.hasExtInPath,
                                    isDirectoryReference: referencePathInfo.isDirectory
                                });
                            }
                        }
                    };
                    stm.declarationList.declarations.forEach(processDeclarations);

                } else if (node.kind === ts.SyntaxKind.ExpressionStatement) {
                    // handle jest.mock("../a"), a bit special for Jest users ;)
                    if ((node as ts.ExpressionStatement).expression.kind === ts.SyntaxKind.CallExpression) {
                        const callExp = (node as ts.ExpressionStatement).expression as ts.CallExpression;
                        if (this.shouldProcessCallExpression(callExp)) {
                            const reference = this.getRelativeReferenceFromCallExpression(callExp);
                            if (reference) {
                                const referencePathInfo = this.getFullPathOfReferencedModule(path, reference.path);
                                references.push({
                                    start: reference.start,
                                    end: reference.end,
                                    sourceFilePath: path,
                                    referenceFilePath: referencePathInfo.path,
                                    hasExtensionInReference: referencePathInfo.hasExtInPath,
                                    isDirectoryReference: referencePathInfo.isDirectory
                                });
                            }
                        }
                    }
                }
            };

            firstNode.getChildren().forEach(parseNode);
            this.fileReferencesMap[path] = references;
        }
    }
    
    /**
     * Check if path was moved from one place to other. This will calculate content hash and check if we have already one
     * If check succesfull, then it's likely the existing file was moved from one place to other
     * 
     * @param path 
     * @returns 
     */
    public isMovedPath(path: string): boolean {
        const hash = this.calculateHashForPath(path);
        return !!(this.hashToFile[hash]);
    }
    
    /**
     * Update old path to new path and get references for this path
     * 
     * @param newPath 
     * @returns 
     */
    public updateAndGetReferences(newPath: string): Reference[] | undefined {
        const hash = this.calculateHashForPath(newPath);
        const oldFilePath = this.hashToFile[hash];
        if (!oldFilePath) {
            return;
        }
        // update file path in hash maps
        this.hashToFile[hash] = newPath;
        this.fileToHash[newPath] = hash;
        if (this.fileToHash[oldFilePath]) {
            delete this.fileToHash[oldFilePath];
        }

        if (this.fileReferencesMap[oldFilePath]) {
            // Update file reference map
            this.fileReferencesMap[newPath] = this.fileReferencesMap[oldFilePath].map(ref => ({ ...ref, sourceFilePath: newPath }));
            delete this.fileReferencesMap[oldFilePath];
        }

        // we're not updating module references to this file because we'll create text edits for these files
        // The module references will be updated when user will save these edits
        
        // get references to this file from other files
        const references: Reference[] = [];
        for (const key of Object.keys(this.fileReferencesMap)) {
            const refs = this.fileReferencesMap[key];
            if (refs) {
                for (const ref of refs) {
                    if (ref.referenceFilePath === oldFilePath) {
                        references.push(ref);
                    }
                }
            }
        }
        // also push all references inside in update path. We may change move directory/file in few levels deep up/down and thus
        // references need to be updated as well
        references.push(...this.fileReferencesMap[newPath]);
        return references;
    }
    
    /**
     * Clean path
     * 
     * @param path 
     */
    public cleanPath(path: string): void {
        const hash = this.calculateHashForPath(path);
        if (this.hashToFile[hash]) {
            delete this.hashToFile[hash];
        }
        if (this.fileToHash[path]) {
            delete this.fileToHash[path];
        }
        if (this.fileReferencesMap[path]) {
            delete this.fileReferencesMap[path];
        }
    }
    
    /**
     * Calculate content hash for file in the path
     * 
     * @private
     * @param path 
     * @returns 
     */
    private calculateHashForPath(path: string): string {
        // Calculate hash
        let hash = MD5File.sync(path);
        // Prepending birthtime will produce unique result of time-hash in 99% cases
        // even if file contents are equal. Unfortunately it's not available on Linux
        // And birthtime will be same as atime (last access time)
        if (this.useBirthtimeForContentHash) {
            const stats = fs.statSync(path);
            hash = stats.birthtime.getTime() + "-" + hash;
        }
        return hash;
    }
    
    
    /**
     * Return true if we need to process given call expression further.
     * This will check expression identifier against this.expressionReferences array
     *
     * @private
     * @param expression 
     * @returns 
     */
    private shouldProcessCallExpression(expression: ts.CallExpression): boolean {
        // this will give full expression name, such as require, jest.mock, a.b.c, etc...
        const identifier = expression.expression.getText();
        // constraint that call expression should have module path as first argument
        const firstArg = expression.arguments[0];
        return (this.expressionReferences.indexOf(identifier) !== -1
            && firstArg
            && (firstArg.kind === ts.SyntaxKind.StringLiteral || firstArg.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral));
    }
    
    /**
     * Get relative module reference from call expression
     * 
     * @private
     * @param expression Call expression
     * @returns Relative module reference or undefined if module reference is not relative
     */
    private getRelativeReferenceFromCallExpression(expression: ts.CallExpression): { path: string, start: ts.LineAndCharacter, end: ts.LineAndCharacter } | undefined {
        const firstArg = expression.arguments[0] as ts.StringLiteral;
        const modulePath = firstArg.text;
        
        if (!this.isModulePathRelative(modulePath)) {
            return undefined;
        }
        
        return {
            path: modulePath,
            start: ts.getLineAndCharacterOfPosition(expression.getSourceFile(), firstArg.getStart()),
            end: ts.getLineAndCharacterOfPosition(expression.getSourceFile(), firstArg.getEnd())
        };
    }

    /**
     * Return true if file is javascript/typescript like
     * 
     * @private
     * @param path 
     * @returns 
     */
    private isPathJSTSLike(path: string): boolean {
        return /\.(js|jsx|ts|tsx)$/.test(path);
    }
    
    /**
     * Return true if given path is relative
     * 
     * @private
     * @param path 
     * @returns 
     */
    private isModulePathRelative(path: string): boolean {
        return (path.startsWith("./") || path.startsWith("../"));
    }
    
    /**
     * Return full path of referenced module
     * 
     * @private
     * @param fromPath 
     * @param referencePath 
     * @returns 
     */
    private getFullPathOfReferencedModule(fromPath: string, referencePath: string): { path: string, hasExtInPath: boolean, isDirectory: boolean } {
        let fullPath = nodePath.resolve(nodePath.dirname(fromPath), referencePath);
        const hasExtensionInPath = /\.\w+$/.test(fullPath);
        let isDirectoryReference = false;
        if (!hasExtensionInPath) {
            // Not specified extension, first check if it's a file
            let hasFile = false;
            const tryExt = [".tsx", ".ts", ".jsx", ".js"];
            for (const ext of tryExt) {
                if (fs.existsSync(fullPath + ext)) {
                    fullPath += ext;
                    hasFile = true;
                    break;
                }
            }
            if (!hasFile) {
                // If no such file exist, try fullPath/index + [...tryExt]
                const indexLikePath = nodePath.join(fullPath, "index");
                for (const ext of tryExt) {
                    if (fs.existsSync(indexLikePath + ext)) {
                        fullPath = indexLikePath + ext;
                        isDirectoryReference = true;
                        break;
                    }
                }
            }
        }
        return {
            path: fullPath,
            hasExtInPath: hasExtensionInPath,
            isDirectory: isDirectoryReference
        };
    }    
}