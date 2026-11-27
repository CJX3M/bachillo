# Diseño: reporte diario de baches al gobierno

Fecha: 2026-11-27. Estado: aprobado.

## Intención

Dar visibilidad a quien debe reparar los baches: avisar al gobierno de la ciudad (Hermosillo) de los
baches **nuevos**, con foto y dirección, por X y por el WhatsApp municipal (662 155 0100).

## Objetivos

- Una página pública con los baches aprobados el día anterior.
- Un envío diario automático, solo si hubo baches nuevos.
- Que cualquiera pueda marcar un bache como atendido con un clic.

## No objetivos

- Historial por fecha en la página (decisión: solo "ayer", para no invitar a consultarla día por día).
- Aprobación automática con IA (futuro; por ahora aprueba el administrador).
- Deduplicar reportes: un bache re-reportado vuelve a dar visibilidad.
- Pedir permisos o cuenta para marcar como atendido.

## Anti-objetivos

- Mandar al gobierno fotos no revisadas.
- Publicar días sin baches nuevos, o publicar dos veces el mismo día.
- Exponer la red de casa a internet.

## Enfoques considerados

| Enfoque | A favor | En contra |
|---|---|---|
| **A. Firebase + computadora de casa solo para WhatsApp (elegido)** | La página y X no dependen de la casa; vista previa de la liga | Varias piezas |
| B. Página estática en el frontend | Lo más simple | Sin vista previa en X ni WhatsApp |
| C. Todo en la computadora de casa | Un solo lugar | Un apagón rompe todo; hay que exponer la casa |

## Restricciones

- Firebase (plan Blaze), Functions v2 con Node 20, Firestore, `us-central1`.
- Frontend Next.js estático. Sitio de trabajo: `bachillo-v1.web.app` (target `frontend-v1`).
- `bachillo.web.app` y `bachillo-v1` comparten backend y datos: los cambios de API no deben romper el
  frontend anterior.
- Hora local: `America/Hermosillo` (UTC-7, sin horario de verano).
- Presupuesto: capas gratuitas, salvo X con un tope de $10 USD al mes.

## Hallazgos en el código que hay que resolver

1. **El acceso de administrador debe restringirse** a una lista de correos autorizados.
2. **`GET /bumps/nearby` no excluye los baches atendidos** (`fixed`), y el mapa lo usa al moverse.
3. **El backend de producción es anterior** a la migración: no guarda `address` y usa URLs de foto que
   caducan en 24 horas.

## Fase 1: sitio y envío manual

### 1.1 Seguridad del admin (antes de que aprobar signifique "enviar al gobierno")
- Lista de correos de administrador en configuración (`ADMIN_EMAILS`); exigir `email_verified` y
  pertenencia. Quitar los logs del encabezado y del token.

### 1.2 Despliegue del backend a producción
- Incluye `address` y URL permanente de foto. Verificar después que una foto nueva carga.
- Revisar `git status` antes: hay cambios locales ajenos (`cors.js`, `bumpController-Leiya.js`).

### 1.3 Página `/bachesNuevos`
- HTML generado por una Function, con rewrite de Hosting en `frontend-v1` antes de la regla `**`.
- Contenido: baches con `verified == true`, `fixed == false` y `verifiedAt` dentro de ayer
  (00:00 a 23:59 hora de Hermosillo).
- Por bache: foto, dirección, fecha de reporte y liga "ver en el mapa".
- "Ver en el mapa" abre el mapa de Bachillo centrado en ese bache, con su detalle abierto (donde está
  "Marcar como atendido"). Hoy el mapa no lo permite: hay que agregar la liga directa
  (`/?bache=<id>`). Si el bache ya fue atendido o no existe, se avisa y se muestra el mapa normal.
- Metadatos Open Graph y Twitter Card (título con el número de baches; imagen: la primera foto).
- Sin baches: "No hubo baches nuevos ayer" y liga al mapa.
- Sin dirección guardada: resolverla en servidor con LocationIQ y guardarla; si falla, mostrar
  coordenadas. Requiere una key apta para servidor (la actual está restringida por dominio).
- Baches creados antes del despliegue pueden tener foto con URL caducada: mostrar la URL permanente
  del mismo archivo.
