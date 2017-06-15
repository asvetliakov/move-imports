
export class Configuration {
    public extensions: string[] = ["tsx", "ts", "jsx", "js"];
    
    public excludeGlobs: string[] = ["node_modules"];
    
    public useGitIgnoreForExclude: boolean = true;
    
    public expressionReferences: string[] = ["require", "jest.mock", "jest.setMock", "jest.unmock", "jest.genMockFromModule"];
    
    public useCreationDateForFileHash: boolean = false;
    
    public warnAboutSameContentFiles: boolean = true;
    
    public confirmMoveReferences: boolean = true;
}