// Rasteriza los monigotes de index.html a PNG para poder MIRARLOS.
// Los dibujos se venían verificando solo por cálculo y así se colaron errores
// (la mancuerna de las aperturas apuntaba para el lado equivocado).
//
//   node tools/ver-dibujos.mjs aperturas martillo frances
//   node tools/ver-dibujos.mjs --todos
//
// Sale en tools/dibujos.png, con el índice de qué celda es cada ejercicio.
import { deflateSync } from "node:zlib";
import { readFile, writeFile } from "node:fs/promises";

/* ---------- traigo el código de dibujo de index.html, sin tocarlo ---------- */
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const tajada = (desde, hasta) => {
  const i = html.indexOf(desde);
  const j = html.indexOf(hasta, i);
  if (i < 0 || j < 0) throw new Error(`no encontré el bloque ${desde}…${hasta}`);
  return html.slice(i, j);
};
const { EX, draw, pose } = new Function(
  `${tajada("const EQ = {", "const PUSH=[")}
   ${tajada("const lerp=", "const HOLD=")}
   return {EX, draw, pose};`,
)();

/* ---------- paleta (modo oscuro, como lo ve en el gimnasio) ---------- */
const COLOR = {
  "var(--bg)": [0, 0, 0],
  "var(--surface)": [14, 18, 22],
  "var(--ink)": [231, 236, 241],
  "var(--muted)": [148, 163, 184],
  "var(--line)": [31, 38, 45],
  "var(--equip)": [73, 83, 93],
  "var(--celeste)": [78, 155, 220],
  "var(--plate)": [201, 150, 60],
  "var(--done)": [76, 192, 138],
  none: null,
};
const color = (s) => {
  if (!s || s === "none") return null;
  if (!(s in COLOR)) throw new Error("color desconocido: " + s);
  return COLOR[s];
};

/* ---------- parser de los primitivos que usa draw() ---------- */
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
};
const num = (tag, name, def = 0) => {
  const v = attr(tag, name);
  return v == null ? def : parseFloat(v);
};

function parse(svg) {
  const formas = [];
  // <g opacity="..."> envuelve al fantasma de la pose final
  let alphaG = 1;
  const re = /<(g|\/g|line|circle|rect)\b([^>]*)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const [tag, nombre, resto] = [m[0], m[1], m[2] || ""];
    if (nombre === "g") {
      alphaG = resto.includes("opacity") ? parseFloat(attr(tag, "opacity")) : 1;
      continue;
    }
    if (nombre === "/g") {
      alphaG = 1;
      continue;
    }
    const op = (attr(tag, "opacity") ? parseFloat(attr(tag, "opacity")) : 1) * alphaG;
    // las líneas punteadas de los cables las dibujo enteras: acá solo importa la geometría
    if (nombre === "line") {
      formas.push({
        t: "seg",
        a: [num(tag, "x1"), num(tag, "y1")],
        b: [num(tag, "x2"), num(tag, "y2")],
        w: num(tag, "stroke-width", 1),
        c: color(attr(tag, "stroke")),
        op,
      });
    } else if (nombre === "circle") {
      formas.push({
        t: "circ",
        c0: [num(tag, "cx"), num(tag, "cy")],
        r: num(tag, "r"),
        relleno: color(attr(tag, "fill")),
        borde: color(attr(tag, "stroke")),
        w: num(tag, "stroke-width", 0),
        op,
      });
    } else {
      formas.push({
        t: "rect",
        x: num(tag, "x"),
        y: num(tag, "y"),
        w2: num(tag, "width"),
        h: num(tag, "height"),
        rx: num(tag, "rx"),
        relleno: color(attr(tag, "fill")),
        op,
      });
    }
  }
  return formas;
}

