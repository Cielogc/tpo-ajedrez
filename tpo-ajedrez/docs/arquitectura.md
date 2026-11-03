# Arquitectura Hexagonal en el TPO de Ajedrez

**La idea:** el núcleo con las reglas del ajedrez no sabe nada del mundo exterior.
No sabe si lo dibujan en 3D, si lo imprimen en consola o si del otro lado juega
una IA. Esa lógica queda *protegida*: todo lo de afuera entra y sale por
**puertos**, y cada tecnología concreta es un **adaptador** enchufable.

```
                          Main  (src/main.js)
              Raíz de composición e inyección de dependencias
                                  │
            ┌─────────────────── Adaptadores ───────────────────┐
            │                   Puertos                         │
            │        ┌────────────┐   ┌────────────┐            │
            │        │  ChessGame │   │ ChessEngine│            │
            │        └────────────┘   └────────────┘            │
  Vista 3D ─┤              ┌─────────────────┐            ├─ Motor / IA
 (Three.js) │              │  Núcleo (Core)  │            │   (Groq)
            │              │ Lógica pura de  │            │
            │              │     ajedrez.    │            │
            │              │ Cero dependencias            │
            │              │ de infraestructura.          │
            │              └─────────────────┘            │
            └──────────────────── Consola ─────────────────────┘
```

## 🟧 Núcleo (Core) — `src/core/`

Lógica pura de ajedrez, **cero dependencias de infraestructura** (no importa
Three.js, ni `fetch`, ni el DOM).

- `ChessGame.js` — el motor de reglas (turnos, jugadas legales, jaque mate,
  tablas, FEN, historial).
- `models/` — `Board`, `Piece`, `Position`, `Color`.
- `strategies/` — cómo se mueve cada pieza (peón, torre, caballo, alfil, dama, rey).
- `commands/` — cada tipo de jugada (`Move`, `Castling`, `EnPassant`,
  `Promotion`), que además permite deshacer.
- `factories/` — arman el tablero y las piezas iniciales.

## 🔵 Puertos — los contratos

- **Puerto de juego** (`ChessGame`) = la API pública de `ChessGame`
  (`getLegalMoves()`, `move()`, `toFen()`, `undo()`…). Es lo que cualquier
  adaptador consume para jugar.
- **Puerto del motor / rival** (`ChessEngine`) = el contrato
  `chooseMove(game, opciones)`. Cualquier "cerebro" que respete esa firma sirve,
  sin tocar el núcleo. En un diseño clásico eso lo cumple Stockfish; acá lo
  implementa Groq.
- **Puerto de notificación** = el `notifier` que recibe `ChessGame` en su
  constructor, para avisar eventos hacia afuera.

## 🔷 Adaptadores — `src/adapters/`, `src/view/`, `scripts/`

- **GUI / Vista 3D** → `view/ChessScene.js` (Three.js: tablero, piezas, cámara,
  animaciones) + `adapters/WebAdapter.js`, que conecta los clics y el tablero con
  el núcleo.
- **Motor / Rival IA** → `adapters/GroqAIPlayer.js`, que implementa el puerto del
  motor pidiéndole la jugada al servidor (`scripts/ai-move.js` → API de Groq).
- La "Consola" del diagrama representa que el mismo núcleo podría salir por otro
  adaptador —por ejemplo el tablero 2D accesible de respaldo— sin cambiar una
  línea de las reglas.

## ⬛ Main — raíz de composición e inyección de dependencias — `src/main.js`

Acá se **arma** todo y se inyectan las piezas (*dependency injection*):

```js
const game = new ChessGame();
new WebAdapter(game, new GroqAIPlayer());
```

`main.js` es el único lugar que conoce a todos: crea el núcleo y le enchufa los
adaptadores. Si mañana cambiás Groq por Stockfish, o la vista 3D por una consola,
**solo tocás el `main.js` y el adaptador nuevo**; el núcleo con las reglas no se
entera.

> Al dominio le da igual si lo están *dibujando en una pantalla* (Three.js) o
> *jugando contra una IA* (Groq). Las reglas del ajedrez viven en un solo lugar,
> blindadas.
