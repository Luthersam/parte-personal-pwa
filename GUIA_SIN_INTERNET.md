# Modo sin internet (códigos QR entre celulares)

Funciona **sin Wi-Fi, sin datos móviles y sin servidor**: los celulares se pasan el parte
mostrándose códigos QR con la cámara. El modo con internet («Recibir por QR» / «Enviar mi parte»)
sigue igual y es el que conviene usar cuando hay conexión.

## Cómo se usa

**La unidad (quien envía):**
1. En la pantalla principal toca **ENVIAR SIN INTERNET**.
2. Llena el parte (unidad, cantidades, nombres) y toca **GENERAR CÓDIGOS PARA EL COORDINADOR**.
3. Muestra el celular al coordinador. Los códigos avanzan solos (uno cada 1,5 segundos); con
   **Anterior** y **Siguiente** puedes moverlos a mano.
4. Cuando el coordinador termine de escanear, toca **YA LOS MOSTRÉ: ESPERAR CONFIRMACIÓN**.
5. Escanea los códigos de confirmación que muestra el coordinador. Verás «Parte aprobado», o el
   motivo si lo rechazó (tu formulario se conserva para corregir y reenviar).

**El coordinador (quien recibe):**
1. En la pantalla principal toca **RECIBIR SIN INTERNET**.
2. Toca **ESCANEAR PARTE** y apunta la cámara a los códigos de la unidad hasta que aparezca
   «Recibido: NOMBRE DE LA UNIDAD».
3. Revisa la tarjeta en **Por aprobar** y toca **APROBAR** o **RECHAZAR** (con motivo).
4. La app muestra la **confirmación** en códigos: la unidad debe escanearla. Toca
   **LISTO, SIGUIENTE** cuando termine.
5. Los partes aprobados se suman al consolidado, como en el modo con internet.

## Detalles útiles

- Un parte pequeño cabe en 1 o 2 códigos; uno con 40 nombres necesita unos 4.
- No importa el orden ni si un código se lee dos veces: la app los junta y verifica que el parte
  llegó completo y sin errores. Si se lee mal, pide escanear de nuevo.
- Los códigos de la unidad y los de confirmación son distintos, y cada uno vale solo para su parte.
- Para que la cámara lea bien: pantalla con brillo alto, el celular quieto y a unos 20-30 cm.
- La cámara solo se usa para leer estos códigos; no se guarda ninguna imagen.
- El modo sin internet no necesita el servicio de conexión de PeerJS: no envía nada a ningún servidor.
