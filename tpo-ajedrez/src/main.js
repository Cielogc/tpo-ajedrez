import { ChessGame } from './core/ChessGame.js';
import { WebAdapter } from './adapters/WebAdapter.js';

// Puerto de Salida / Notificaciones para la Web
const webNotifier = {
  notifyCheck: (color) => {
    const alert = document.getElementById('check-alert');
    if (alert) {
      alert.textContent = `¡JAQUE AL REY ${color}!`;
      alert.style.display = 'block';
    }
  },
  clearCheck: () => {
    const alert = document.getElementById('check-alert');
    if (alert) {
      alert.style.display = 'none';
    }
  }
};

// Instanciar Dominio (Núcleo) con la inyección del notificador
const game = new ChessGame(webNotifier);

// Instanciar Adaptador de Interfaz Web (Driving Adapter)
new WebAdapter(game);

console.log("Juego de Ajedrez Hexagonal iniciado correctamente en la Web.");
