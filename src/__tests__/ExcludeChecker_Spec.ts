import fsMock from "mock-fs";
import { ExcludeChecker } from "../ExcludeChecker";

let checker: ExcludeChecker;
beforeEach(() => {
    checker = new ExcludeChecker("/u/workspace", ["node_modules", "jspm_modules", "a", "b/*", "!b/c.js"]);
});

afterEach(() => {
    fsMock.restore();
});

it("Checks if the file is excluded", () => {
    expect(checker.isFileExcluded("/u/workspace/a.js")).toBeFalsy();
    expect(checker.isFileExcluded("a.js")).toBeFalsy();

    expect(checker.isFileExcluded("/u/workspace/b.js")).toBeFalsy();
    expect(checker.isFileExcluded("b.js")).toBeFalsy();

    expect(checker.isFileExcluded("/u/workspace/node_modules/a/index.js")).toBeTruthy();
    expect(checker.isFileExcluded("node_modules/a/index.js")).toBeTruthy();

    expect(checker.isFileExcluded("/u/workspace/jspm_modules/a.js")).toBeTruthy();
    expect(checker.isFileExcluded("jspm_modules/a.js")).toBeTruthy();

    expect(checker.isFileExcluded("/u/workspace/a/a.js")).toBeTruthy();
    expect(checker.isFileExcluded("a/a.js")).toBeTruthy();

    expect(checker.isFileExcluded("/u/workspace/b/a.js")).toBeTruthy();
    expect(checker.isFileExcluded("b/a.js")).toBeTruthy();

    expect(checker.isFileExcluded("/u/workspace/b/c.js")).toBeFalsy();
    expect(checker.isFileExcluded("b/c.js")).toBeFalsy();
});

it("Checks if the file is excluded by using git ignore file", async () => {
    fsMock({
        "/u/workspace/.gitignore": `
        # Comment
        node_modules
        **/c
        **/index.*
        # Comment
        e/*
        !e/e.js
        `,
    });
    await checker.readGitIgnoreExcludes();
    expect(checker.isFileExcluded("/u/workspace/node_modules")).toBeTruthy();
    expect(checker.isFileExcluded("node_modules")).toBeTruthy();

    expect(checker.isFileExcluded("/u/workspace/index.js")).toBeTruthy();
    expect(checker.isFileExcluded("index.js")).toBeTruthy();

    expect(checker.isFileExcluded("/u/workspace/a/b/w/index.js")).toBeTruthy();
    expect(checker.isFileExcluded("a/b/w/index.js")).toBeTruthy();

    expect(checker.isFileExcluded("/u/workspace/a/b/c/a.js")).toBeTruthy();
    expect(checker.isFileExcluded("a/b/c/a.js")).toBeTruthy();

    expect(checker.isFileExcluded("/u/workspace/e/a.js")).toBeTruthy();
    expect(checker.isFileExcluded("e/a.js")).toBeTruthy();

    expect(checker.isFileExcluded("/u/workspace/e/e.js")).toBeFalsy();
    expect(checker.isFileExcluded("e/e.js")).toBeFalsy();

    expect(checker.isFileExcluded("/u/workspace/y.js")).toBeFalsy();
    expect(checker.isFileExcluded("y.js")).toBeFalsy();
});

it("Returns globs", async () => {
    fsMock({
        "/u/workspace/.gitignore": `
        # Comment
        node_modules
        **/c
        **/index.*
        # Comment
        e/*
        !e/e.js
        `,
    });
    await checker.readGitIgnoreExcludes();
    expect(checker.getIgnoreGlobs()).toMatchSnapshot();
    expect(checker.getIgnoreGlobs(true)).toMatchSnapshot();
});
