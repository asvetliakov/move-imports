declare namespace MD5File {
    function sync(path: string): string;
}

declare function MD5File(path: string, callback: (err: Error | undefined, hash: string) => void): void;

export = MD5File;