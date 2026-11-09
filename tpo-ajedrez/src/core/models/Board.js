import { Color } from './Color.js';
import { Position } from './Position.js';

export class Board {
  constructor() {
    this.grid = Array(8).fill(null).map(() => Array(8).fill(null));
  }

  getPieceAt(position) {
    if (!position.isValid()) return null;
    return this.grid[position.row][position.col];
  }

  setPieceAt(position, piece) {
    if (position.isValid()) {
      this.grid[position.row][position.col] = piece;
    }
  }

  findKingPosition(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.grid[r][c];
        if (piece && piece.type === 'KING' && piece.color === color) {
          return new Position(r, c);
        }
      }
    }
    return null;
  }

  // ¿Alguna pieza de byColor ataca la casilla? Sirve también para casillas vacías (enroque)
  isSquareAttacked(position, byColor) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.grid[r][c];
        if (!piece || piece.color !== byColor) continue;

        if (piece.type === 'PAWN') {
          // El peón ataca en diagonal aunque la casilla esté vacía; su avance no es un ataque
          const direction = byColor === Color.WHITE ? -1 : 1;
          if (position.row === r + direction && Math.abs(position.col - c) === 1) return true;
        } else if (piece.getValidMoves(new Position(r, c), this).some(m => m.equals(position))) {
          return true;
        }
      }
    }
    return false;
  }

  isKingInCheck(color) {
    const kingPos = this.findKingPosition(color);
    if (!kingPos) return false;

    const opponentColor = color === Color.WHITE ? Color.BLACK : Color.WHITE;
    return this.isSquareAttacked(kingPos, opponentColor);
  }
}
