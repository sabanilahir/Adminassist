declare module "ldapjs" {
  export interface ClientOptions {
    url: string;
    reconnect?: boolean;
    timeout?: number;
    connectTimeout?: number;
    tlsOptions?: any;
  }

  export interface SearchOptions {
    filter: string;
    scope: "base" | "one" | "sub";
    attributes?: string[];
    paged?: boolean;
    sizeLimit?: number;
    timeLimit?: number;
  }

  export interface SearchEntry {
    pojo: {
      objectName: string;
      attributes: Array<{
        type: string;
        values: string[];
      }>;
    };
  }

  export interface Client {
    bind(dn: string, password: string, callback: (err: Error | null) => void): void;
    search(base: string, options: SearchOptions, callback: (err: Error | null, res: SearchResult) => void): void;
    unbind(callback?: (err: Error | null) => void): void;
  }

  export interface SearchResult {
    on(event: "searchEntry", callback: (entry: SearchEntry) => void): void;
    on(event: "error", callback: (err: Error) => void): void;
    on(event: "end", callback: (result: any) => void): void;
  }

  export function createClient(options: ClientOptions): Client;
}