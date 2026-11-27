# Reporte diario de baches, fase 1: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página pública con los baches aprobados ayer, botón "Marcar como atendido" y admin restringido, listos para probar el envío manual al gobierno.

**Architecture:** La Function `api` (Express) gana endpoints y sirve el HTML de `/bachesNuevos`, con rewrite de Hosting. La lógica nueva vive en módulos con dependencias inyectadas (probables sin Firebase). El frontend abre `/?bache=<id>` y el admin puede reabrir baches.

**Tech Stack:** Firebase Functions v2 (Node 20), Express 4, Firestore, `node:test` (sin dependencias nuevas), Next.js 15 estático, react-leaflet.

**Spec:** `docs/superpowers/specs/2026-11-27-reporte-diario-baches-design.md`

## Global Constraints

- Rama: `migrate-opensource-maps`. No incluir en commits cambios ajenos (`cors.js`, `bumpController-Leiya.js`, `.firebase/`, `screenshots/`, `PreviewModal.jsx`, `.playwright-zoom-check.mjs`, `.claude/`).
- Los cambios de API no deben romper el frontend anterior (`bachillo.web.app`).
- Hora local `America/Hermosillo`: UTC-7 fijo, sin horario de verano.
- Textos de interfaz en español.
- Sin dependencias nuevas.
- Todo despliegue se hace con la skill `deploy-firebase`, con confirmación explícita del alcance y nunca con `--force`.
- No imprimir ni commitear keys, tokens ni correos de administrador (van en `.env`, que está ignorado).

## Review Focus

1. Bache aprobado a las 23:59 o 00:00 de Hermosillo: cae en el día correcto (Task 3).
2. `address` con HTML o comillas: se muestra como texto, no se ejecuta (Task 3).
3. LocationIQ falla o no hay key: la página sale con coordenadas, no con error (Task 3).
4. `X-Forwarded-For` falsificado no evade el límite, y dos personas distintas no comparten cupo (Task 2).
5. `/?bache=` con id inexistente, sin aprobar o ya atendido: aviso y mapa normal; un id sin aprobar no revela datos (Tasks 2 y 4).

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `street-bump-backend/src/middleware/auth.js` | Solo correos de `ADMIN_EMAILS` |
| `street-bump-backend/src/middleware/rateLimit.js` | Límite por IP en memoria |
| `street-bump-backend/src/controllers/fixedController.js` | Ver un bache, marcar, listar y reabrir |
| `street-bump-backend/src/services/nearby.js` | Filtro de cercanos |
| `street-bump-backend/src/services/{yesterday,photoUrl,serverGeocoding,reportPage}.js` | Piezas de la página |
| `street-bump-backend/src/controllers/reportController.js` | `GET /bachesNuevos` |
| `street-bump-frontend/src/app/components/BumpMap.jsx` | Liga directa y botón |
| `street-bump-admin/src/components/FixedBumpsList.tsx` | Atendidos y "Reabrir" |

---

### Task 1: Admin solo para correos autorizados

**Files:**
- Modify: `street-bump-backend/src/middleware/auth.js`, `street-bump-backend/package.json`
- Modify: `street-bump-admin/src/services/adminService.ts`, `street-bump-admin/src/components/UnverifiedBumpsList.tsx`
- Test: `street-bump-backend/test/auth.test.js`

**Interfaces:**
- Produces: `parseAdminEmails(value?: string): string[]` (minúsculas, sin espacios ni vacíos); `makeVerifyAdminToken({ verifyIdToken, getAdminEmails })`; `verifyAdminToken` (el mismo nombre que ya importa `routes/admin.js`).

- [ ] **Step 1:** Agregar `"test": "node --test"` a los scripts del backend.
- [ ] **Step 2: Pruebas que fallan** (`req`/`res` falsos, `verifyIdToken` inyectado, `getAdminEmails: () => ['admin@example.com']`):
  - sin encabezado `Bearer` → 401
  - `verifyIdToken` lanza → 403
  - `{email:'otro@example.com', email_verified:true}` → 403, `next` no se llama
  - `{email:'admin@example.com', email_verified:false}` → 403
  - `{email:'Admin@Example.com', email_verified:true}` → `next` se llama y `req.user` queda asignado
  - lista vacía → 403
  - `parseAdminEmails(' A@x.com, ,b@x.com ')` → `['a@x.com','b@x.com']`; `parseAdminEmails(undefined)` → `[]`
