import { Configuration } from "./Configuration";

export class Server {
    private initialized: boolean = false;
    public async initializeWorkspaces(workspaces: Array<{ uri: string, conf: Configuration }>): Promise<void> {

    }

    public removeWorkspace(uri: string): void {

    }

    public async addWorkspace(uri: string, conf: Configuration): Promise<void> {

    }

    public reset(): void {

    }
}
