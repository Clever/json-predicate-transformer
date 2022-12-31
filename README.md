# json-predicate-transformer

A simple utility for modifying JSON objects using a predicate-transformer paradigm

## Usage

```js
  import { predicateTransform } from "json-predicate-transformer"

  const preTransformedObject = {
    foo: {
      bar: 123,
      xyz: 200,
      dontTouchMe: 0,
    },
    baz: "hello world",
  };

  const result = predicateTransform(preTransformedObject, {
    keyHandlers: [
      {
          predicate: (path) => path === "foo.xyz",
          transformer: (path, value) => `key-${path}-${value}`
      }
    ],
    valueHandlers: [
      {
        predicate: (_, value) => value > 100,
        transformer: (_, value) => value * 2,
      },
      {
        predicate: (_, value) => typeof value === "string",
        transformer: () => "[string]",
      },
    ],
  });

  console.log(result)
  // {
  //     foo: {
  //         bar: 246,
  //         "key-xyz-200": 200,
  //         dontTouchMe: 0,
  //     },
  //     baz: "[string]"
  // }
```

## API

> This library is built in Typescript and includes type declarations so those are the authoritative and easiest to use source for the API.

### `predicateTransform(blob: object | any[], options: TransformerOptions): object | any[]`
The main transformer function.

### Important Types
```js
interface TransformerOptions {
  keyHandlers?: []HandlerConfig,
  valueHandlers?: []HandlerConfig
}

interface HandlerConfig {
  predicate: (path: string, value: any) => boolean,
  transformer: (path: string, value: any) => any
}
```

## FAQ

### What is a `HandlerConfig`?
A `HandlerConfig` is the most fundamental building block for using `json-predicate-transformer`. A `HandlerConfig` is an object with two properties: a `predicate` function and `transformer` function. 

A `predicate` has the function signature `(path: string, value: any) => boolean`.

A `transformer` has the function signature `(path: string, value: any) => any`.

You can specify any number of `HandlerConfig`s for `keyHandlers` and `valueHandlers` and they will be applied (in the provided order) on every JSON key or value, respectively, e.g:
```js
if (predicate(...)) {
  newValue = transformer(...)
}
```
See the example usage at the top for an idea of what this means.

### What is the difference between `keyHandlers` vs. `valueHandlers`?
Key handlers allow you to predicate-transform the **keys** of a JSON object while value handlers allow you to predicate-transform the **values**.

Key handlers and value handlers will both receive the same parameters to their `predicate` and `transformer` functions.

Assume the following input to `predicateTransform`:
```js
{
  foo: {
    bar: 123
  }
}
```

For both key and value handlers, the `path` parameter will be the dotpath to the key being processed, e.g. `"foo.bar"`, while the `value` parameter will be the value at that path, e.g. `123`.

The key difference between them is simply which value the `transformer`'s output is applied to. Assume the following super-simple `HandlerConfig`
```js
{ predicate: () => true, transformer: () => "ZZZ" }
```

If this was provided in `keyHandlers` with the above object as input, it would result in
```js
{
  ZZZ: {
    ZZZ: 123
  }
}
```
whereas if it was provided in `valueHandlers`, it would result in
```js
{
  foo: {
    bar: "ZZZ"
  }
}
```

### What's a "dotpath"?

A dotpath is simply notation you can use to refer to objects nested within a JSON object.
```js
{
  foo: {
    bar: [
      { abc: 1, def: 2 },
      { xyz: 3, uvw: 4 }
    ],
    baz: 100
  }
}
```

For example, You can access the `1` using `foo.bar.abc`, the `100` using `foo.baz`.test
