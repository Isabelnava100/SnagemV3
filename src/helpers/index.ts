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

export const getPokemonImageURL = (slug: string) => {
  const url = "http://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/shiny";
  const extension = "png";
  return `${url}/${slug}.${extension}`;
};
