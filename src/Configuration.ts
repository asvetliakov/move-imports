import { Config } from "mock-fs";

// export class Configuration {
//     public extensions: string[] = ["tsx", "ts", "jsx", "js"];

//     public excludeGlobs: string[] = ["node_modules"];

//     public useGitIgnoreForExclude: boolean = true;

//     public expressionReferences: string[] = ["require", "jest.mock", "jest.setMock", "jest.unmock", "jest.genMockFromModule"];

//     public useCreationDateForFileHash: boolean = false;

//     public warnAboutSameContentFiles: boolean = true;

//     public confirmMoveReferences: boolean = true;
// }

export interface GlobalConfiguration {
    useCreationDateForFileHash: boolean;
    warnAboutSameContentFiles: boolean;
    confirmMoveReferences: boolean;
}

export interface Configuration {
    extensions: string[];
    useGitIgnoreForExclude: boolean;
    expressionReferences: string[];
}

export const defaultGlobalConf: GlobalConfiguration = {
    useCreationDateForFileHash: false,
    warnAboutSameContentFiles: true,
    confirmMoveReferences: true,
};

export const defaultConf: Configuration = {
    expressionReferences: ["require", "jest.mock", "jest.setMock", "jest.unmock", "jest.genMockFromModule"],
    extensions: ["tsx", "ts", "jsx", "js"],
    useGitIgnoreForExclude: true,
};