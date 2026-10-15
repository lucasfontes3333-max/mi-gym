// Cuenta las series semanales por grupo muscular que tiene la rutina de index.html.
// Sirve para ver de un saque si un grupo quedó corto o de más, que es muy difícil
// de ver leyendo las listas de los días: el bíceps y el tríceps se acumulan sin
// que se note, porque cada jalón y cada press les suma de costado.
//
//   node tools/volumen.mjs
//
// Directo = 1 serie, secundario = 0,5 (conteo fraccional).
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const lista = (n) => {
  const i = html.indexOf(`const ${n}=[`);
  if (i < 0) throw new Error("no encontré la lista " + n);
  const j = html.indexOf("];", i);
  return JSON.parse(html.slice(i + `const ${n}=`.length, j + 1).replace(/×/g, "x"));
};

const DIAS = { PUSH: "Lun", PULL: "Mar", LEGS: "Mié", PUSH_B: "Jue", PULL_B: "Vie" };

/* Qué músculo trabaja cada ejercicio. Lo de 0,5 es carga indirecta real:
   el press carga tríceps aunque no sea un ejercicio de tríceps. */
const M = {
  banca: { pecho: 1, "delt ant": 0.5, triceps: 0.5 },
  inclinado: { pecho: 1, "delt ant": 0.5, triceps: 0.5 },
  pressplano: { pecho: 1, "delt ant": 0.5, triceps: 0.5 },
  aperturas: { pecho: 1 },
  cruce: { pecho: 1 },
  hombro: { "delt ant": 1, "delt lat": 0.5, triceps: 0.5 },
  arnold: { "delt ant": 1, "delt lat": 0.5, triceps: 0.5 },
  laterales: { "delt lat": 1 },
  latpolea: { "delt lat": 1 },
  facepull: { "delt post": 1, trapecio: 0.5 },
  cruceinv: { "delt post": 1 },
  pushdown: { triceps: 1 },
  overhead: { triceps: 1 },
  cuerda: { triceps: 1 },
  frances: { triceps: 1 },
  jalon: { espalda: 1, biceps: 0.5 },
  jalon1: { espalda: 1, biceps: 0.5 },
  pullover: { espalda: 1 },
  remo: { espalda: 1, biceps: 0.5, "delt post": 0.5 },
  remo1: { espalda: 1, biceps: 0.5, "delt post": 0.5 },
  curlinc: { biceps: 1 },
  predicador: { biceps: 1 },
  martillo: { biceps: 1 },
  curlpolea: { biceps: 1 },
  concentrado: { biceps: 1 },
  martillocuerda: { biceps: 1 },
  /* El aductor mayor es extensor de cadera: trabaja de verdad en sentadillas,
     zancadas y rumano, no solo en ejercicios dedicados. Por eso lleva 0.5 acá. */
  goblet: { cuadriceps: 1, gluteo: 0.5, aductores: 0.5 },
  sentadillamanc: { cuadriceps: 1, gluteo: 0.5 },
  zancadas: { cuadriceps: 1, gluteo: 0.5, aductores: 0.5 },
  zancadaestatica: { cuadriceps: 1, gluteo: 0.5 },
  stepup: { cuadriceps: 1, gluteo: 0.5, aductores: 0.5 },
  jumpsquat: { cuadriceps: 1 },
  rumano: { "isquio cadera": 1, gluteo: 0.5 },
  rumanobarra: { "isquio cadera": 1, gluteo: 0.5, aductores: 0.5 },
  femoral: { "isquio rodilla": 1 },
  gemelos: { gemelos: 1 },
  gemelo1: { gemelos: 1 },
  encogimientos: { trapecio: 1 },
  elevaciones: { core: 1 },
  plancha: { core: 1 },
  crunchpolea: { core: 1 },
};

/* Objetivos para Lucas: prioridad tren superior, piernas en mantenimiento
   mientras juegue al fútbol. Rangos de la meta-regresión de volumen.
   Ojo: los números de arriba son fraccionales, así que los objetivos de bíceps y
   tríceps son altos (10-14) aunque las series DIRECTAS sean solo 3 o 4: el resto
   se lo comen los jalones y los press.
   Piernas: desde octubre 2026 hay una sola práctica por semana en vez de dos, así
   que la cancha aporta menos y los rangos de cuádriceps y glúteo subieron.
   Isquio cadera 5 es el piso: sumado al nórdico del lunes son 8 series de isquio. */
const OBJ = {
  pecho: [12, 16], espalda: [14, 18], "delt lat": [12, 18], "delt post": [8, 12],
  "delt ant": [6, 8], triceps: [10, 14], biceps: [10, 14], trapecio: [4, 6],
  cuadriceps: [10, 14], "isquio cadera": [5, 8], "isquio rodilla": [2, 4],
  gluteo: [4, 8], gemelos: [6, 8], aductores: [4, 8], core: [4, 6],
};
/* "isquio rodilla" queda en rojo a propósito y no le bajo el objetivo: el nórdico
   era lo único que doblaba la rodilla contra resistencia y Lucas lo sacó. El rumano
   cubre el isquio desde la cadera, no desde la rodilla. Es un agujero real para
   alguien que corre, así que el script tiene que seguir avisando hasta que entre
   algún reemplazo (curl femoral si la máquina existe, o deslizamientos de talón). */

const tot = {}, porDia = {}, faltan = [];
for (const [n, dia] of Object.entries(DIAS)) {
  let s = 0;
  for (const [k, pre] of lista(n)) {
    const ser = parseInt(pre) || 1;
    s += ser;
    if (!M[k] && !faltan.includes(k)) faltan.push(k);
    for (const [m, peso] of Object.entries(M[k] || {})) tot[m] = (tot[m] || 0) + ser * peso;
  }
  porDia[dia] = s;
}

console.log("Series por sesión: " + Object.entries(porDia).map(([d, s]) => `${d} ${s}`).join("   "));
console.log("(más de 20 por sesión es sesión de dos horas)\n");
console.log("grupo              tenés  objetivo");
for (const g of Object.keys(OBJ)) {
  const v = tot[g] || 0, [a, b] = OBJ[g];
  console.log(g.padEnd(18), String(v).padStart(5), ` ${a}-${b}`.padEnd(8), v < a ? "FALTA" : v > b ? "DE MÁS" : "ok");
}
if (faltan.length) console.log("\nSin mapear (no cuentan): " + faltan.join(", "));
