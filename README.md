# move-imports README

VSCode move-imports Extension

## How to Use

Just move/rename folder or file in VSCode

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

* `move-imports.extensions`: Array of file extensions which will be handled by extension. Webpack users may add assets extensions (i.e. ```png, jpg, etc...```) here
* `move-imports.excludeGlobs`: List of glob expressions (for example: ```[node_modules, public, src/**/*.js]```) to exclude from reference replacing/indexing
* `move-imports.useGitIgnoreForExclude`: Read glob expressions for excluding from top-level ```.gitignore``` file. These globs will be prepened to ```excludeGlobs```
* `move-imports.expressionReferences`: Array of call expressions to treat them as module reference. This includes ```require()``` and for example jest module mocks, such as ```jest.mock```
* `move-imports.useCreationDateForHash`: Prepend file creation date after calculating file content hashes. If a new file with some content hash appears and this content hash is stored internally with different file name, then extension is treating this as 'move/rename file' operation and perform reference lookup & replace. The drawback is only when you have 2 files with same content. Setting this to true will handle 99,9% cases since you'll probably never have 2 files with same creation date and same content. Actually this setting won't work on Linux since Linux doesn't store this attribute in filesystem and even break extension because birthdate will be substituted with access time (and you'll get always different hashes)
* `move-imports.warnAboutSameContentFiles`: Display warning when you have files with same content. Set to false to disable
* `move-imports.confirmMoveReferences`: Display confirmation dialog before performing any module reference replacing. Set to false to rename without confirmation

## Known Issues


## Release Notes

# [0.0.7]
* Fixed incorrect reference paths in files inside moved directory, for ex. ```import { A } from "../a"``` in ```./__tests__/a_spec``` and moving directory with both ```a``` and ```./__tests__/a_spec```

# [0.0.6]

* Fixed issue when negative glob pattern (i.e. !myfile.ts) is excluding all files

# [0.0.5]

* removed excludedRegexp, added exludeGlobs array instead
* read .gitignore for additional exludeGlobs (true by default), fixes issue #2
* process directories reference, i.e. ```import { a } from "./dir";``` where { a } will be imported from "./dir/index.{js, ts}", fixes issue #3
* process and rewrite ES6 re-export statements, such as ```export * from "./abc";```
* process and rewrite reference in both moved file and files which reference to this file (previously it was updating only files which had references to moved file)

### 0.0.4

* Fix windows paths (#1)

### 0.0.3

* Fix unable to apply reference edits due to wrong path

### 0.0.1

* Initial release of move-imports