type KVTransformer<T> = (path: string, value: T) => T;

export interface TransformerOptions {
  keyHandlers?: HandlerConfig[];
  valueHandlers?: HandlerConfig[];
}

export interface HandlerConfig {
  predicate: (path: string, value: any) => boolean;
  transformer: KVTransformer<any>;
}

interface RecursionMetaData {
  pathChain: string[];
  currentPathKey: string;
}

const DEFAULT_TRANSFORMER_OPTIONS = {
  keyHandlers: [],
  valueHandlers: [],
};

const DEFAULT_RECURSION_META = {
  pathChain: [],
  currentPathKey: "",
};

// NOTE: This implementation won't work if the object contains any non-JSON-compliant
// data such as functions, Maps, RegExps, etc.
// If this lib ever matures to such a point, replace this with something more reliable
// like lodash.deepClone
const deepClone = (obj: object) => JSON.parse(JSON.stringify(obj));

const doesPropKeyMatch = (testKey: string, baseKey: string) => {
  const cleanTestKey = testKey.replace(/\[objectID:.*\]/g, "[objectID]");
  return cleanTestKey === baseKey;
};

// HandlerConfig creator that adds a layer to the predicate that prevents the handler
// from transforming certain paths
// E.g. pathOmitter(['foo.bar'], numberNoiseGenerator) will prevent the 123 in { foo: { bar: 123 }}
// from getting transformed
export const pathOmitter = (
  omitPaths: string[],
  nestedHandlerConfig: HandlerConfig,
): HandlerConfig => ({
  predicate: (path, value) =>
    // Only transform if this path isn't specified for omission or...
    omitPaths.find(pathToOmit => doesPropKeyMatch(path, pathToOmit)) == null ||
    // the original predicate says so
    nestedHandlerConfig.predicate(path, value),
  transformer: nestedHandlerConfig.transformer,
});

/**
 * A simple tool for making local modifications to JSON objects based on a predicate-transformer paradigm.
 *
 * Example Usage
 * /////////////
 * const jsonTransformer = new JSONTransformer()
 * const jsonBlob = { foo: { bar: 123 }}
 * const result = jsonTransformer.transform(jsonBlob, {
 *   valueHandlers: [
 *     {
 *        predicate: (path, value) => path === 'foo.bar' && value === 123,
 *        transformer: (path, value) => 456
 *     }
 *   ]
 * })
 *
 * console.log(result); // { foo: { bar: 456 }}
 */
export default class JSONTransformer {
  // Transforms, then returns, the given JSON blob using the provided options
  public transform(blob: any, options: TransformerOptions) {
    const preparedOptions = {
      ...DEFAULT_TRANSFORMER_OPTIONS,
      ...options,
    };
    return this.transformAny(blob, preparedOptions, DEFAULT_RECURSION_META);
  }

  private transformAny(
    blob: any,
    options: TransformerOptions,
    recursionMeta: RecursionMetaData,
  ) {
    const { pathChain } = recursionMeta;
    const key = pathChain.join(".");

    // Try and use the consumer-defined predicate/transformers if possible
    for (const { predicate, transformer } of options.valueHandlers) {
      if (predicate(key, blob)) {
        return transformer(key, blob);
      }
    }

    // If no consumer-defined predicate was met, check if we're dealing with a nested
    // data structure (array or object) and recurse.
    if (Array.isArray(blob)) {
      return this.transformArray(blob, options, recursionMeta);
    } else if (typeof blob === "object" && blob != null) {
      return this.transformObject(blob, options, recursionMeta);
    } else if (blob === null) {
      return null;
    }

    // Otherwise, we reached a leaf item, just return it without a transformation
    return blob;
  }

  private transformArray = (
    a: any[],
    options: TransformerOptions,
    recursionMeta: RecursionMetaData = DEFAULT_RECURSION_META,
  ) => a.map(aItem => this.transformAny(aItem, options, recursionMeta));

  private transformObject = (
    o: object,
    options: TransformerOptions,
    recursionMeta: RecursionMetaData = DEFAULT_RECURSION_META,
  ) =>
    Object.keys(o).reduce((acc, keyName) => {
      const value = o[keyName];
      // Need to deep-clone to prevent the same metadata object from being stomped on by recursive calls
      const crm = deepClone(recursionMeta);
      const currentPath = [...crm.pathChain, keyName].join(".");

      // If key handlers are provided, apply them in order to the current key name
      // Otherwise, use the key name as-is
      const transformedKey = options.keyHandlers
        ? options.keyHandlers.reduce(
            (keyInProgress, { predicate, transformer }) => {
              if (predicate(currentPath, keyInProgress)) {
                keyInProgress = transformer(currentPath, value);
              }
              return keyInProgress;
            },
            keyName,
          )
        : keyName;

      crm.pathChain = [...crm.pathChain, transformedKey];
      crm.currentPathKey = transformedKey;
      acc[transformedKey] = this.transformAny(value, options, crm);
      return acc;
    }, {});
}
