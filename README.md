# merge-n-paste

Merge before pasting.

## Features

Compare(editor <=> clipboard) and paste using the diff tool or external merge tool.

*Tested on Windows platform only*

Like this:

- diff tool
![Image](https://ltside.com/img/ext-merge-n-paste-exp-v.gif)

- external merge tool
![Image](https://ltside.com/img/ext-merge-n-paste-exp.gif)



## Requirements

Set this Configure to Settings (Example: KDiff3)
```
{
  // The path to Merge tool. 
  // replace: %E = EditorFile, %C = ClipboardFile, %M = MergedOutput 
  // ex: "\"C:\\Program Files\\KDiff3\\KDiff3.exe\" %E %C -o %M" 
  "merge-n-paste.pathToMergeTool": ""
}
```
Command Name: `Merge and Paste`

## Extension Settings

We recommend key binding to: `Ctrl` + `Alt` + `v`

Set this Configure to Settings
```
{
  // Reflect source File to editor. 
  // replace: %E = EditorFile, %C = ClipboardFile, %M = MergedOutput 
  // ex: "Reflect clipboard text" = %C
  "merge-n-paste.reflectFile": "%M"
}
```

## Contacts
- http://ltside.com

## License

- MIT
