import JSONTransformer from "../lib";

test("correctly processes value handlers", () => {
  const jsont = new JSONTransformer();

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

  const result = jsont.transform(preTransformedObject, {
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

test("correctly handles key handlers", () => {
  const jsont = new JSONTransformer();

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

  const result = jsont.transform(preTransformedObject, {
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
