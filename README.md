# move-imports README

VSCode move-imports Extension

## Features

Automatically move/rename imports when you rename/move your project files

* Support multiple file extensions (although actual module renaming is only available in ```js, jsx, ts, tsx``` files)
* Support webpack assets (Add your assets extensions to extension list)
* Support ES6/TS imports and commonjs ```require()```
* Supports custom call expressions, such as ```jest.mock("../myfile")```
* Seamlessly integrated into VSCode UI


![features](/features.gif)

## Notice

Due to lack of VSCode API, this extension is checking files by checking content hashes of old/moved file. That means if you have 2 files or more with same content the extension will work only with first of them. Actually this is not common case for your working files. If you're on Mac/Windows (Sorry Linux users) you can set ```move-imports.useCreationDateForHash``` setting to ```true``` (see below) to cover 99% cases. If you're on Linux, please don't enable this, otherwise the extension won't work.

## Extension Settings

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something
* `move-imports.extensions`: Array of file extensions which will be handled by extension. Webpack users may add assets extensions (i.e. ```png, jpg, etc...```) here
* `move-imports.excludedRegexp`: Regexp to exclude files/directories from reference replacing/indexing. Being matched against absolute file path
* `move-imports.expressionReferences`: Array of call expressions to treat them as module reference. This includes ```require()``` and for example jest module mocks, such as ```jest.mock```
* `move-imports.useCreationDateForHash`: Prepend file creation date after calculating file content hashes. If a new file with some content hash appears and this content hash is stored internally with different file name, then extension is treating this as 'move/rename file' operation and perform reference lookup & replace. The drawback is only when you have 2 files with same content. Setting this to true will handle 99,9% cases since you'll probably never have 2 files with same creation date and same content. Actually this setting won't work on Linux since Linux doesn't store this attribute in filesystem and even break extension because birthdate will be substituted with access time (and you'll get always different hashes)
* `move-imports.warnAboutSameContentFiles`: Display warning when you have files with same content. Set to false to disable
* `move-imports.confirmMoveReferences`: Display confirmation dialog before performing any module reference replacing. Set to false to rename without confirmation

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 0.0.1

Initial release of move-imports