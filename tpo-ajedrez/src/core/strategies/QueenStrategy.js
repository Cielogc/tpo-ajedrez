import { Position } from '../models/Position.js';

export class QueenStrategy {
  getValidMoves(position, board, color) {
    const moves = [];
    const directions = [
      { r: 1, c: 0 }, { r: -1, c: 0 }, { r: 0, c: 1 }, { r: 0, c: -1 },
      { r: 1, c: 1 }, { r: 1, c: -1 }, { r: -1, c: 1 }, { r: -1, c: -1 }
    ];

    for (const dir of directions) {
      let r = position.row + dir.r;
      let c = position.col + dir.c;

      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const targetPos = new Position(r, c);
        const targetPiece = board.getPieceAt(targetPos);

        if (!targetPiece) {
          moves.push(targetPos);
        } else {
          if (targetPiece.color !== color) moves.push(targetPos);
          break;
        }
        r += dir.r;
        c += dir.c;
      }
    }
    return moves;
  }
}
