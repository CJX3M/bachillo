# Publicar el reporte diario en X — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un botón en el admin que abre X con el reporte de ayer ya escrito, mencionando al gobierno.

**Architecture:** El backend arma el texto con los mismos baches que muestra `/bachesNuevos` y lo entrega en una ruta de administrador. El admin lo muestra y abre `https://x.com/intent/post`. No se usa la API de X.

**Tech Stack:** Express en Firebase Functions (Node 22), `node --test`, Next.js 15 con TypeScript.

**Spec:** `docs/superpowers/specs/2026-11-27-publicar-en-x-design.md`

## Global Constraints

- Sin dependencias nuevas, sin API de X, sin función programada, sin registro en el servidor de lo publicado.
- Textos de interfaz en español.
- No imprimir ni commitear keys, tokens ni correos de administrador (van en `.env`, que está ignorado).
- El repositorio es público.
- No incluir en commits los cambios locales ajenos: `cors.js`, `bumpController-Leiya.js`, `.firebase/`, `screenshots/`, `PreviewModal.jsx`, `.playwright-zoom-check.mjs`, `.claude/`.
- Trabajar en la rama `feat/publicar-en-x`, creada desde `main`.

## Review Focus

- `GOV_X_HANDLE` escrito con `@`, con espacios o como liga: se acepta el usuario válido o se omite la mención; nunca sale texto roto.
- Admin abierto desde el día anterior: al volver a la pestaña se recarga el reporte, para no publicar la cuenta de otro día.
- `PUBLIC_BASE_URL` con `/` al final: la liga no lleva `//`.
- Navegador que bloquea `localStorage`: la tarjeta funciona sin el aviso.
- Cuenta sin permiso: se muestra el mensaje de administrador y no hay botón.

---

### Task 1: Texto del reporte y ruta de administrador

**Files:**
- Create: `street-bump-backend/src/services/xPost.js`
- Modify: `street-bump-backend/src/controllers/reportController.js`
- Modify: `street-bump-backend/src/routes/admin.js`
- Test: `street-bump-backend/test/xPost.test.js`

**Interfaces:**
- Consumes: `getYesterdayBumps({ db, now })`, `yesterdayRange(now)`, `fakeDb`, `fakeRes`.
- Produces:
  - `normalizeHandle(raw: string | undefined): string | null` (usuario sin `@`).
  - `buildXPost({ count, day, baseUrl, handle }): string | null`.
  - `createXPostHandler({ db, now, baseUrl, handle })` (exportado por `reportController.js`).
  - `GET /admin/report/yesterday` → `{ day: 'YYYY-MM-DD', count: number, text: string | null, hasMention: boolean }`.

- [ ] **Step 1: Crear la rama y commitear los documentos**

```bash
git switch -c feat/publicar-en-x
git add docs/superpowers/specs/2026-11-27-publicar-en-x-design.md docs/superpowers/specs/2026-11-27-reporte-diario-baches-design.md docs/superpowers/plans/2026-11-27-publicar-en-x.md
git commit -m "docs: diseno y plan de publicar en X"
```

- [ ] **Step 2: Escribir las pruebas que fallan** en `test/xPost.test.js`

```js
const test = require('node:test');
const assert = require('node:assert');
const { fakeDb, fakeRes } = require('./fakeDb');
const { normalizeHandle, buildXPost } = require('../src/services/xPost');
const { createXPostHandler } = require('../src/controllers/reportController');

const NOW = new Date('2026-11-28T15:00:00.000Z');
const BASE = 'https://ejemplo.test';
const post = (extra) => buildXPost({ count: 3, day: '2026-11-27', baseUrl: BASE, handle: 'Gobierno', ...extra });

test('normalizeHandle accepts a user with or without @ and rejects the rest', () => {
    assert.strictEqual(normalizeHandle(' @Gobierno_1 '), 'Gobierno_1');
    assert.strictEqual(normalizeHandle('Gobierno'), 'Gobierno');
    for (const bad of [undefined, '', '@', 'dos palabras', 'https://x.com/gob', 'a'.repeat(16)]) {
        assert.strictEqual(normalizeHandle(bad), null);
    }
});

test('post has the count, the dated link and the mention', () => {
    assert.strictEqual(post(),
        '3 baches nuevos reportados ayer en Hermosillo.\nhttps://ejemplo.test/bachesNuevos?d=2026-11-27 @Gobierno');
});

test('post uses the singular, drops a missing mention and a trailing slash', () => {
    assert.strictEqual(post({ count: 1, handle: undefined, baseUrl: `${BASE}/` }),
        '1 bache nuevo reportado ayer en Hermosillo.\nhttps://ejemplo.test/bachesNuevos?d=2026-11-27');
});

test('there is no post without bumps', () => {
    assert.strictEqual(post({ count: 0 }), null);
});

async function call(db, handle) {
    const res = fakeRes();
    await createXPostHandler({ db, now: () => NOW, baseUrl: BASE, handle })({}, res);
    return res;
}

const bump = (extra) => ({ verified: true, fixed: false, verifiedAt: '2026-11-27T18:00:00.000Z', ...extra });

test('handler counts the same bumps as the page', async () => {
    const res = await call(fakeDb({ a: bump(), fixed: bump({ fixed: true }), old: bump({ verifiedAt: '2026-11-26T18:00:00.000Z' }) }), '@Gobierno');
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, {
        day: '2026-11-27', count: 1, hasMention: true,
        text: '1 bache nuevo reportado ayer en Hermosillo.\nhttps://ejemplo.test/bachesNuevos?d=2026-11-27 @Gobierno',
    });
});

test('handler answers no text and no mention for an empty day without handle', async () => {
    const res = await call(fakeDb({}), undefined);
    assert.deepStrictEqual(res.body, { day: '2026-11-27', count: 0, text: null, hasMention: false });
});

test('handler answers 500 when the database fails', async () => {
    const res = await call({ collection: () => { throw new Error('down'); } }, 'Gobierno');
    assert.strictEqual(res.statusCode, 500);
});
```

