# Mi gym

App de registro de entrenamiento. Una sola página, sin build, sin servidor, sin cuentas.
Se instala en el celular y funciona entera sin señal.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La app completa: rutina, dibujos animados, registro, progreso e historial |
| `sw.js` | Service worker: guarda la app en el teléfono para que abra sin internet |
| `manifest.json` | Hace que se pueda instalar como app |
| `fonts.css`, `fonts/` | Las fuentes Barlow, auto-hospedadas (si no, sin señal no cargan) |
| `icons/` | El ícono de la pantalla de inicio |
| `tools/` | Scripts que generaron las fuentes y los íconos. No hacen falta para usar la app |

## Dónde se guardan los datos

Todo en el `localStorage` del navegador del celular, bajo la clave `registro-v1`.
No sale de ahí: no hay servidor, no hay cuenta, nadie más lo ve.

La contra: si borrás los datos del navegador o cambiás de celular, se pierde.
Por eso está **Progreso → Respaldo → Bajar respaldo**, que descarga un `.json`
con todo. Para recuperarlo, **Restaurar respaldo**. Restaurar nunca pisa lo que
ya tenés: solo agrega lo que falta, así que podés hacerlo sin miedo.

## Probar en la compu

```bash
npx http-server . -p 4173 -c-1
```

Y abrir http://localhost:4173

## Cambiar la rutina

Todo vive en `index.html`:

- `EX` — el diccionario de ejercicios (nombre, consejo, técnica y las poses del dibujo).
- `PUSH`, `PULL`, `LEGS`, `PUSH_B`, `PULL_B` — qué ejercicios tiene cada día,
  en formato `["clave", "series×reps", "peso sugerido"]`.
- `DAYS` — los cinco días y sus notas.
- `ALT` — las alternativas de cada ejercicio, en formato `["clave", "por qué"]`.
  Solo se leen las alternativas de los ejercicios que están en la rutina.

Un ejercicio que existe solo como alternativa (no está en ningún día) lleva
su prescripción en su propio campo `pre: ["series×reps", "peso sugerido"]`.
Si además se registra en kg por lado o en placas, agregalo a `UNIT`; si se hace
con una sola mancuerna, a `SINGLE`.

**Importante:** después de tocar `index.html`, subí el número de `VERSION` en
`sw.js` (`mi-gym-v2` → `mi-gym-v3`). Si no, el celular sigue mostrando la
versión vieja que tiene guardada.

## Publicar

Es un sitio estático: cualquier hosting con HTTPS sirve. Con GitHub Pages,
subir el contenido de esta carpeta a un repo y activar Pages en la rama `main`.

Hace falta HTTPS para que el service worker funcione, y por lo tanto para que
la app se pueda instalar y ande sin señal.

## Instalar en el iPhone

1. Abrir la URL en **Safari** (no Chrome: en iOS solo Safari instala apps).
2. Botón compartir → **Agregar a inicio**.
3. Abrirla desde el ícono, una vez, con señal. Ahí queda guardada.

Desde ese momento abre sin internet.