/* ---------- cobertura de cada forma en un punto ---------- */
const distSeg = (p, a, b) => {
  const vx = b[0] - a[0],
    vy = b[1] - a[1],
    wx = p[0] - a[0],
    wy = p[1] - a[1];
  const L = vx * vx + vy * vy;
  const t = L === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / L));
  return Math.hypot(wx - vx * t, wy - vy * t);
};
function dentro(f, p) {
  if (f.t === "seg") return distSeg(p, f.a, f.b) <= f.w / 2 ? f.c : null;
  if (f.t === "circ") {
    const d = Math.hypot(p[0] - f.c0[0], p[1] - f.c0[1]);
    if (f.borde && Math.abs(d - f.r) <= f.w / 2) return f.borde;
    if (f.relleno && d <= f.r) return f.relleno;
    return null;
  }
  const x1 = f.x,
    y1 = f.y,
    x2 = f.x + f.w2,
    y2 = f.y + f.h,
    r = Math.min(f.rx, f.w2 / 2, f.h / 2);
  if (p[0] < x1 || p[0] > x2 || p[1] < y1 || p[1] > y2) return null;
  const cx = Math.min(Math.max(p[0], x1 + r), x2 - r);
  const cy = Math.min(Math.max(p[1], y1 + r), y2 - r);
  return Math.hypot(p[0] - cx, p[1] - cy) <= r ? f.relleno : null;
}

/* ---------- PNG ---------- */
function crc32(buf) {
  let c,
    crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(w, h, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) {
    const off = y * (w * 3 + 1);
    raw[off] = 0;
    px.copy(raw, off + 1, y * w * 3, (y + 1) * w * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- la hoja de contactos ---------- */
const VB = [200, 158]; // viewBox de la app
const ESC = 2; // escala, para que se vea
const COLS = 2; // ejercicios por fila (cada uno ocupa dos poses)
const S = 3; // muestras de antialias por lado

const args = process.argv.slice(2);
const claves = args.includes("--todos") ? Object.keys(EX) : args.filter((a) => !a.startsWith("--"));
if (!claves.length) {
  console.error("Decime qué ejercicios: node tools/ver-dibujos.mjs aperturas martillo  |  --todos");
  process.exit(1);
}
for (const k of claves) if (!EX[k]) throw new Error("no existe el ejercicio: " + k);

const CW = VB[0] * 2 * ESC, // ancho de celda: pose A + pose B
  CH = VB[1] * ESC;
const filas = Math.ceil(claves.length / COLS);
const W = CW * COLS,
  H = CH * filas;
const px = Buffer.alloc(W * H * 3);

// fondo
for (let i = 0; i < W * H; i++) {
  px[i * 3] = COLOR["var(--surface)"][0];
  px[i * 3 + 1] = COLOR["var(--surface)"][1];
  px[i * 3 + 2] = COLOR["var(--surface)"][2];
}

const indice = [];
claves.forEach((k, n) => {
  const col = n % COLS,
    fila = Math.floor(n / COLS);
  indice.push(`fila ${fila + 1}, ${col ? "derecha" : "izquierda"} → ${k} (${EX[k].name})`);
  [0, 1].forEach((t) => {
    const formas = parse(draw(EX[k], t));
    const ox = col * CW + t * VB[0] * ESC,
      oy = fila * CH;
    for (let y = 0; y < VB[1] * ESC; y++) {
      for (let x = 0; x < VB[0] * ESC; x++) {
        // acumulo color por submuestra, en orden de pintado
        let r = 0,
          g = 0,
          b = 0;
        for (let sy = 0; sy < S; sy++) {
          for (let sx = 0; sx < S; sx++) {
            const p = [(x + (sx + 0.5) / S) / ESC, (y + (sy + 0.5) / S) / ESC];
            let c = COLOR["var(--surface)"];
            // franja separadora entre las dos poses
            if (t === 1 && p[0] < 1) c = COLOR["var(--line)"];
            for (const f of formas) {
              const cc = dentro(f, p);
              if (cc) c = f.op >= 1 ? cc : c.map((v, i) => v + (cc[i] - v) * f.op);
            }
            r += c[0];
            g += c[1];
            b += c[2];
          }
        }
        const tot = S * S,
          o = ((oy + y) * W + ox + x) * 3;
        px[o] = Math.round(r / tot);
        px[o + 1] = Math.round(g / tot);
        px[o + 2] = Math.round(b / tot);
      }
    }
  });
});

const buf = png(W, H, px);
const salida = new URL("./dibujos.png", import.meta.url);
await writeFile(salida, buf);
console.log(`${W}x${H}, ${buf.length} bytes → tools/dibujos.png`);
console.log("Cada ejercicio: pose A (izquierda) y pose B (derecha).\n");
for (const l of indice) console.log("  " + l);
