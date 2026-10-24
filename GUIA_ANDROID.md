# App de Android — Parte de Personal

La app de Android es la misma aplicación web, empaquetada con **Capacitor**. Los archivos de la
app van **dentro** del APK/AAB (no carga la web en línea), así que abre rápido y no depende de
Vercel para arrancar. Sigue necesitando internet para recibir y enviar partes por QR.

## Datos de la app

| Dato | Valor |
|---|---|
| Nombre | Parte de Personal |
| ID del paquete (`applicationId`) | `com.partepersonal.app` |
| Versión | `1.0.0` (`versionCode 1`) |
| Android mínimo | 7.0 (API 24) |

> **El ID del paquete no se puede cambiar después de subir la app a Google Play.** Si quieres
> otro (por ejemplo, con el dominio de tu organización), cámbialo **antes** de la primera subida
> en `capacitor.config.ts` (`appId`) y en `android/app/build.gradle` (`namespace` y
> `applicationId`), y carpeta `android/app/src/main/java/...`. Pídeme que lo haga.

## Qué cambia dentro de la app de Android

- Escáner de QR dentro de la app (cámara).
- La pantalla se mantiene encendida mientras recibes partes por QR.
- El botón "atrás" de Android cierra la ventana abierta; sin ventanas, sale de la app.
- El QR que genera el coordinador apunta a `https://parte-personal-pwa.vercel.app` (constante
  `URL_PUBLICA` en `src/nativo.ts`), para que lo abran también iPhone y otros celulares.
- No muestra el aviso de "instalar" ni usa service worker.
- Las copias de seguridad de Android están desactivadas (`allowBackup=false`), para que los
  datos del personal no se suban a la nube de Google.

## Requisitos para compilar

- Android Studio (trae el SDK) y Java 21. Gradle ya descargó un Java 21 (Corretto); si compilas
  por terminal, usa:

```bash
export JAVA_HOME="$HOME/.gradle/jdks/amazon_com_inc_-21-aarch64-os_x.2/amazon-corretto-21.jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

## Probar en un celular (APK de prueba)

```bash
npm run android:sync          # compila la web y la copia al proyecto de Android
cd android && ./gradlew assembleDebug
```

El archivo queda en `android/app/build/outputs/apk/debug/app-debug.apk`. Pásalo al celular e
instálalo (hay que permitir "instalar apps desconocidas"), o con el celular por cable y la
depuración USB activada: `adb install -r app/build/outputs/apk/debug/app-debug.apk`.
También puedes abrir el proyecto con `npm run android:abrir` y pulsar ▶ en Android Studio.

## La llave de firma (ya creada)

Google Play exige que cada versión esté firmada. La llave de subida ya se creó con estos archivos:

| Archivo | Qué es |
|---|---|
| `~/parte-personal-upload.jks` | La llave de firma (almacén de llaves). |
| `android/keystore.properties` | Ruta y contraseñas, que lee Gradle al firmar. |

Ambos están **fuera de git** (no se suben nunca). **Haz una copia de los dos en un lugar seguro**
(por ejemplo, un gestor de contraseñas o un disco externo): sin ellos no podrás firmar
actualizaciones. Si los pierdes, con Play App Signing activado se puede pedir a Google que
restablezca la llave de subida, pero es un trámite lento.

Si alguna vez necesitas crear una nueva (por ejemplo, en otro computador):

```bash
keytool -genkeypair -v -keystore ~/parte-personal-upload.jks -storetype PKCS12 -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

y crea `android/keystore.properties` con este formato:

```properties
storeFile=/Users/TU_USUARIO/parte-personal-upload.jks
storePassword=LA_CONTRASEÑA
keyAlias=upload
keyPassword=LA_CONTRASEÑA
```

## Generar el paquete para Google Play (AAB)

```bash
npm run android:sync
cd android && ./gradlew bundleRelease
```

Resultado: `android/app/build/outputs/bundle/release/app-release.aab`.

## Publicar en Google Play Console

1. **Crear la app** (nombre, idioma español, gratuita).
2. **Política de privacidad**: ya está redactada y publicada en la app web:
   `https://parte-personal-pwa.vercel.app/privacidad.html` (también hay un enlace dentro de la app).
   Muestra «Parte Personal» como responsable y `medaysanluc@gmail.com` como contacto; si quieres
   cambiarlos, edita `public/privacidad.html` (secciones 1 y 10).
3. **Seguridad de los datos**: las respuestas sugeridas están en `play-store/textos-y-respuestas.md`,
   junto con la descripción, el ícono y el gráfico de funciones.
4. **Clasificación de contenido** y **público objetivo** (adultos).
5. **Prueba interna** (recomendado primero): sube el `.aab` en *Pruebas > Prueba interna*,
   agrega los correos de tus probadores e instala desde el enlace.
6. **Producción**: cuando esté probada. Las cuentas personales nuevas pueden tener que hacer
   antes una **prueba cerrada** con un mínimo de testers durante varios días; Play Console te
   indica los requisitos exactos de tu cuenta.
7. Activa **Play App Signing** cuando te lo ofrezca (es lo estándar): Google guarda la llave
   final y tu llave local queda como llave de subida.

## Publicar una actualización

1. Cambia el código web como siempre.
2. En `android/app/build.gradle` **sube** `versionCode` (2, 3, ...) y ajusta `versionName`.
3. `npm run android:sync` y `cd android && ./gradlew bundleRelease`.
4. Sube el nuevo `.aab` en Play Console.

Los cambios de la web en Vercel **no** llegan solos a la app de Android: hay que publicar una
versión nueva.

## Conexión en redes difíciles

Si dos celulares no logran conectarse (por ejemplo, con internet compartido desde un celular), hace
falta un servidor TURN. Los pasos están en [GUIA_TURN.md](GUIA_TURN.md).

## Riesgos a tener en cuenta

- **Revisión de Google:** las apps que solo muestran una página web pueden ser rechazadas por
  "funcionalidad mínima". Esta incluye funciones propias (cámara con escáner de QR, pantalla
  encendida, botón atrás, funcionamiento sin conexión para llenar el parte), lo que ayuda.
- **WebRTC dentro de la app:** funciona sobre el motor de Chrome de Android, pero hay que
  probarlo en celulares reales (cámara, permisos y envío por QR entre dos equipos).
- **iPhone:** no tiene app; se usa en Safari (la cámara lee el QR y lo abre en Safari).
