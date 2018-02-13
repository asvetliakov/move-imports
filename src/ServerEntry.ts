import {
    CompletionItem, CompletionItemKind, createConnection, Diagnostic, DiagnosticSeverity, IConnection,
    InitializeParams, InitializeResult, IPCMessageReader, IPCMessageWriter, Proposed,
    ProposedFeatures, TextDocument, TextDocumentPositionParams, TextDocuments,
} from "vscode-languageserver";
import { Configuration, defaultConf, GlobalConfiguration } from "./Configuration";
import { DocumentRegistry } from "./DocumentRegistry";
import { FileHashRegistry } from "./FileHashRegistry";
import { Server } from "./Server";

const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
const documents: TextDocuments = new TextDocuments();

let hashRegistry: FileHashRegistry;
let documentRegistry: DocumentRegistry;
let server: Server;

async function getWorkspaceUriForFile(uri: string): Promise<string | undefined> {
    return connection.sendRequest<string | undefined>("mvGetWorkpaceUriForFile", uri);
}

connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {
    const globalConf: GlobalConfiguration = await connection.workspace.getConfiguration("move-imports");
    hashRegistry = new FileHashRegistry(globalConf.useCreationDateForFileHash);
    documentRegistry = new DocumentRegistry();
    server = new Server();

    const workspaces = await connection.workspace.getWorkspaceFolders();
    if (workspaces) {
        const initWorkspaces: Array<{ uri: string, conf: Configuration }> = [];
        for (const workspace of workspaces) {
            let workspaceConf: Configuration = await connection.workspace.getConfiguration({ scopeUri: workspace.uri, section: "move-imports" });
            if (!workspaceConf) {
                workspaceConf = defaultConf;
            }
            initWorkspaces.push({
                uri: workspace.uri,
                conf: workspaceConf,
            });
        }
        // not awaiting, the server won't process any requests until completing initialization
        server.initializeWorkspaces(initWorkspaces);
    }
    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
        },
    };
});

connection.onDidChangeConfiguration(change => {
});

connection.workspace.onDidChangeWorkspaceFolders(async change => {
    for (const removed of change.removed) {
        await server.removeWorkspace(removed.uri);
    }
    for (const added of change.added) {
        const conf: Configuration = await connection.workspace.getConfiguration({ scopeUri: added.uri, section: "move-imports" });
        await server.addWorkspace(added.uri, conf);
    }
});

documents.onDidChangeContent(change => {

});

documents.onDidClose(change => {

});

connection.onDidChangeWatchedFiles(async change => {
    for (const c of change.changes) {
        if (c.uri.endsWith(".gitignore")) {
            // gitignore change -> reset workspace
            const workspace = await getWorkspaceUriForFile(c.uri);
            if (!workspace) {
                continue;
            }
            const workspaceConf = await connection.workspace.getConfiguration({ scopeUri: workspace, section: "move-imports" });
            await server.removeWorkspace(workspace);
            await server.addWorkspace(workspace, workspaceConf || defaultConf);
        }
    }
});
