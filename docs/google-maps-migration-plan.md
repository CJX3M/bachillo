# Plan de migración: Google Maps → stack open source

**Fecha:** 2026-10-01
**Alcance:** `street-bump-frontend`, `street-bump-admin`
**No afecta:** `street-bump-backend` (no usa Google Maps; Firestore + cálculo de distancia manual en `bumpController.js`)

## 1. Inventario actual (qué hay que reemplazar)

| Archivo | Uso de Google Maps | Reemplazo |
|---|---|---|
| `street-bump-frontend/src/app/components/GoogleMapsWrapper.tsx` | `useLoadScript` de `@react-google-maps/api`, carga librería `places` (no usada en ningún lado) | Eliminar — Leaflet no requiere script loader |
| `street-bump-frontend/src/app/components/BumpMap.jsx` | `<GoogleMap>`, `<Marker>`, `<InfoWindow>` para el mapa principal con los baches | `<MapContainer>`, `<Marker>`, `<Popup>` de `react-leaflet` |
| `street-bump-frontend/src/app/components/MapPicker.jsx` | `<GoogleMap>` + `useLoadScript` para elegir ubicación manualmente | `<MapContainer>` de `react-leaflet` con pin centrado fijo (el componente ya simula esto con `onDragEnd`) |
| `street-bump-frontend/src/services/googleMapsService.ts` | `google.maps.Geocoder` (reverse y forward geocoding) | Llamadas REST a Nominatim/Photon/LocationIQ (ver sección 3) |
| `street-bump-admin/src/services/geocodingService.ts` | `fetch` directo a `maps.googleapis.com/maps/api/geocode/json` | Mismo patrón, URL distinta |
| `.env.development`, `.env.local` (frontend) | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Eliminar (o dejar solo si se conserva geocoding de pago como fallback) |
| `package.json` (frontend) | `@react-google-maps/api`, `@googlemaps/google-maps-services-js` | Remover; `leaflet` y `react-leaflet` **ya están instalados** (dependencia huérfana sin usar hoy — probablemente un intento previo abandonado) |

**Hallazgo relevante:** `leaflet@1.9.4` y `react-leaflet@5.0.0` ya están en `street-bump-frontend/package.json` pero no se importan en ningún componente. Esto reduce el trabajo de setup: no hay que instalar nada nuevo para la parte de mapas, solo escribir los componentes y quitar las dependencias de Google.

## 2. Decisión de proveedor de tiles

React-Leaflet necesita una fuente de tiles rasterizados (o vectoriales vía plugin). Opciones evaluadas:

| Opción | Costo | Límite de uso | Notas |
|---|---|---|---|
| Tiles OSM directos (`tile.openstreetmap.org`) | Gratis | Política de "fair use": no apto para apps en producción con tráfico real, pueden bloquear por IP/volumen | Sirve solo para desarrollo/pruebas, **no para producción** |
| **MapTiler** (recomendado) | Gratis hasta 100k cargas de mapa/mes | Generoso para una app comunitaria pequeña | Tiles vectoriales y raster, buena cobertura en México, requiere API key gratuita |
| Stadia Maps | Gratis hasta 200k créditos/mes (no comercial) | Requiere registrar dominio | Alternativa si MapTiler no convence |
| OpenFreeMap / Protomaps (self-hosted) | Gratis, sin límites, pero tú pagas el hosting | Requiere mantener un servidor de tiles (PMTiles) | Solo vale la pena si el tráfico crece mucho; no recomendado para el tamaño actual del proyecto |

**Recomendación:** MapTiler para producción (free tier cubre el uso esperado de una app municipal/comunitaria), tiles OSM directos solo como fallback de desarrollo local.

## 3. Decisión de geocoding (reverse + forward)

Esta es la parte de mayor riesgo de precisión, porque hoy el reverse geocoding se usa intensivamente: cada bache visible en el mapa dispara una llamada (`fetchBumpsInRadius` → `getAddressFromCoordinates` por cada resultado, ver `BumpMap.jsx:83` y `googleMapsService.ts:121-129`).

| Opción | Costo | Límite | Cobertura México | Notas |
|---|---|---|---|---|
| Nominatim (instancia pública `nominatim.openstreetmap.org`) | Gratis | **1 req/seg, sin uso comercial pesado** — con el patrón actual de N llamadas por carga de mapa, se satura rápido | Buena en zonas urbanas, variable en colonias/calles menores | Requiere agregar un `User-Agent`/`Referer` identificable por política de uso |
| **LocationIQ** (recomendado) | Gratis hasta 5,000 req/día | Rate limit más alto que Nominatim público | Basado en datos OSM + mejoras propias | Drop-in: mismo modelo request/response que Nominatim, requiere API key gratuita |
| Photon / Pelias self-hosted | Gratis, sin límite propio | Requiere mantener servidor + datos OSM | Depende de qué tan actualizado mantengas el dataset | Solo si el volumen de geocoding crece mucho |
| MapTiler Geocoding API | Gratis hasta cierto tier, compartido con el límite de tiles | — | Buena | Permite usar un solo proveedor para tiles + geocoding |

**Recomendación:** LocationIQ para geocoding (reverse + forward), por ser el reemplazo más directo sin tener que mantener infraestructura. Si el volumen de reportes crece mucho, revisar migrar a self-hosted Photon.

**Antes de migrar en serio:** correr una prueba de precisión con 15-20 direcciones reales de Hermosillo/zonas donde se usa la app (ver coordenadas hardcodeadas en `BumpMap.jsx:36-37`: `29.0729, -110.9559`) comparando resultado de Google vs. LocationIQ/Nominatim, para decidir si la pérdida de precisión es aceptable.

