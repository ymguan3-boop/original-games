const baseUrl = import.meta.env.BASE_URL || "/";

/** Resolves game media under both the Sites root and a GitHub Pages subfolder. */
export const gameAsset = (path: string): string => {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}${path.replace(/^\/+/, "")}`;
};
