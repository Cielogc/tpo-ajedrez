import { Board } from '../models/Board.js';
import { Position } from '../models/Position.js';
import { Color } from '../models/Color.js';
import { PieceFactory } from './PieceFactory.js';

const backRank = ['ROOK', 'KNIGHT', 'BISHOP', 'QUEEN', 'KING', 'BISHOP', 'KNIGHT', 'ROOK'];

export class StandardBoardFactory {
  static createInitialBoard() {
    const board = new Board();

    for (let c = 0; c < 8; c++) {
      // Piezas Negras (Fila 0 y 1)
      board.setPieceAt(new Position(0, c), PieceFactory.create(backRank[c], Color.BLACK));
      board.setPieceAt(new Position(1, c), PieceFactory.create('PAWN', Color.BLACK));

      // Piezas Blancas (Fila 6 y 7)
      board.setPieceAt(new Position(6, c), PieceFactory.create('PAWN', Color.WHITE));
      board.setPieceAt(new Position(7, c), PieceFactory.create(backRank[c], Color.WHITE));
    }

    return board;
  }
}
