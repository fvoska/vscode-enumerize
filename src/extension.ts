'use strict';
import * as vscode from 'vscode';
import { Range, TextLine, InputBoxOptions, TextEditor, TextEditorEdit, QuickPickOptions } from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
    const enumerizeSelection = vscode.commands.registerCommand('extension.enumerizeSelection', async () => {
        const editor: TextEditor = vscode.window.activeTextEditor;

        // Get selection range
        const selectionRange = editor.selection;

        if (selectionRange.start.line === selectionRange.end.line && selectionRange.start.character === selectionRange.end.character) {
            vscode.window.showInformationMessage('Selection empty - enumerizing whole document');

            const documentRange = getWholeDocumentRange(editor);
            enumerize(editor, documentRange)
        } else {
            enumerize(editor, selectionRange);
        }
    });
    context.subscriptions.push(enumerizeSelection);

    const enumerizeDocument = vscode.commands.registerCommand('extension.enumerize', async () => {
        const editor: TextEditor = vscode.window.activeTextEditor;

        // Get full document range
        const documentRange = getWholeDocumentRange(editor);

        enumerize(editor, documentRange);
    });
    context.subscriptions.push(enumerizeDocument);
}

export function deactivate(): void {}

async function enumerize(editor: TextEditor, documentRange: Range): Promise<boolean> {
    const editorConfig = vscode.workspace.getConfiguration('editor');

    // Prompt for enum name
    const enumNamePromptOptions: InputBoxOptions = {
        prompt: "Enter enum name",
        placeHolder: "MyEnum",
    }
    const enumName = await vscode.window.showInputBox(enumNamePromptOptions);

    // Prompt for enum data keys
    const enumDataKeysPromptOptions: InputBoxOptions = {
        prompt: "Enter enum data keys separated by commas or spaces",
        placeHolder: "firstKey,secondKey",
    }
    const enumDataKeys = await vscode.window.showInputBox(enumDataKeysPromptOptions);

    // Prompt for sorting
    const sortingChoices: Array<string> = ['Sort values alphabetically', 'Sort values alphabetically in reverse', 'Do not sort'];
    const shouldSort: string = await vscode.window.showQuickPick(sortingChoices);

    // Get all lines
    const text: string = editor.document.getText(documentRange);
    const lines: Array<string> = text.split('\n').map((line: string) => line.trim()).filter(Boolean);

    // Sort if necessary
    switch (shouldSort) {
        case sortingChoices[0]:
            lines.sort();
            break;
        case sortingChoices[1]:
            lines.sort().reverse();
            break;
    }

    // Build enum
    const enumEntries = [];
    lines.forEach((lineText) => {
        enumEntries.push(`${' '.repeat(editorConfig.tabSize)}${lineText} = '${lineText}'`);
    });
    const enumString = `export enum ${enumName} {\n${enumEntries.join(',\n')}\n}`;

    // Build enum data
    const enumDataEntries = [];
    lines.forEach((lineText) => {
        // Split entered enum data keys and trim them
        const keys: Array<string> = enumDataKeys.split(/[ ,]+/).map((enumDataKey) => {
            return enumDataKey.trim();
        }).filter(Boolean);

        // Format keys
        const formattedKeys: Array<string> = keys.map((key) => {
            return `${' '.repeat(editorConfig.tabSize * 2)}${key}: '${key}Value'`;
        });

        // Build data object
        if (formattedKeys.length) {
            enumDataEntries.push(`${' '.repeat(editorConfig.tabSize)}[${enumName}.${lineText}]: {\n${formattedKeys.join(',\n')}\n${' '.repeat(editorConfig.tabSize)}}`);
        }
    });
    const enumData = `export const ${decapitalizeFirstLetter(enumName)}Data = {\n${enumDataEntries.join(',\n')}\n};`;

    // Change document content with build enum
    editor.edit((edit: TextEditorEdit) => {
        const enumDataChecked = enumDataEntries.length ? `\n\n${enumData}` : '';
        edit.replace(documentRange, `${enumString}${enumDataChecked}`);
    });

    return Promise.resolve(true);
}

function decapitalizeFirstLetter(string) {
    return (string.charAt(0) as string).toLowerCase() + string.slice(1);
}

function getWholeDocumentRange(editor: TextEditor): Range {
    const firstLine = editor.document.lineAt(0);
    const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
    const documentRange: Range = new Range(0, firstLine.range.start.character, editor.document.lineCount - 1, lastLine.range.end.character);

    return documentRange;
}
