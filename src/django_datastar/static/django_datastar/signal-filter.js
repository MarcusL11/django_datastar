export function findSignalMatches(signals, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  return Object.entries(signals).flatMap(([key, value]) =>
    matchesIn(value, key, needle),
  );
}

function matchesIn(value, path, needle) {
  if (path.toLowerCase().includes(needle)) return [{ path, value }];
  if (value === null || typeof value !== "object") return [];

  const children = Array.isArray(value)
    ? value.map((child, index) => [`${path}[${index}]`, child])
    : Object.entries(value).map(([key, child]) => [`${path}.${key}`, child]);

  return children.flatMap(([childPath, child]) => matchesIn(child, childPath, needle));
}
