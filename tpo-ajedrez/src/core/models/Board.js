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

  isKingInCheck(color) {
    const kingPos = this.findKingPosition(color);
    if (!kingPos) return false;

    const opponentColor = color === Color.WHITE ? Color.BLACK : Color.WHITE;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.grid[r][c];
        if (piece && piece.color === opponentColor) {
          const currentPos = new Position(r, c);
          const moves = piece.getValidMoves(currentPos, this);
          if (moves.some(m => m.equals(kingPos))) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
