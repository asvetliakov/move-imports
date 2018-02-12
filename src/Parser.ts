import * as ts from "typescript";

export interface LineAndCharacter {
    line: number;
    character: number;
}

export interface Reference {
    /**
     * Reference path
     */
    path: string;
    /**
     * Start position
     */
    start: LineAndCharacter;
    /**
     * End position
     */
    end: LineAndCharacter;
}

/**
 * Simple TS file parser to extract imports/exports and require-like expressions
 */
export class Parser {
    public constructor(
        private expressionReferences: string[],
    ) { }

    /**
     * Return references to other source from given source
     */
    public getReferences(source: string): Reference[] {
        const refs: Reference[] = [];

        try {
            const tsSourceFile = ts.createSourceFile("", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
            const visitor = (node: ts.Node): void => {
                if (
                    (ts.isImportDeclaration(node) || (ts.isExportDeclaration(node) && !node.exportClause)) &&
                    node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
                    // ES6 imports/ES6 re-export
                    // !node.exportClause will be undefined for re-export
                    refs.push({
                        path: node.moduleSpecifier.text,
                        start: ts.getLineAndCharacterOfPosition(tsSourceFile, node.moduleSpecifier.getStart()),
                        end: ts.getLineAndCharacterOfPosition(tsSourceFile, node.moduleSpecifier.getEnd()),
                    });
                } else if (ts.isVariableStatement(node)) {
                    // const a = require("b"), { c } = require("c");
                    node.declarationList.declarations.forEach((decl) => {
                        if (decl.initializer && ts.isCallExpression(decl.initializer) && this.shouldProcessCallExpression(decl.initializer)) {
                            // first arg is string was asserted in this.shouldProcessCallExpression
                            const refNode = decl.initializer.arguments[0] as ts.StringLiteral;
                            refs.push({
                                path: refNode.text,
                                start: ts.getLineAndCharacterOfPosition(tsSourceFile, refNode.getStart()),
                                end: ts.getLineAndCharacterOfPosition(tsSourceFile, refNode.getEnd()),
                            });
                        }
                    });

                } else if (ts.isExpressionStatement(node)) {
                    // expression calls without variable assignment:
                    // require("./a");
                    // jest.mock("./a");
                    if (ts.isCallExpression(node.expression) && this.shouldProcessCallExpression(node.expression)) {
                        // first arg is string was asserted in this.shouldProcessCallExpression
                        const refNode = node.expression.arguments[0] as ts.StringLiteral;
                        refs.push({
                            path: refNode.text,
                            start: ts.getLineAndCharacterOfPosition(tsSourceFile, refNode.getStart()),
                            end: ts.getLineAndCharacterOfPosition(tsSourceFile, refNode.getEnd()),
                        });
                    }
                }
            };

            // Process only top-level file statements, no need to walk through full AST
            // however dynamic imports and require-like calls won't be processed if they-re not top-level
            // not a really issue i think
            tsSourceFile.statements.forEach(visitor);
            return refs;
        } catch {
            return refs;
        }
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
        return (
            this.expressionReferences.includes(identifier) &&
            firstArg &&
            (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg))
        );
    }

}
