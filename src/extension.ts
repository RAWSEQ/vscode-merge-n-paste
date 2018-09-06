'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { window, env, Position, Selection } from 'vscode';
import { appendFile, writeFile, readFile, mkdir, exists, unlink } from 'fs';
import { paste } from 'copy-paste';
import { exec } from 'child_process';
import { tmpdir } from 'os';

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

        const conf = vscode.workspace.getConfiguration('merge-n-paste');
        const pathToMergeTool = ""+conf.get('pathToMergeTool');
        const reflectFile = ""+conf.get('reflectFile');

        let editor = window.activeTextEditor;
        if(!editor) return;
        if(!pathToMergeTool){
            vscode.window.showInformationMessage("Please Define your MergeTool to Settings[merge-n-paste.pathToMergeTool].");
            return;
        }

        let doc = editor.document;

        let base_path = tmpdir()+"/vscode-merge-n-paste-";
        let file_name_editor = "EDITOR_{id}.txt";
        let file_name_clipboard = "CLIPBOARD_{id}.txt";
        let file_name_merged = "MERGED_{id}.txt";

        let uniqid = Math.random().toString(36).slice(-8);
        let file_path_editor = base_path+file_name_editor.replace("{id}",uniqid);
        let file_path_clipboard = base_path+file_name_clipboard.replace("{id}",uniqid);
        let file_path_merged = base_path+file_name_merged.replace("{id}",uniqid);

        let cur_selection = editor.selection;
        if(editor.selection.isEmpty){
            let startPos = new Position(0, 0);
            let endPos = new Position(doc.lineCount - 1, 10000);
            cur_selection = new Selection(startPos, endPos);
        }

        let editor_text = doc.getText(cur_selection);

        let delete_temp = () => 
        {
            exists(file_path_editor,(ex) => { if(ex) unlink(file_path_editor, (err) =>{}) });
            exists(file_path_clipboard,(ex) => { if(ex) unlink(file_path_clipboard, (err) =>{}) });
            exists(file_path_merged,(ex) => { if(ex) unlink(file_path_merged, (err) =>{}) });
        };

        paste((e,d) => 
        {
            if(editor_text == d){
                vscode.window.showInformationMessage("EDITOR and CLIPBOARD are the same.");
                return;
            }

            writeFile(file_path_editor, editor_text, (err) =>{});
            writeFile(file_path_clipboard, d, (err) =>{});

            exec(pathToMergeTool
                .replace("%E", file_path_editor)
                .replace("%C", file_path_clipboard)
                .replace("%M", file_path_merged)
                ,(error,stdout,stderr) =>
            {
                let reflectFilePath = reflectFile
                    .replace("%E", file_path_editor)
                    .replace("%C", file_path_clipboard)
                    .replace("%M", file_path_merged)
    
                exists(reflectFilePath,(ex) => 
                { 
                    if(ex) {
                        vscode.window.showInformationMessage("Are you sure you want to reflect from MERGED?", { modal: true }, 'Yes')
                        .then(result => 
                        {
                            if(result == "Yes"){
                                readFile(reflectFilePath
                                    ,(err,data) => 
                                {
                                    if(err) return;
                                    editor.edit(edit => 
                                    {
                                        edit.replace(cur_selection, data.toString());
                                    });
                                    delete_temp();
                                });
                            }else{
                                delete_temp();
                            }
                        });
                    }else{
                        vscode.window.showInformationMessage("Are you sure you want to reflect from.. ", { modal: true }, 'EDITOR', 'CLIPBOARD')
                        .then(result => 
                        {
                            reflectFilePath = null;
    
                            if(result == "EDITOR"){
                                reflectFilePath = file_path_editor;
                            }else if(result == "CLIPBOARD"){
                                reflectFilePath = file_path_clipboard;
                            }else{
                                delete_temp();
                                return;
                            }
    
                            readFile(reflectFilePath, (err,data) => 
                            {
                                if(err) return;
                                editor.edit(edit => 
                                {
                                    edit.replace(cur_selection, data.toString());
                                });
                                delete_temp();
                            });
                        });
                    }
                });
            });
        });
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {
}