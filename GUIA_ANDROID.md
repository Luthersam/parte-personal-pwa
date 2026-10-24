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

## Crear la llave de firma (una sola vez)

Google Play exige que las versiones estén firmadas. **Guarda esta llave y sus contraseñas en un
lugar seguro (con copia): si la pierdes no podrás actualizar la app sin pasar por soporte.**

```bash
keytool -genkey -v -keystore ~/parte-personal-upload.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias upload
```

Crea el archivo `android/keystore.properties` (ya está excluido de git; **nunca lo subas**):

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
2. **Política de privacidad**: es obligatoria. La app maneja nombres y novedades de personal;
   debe indicar que los datos se guardan en el dispositivo y se envían directamente entre
   dispositivos, sin servidor propio. Necesita una dirección web pública con ese texto.
3. **Seguridad de los datos**: declara qué datos se recopilan y cómo se comparten.
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

## Riesgos a tener en cuenta

- **Revisión de Google:** las apps que solo muestran una página web pueden ser rechazadas por
  "funcionalidad mínima". Esta incluye funciones propias (cámara con escáner de QR, pantalla
  encendida, botón atrás, funcionamiento sin conexión para llenar el parte), lo que ayuda.
- **WebRTC dentro de la app:** funciona sobre el motor de Chrome de Android, pero hay que
  probarlo en celulares reales (cámara, permisos y envío por QR entre dos equipos).
- **iPhone:** no tiene app; se usa en Safari (la cámara lee el QR y lo abre en Safari).
