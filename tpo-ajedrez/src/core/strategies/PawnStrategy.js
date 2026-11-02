import { Position } from '../models/Position.js';
import { Color } from '../models/Color.js';

export class PawnStrategy {
  getValidMoves(position, board, color) {
    const moves = [];
    const direction = color === Color.WHITE ? -1 : 1;
    const startRow = color === Color.WHITE ? 6 : 1;

    // Avance 1 casillero
    const forwardPos = new Position(position.row + direction, position.col);
    if (forwardPos.isValid() && !board.getPieceAt(forwardPos)) {
      moves.push(forwardPos);

      // Avance 2 casilleros si está en la fila inicial
      const doubleForward = new Position(position.row + (2 * direction), position.col);
      if (position.row === startRow && !board.getPieceAt(doubleForward)) {
        moves.push(doubleForward);
      }
    }

    // Capturas diagonales
    const captureCols = [position.col - 1, position.col + 1];
    for (const c of captureCols) {
      const diagPos = new Position(position.row + direction, c);
      if (diagPos.isValid()) {
        const targetPiece = board.getPieceAt(diagPos);
        if (targetPiece && targetPiece.color !== color) {
          moves.push(diagPos);
        }
      }
    }

    return moves;
  }
}
