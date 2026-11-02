# TPO Ajedrez · 3D

Ajedrez local para dos jugadores con tablero y piezas modeladas en Three.js, luz, sombras y una mesa de madera generada por código. El núcleo de reglas conserva su arquitectura original.

## Ejecutar

Requiere Node.js 18 o superior.

```sh
npm install
npm start
```

Abrí http://localhost:3000. Si el puerto está ocupado: `PORT=3001 npm start`.

## Jugar contra la IA

La IA usa un modelo de [Groq](https://console.groq.com). Creá un archivo `.env` en esta carpeta (ya está en `.gitignore`, no lo subas):

```sh
GROQ_API_KEY=tu_api_key
# Opcional, por defecto openai/gpt-oss-120b
GROQ_MODEL=openai/gpt-oss-120b
# Opcional: low (por defecto, ~850 tokens por jugada) o medium (juega más fuerte, gasta ~3 veces más)
GROQ_REASONING=low
```

El plan gratuito de Groq limita los tokens por minuto y por día. Si se alcanza el límite por minuto, el servidor espera lo que Groq indique y reintenta; la consola del servidor muestra cuántos tokens usa cada jugada.

Tocá **Partida local / Dos jugadores** en el encabezado para pasar a **Contra la IA**. El juego te pide tu nombre (queda guardado en el navegador): jugás con blancas y la IA responde con negras, tirándote una chicana argentina con tu nombre en cada jugada, que aparece arriba del tablero como «Tu rival dice». La key se queda en el servidor (`scripts/ai-move.js`); el navegador solo envía la posición y las jugadas legales. Si Groq no responde, la IA juega una movida legal al azar y lo avisa en pantalla. Contra la IA, **Deshacer jugada** retrocede tu jugada y la respuesta.

## Controles

- Seleccioná una pieza y después una casilla marcada para mover.
- Arrastrá sobre el tablero para girar la cámara; usá la rueda o el gesto de pinza para acercar.
- **2D / 3D** alterna entre la cámara superior y la perspectiva.
- **↻** cambia el lado del tablero; **⌖** restablece la cámara.
- **Deshacer jugada** y **Nueva partida** controlan la partida.
- Con el tablero enfocado, usá las flechas y Enter o Espacio para seleccionar casillas.

Los movimientos se animan suavemente y los caballos saltan. Al capturar, la pieza rival se desvanece con partículas doradas y un anillo sobre la casilla. Deshacer también anima el regreso; reiniciar limpia cualquier efecto en curso. Se respeta la preferencia de movimiento reducido del sistema.

Si WebGL no está disponible, se muestra automáticamente un tablero clásico con botones accesibles. Las fuentes tienen alternativas locales.

Las reglas están completas: enroque (mové el rey dos casillas), captura al paso, coronación (elegís dama, torre, alfil o caballo), jaque mate, y tablas por ahogado, triple repetición, regla de los 50 movimientos y material insuficiente.