- [ ] **Step 3:** `npm test` en `street-bump-backend` → FAIL.
- [ ] **Step 4:** Implementar. `getAdminEmails` por defecto lee `process.env.ADMIN_EMAILS` en cada petición. Quitar todos los `console.log` del encabezado, token y token decodificado.
- [ ] **Step 5:** `npm test` → PASS.
- [ ] **Step 6:** Admin: quitar `console.log('Token:', ...)`; si la respuesta es 403, mostrar "Esta cuenta no tiene permiso de administrador." en lugar del error genérico. `npm run lint` en el admin → sin errores nuevos.
- [ ] **Step 7:** Agregar `ADMIN_EMAILS=<correos del usuario, separados por coma>` a `street-bump-backend/.env` (pedirlos si faltan).
- [ ] **Step 8:** Commit `fix: restringir admin a correos autorizados`.

### Task 2: Marcar como atendido (backend)

**Files:**
- Create: `src/controllers/fixedController.js`, `src/middleware/rateLimit.js`, `src/services/nearby.js` (en `street-bump-backend`)
- Modify: `src/routes/bumps.js`, `src/routes/admin.js`, `src/controllers/bumpController.js` (`getNearbyBumps`, `calculateDistance`)
- Test: `test/fixed.test.js`, `test/rateLimit.test.js`, `test/nearby.test.js`, `test/fakeDb.js`

**Interfaces:**
- Produces:
  - `createFixedController({ db, now = () => new Date() })` → `{ getBump, markFixed, listFixed, reopen }` (handlers Express)
  - `createRateLimit({ limit, windowMs, now = Date.now })` → middleware
  - `selectNearby(bumps, { lat, lng }, radiusKm)` → baches `verified && fixed !== true` dentro del radio, con `distance`, ordenados
  - `GET /bumps/:id` → `{id, imageUrl, location, address?, createdAt, fixed}`; 404 si no existe o no está aprobado
  - `POST /bumps/:id/fixed` → 200 `{id, fixed:true}`
  - `GET /admin/bumps/fixed` → arreglo ordenado por `fixedAt` descendente
  - `PATCH /admin/bumps/:id/reopen` → 200 `{id, fixed:false}`
  - `test/fakeDb.js`: `fakeDb(docsById)` con `collection().doc().get()/update()` y `collection().where().get()` (operadores `==`, `>=`, `<`); lo reutiliza Task 3

- [ ] **Step 1: Pruebas que fallan:**
  - `getBump`: aprobado → 200 sin `distance` ni campos extra; sin aprobar → 404; inexistente → 404
  - `markFixed`: aprobado → `fixed:true` y `fixedAt` = `now().toISOString()`; segunda llamada → 200 y `fixedAt` no cambia; sin aprobar o inexistente → 404 sin escribir
  - `listFixed` devuelve solo `fixed:true`; `reopen` deja `fixed:false`, `fixedAt:null`; inexistente → 404
  - `selectNearby` excluye `fixed:true`, sin aprobar y fuera del radio
  - rate limit `{limit: 2, windowMs: 1000}`: tercera petición → 429; pasado `windowMs` → pasa; `x-forwarded-for: 'falso-1, 9.9.9.9'` y `'falso-2, 9.9.9.9'` comparten cupo; IPs finales distintas no
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar. La clave del límite es la **última** entrada de `x-forwarded-for` (la agrega Google), o `req.ip`. Purgar entradas vencidas. Errores de Firestore → 500 `{error}`.
- [ ] **Step 4:** Rutas: en `bumps.js`, `/nearby` antes de `/:id`; `POST /:id/fixed` con `createRateLimit({ limit: 10, windowMs: 60 * 60 * 1000 })`. En `admin.js` las nuevas quedan detrás de `verifyAdminToken`. `getNearbyBumps` usa `selectNearby`.
- [ ] **Step 5:** `npm test` → PASS.
- [ ] **Step 6:** Commit `feat: marcar baches como atendidos`.

### Task 3: Página `/bachesNuevos`

**Files:**
- Create: `src/services/yesterday.js`, `photoUrl.js`, `serverGeocoding.js`, `reportPage.js`, `src/controllers/reportController.js`
- Modify: `street-bump-backend/server.js`, `firebase.json`
- Test: `test/report.test.js`

