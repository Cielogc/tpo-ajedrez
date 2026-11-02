import { ChessGame } from './core/ChessGame.js';
import { WebAdapter } from './adapters/WebAdapter.js';
import { GroqAIPlayer } from './adapters/GroqAIPlayer.js';

// El dominio conserva las reglas; el adaptador sincroniza ambas vistas y delega en la IA cuando le toca.
const game = new ChessGame();
new WebAdapter(game, new GroqAIPlayer());
