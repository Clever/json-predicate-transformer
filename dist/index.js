"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var DEFAULT_TRANSFORMER_OPTIONS = {
    keyHandlers: [],
    valueHandlers: []
};
var DEFAULT_RECURSION_META = {
    pathChain: [],
    currentPathKey: ""
};
// NOTE: This implementation won't work if the object contains any non-JSON-compliant
// data such as functions, Maps, RegExps, etc.
// If this lib ever matures to such a point, replace this with something more reliable
// like lodash.deepClone
var deepClone = function (obj) { return JSON.parse(JSON.stringify(obj)); };
var transformAny = function (blob, options, recursionMeta) {
    var pathChain = recursionMeta.pathChain;
    var key = pathChain.join(".");
    // Try and use the consumer-defined predicate/transformers if possible
    for (var _i = 0, _a = options.valueHandlers; _i < _a.length; _i++) {
        var _b = _a[_i], predicate = _b.predicate, transformer = _b.transformer;
        if (predicate(key, blob)) {
            return transformer(key, blob);
        }
    }
    // If no consumer-defined predicate was met, check if we're dealing with a nested
    // data structure (array or object) and recurse.
    if (Array.isArray(blob)) {
        return transformArray(blob, options, recursionMeta);
    }
    else if (typeof blob === "object" && blob != null) {
        return transformObject(blob, options, recursionMeta);
    }
    else if (blob === null) {
        return null;
    }
    // Otherwise, we reached a leaf item, just return it without a transformation
    return blob;
};
var transformArray = function (a, options, recursionMeta) {
    if (recursionMeta === void 0) { recursionMeta = DEFAULT_RECURSION_META; }
    return a.map(function (aItem) { return transformAny(aItem, options, recursionMeta); });
};
var transformObject = function (o, options, recursionMeta) {
    if (recursionMeta === void 0) { recursionMeta = DEFAULT_RECURSION_META; }
    return Object.keys(o).reduce(function (acc, keyName) {
        var value = o[keyName];
        // Need to deep-clone to prevent the same metadata object from being stomped on by recursive calls
        var crm = deepClone(recursionMeta);
        var currentPath = crm.pathChain.concat([keyName]).join(".");
        // If key handlers are provided, apply them in order to the current key name
        // Otherwise, use the key name as-is
        var transformedKey = options.keyHandlers
            ? options.keyHandlers.reduce(function (keyInProgress, _a) {
                var predicate = _a.predicate, transformer = _a.transformer;
                if (predicate(currentPath, keyInProgress)) {
                    keyInProgress = transformer(currentPath, value);
                }
                return keyInProgress;
            }, keyName)
            : keyName;
        crm.pathChain = crm.pathChain.concat([transformedKey]);
        crm.currentPathKey = transformedKey;
        acc[transformedKey] = transformAny(value, options, crm);
        return acc;
    }, {});
};
// Transforms, then returns, the given JSON blob using the provided options
function predicateTransform(blob, options) {
    var preparedOptions = __assign({}, DEFAULT_TRANSFORMER_OPTIONS, options);
    return transformAny(blob, preparedOptions, DEFAULT_RECURSION_META);
}
exports.predicateTransform = predicateTransform;
