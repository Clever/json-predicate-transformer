import { predicateTransform } from "../lib";

it("correctly processes value handlers", () => {
  const preTransformedObject = {
    foo: {
      bar: 123,
      xyz: 200,
    },
    baz: "hello world",
  };

  const expectedObject = {
    foo: {
      bar: 246,
      xyz: 200,
    },
    baz: "[string]",
  };

  const result = predicateTransform(preTransformedObject, {
    valueHandlers: [
      {
        predicate: (_, value) => value === 123,
        transformer: (_, value) => value * 2,
      },
      {
        predicate: (_, value) => typeof value === "string",
        transformer: () => "[string]",
      },
    ],
  });

  // Check that objects match in both directions to ensure full equality
  // i.e. (A ⊆ B) & (B ⊆ A) <=> A == B
  expect(result).toMatchObject(expectedObject);
  expect(expectedObject).toMatchObject(result);
});

it("correctly handles key handlers", () => {
  const preTransformedObject = {
    foo: {
      bar: 123,
    },
    baz: {
      abc: {
        def: 4,
      },
    },
  };

  const expectedObject = {
    foo: {
      "foo.bar-123": 123,
    },
    bazNew: {
      abc: {
        def: 4,
      },
    },
  };

  const result = predicateTransform(preTransformedObject, {
    keyHandlers: [
      {
        predicate: path => path === "foo.bar",
        transformer: (path, value) => `${path}-${value}`,
      },
      {
        predicate: path => path === "baz",
        transformer: path => `${path}New`,
      },
    ],
  });

  expect(result).toMatchObject(expectedObject);
  expect(expectedObject).toMatchObject(result);
});

it("handles dotpaths that are nested within arrays", () => {
  const preTransformedObject = {
    foo: [{ bar: 123 }],
  };

  const expectedObject = {
    foo: [{ bar: 246 }],
  };

  const result = predicateTransform(preTransformedObject, {
    valueHandlers: [
      {
        predicate: path => path === "foo.bar",
        transformer: (_path, value) => value * 2,
      },
    ],
  });

  expect(result).toMatchObject(expectedObject);
  expect(expectedObject).toMatchObject(result);
});

it("handles updates to both an object and props within that object", () => {
  const preTransformedObject = {
    foo: [{ bar: 123 }, { xyz: 400 }],
  };

  const expectedObject = {
    foo: [{ bar: 246 }],
  };

  const result = predicateTransform(preTransformedObject, {
    valueHandlers: [
      {
        predicate: path => path === "foo.bar",
        transformer: (_path, value) => value * 2,
      },
      {
        predicate: path => path === "foo",
        transformer: (_path, value) => value.slice(0, 1),
      },
    ],
  });

  expect(result).toMatchObject(expectedObject);
  expect(expectedObject).toMatchObject(result);
});
