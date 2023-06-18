type ExcludeProperties<T, K extends keyof T> = Omit<T, K>;

export function excludeProperties<T, K extends keyof T>(
  obj: T,
  propsToExclude: K[]
): ExcludeProperties<T, K> {
  const result = { ...obj };
  propsToExclude.forEach((prop) => {
    delete result[prop];
  });
  return result;
}
