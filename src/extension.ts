'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { window, env, Position, Selection } from 'vscode';
import { appendFile, writeFile, readFile, mkdir, exists, unlink, existsSync } from 'fs';
import { paste } from 'copy-paste';
import { exec } from 'child_process';
import { tmpdir } from 'os';
import { Localize } from './localize';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "merge-n-paste" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    context.subscriptions.push(vscode.commands.registerCommand('extension.mergeNPaste', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        //vscode.window.showInformationMessage("");

        var ll = new Localize();
        const conf = vscode.workspace.getConfiguration('merge-n-paste');
        const pathToMergeTool = "" + conf.get('pathToMergeTool');
        const reflectFile = "" + conf.get('reflectFile');

        let editor = window.activeTextEditor;
        let docForDiff = editor.document;
        if (!editor) return;

        let doc = editor.document;

        let base_path = tmpdir() + "/vscode-merge-n-paste-";
        let file_name_editor = "EDITOR_{id}.txt";
        let file_name_clipboard = "CLIPBOARD_{id}.txt";
        let file_name_merged = "MERGED_{id}.txt";

        let uniqid = Math.random().toString(36).slice(-8);
        let file_path_editor = base_path + file_name_editor.replace("{id}", uniqid);
        let file_path_clipboard = base_path + file_name_clipboard.replace("{id}", uniqid);
        let file_path_merged = base_path + file_name_merged.replace("{id}", uniqid);

        let cur_selection = editor.selection;
        if (editor.selection.isEmpty) {
            let startPos = new Position(0, 0);
            let endPos = new Position(doc.lineCount - 1, 10000);
            cur_selection = new Selection(startPos, endPos);
        }

        let editor_text = doc.getText(cur_selection);

        let delete_temp = () => {
            if (existsSync(file_path_editor)) {
                unlink(file_path_editor, (err) => { });
            }
            if (existsSync(file_path_clipboard)) {
                unlink(file_path_clipboard, (err) => { });
            }
            if (existsSync(file_path_merged)) {
                unlink(file_path_merged, (err) => { });
            }
        };

        paste((e, d) => {
            if (editor_text == d) {
                vscode.window.showInformationMessage(ll.localize('extension.mergeNPaste.message.isSame'));
                return;
            }

            writeFile(file_path_editor, editor_text, (err) => { });
            writeFile(file_path_clipboard, d, (err) => { });

            if (!pathToMergeTool) {
                const opts: vscode.TextDocumentShowOptions = {
                    preserveFocus: true,
                    preview: true
                };
                let rs_clip = vscode.Uri.parse('file:///' + file_path_clipboard);
                let rs_editor = vscode.Uri.parse('file:///' + file_path_editor);

                let cmd = vscode.commands.executeCommand('vscode.diff',
                    rs_clip,
                    rs_editor,
                    ll.localize('extension.mergeNPaste.word.clipboard') + ' => ' + ll.localize('extension.mergeNPaste.word.editor'),
                    opts
                );
                cmd.then(() => {
                    vscode.window.showInformationMessage(ll.localize('extension.mergeNPaste.message.aboutDiffTab'));
                    let de = window.activeTextEditor;
                    vscode.workspace.onDidCloseTextDocument(doc => {
                        if (doc == de.document) {
                            vscode.window.showInformationMessage(ll.localize('extension.mergeNPaste.message.reflectSelect'), { modal: true }, ll.localize('extension.mergeNPaste.word.editor'), ll.localize('extension.mergeNPaste.word.clipboard'))
                                .then(result => {
                                    let reflectFilePath = null;

                                    if (result == ll.localize('extension.mergeNPaste.word.editor')) {
                                        reflectFilePath = file_path_editor;
                                    } else if (result == ll.localize('extension.mergeNPaste.word.clipboard')) {
                                        reflectFilePath = file_path_clipboard;
                                    } else {
                                        delete_temp();
                                        return;
                                    }

                                    editor = window.activeTextEditor;
                                    if (editor.document.fileName.indexOf('vscode-merge-n-paste-CLIPBOARD') != -1) {
                                        editor.document.save().then(() => {
                                            vscode.commands.executeCommand('workbench.action.closeActiveEditor').then(() => {
                                                readFile(reflectFilePath, (err, data) => {
                                                    if (err) return;
                                                    editor = window.activeTextEditor;
                                                    if (docForDiff != editor.document || editor_text != editor.document.getText(cur_selection)) {
                                                        vscode.window.showWarningMessage(ll.localize('extension.mergeNPaste.message.notReflected'));
                                                        delete_temp();
                                                        return;
                                                    }
                                                    editor.edit(edit => {
                                                        edit.replace(cur_selection, data.toString());
                                                    });
                                                    delete_temp();
                                                });
                                            });
                                        });
                                    } else {
                                        readFile(reflectFilePath, (err, data) => {
                                            if (err) return;
                                            editor = window.activeTextEditor;
                                            if (docForDiff != editor.document || editor_text != editor.document.getText(cur_selection)) {
                                                vscode.window.showWarningMessage(ll.localize('extension.mergeNPaste.message.notReflected'));
                                                delete_temp();
                                                return;
                                            }
                                            editor.edit(edit => {
                                                edit.replace(cur_selection, data.toString());
                                            });
                                            delete_temp();
                                        });
                                    }

                                });
                        }
                    });
                });

            } else {
                exec(pathToMergeTool
                    .replace("%E", file_path_editor)
                    .replace("%C", file_path_clipboard)
                    .replace("%M", file_path_merged)
                    , (error, stdout, stderr) => {
                        if (stderr) {
                            console.log("Error during runnning merge tool: " + stderr + " \ncommand: " + pathToMergeTool
                                .replace("%E", file_path_editor)
                                .replace("%C", file_path_clipboard)
                                .replace("%M", file_path_merged));
                        }
                        let reflectFilePath = reflectFile
                            .replace("%E", file_path_editor)
                            .replace("%C", file_path_clipboard)
                            .replace("%M", file_path_merged)

                        if (existsSync(reflectFilePath)) {
                            vscode.window.showInformationMessage(ll.localize('extension.mergeNPaste.message.mergeReflectConfirm'), { modal: true }, ll.localize('extension.mergeNPaste.word.yes'))
                                .then(result => {
                                    if (result == ll.localize('extension.mergeNPaste.word.yes')) {
                                        readFile(reflectFilePath
                                            , (err, data) => {
                                                if (err) return;
                                                editor.edit(edit => {
                                                    edit.replace(cur_selection, data.toString());
                                                });
                                                delete_temp();
                                            });
                                    } else {
                                        delete_temp();
                                    }
                                });
                        } else {
                            vscode.window.showInformationMessage(ll.localize('extension.mergeNPaste.message.reflectSelect'), { modal: true }, ll.localize('extension.mergeNPaste.word.editor'), ll.localize('extension.mergeNPaste.word.clipboard'))
                                .then(result => {
                                    reflectFilePath = null;

                                    if (result == ll.localize('extension.mergeNPaste.word.editor')) {
                                        reflectFilePath = file_path_editor;
                                    } else if (result == ll.localize('extension.mergeNPaste.word.clipboard')) {
                                        reflectFilePath = file_path_clipboard;
                                    } else {
                                        delete_temp();
                                        return;
                                    }

                                    readFile(reflectFilePath, (err, data) => {
                                        if (err) return;
                                        editor.edit(edit => {
                                            edit.replace(cur_selection, data.toString());
                                        });
                                        delete_temp();
                                    });
                                });
                        }
                    });
            }

        });
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {
}
