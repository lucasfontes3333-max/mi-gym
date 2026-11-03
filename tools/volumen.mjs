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

const DIAS = { PIERNAS_1: "Lun", PECHO: "Mar", ESPALDA: "Mié", PIERNAS_2: "Jue", HOMBROS: "Vie" };

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
  gemelos: { gemelos: 1 },
  gemelo1: { gemelos: 1 },
  encogimientos: { trapecio: 1 },
  elevaciones: { core: 1 },
  plancha: { core: 1 },
  crunchpolea: { core: 1 },
};

/* Objetivos para Lucas, noviembre 2026. Dos cosas los mueven respecto de los
   rangos genéricos, y las dos salieron de cosas que dijo él:

   BRAZOS ARRIBA. Se define como flaco de brazos y los quiere como prioridad. Ojo
   con el conteo fraccional: decía que el bíceps estaba en 11,5 y "cubierto",
   pero eso contaba media serie por cada jalón y cada remo — las series DIRECTAS
   de brazo eran 5. Lo que hace crecer el brazo es el trabajo directo, así que el
   rango subió para dejar lugar a 9 directas de cada uno.

   PIERNAS EN EL PISO DE LA ZONA DE CRECIMIENTO. Tienen dos días desde que se
   terminó el fútbol, pero él pidió bajar el volumen total ("es mucho para
   empezar de 0"), y entre pierna y torso prioriza torso. Nada queda por debajo
   de mantenimiento.

   El plan arranca a propósito en el piso de casi todos los rangos: hay margen
   para sumar una serie por músculo cada 3 o 4 semanas. Si algo cae POR DEBAJO
   del piso, el script avisa y hay que sacarle series a otro lado, no bajarle el
   objetivo. */
const OBJ = {
  pecho: [12, 16], espalda: [12, 18], "delt lat": [9, 16], "delt post": [8, 12],
  "delt ant": [6, 8], triceps: [12, 18], biceps: [12, 18], trapecio: [1, 6],
  cuadriceps: [12, 18], "isquio cadera": [6, 10], "isquio rodilla": [0, 4],
  gluteo: [6, 12], gemelos: [6, 10], aductores: [4, 10], core: [4, 8],
};
/* "isquio rodilla" tiene piso 0 y es la única excepción a la regla de arriba.
   El curl nórdico y el Copenhagen los rechazó, la máquina no existe y el curl
   femoral con mancuerna entre los pies lo probó y es impracticable. El rumano
   cubre el isquio desde la CADERA, que es la función más grande, pero no desde
   la rodilla. Mientras no corra está bien así; si arranca la pretemporada que
   mencionó, esto vuelve a ser un agujero real y hay que buscarle algo. */
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
