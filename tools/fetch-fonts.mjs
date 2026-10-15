// Descarga las fuentes de Google y las deja dentro del proyecto, para que la app
// funcione sin internet. Solo el subset "latin" (castellano) para que pese poco.
import { mkdir, writeFile, readFile } from "node:fs/promises";

const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;800&family=Barlow:wght@400;500;600&display=swap";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const css = await (await fetch(CSS_URL, { headers: { "User-Agent": UA } })).text();

// Cada @font-face viene precedido por un comentario con el subset: /* latin */
const blocks = css
  .split("/*")
  .slice(1)
  .map((chunk) => {
    const subset = chunk.slice(0, chunk.indexOf("*/")).trim();
    return { subset, body: "@font-face" + chunk.split("@font-face").slice(1).join("@font-face") };
  })
  .filter((b) => b.subset === "latin" && b.body.includes("url("));

await mkdir("fonts", { recursive: true });

let out = "/* Fuentes Barlow auto-hospedadas para que la app ande sin internet. */\n";
for (const b of blocks) {
  const url = b.body.match(/url\((https:\/\/[^)]+\.woff2)\)/)[1];
  const family = b.body.match(/font-family:\s*'([^']+)'/)[1];
  const weight = b.body.match(/font-weight:\s*(\d+)/)[1];
  const file = `${family.toLowerCase().replace(/\s+/g, "-")}-${weight}.woff2`;

  const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
  await writeFile(`fonts/${file}`, buf);
  console.log(file, buf.length, "bytes");

  out += b.body.replace(/url\(https:\/\/[^)]+\.woff2\)/, `url(fonts/${file})`).trim() + "\n";
}

await writeFile("fonts.css", out);
console.log(`\nfonts.css reescrito con ${blocks.length} familias locales.`);
