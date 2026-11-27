# Diseño: publicar el reporte diario en X (fase 2)

Fecha: 2026-11-27. Estado: aprobado. Sustituye la sección "Fase 2" de
[el diseño del reporte diario](2026-11-27-reporte-diario-baches-design.md).

## Intención

Dar visibilidad ante el gobierno de la ciudad: cada día con baches nuevos, una publicación en X que lo
mencione y lleve a la lista.

## Objetivos

- Publicar desde el admin con un botón que abre X con el texto listo; la persona da "Publicar".
- Cuesta $0 (tope del proyecto: $10 USD al mes).

## No objetivos

- API de X, llaves, función programada o publicación sin intervención.
- Recordatorios y registro en el servidor de lo publicado.

## Anti-objetivos

- Publicar un día sin baches nuevos.
- Publicar dos veces el mismo día sin darse cuenta.

## Enfoques considerados

| Enfoque | A favor | En contra |
|---|---|---|
| A. Publicación automática | Sin esfuerzo | No puede mencionar al gobierno; unos $6 USD al mes |
| **B. Un clic desde el admin (elegido)** | Menciona al gobierno; $0; sin llaves | Depende de que alguien publique cada día |
| C. Automática más cita manual | La lista sale aunque nadie entre | Cuesta como A y pide el trabajo de B |

Se eligió B porque la mención es lo que da visibilidad, y las
[reglas para desarrolladores de X](https://docs.x.com/developer-guidelines) prohíben las menciones no
solicitadas desde cuentas automatizadas.

Riesgo aceptado: la página solo muestra "ayer", así que un día sin publicar pierde esa lista.

## Cómo funciona

En el panel del admin, arriba de los pendientes:

```
Reporte de ayer
3 baches nuevos reportados ayer en Hermosillo.
https://bachillo.web.app/bachesNuevos?d=2026-11-26 @cuentaDelGobierno
[ Publicar en X ]
```

- El backend arma el texto: ruta de administrador que devuelve el día, el número de baches y el texto,
  con los mismos baches que muestra `/bachesNuevos`. Singular y plural correctos.
- "Publicar en X" abre `https://x.com/intent/post?text=…` en otra pestaña. Se publica con la sesión
  que esté abierta en X.
- Sin baches: "No hubo baches nuevos ayer", sin botón.
- Si la consulta falla: mensaje de error, sin botón.
- La cuenta a mencionar se configura en el backend (`GOV_X_HANDLE`). Sin configurar, el texto sale sin
  mención y el admin lo avisa.
- Después de dar clic, ese navegador muestra "Ya abriste X para este reporte"; el botón sigue
  disponible. Decisión de quien construye: se guarda solo en el navegador, no confirma que se publicó.
- Decisión de quien construye: la liga lleva `?d=<día>` para que X no reutilice la vista previa de un
  día anterior (comportamiento de X sin verificar). La página ignora el parámetro.

## Terminado cuando

Con un bache aprobado ayer, el admin muestra el texto con la mención y el botón abre X con ese texto;
sin baches no hay botón; una cuenta que no es admin recibe 403.

## Pendiente del usuario

- Cuenta de X desde la que se publicará. Al publicarse a mano no necesita la etiqueta de automatizada.
- Usuario de X del gobierno a mencionar. No bloquea la construcción.

## Sin verificar

La página de [reglas de automatización de X](https://help.x.com/en/rules-and-policies/x-automation) no
se pudo leer. Conviene revisarla, junto con las reglas sobre menciones repetidas hechas a mano.
