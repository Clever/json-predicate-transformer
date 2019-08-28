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

const transformAny = (
  blob: any,
  options: TransformerOptions,
  recursionMeta: RecursionMetaData,
) => {
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
    return transformArray(blob, options, recursionMeta);
  } else if (typeof blob === "object" && blob != null) {
    return transformObject(blob, options, recursionMeta);
  } else if (blob === null) {
    return null;
  }

  // Otherwise, we reached a leaf item, just return it without a transformation
  return blob;
};

const transformArray = (
  a: any[],
  options: TransformerOptions,
  recursionMeta: RecursionMetaData = DEFAULT_RECURSION_META,
) => a.map(aItem => transformAny(aItem, options, recursionMeta));

const transformObject = (
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
    acc[transformedKey] = transformAny(value, options, crm);
    return acc;
  }, {});

// Transforms, then returns, the given JSON blob using the provided options
export function predicateTransform<T extends object | any[]>(
  blob: T,
  options: TransformerOptions,
): T {
  const preparedOptions = {
    ...DEFAULT_TRANSFORMER_OPTIONS,
    ...options,
  };

  return transformAny(blob, preparedOptions, DEFAULT_RECURSION_META);
}
