
export class Configuration {
    public extensions: string[] = ["tsx", "ts", "jsx", "js"];
    
    public excludedRegexp?: string = undefined;
    
    public expressionReferences: string[] = ["require", "jest.mock", "jest.setMock", "jest.unmock", "jest.genMockFromModule"];
    
    public useCreationDateForFileHash: boolean = false;
    
    public warnAboutSameContentFiles: boolean = true;
    
    public confirmMoveReferences: boolean = true;
}