import { Position } from '../models/Position.js';

export class KnightStrategy {
  getValidMoves(position, board, color) {
    const moves = [];
    const offsets = [
      { r: -2, c: -1 }, { r: -2, c: 1 }, { r: -1, c: -2 }, { r: -1, c: 2 },
      { r: 1, c: -2 }, { r: 1, c: 2 }, { r: 2, c: -1 }, { r: 2, c: 1 }
    ];

    for (const off of offsets) {
      const targetPos = new Position(position.row + off.r, position.col + off.c);
      if (targetPos.isValid()) {
        const targetPiece = board.getPieceAt(targetPos);
        if (!targetPiece || targetPiece.color !== color) {
          moves.push(targetPos);
        }
      }
    }
    return moves;
  }
}
