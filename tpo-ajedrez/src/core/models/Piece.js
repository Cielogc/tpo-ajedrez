export class Piece {
  constructor(type, color, movementStrategy, symbol) {
    this.type = type; // 'PAWN', 'ROOK', 'KNIGHT', 'BISHOP', 'QUEEN', 'KING'
    this.color = color;
    this.movementStrategy = movementStrategy;
    this.symbol = symbol;
  }

  getValidMoves(position, board) {
    return this.movementStrategy.getValidMoves(position, board, this.color);
  }
}
