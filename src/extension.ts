'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const enumerizeSelection = vscode.commands.registerCommand('extension.enumerizeSelection', () => {
        vscode.window.showInformationMessage('Enumerize selection WIP');
    });
    context.subscriptions.push(enumerizeSelection);

    const enumerize = vscode.commands.registerCommand('extension.enumerize', async () => {
        const editor = vscode.window.activeTextEditor;
        const editorConfig = vscode.workspace.getConfiguration('editor');

        // Get range for editing
        const firstLine = editor.document.lineAt(0);
        const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
        const documentRange = new vscode.Range(0, firstLine.range.start.character, editor.document.lineCount - 1, lastLine.range.end.character);

        // Get all lines
        const lines: Array<vscode.TextLine> = [];
        for (let lineIndex = 0; lineIndex < editor.document.lineCount; lineIndex++) {
            const line = editor.document.lineAt(lineIndex);
            if (line.text) {
                lines.push(line);
            }
        }

        // Prompt for enum name
        const enumNamePromptOptions: vscode.InputBoxOptions = {
            prompt: "Enter enum name",
            placeHolder: "MyEnum",
        }
        const enumName = await vscode.window.showInputBox(enumNamePromptOptions);

        // Prompt for enum data keys
        const enumDataKeysPromptOptions: vscode.InputBoxOptions = {
            prompt: "Enter enum data keys separated by commas or spaces",
            placeHolder: "firstKey,secondKey",
        }
        const enumDataKeys = await vscode.window.showInputBox(enumDataKeysPromptOptions);

        // Build enum
        const enumEntries = [];
        lines.map(line => line.text).forEach((lineText) => {
            enumEntries.push(`${' '.repeat(editorConfig.tabSize)}${lineText} = '${lineText}'`);
        });
        const enumString = `export enum ${enumName} {\n${enumEntries.join(',\n')}\n}`;

        // Build enum data
        const enumDataEntries = [];
        lines.map(line => line.text).forEach((lineText) => {
            // Split entered enum data keys and trim them
            const keys: Array<string> = enumDataKeys.split(/[ ,]+/).map((enumDataKey) => {
              return enumDataKey.trim();
            }).filter(Boolean);

            // Format keys
            const formattedKeys: Array<string> = keys.map((key) => {
                return `${' '.repeat(editorConfig.tabSize * 2)}${key}: '${key}Value'`;
            });

            // Build data object
            enumDataEntries.push(`${' '.repeat(editorConfig.tabSize)}[${enumName}.${lineText}]: {\n${formattedKeys.join(',\n')}\n${' '.repeat(editorConfig.tabSize)}}`);
        });
        const enumData = `export const myEnumData = {\n${enumDataEntries.join(',\n')}\n};`;

        // Change document content with build enum
        editor.edit(builder => {
            builder.replace(documentRange, `${enumString}\n\n${enumData}`);
        });
    });
    context.subscriptions.push(enumerize);
}

export function deactivate() {}
