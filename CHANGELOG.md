# Change Log

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

# [0.0.4]
* Fix windows paths (#1)

## [0.0.1]
* Initial release