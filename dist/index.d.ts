declare type KVTransformer<T> = (path: string, value: T) => T;
export interface TransformerOptions {
    keyHandlers?: HandlerConfig[];
    valueHandlers?: HandlerConfig[];
}
export interface HandlerConfig {
    predicate: (path: string, value: any) => boolean;
    transformer: KVTransformer<any>;
}
export declare function predicateTransform<T extends object | any[]>(blob: T, options: TransformerOptions): T;
export {};
