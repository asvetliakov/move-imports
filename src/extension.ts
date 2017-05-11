'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Plugin } from './Plugin';
import { Configuration } from './Configuration';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    
    const pluginConf = new Configuration();
    const conf = vscode.workspace.getConfiguration("move-imports");
    pluginConf.confirmMoveReferences = conf.get<boolean>("confirmMoveReferences", true);
    pluginConf.excludedRegexp = conf.get<string | undefined>("excludedRegexp", "/node_modules/");
    pluginConf.expressionReferences = conf.get<string[]>("expressionReferences", ["require", "jest.mock", "jest.setMock", "jest.unmock", "jest.genMockFromModule"]);
    pluginConf.extensions = conf.get<string[]>("extensions", ["tsx", "ts", "jsx", "js"]);
    pluginConf.useCreationDateForFileHash = conf.get<boolean>("useCreationDateForHash", false);
    pluginConf.warnAboutSameContentFiles = conf.get<boolean>("warnAboutSameContentFiles", true);
    
    
    const plugin = new Plugin(pluginConf);
    context.subscriptions.push(plugin);

    plugin.init();
}

// this method is called when your extension is deactivated
export function deactivate() {
}