- [ ] **Step 3: Ver que fallan**

Run: `npm test` (en `street-bump-backend`)
Expected: FAIL, `Cannot find module '../src/services/xPost'`.

- [ ] **Step 4: Implementar** `normalizeHandle` y `buildXPost` en `src/services/xPost.js` (usuario válido: `^[A-Za-z0-9_]{1,15}$` tras recortar y quitar un `@` inicial) y `createXPostHandler` en `reportController.js`. El handler responde con `res.json`; ante error, `500` con `{ error: 'Failed to build the report' }`.

- [ ] **Step 5: Registrar la ruta** en `routes/admin.js`, después de `router.use(verifyAdminToken)`:

`router.get('/report/yesterday', createXPostHandler({ db, baseUrl: process.env.PUBLIC_BASE_URL || 'https://bachillo.web.app', handle: process.env.GOV_X_HANDLE }))`

- [ ] **Step 6: Ver que pasan**

Run: `npm test`
Expected: PASS, 44 pruebas, 0 fallas.

- [ ] **Step 7: Commit**

```bash
git add street-bump-backend/src/services/xPost.js street-bump-backend/src/controllers/reportController.js street-bump-backend/src/routes/admin.js street-bump-backend/test/xPost.test.js
git commit -m "feat: texto del reporte de ayer para X"
```

### Task 2: Tarjeta "Reporte de ayer" en el admin

**Files:**
- Create: `street-bump-admin/src/components/XReportCard.tsx`
- Modify: `street-bump-admin/src/services/adminService.ts`
- Modify: `street-bump-admin/src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `GET /admin/report/yesterday` (Task 1), `NOT_ADMIN_MESSAGE`.
- Produces: `adminService.getYesterdayReport(): Promise<YesterdayReport>`, con `export interface YesterdayReport { day: string; count: number; text: string | null; hasMention: boolean }`.

El admin no tiene framework de pruebas y no se agrega uno: se verifica con tipos, build y revisión en el navegador.

- [ ] **Step 1: Agregar** `getYesterdayReport` a `adminService.ts`, con el mismo manejo de token y 403 que `getFixedBumps`.

- [ ] **Step 2: Crear** `XReportCard.tsx`, con título "Reporte de ayer" y el estilo de las tarjetas existentes:

| Estado | Qué muestra |
|---|---|
| Cargando | "Cargando..." |
| Error | `NOT_ADMIN_MESSAGE` o "No se pudo cargar el reporte de ayer." Sin botón |
| `count === 0` | "No hubo baches nuevos ayer." Sin botón |
| Con texto | El texto con sus saltos de línea y "Publicar en X" |
| `hasMention === false` | Además: "Falta configurar la cuenta del gobierno: el texto saldrá sin mención." |
| Ya se dio clic para ese `day` | Además: "Ya abriste X para este reporte." El botón sigue |

- "Publicar en X" es un enlace a `` `https://x.com/intent/post?text=${encodeURIComponent(text)}` `` con `target="_blank"` y `rel="noopener noreferrer"` (un enlace no lo frena el bloqueador de ventanas).
- El aviso de repetido usa `localStorage`, llave `x-opened-<day>`, con lectura y escritura dentro de `try`.
- El reporte se vuelve a pedir en `visibilitychange` cuando la pestaña vuelve a ser visible, sin mostrar "Cargando..." otra vez.

- [ ] **Step 3: Colocar** `<XReportCard />` en `dashboard/page.tsx`, arriba de "Reportes Pendientes".

- [ ] **Step 4: Verificar tipos y build**

Run: `npx tsc --noEmit` y luego `npm run build:dev` (en `street-bump-admin`, con los servidores de desarrollo detenidos)
Expected: sin errores; el build lista la ruta `/dashboard`.

- [ ] **Step 5: Revisar en el navegador** con el backend en emuladores (Java del JBR de Android Studio) y la configuración `admin-emulador`. Requiere que el usuario inicie sesión; si no está disponible, se reporta como no verificado.
Expected: sin baches de ayer, "No hubo baches nuevos ayer."; con uno, el texto y el botón abre X con ese texto.

- [ ] **Step 6: Commit**

```bash
git add street-bump-admin/src/components/XReportCard.tsx street-bump-admin/src/services/adminService.ts street-bump-admin/src/app/dashboard/page.tsx
git commit -m "feat: boton para publicar en X el reporte de ayer"
```

## Después del plan (se confirma aparte)

- Subir la rama y abrir el PR.
- Desplegar `functions` y `hosting:admin` con la skill `deploy-firebase`; verificar que la ruta sin sesión responde 401.
- Cuando el usuario tenga la cuenta del gobierno: `GOV_X_HANDLE` en `street-bump-backend/.env` y volver a desplegar `functions`.
