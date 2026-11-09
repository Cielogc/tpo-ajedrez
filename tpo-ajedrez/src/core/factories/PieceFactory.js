import { Piece } from '../models/Piece.js';
import { Color } from '../models/Color.js';

import { RookStrategy } from '../strategies/RookStrategy.js';
import { KnightStrategy } from '../strategies/KnightStrategy.js';
import { BishopStrategy } from '../strategies/BishopStrategy.js';
import { QueenStrategy } from '../strategies/QueenStrategy.js';
import { KingStrategy } from '../strategies/KingStrategy.js';
import { PawnStrategy } from '../strategies/PawnStrategy.js';

// Las estrategias no guardan estado, así que todas las piezas de un tipo comparten la misma instancia
const strategies = {
  PAWN: new PawnStrategy(),
  ROOK: new RookStrategy(),
  KNIGHT: new KnightStrategy(),
  BISHOP: new BishopStrategy(),
  QUEEN: new QueenStrategy(),
  KING: new KingStrategy()
};

const symbols = {
  [Color.WHITE]: { PAWN: '♙', ROOK: '♖', KNIGHT: '♘', BISHOP: '♗', QUEEN: '♕', KING: '♔' },
  [Color.BLACK]: { PAWN: '♟', ROOK: '♜', KNIGHT: '♞', BISHOP: '♝', QUEEN: '♛', KING: '♚' }
};

export class PieceFactory {
  static create(type, color) {
    return new Piece(type, color, strategies[type], symbols[color][type]);
  }

  static symbolOf(type, color) {
    return symbols[color][type];
  }
}
