export const shuffle = (list) => [...list].sort(() => Math.random() - 0.5);
export const normalize = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s-]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const distance = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] =
        a[i - 1] === b[j - 1]
          ? d[i - 1][j - 1]
          : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
  return d[a.length][b.length];
};
export function answerMatches(input, answer, aliases = []) {
  const actual = normalize(input);
  return [answer, ...aliases].some((candidate) => {
    const expected = normalize(candidate);
    const rearranged =
      [...actual].sort().join("") === [...expected].sort().join("");
    const tolerance = expected.length <= 8 ? 1 : expected.length <= 16 ? 2 : 3;
    return (
      actual === expected ||
      (actual && (distance(actual, expected) <= tolerance || rearranged))
    );
  });
}
export const formatTime = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
export async function api(path, options) {
  const response = await fetch(`/api/${path}`, options);
  let data = {};
  try {
    data = await response.json();
  } catch {}
  if (!response.ok || data.ok === false)
    throw new Error(data.error || "Erreur réseau");
  return data;
}