**Interfaces:**
- Consumes: `fakeDb` (Task 2).
- Produces:
  - `yesterdayRange(now: Date)` → `{ from: string, to: string, day: 'YYYY-MM-DD' }` (ISO UTC; `from` incluido, `to` excluido). Lo reutiliza la fase 2.
  - `getYesterdayBumps({ db, now })` → exportada desde `reportController.js`; `verifiedAt` en rango, `verified`, `fixed !== true`, orden por `createdAt` ascendente. Lo reutiliza la fase 2.
  - `permanentPhotoUrl(url, bucketName)` → string
  - `createReverseGeocoder({ apiKey, fetchImpl = fetch })` → `(lat, lng) => Promise<string | null>`
  - `escapeHtml(s)`, `renderReportPage({ bumps, baseUrl })` → string
  - `createReportHandler({ db, now, reverseGeocode, baseUrl, bucketName, sleep })`

- [ ] **Step 1: Pruebas que fallan:**
  - `yesterdayRange(new Date('2026-11-28T15:00:00Z'))` → `from '2026-11-27T07:00:00.000Z'`, `to '2026-11-28T07:00:00.000Z'`, `day '2026-11-27'`
  - `yesterdayRange(new Date('2026-11-28T06:59:59Z')).day` → `'2026-11-26'`
  - `getYesterdayBumps` incluye `verifiedAt` igual a `from` y `...T06:59:59.999Z`; excluye igual a `to`, atendidos y sin aprobar
  - `permanentPhotoUrl`: URL firmada `https://storage.googleapis.com/b/bumps/1.jpg?Expires=1&Signature=x` → sin query; URL de emulador con `?alt=media` → igual
  - `renderReportPage` con `address: '<img src=x onerror=alert(1)>"'` no contiene `<img src=x`
  - con 2 baches contiene `og:title` con "2 baches", `og:image` = primera foto, `twitter:card` = `summary_large_image` y `href="https://ejemplo.test/?bache=a"`
  - con 1 bache dice "1 bache" (singular); sin baches contiene "No hubo baches nuevos ayer" y liga a `baseUrl`
  - handler: sin `address` llama al geocodificador y guarda el resultado en el documento; si devuelve `null` o lanza, responde 200 con las coordenadas y no guarda nada
  - `createReverseGeocoder({apiKey: undefined})` → `null` sin llamar a `fetchImpl`; respuesta no OK → `null`
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar.
  - Geocodificador: LocationIQ `https://us1.locationiq.com/v1/reverse?key=…&lat=…&lon=…&format=json`, devuelve `display_name`; timeout de 5 s con `AbortSignal.timeout`. Sin respaldo a Nominatim. El handler resuelve en serie, con 600 ms entre llamadas.
  - Página: autocontenida (CSS en línea), pensada para celular, `lang="es"`, título "Baches nuevos en Hermosillo". Por bache: foto, dirección (o `lat, lng`), "Reportado el …" en hora de Hermosillo y "Ver en el mapa". `og:url` = `${baseUrl}/bachesNuevos`.
  - Respuesta con `Cache-Control: public, max-age=60`; error → 500 con HTML breve.
- [ ] **Step 4:** En `server.js`: `app.get('/bachesNuevos', …)` con `baseUrl = process.env.PUBLIC_BASE_URL || 'https://bachillo-v1.web.app'`, `LOCATIONIQ_SERVER_KEY` y `STORAGE_BUCKET`.
- [ ] **Step 5:** En `firebase.json`, target `frontend-v1`, antes de la regla `**`:
  `{ "source": "/bachesNuevos", "function": { "functionId": "api", "region": "us-central1" } }`
- [ ] **Step 6:** `npm test` → PASS.
- [ ] **Step 7:** Con emuladores, abrir `http://127.0.0.1:5001/bachillo/us-central1/api/bachesNuevos` → HTML con "No hubo baches nuevos ayer" o la lista. Para ver una lista, poner en la UI del emulador (puerto 4000) un `verifiedAt` de ayer.
- [ ] **Step 8:** Commit `feat: pagina de baches nuevos de ayer` (incluye `firebase.json`, `.firebaserc`, `build:v1` y `.gitignore` del frontend, aún sin commitear).

### Task 4: Liga directa y botón en el mapa

**Files:**
- Modify: `street-bump-frontend/src/services/bumpService.ts`, `src/app/components/BumpMap.jsx`

**Interfaces:**
- Consumes: `GET /bumps/:id`, `POST /bumps/:id/fixed`.
- Produces: `getBump(id: string): Promise<(Bump & { fixed: boolean }) | null>` (`null` en 404; id con `encodeURIComponent`); `markFixed(id: string): Promise<void>` (lanza si no es OK).

