import { Position } from '../models/Position.js';

export class KingStrategy {
  getValidMoves(position, board, color) {
    const moves = [];
    const offsets = [
      { r: -1, c: -1 }, { r: -1, c: 0 }, { r: -1, c: 1 },
      { r: 0, c: -1 },                  { r: 0, c: 1 },
      { r: 1, c: -1 },  { r: 1, c: 0 },  { r: 1, c: 1 }
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
