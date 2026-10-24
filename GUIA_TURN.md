# Cómo agregar un servidor TURN real

## Para qué sirve

Dos celulares se conectan **directamente** cuando sus redes lo permiten. En algunas redes no
pasa (por ejemplo, **internet compartido desde un celular**, ciertos operadores móviles o Wi-Fi con
aislamiento de clientes). Un servidor **TURN** hace de puente: retransmite los datos, que siguen
cifrados de extremo a extremo (el TURN no puede leerlos).

Los servidores de retransmisión que traía PeerJS por defecto **ya no existen**, así que hoy no hay
puente de respaldo. La app ya está preparada: solo falta contratar uno y pegar sus datos.

## Qué proveedor elegir

| Opción | Cuándo conviene | Complejidad |
|---|---|---|
| **Metered** (plan gratuito) | Lo más rápido: copias unos datos y listo. | Baja |
| **Cloudflare Realtime TURN** | Más robusto y con buena cuota gratuita, pero exige un pequeño servidor para generar credenciales temporales. | Media (requiere código nuevo) |
| **Twilio** | Si ya usas Twilio. De pago. | Media |
| **Servidor propio (coturn)** | Control total, pero hay que administrar un servidor. | Alta |

> Las cuotas gratuitas y los menús cambian con frecuencia; confirma los límites vigentes en la
> página del proveedor antes de decidir. Para uso ocasional (unas 25 unidades, unas pocas veces al
> mes, partes de pocos KB) el consumo es mínimo.

La guía siguiente usa **Metered**, porque no requiere programar nada más.

## Paso a paso con Metered

1. Crea una cuenta en <https://www.metered.ca> y entra al panel.
2. Crea una aplicación de **TURN Server** (el nombre es libre, por ejemplo `parte-personal`).
3. En la sección de **credenciales** (Credentials / TURN Credentials) agrega una credencial.
   Copia el **usuario** y la **contraseña** que te muestra, y las direcciones de los servidores
   (normalmente empiezan con `global.relay.metered.ca`).
4. Arma este texto JSON con tus datos (una sola línea):

```json
[{"urls":["turn:global.relay.metered.ca:80","turn:global.relay.metered.ca:80?transport=tcp","turn:global.relay.metered.ca:443","turns:global.relay.metered.ca:443?transport=tcp"],"username":"TU_USUARIO","credential":"TU_CONTRASEÑA"}]
```

   Usa las direcciones exactas que te muestre el panel, por si cambiaron. Las que terminan en
   `:443` y `turns:` son importantes: atraviesan casi cualquier red.

### Activarlo en la versión web (Vercel)

1. En Vercel abre el proyecto → **Settings → Environment Variables**.
2. Crea la variable `VITE_ICE_SERVERS` con el JSON de arriba, para *Production*.
3. Haz esto en **los dos proyectos** (`parte-personal-pwa` y `parte-personal-pwa-ky1e`).
4. **Redespliega** (Deployments → ⋯ → Redeploy). Las variables se aplican solo al compilar.

### Activarlo en la app de Android

1. En la carpeta del proyecto crea el archivo `.env.production.local` (ya está excluido de git):

```
VITE_ICE_SERVERS=[{"urls":[...],"username":"...","credential":"..."}]
```

2. Genera de nuevo el paquete: `npm run android:sync` y luego `cd android && ./gradlew bundleRelease`
   (con las variables `JAVA_HOME` y `ANDROID_HOME` de la guía de Android).
3. Sube el nuevo `.aab` a Play Console con un `versionCode` mayor.

## Cómo comprobar que funciona

**Prueba 1 — el TURN responde (sin la app).** Abre
<https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/>, borra los servidores
de la lista, agrega uno con el `turn:` de tu proveedor, el usuario y la contraseña, y pulsa
«Gather candidates». Debe aparecer al menos un candidato de tipo **relay**. Si no aparece, las
credenciales o las direcciones están mal.

**Prueba 2 — la app usa el TURN.** Compila con además `VITE_ICE_SOLO_RELAY=true` (obliga a pasar
por el TURN). Si el envío de un parte entre dos celulares funciona así, el puente sirve. **Quita
esa variable después**: con ella todo el tráfico pasaría por el proveedor.

**Prueba 3 — el caso real.** Con el TURN activo y sin `VITE_ICE_SOLO_RELAY`, repite la prueba que
falló: un celular compartiendo internet a la Mac, y el otro en datos móviles.

## Seguridad

- Un usuario y contraseña de TURN dentro de la app **se pueden extraer** del código. Con proveedores
  que lo permiten, activa límites de uso y rota la contraseña si sospechas abuso. La opción más
  segura es la de Cloudflare con credenciales temporales; pídeme que la implemente si la eliges.
- No pegues estas credenciales en chats ni las subas a git (los archivos `.env*.local` están
  excluidos).