- [ ] **Step 1:** Implementar las dos funciones.
- [ ] **Step 2:** `BumpMap`: cuando el mapa existe, leer `?bache=` una sola vez. Aprobado y no atendido → `setView(ubicación, 17)`, agregarlo a los marcadores y abrir su detalle. `null` o `fixed` → toast "Ese bache ya fue atendido o no existe." Error de red → toast "No se pudo cargar el bache."
- [ ] **Step 3:** En el `Popup`, botón "Marcar como atendido" (un clic, sin confirmación; deshabilitado mientras envía). Éxito: quitarlo de `bumps` y `visibleBumps`, cerrar el detalle, toast "¡Gracias! Marcado como atendido." Falla: toast "No se pudo marcar. Intenta de nuevo."
- [ ] **Step 4:** `npm run lint` → sin errores nuevos.
- [ ] **Step 5:** Verificar en el navegador contra emuladores: liga válida abre el bache; `?bache=no-existe` muestra el aviso; el botón lo quita del mapa y no reaparece al moverlo; `?bache=<atendido>` muestra el aviso.
- [ ] **Step 6:** Commit `feat: liga directa a un bache y boton de atendido`.

### Task 5: Reabrir desde el admin

**Files:**
- Create: `street-bump-admin/src/components/FixedBumpsList.tsx`
- Modify: `street-bump-admin/src/services/adminService.ts`, `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `GET /admin/bumps/fixed`, `PATCH /admin/bumps/:id/reopen`.
- Produces: `getFixedBumps()`, `reopenBump(id: string)`.

- [ ] **Step 1:** Implementar el servicio, con el mismo manejo de token y 403 que el resto.
- [ ] **Step 2:** Sección "Atendidos" en el dashboard: foto, dirección o coordenadas, fecha en que se marcó y botón "Reabrir", que lo quita de la lista. Vacía: "No hay baches atendidos."
- [ ] **Step 3:** `npm run lint` y `npm run build:dev` → sin errores.
- [ ] **Step 4:** Verificar contra emuladores (con `NEXT_PUBLIC_API_URL` del emulador): marcar en el mapa, verlo en "Atendidos", reabrir y verlo volver al mapa.
- [ ] **Step 5:** Commit `feat: reabrir baches atendidos desde el admin`.

### Task 6: Despliegue de prueba (v1)

Requiere del usuario: segunda key de LocationIQ (para servidor) y confirmación del alcance.

- [ ] **Step 1:** Agregar a `street-bump-backend/.env`: `LOCATIONIQ_SERVER_KEY`, `PUBLIC_BASE_URL=https://bachillo-v1.web.app`. Confirmar que `ADMIN_EMAILS` está.
- [ ] **Step 2:** El usuario verifica que `bachillo-v1.web.app` y `bachillo-admin.web.app` están en los orígenes permitidos de las keys de navegador (MapTiler, LocationIQ).
- [ ] **Step 3:** Con `deploy-firebase`: `functions`, `hosting:frontend-v1` (`npm run build:v1`) y `hosting:admin` (`npm run build:dev`). Avisar antes: el admin desplegado todavía usa Google; este cambio lo pasa a LocationIQ.
- [ ] **Step 4:** Verificar en producción:
  - `/admin/bumps/unverified` sin token → 401; el usuario confirma que su cuenta entra y que otra cuenta ve el aviso de permiso
  - `https://bachillo-v1.web.app/bachesNuevos` → 200 con HTML
  - una foto nueva y una anterior cargan
  - `https://bachillo.web.app` sigue funcionando
- [ ] **Step 5:** Prueba de punta a punta con el usuario: aprobar un bache hoy; mañana aparece en la página con foto y dirección, su liga lo abre y marcarlo lo quita.

### Task 7: Pasar a `bachillo.web.app` y prueba manual

No iniciar sin que Task 6 esté verificada y sin confirmación aparte: cambia el sitio que usa el público.

- [ ] **Step 1:** Agregar el mismo rewrite de `/bachesNuevos` al target `frontend` en `firebase.json`; `PUBLIC_BASE_URL=https://bachillo.web.app`.
- [ ] **Step 2:** El usuario agrega `bachillo.web.app` a los orígenes permitidos de las keys de navegador.
- [ ] **Step 3:** Con `deploy-firebase`: `functions` y `hosting:frontend` (`npm run build:dev`; `out` es la carpeta de ese target).
- [ ] **Step 4:** Verificar `https://bachillo.web.app/bachesNuevos` y que el mapa y el reporte funcionan.
- [ ] **Step 5:** Commit `chore: publicar la version nueva en bachillo.web.app`.
- [ ] **Step 6:** El usuario envía la liga por WhatsApp (hola → 1 → 2 → detalles) y comparte las respuestas del bot. Es la compuerta de la fase 3.