- Escapar todo texto que venga de usuarios (`address` llega del cliente).

### 1.4 Marcar como atendido
- Botón "Marcar como atendido" en el detalle del bache del mapa. Un clic, sin permisos.
- `POST /bumps/:id/fixed`: solo sobre baches aprobados; guarda `fixed: true` y `fixedAt`; repetirlo
  no es error. Límite básico por IP.
- `/bumps/nearby` excluye los atendidos.
- En el admin: lista de atendidos con botón "Reabrir".

### 1.5 Dirección definitiva
- Al gobierno se le envía `bachillo.web.app/bachesNuevos`, porque las ligas enviadas no se pueden
  cambiar. `bachillo-v1.web.app` es el sitio de prueba.
- Una vez verificado todo en v1, se publica la versión nueva en `bachillo.web.app` (con su rewrite),
  **antes** de mandar cualquier liga al gobierno. Es un despliegue a producción que se confirma aparte.
- La dirección base de las ligas es configurable.

### 1.6 Prueba manual (compuerta para la fase 3)
El usuario manda la liga por WhatsApp (hola → 1 → 2 → detalles) y anota cada respuesta del bot.
Si el bot exige ubicación o foto y no acepta texto, la fase 3 se replantea.

**Fase 1 terminada cuando:** un bache aprobado hoy aparece mañana en la página con foto y dirección,
su liga abre ese bache en el mapa, marcarlo como atendido lo quita del mapa y de la página, una cuenta
que no es admin recibe 403 y la versión nueva está en `bachillo.web.app`.

## Fase 2: publicación en X

- Cuenta nueva dedicada, declarada como automatizada.
- Función programada diaria a las 8:00 (Hermosillo). Si la lista de ayer está vacía, no publica.
- Texto: número de baches, liga y mención a la cuenta del gobierno.
- Registro `dispatches/{YYYY-MM-DD}` con estado por canal: impide publicar dos veces. Ante una falla
  se avisa; no hay reintento automático.
- Credenciales como secretos de Functions.
- Antes de construir: confirmar en el portal de X el costo, si se puede publicar con foto/liga y si
  sus reglas permiten la mención diaria automática (sin verificar).
- **Tope de gasto: $10 USD al mes.** Si cuesta más, el sistema solo prepara el texto, visible en el
  admin, y el usuario lo publica a mano.
- Si las reglas no permiten la mención automática, el tweet sale sin mención.

## Fase 3: WhatsApp automático (se detalla después de la prueba manual)

- Chip dedicado; contenedor OpenWA en una computadora de casa.
- La casa **solo hace conexiones salientes**: consulta al backend los envíos pendientes y reporta el
  resultado, con un secreto compartido. No guarda credenciales de Firebase.
- Un envío pendiente caduca a las 23:59 de ese día, porque al día siguiente la liga muestra otra lista.
- Si el menú del bot no responde lo esperado, se detiene y avisa; no sigue mandando mensajes.
- Riesgo aceptado: OpenWA no es oficial y el número puede ser bloqueado.

## Avisos y servicios externos (revisión de free-for.dev)

- **healthchecks.io** (20 checks gratis): el job diario y el contenedor le hacen ping; si falla o deja
  de reportar, manda correo a el correo del proyecto. Evita programar envío de correos.
- **Tailscale** (gratis para uso personal): administrar la computadora de casa sin abrir puertos.
- **Sentry** (5 mil errores al mes): opcional.
- **Oracle Cloud Always Free**: respaldo si la computadora de casa no resulta confiable; la lista
  advierte que reclaman instancias inactivas.

Los límites vienen de la lista y hay que confirmarlos al registrarse.

## Pendiente del usuario

- Fase 1: correo(s) de Google que deben ser administradores.
- Fase 1: segunda key de LocationIQ, para llamadas desde el servidor.
- Fase 2: cuenta de X creada y la cuenta del gobierno a mencionar.
- Fase 3: chip, computadora lista y transcripción de la prueba manual.

## Queda a criterio de quien construya

Diseño visual de la página (coherente con la app), valores del límite por IP, nombres de funciones y
módulos, y estrategia de pruebas.
