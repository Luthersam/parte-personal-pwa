# Parte de Personal — textos y respuestas para Google Play Console

Todo lo de aquí se copia y pega en Play Console. Todo está completo; solo revisa que el nombre y el correo sean los que quieres mostrar.

## Ficha de la tienda

| Campo | Valor |
|---|---|
| Nombre de la app (máx. 30) | `Parte de Personal` |
| Descripción breve (máx. 80) | `Consolide el parte de su equipo en minutos y en tiempo real.` |
| Categoría | Productividad (o Empresas) |
| Correo de contacto | `medaysanluc@gmail.com` |
| Política de privacidad | `https://parte-personal-pwa.vercel.app/privacidad.html` |
| Anuncios | No contiene anuncios |
| Acceso a la app | Sin inicio de sesión: todas las funciones están disponibles |
| Público objetivo | Mayores de 18 años |

### Descripción completa (máx. 4000)

```
Parte de Personal es una herramienta para elaborar el parte diario de disponibilidad de personal de forma rápida y clara.

Con ella puede:
• Registrar la fuerza efectiva de su unidad (OF, SUB, PT/PP, AXP).
• Anotar las novedades por categoría (comisión, excusado de servicio, franquicia, permiso, vacaciones, servicios, retardado, horario flexible y otros) con el nombre de cada funcionario.
• Ver al instante cuántos funcionarios quedan disponibles: fuerza efectiva menos novedades.
• Recibir los partes de otras unidades en tiempo real mediante un código QR válido por 2 horas, y aprobar o rechazar cada uno antes de que se sume al consolidado.
• Enviar su parte al coordinador escaneando su código QR.
• Generar el reporte consolidado y compartirlo como imagen o como texto.

Pensada para usarse sin complicaciones: textos grandes, botones amplios y pasos claros.

Privacidad: no hay cuentas ni publicidad. Los partes se guardan en su dispositivo y viajan directamente, de forma cifrada, entre los celulares que participan en la recepción. La cámara solo se usa para leer el código QR.
```

## Imágenes

| Elemento | Archivo | Estado |
|---|---|---|
| Ícono (512×512) | `play-store/icono-512x512.png` | Listo |
| Gráfico de funciones (1024×500) | `play-store/grafico-de-funciones-1024x500.png` | Listo |
| Capturas de pantalla del teléfono (mín. 2) | — | Pendiente |

**Capturas:** Google exige que el lado largo no supere el doble del lado corto. Las capturas del
emulador (1080×2400) no cumplen; hay que recortarlas a 1080×2160 o menos (por ejemplo 1080×1920).

## Seguridad de los datos (formulario de Play Console)

Respuestas sugeridas, según cómo funciona la app. **Revísalas con quien responda por la parte
legal**; lo que declares debe coincidir con la política de privacidad y con el comportamiento real.

**¿La app recopila o comparte datos de usuario requeridos?** Sí.
**¿Todos los datos se cifran en tránsito?** Sí (conexión WebRTC cifrada entre dispositivos).
**¿Los usuarios pueden pedir que se eliminen sus datos?** Sí (el parte se borra con «Limpiar» o al
desinstalar; los titulares pueden pedirlo a la entidad que lo elaboró).

| Tipo de dato | ¿Se recopila? | ¿Se comparte? | Finalidad | Opcional |
|---|---|---|---|---|
| Información personal → **Nombre** (grado y nombre de funcionarios) | Sí | No | Funcionalidad de la app | No (es el parte) |
| Ubicación (precisa o aproximada) | No | — | — | — |
| Fotos y videos | No (la cámara solo lee el QR; no se guarda ni envía nada) | — | — | — |
| Contactos, mensajes, archivos, salud | No | — | — | — |
| Identificadores de dispositivo o publicidad | No | — | — | — |

Notas para el formulario:

- «Recopilar» en Google significa **enviar datos fuera del dispositivo**. Aquí los nombres viajan de
  un celular a otro (unidad → coordinador). Los servicios de conexión (PeerJS y el servidor STUN de
  Google) reciben direcciones IP y datos técnicos, pero **no el contenido** del parte.
- Esos servicios actúan como proveedores de servicio de la conexión, por lo que normalmente no
  cuentan como «compartir con terceros». Si Google te pide detallar las direcciones IP, descríbelas
  como datos técnicos de conexión que no se almacenan ni se usan para identificar a nadie.
- **Práctica de seguridad:** no se comprometió con la política «Familias» y no tiene revisión de
  seguridad independiente.

## Permisos que declara la app

| Permiso | Para qué |
|---|---|
| `INTERNET` | Conectar los celulares en la recepción por QR. |
| `CAMERA` | Leer el código QR del coordinador. Es opcional: la cámara no es obligatoria para usar la app. |

## Clasificación de contenido (cuestionario)

Responde «No» a violencia, sexo, drogas, lenguaje soez, juegos de azar, compras dentro de la app,
contenido generado por usuarios visible a otros y ubicación compartida. Es una herramienta de
productividad, sin chat ni red social.

## Notas para el revisor de Google (campo «Instrucciones de acceso»)

```
La app no requiere cuenta ni inicio de sesión. Todas las funciones están disponibles al abrirla.

Para probar el flujo principal: llene el formulario (nombre de unidad, cantidades) y toque GUARDAR; luego REPORTE para ver el consolidado.

Función «Recibir por QR» (opcional, requiere dos dispositivos): en el dispositivo A toque RECIBIR POR QR para mostrar un código; en el dispositivo B toque ENVIAR MI PARTE (ESCANEAR QR), apunte la cámara al código y envíe un parte; en A aparece como «Por aprobar».

La cámara se usa solo para leer ese código QR.
```

## Pasos finales en Play Console

1. Crear la app → subir `app-release.aab` a **Pruebas internas**.
2. Completar: ficha de la tienda, política de privacidad, seguridad de los datos, clasificación,
   público objetivo, anuncios y acceso a la app (con los datos de arriba).
3. Probar con tus testers y, si todo va bien, pasar a **Producción** (o a prueba cerrada si tu cuenta
   lo exige).