## 4. Pasos de migración (orden sugerido)

### Fase 0 — Preparación (sin tocar producción)
1. Crear cuenta gratuita en MapTiler y LocationIQ, generar API keys de prueba.
2. Añadir `NEXT_PUBLIC_MAPTILER_KEY` y `NEXT_PUBLIC_LOCATIONIQ_KEY` a `.env.development` / `.env.local` (sin tocar aún las keys de Google, para poder hacer rollback).
3. Correr la prueba de precisión de geocoding de la sección 3 y documentar resultados.

### Fase 1 — Capa de mapas (`BumpMap.jsx`, `MapPicker.jsx`)
4. Crear `src/services/mapTileConfig.ts` con la URL del tile layer de MapTiler y atribución OSM requerida (`&copy; OpenStreetMap contributors`).
5. Reescribir `BumpMap.jsx`:
   - Reemplazar `<GoogleMap>` por `<MapContainer>` + `<TileLayer>`.
   - Reemplazar `<Marker>`/`<InfoWindow>` de Google por los de `react-leaflet` (`<Marker>`/`<Popup>`).
   - El icono por defecto de Leaflet no se carga bien con bundlers de Next.js (problema conocido) — hay que configurar manualmente `L.Icon.Default` o usar un ícono custom (hay un `icon` comentado en el código actual, línea 170-173, que ya anticipa esto).
   - Reimplementar `onIdle`/`onDragEnd`/`onZoomChanged` con los eventos equivalentes de Leaflet (`moveend`, `dragend`, `zoomend` vía `useMapEvents`).
6. Reescribir `MapPicker.jsx` de forma análoga (es más simple: solo necesita centrar y capturar `dragend`).
7. Eliminar `GoogleMapsWrapper.tsx` y su uso en `page.tsx` (Leaflet no necesita carga de script externo).

### Fase 2 — Geocoding (`googleMapsService.ts`, `street-bump-admin/geocodingService.ts`)
8. Agregar métodos `getAddressFromCoordinates` / `getCoordinatesFromAddress` que llamen a LocationIQ (misma firma de función, mismo contrato — así no hay que tocar los componentes que los consumen).
9. Mantener `getCurrentLocation` y `parseEXIFCoordinate` sin cambios (no dependen de Google, son geolocalización del navegador y parseo EXIF).
10. Actualizar `street-bump-admin/src/services/geocodingService.ts` con el mismo patrón.
11. **Optimización aprovechable de paso:** `fetchBumpsInRadius` hoy geocodifica *cada bache visible* en cada carga (`googleMapsService.ts:121-129`). Con el rate limit más ajustado de LocationIQ free tier (5k/día), vale la pena cachear direcciones ya resueltas por coordenada (ej. en el propio documento de Firestore, guardar `address` una vez calculada en `createBump`) en vez de recalcular en cada fetch. Esto no es estrictamente necesario para la migración, pero reduce mucho el consumo de cuota.

### Fase 3 — Limpieza de dependencias
12. `npm uninstall @react-google-maps/api @googlemaps/google-maps-services-js` en `street-bump-frontend`.
13. Quitar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` de `.env.development`/`.env.local` y de cualquier variable de entorno configurada en Firebase Hosting/CI.
14. Revocar o restringir la API key de Google Maps en Google Cloud Console (no solo borrarla del código).

### Fase 4 — Verificación manual
15. Probar en navegador: carga inicial del mapa, pan/zoom, click en marker (popup con imagen + dirección + fecha), botón de reportar bache con `MapPicker`, lista lateral de baches cercanos con dirección.
16. Probar en un dispositivo móvil real (geolocalización + cámara), ya que `ReportForm.jsx` depende de `navigator.geolocation` y EXIF — ninguno de los dos cambia, pero el flujo completo sí debe revalidarse end-to-end.
17. Verificar atribución de OpenStreetMap visible en el mapa (es requisito de la licencia ODbL, no opcional).

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Precisión de geocoding inferior a Google en zonas rurales/colonias nuevas | Prueba de precisión previa (Fase 0); fallback a mostrar solo coordenadas si no hay dirección legible |
| Rate limit de LocationIQ (5k/día) insuficiente si la app crece | Cachear direcciones resueltas en Firestore junto al bump (optimización del paso 11) |
| Iconos de Leaflet rotos por bundling de Next.js | Configurar `L.Icon.Default.mergeOptions` con rutas explícitas a los assets, o usar íconos SVG propios (ya hay un ícono planeado y comentado en el código) |
| Falta de atribución OSM (incumplimiento de licencia) | Verificación explícita en paso 17 |
| Regresión no detectada en el flujo de reporte (cámara + GPS + mapa) | Prueba manual end-to-end en móvil real antes de dar por cerrada la migración (paso 16) |

## 6. Estimación de esfuerzo

- Fase 0: ~1 hora (crear cuentas, keys, correr prueba de precisión)
- Fase 1: ~1 día (mapas son la parte más grande, por los eventos e iconos de Leaflet)
- Fase 2: ~2-3 horas (geocoding es un cambio de URL con el mismo contrato de función)
- Fase 3: ~30 min
- Fase 4: ~2-3 horas de pruebas manuales (incluye dispositivo móvil)

**Total estimado: 1.5-2 días de trabajo enfocado.**

## 7. Rollback

Como ambos sets de dependencias (Google y Leaflet) pueden coexistir temporalmente, el rollback más simple durante la migración es no borrar las keys de Google hasta completar la Fase 4 — si algo falla en producción, revertir el commit de la Fase 1/2 restaura el comportamiento anterior sin pasos adicionales.
