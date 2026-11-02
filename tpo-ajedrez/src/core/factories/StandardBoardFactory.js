import { Board } from '../models/Board.js';
import { Piece } from '../models/Piece.js';
import { Position } from '../models/Position.js';
import { Color } from '../models/Color.js';

import { RookStrategy } from '../strategies/RookStrategy.js';
import { KnightStrategy } from '../strategies/KnightStrategy.js';
import { BishopStrategy } from '../strategies/BishopStrategy.js';
import { QueenStrategy } from '../strategies/QueenStrategy.js';
import { KingStrategy } from '../strategies/KingStrategy.js';
import { PawnStrategy } from '../strategies/PawnStrategy.js';

export class StandardBoardFactory {
  static createInitialBoard() {
    const board = new Board();

    const rookStrat = new RookStrategy();
    const knightStrat = new KnightStrategy();
    const bishopStrat = new BishopStrategy();
    const queenStrat = new QueenStrategy();
    const kingStrat = new KingStrategy();
    const pawnStrat = new PawnStrategy();

    // Piezas Negras (Fila 0 y 1)
    board.setPieceAt(new Position(0, 0), new Piece('ROOK', Color.BLACK, rookStrat, '♜'));
    board.setPieceAt(new Position(0, 1), new Piece('KNIGHT', Color.BLACK, knightStrat, '♞'));
    board.setPieceAt(new Position(0, 2), new Piece('BISHOP', Color.BLACK, bishopStrat, '♝'));
    board.setPieceAt(new Position(0, 3), new Piece('QUEEN', Color.BLACK, queenStrat, '♛'));
    board.setPieceAt(new Position(0, 4), new Piece('KING', Color.BLACK, kingStrat, '♚'));
    board.setPieceAt(new Position(0, 5), new Piece('BISHOP', Color.BLACK, bishopStrat, '♝'));
    board.setPieceAt(new Position(0, 6), new Piece('KNIGHT', Color.BLACK, knightStrat, '♞'));
    board.setPieceAt(new Position(0, 7), new Piece('ROOK', Color.BLACK, rookStrat, '♜'));

    for (let c = 0; c < 8; c++) {
      board.setPieceAt(new Position(1, c), new Piece('PAWN', Color.BLACK, pawnStrat, '♟'));
    }

    // Piezas Blancas (Fila 6 y 7)
    for (let c = 0; c < 8; c++) {
      board.setPieceAt(new Position(6, c), new Piece('PAWN', Color.WHITE, pawnStrat, '♙'));
    }

    board.setPieceAt(new Position(7, 0), new Piece('ROOK', Color.WHITE, rookStrat, '♖'));
    board.setPieceAt(new Position(7, 1), new Piece('KNIGHT', Color.WHITE, knightStrat, '♘'));
    board.setPieceAt(new Position(7, 2), new Piece('BISHOP', Color.WHITE, bishopStrat, '♗'));
    board.setPieceAt(new Position(7, 3), new Piece('QUEEN', Color.WHITE, queenStrat, '♕'));
    board.setPieceAt(new Position(7, 4), new Piece('KING', Color.WHITE, kingStrat, '♔'));
    board.setPieceAt(new Position(7, 5), new Piece('BISHOP', Color.WHITE, bishopStrat, '♗'));
    board.setPieceAt(new Position(7, 6), new Piece('KNIGHT', Color.WHITE, knightStrat, '♘'));
    board.setPieceAt(new Position(7, 7), new Piece('ROOK', Color.WHITE, rookStrat, '♖'));

    return board;
  }
}
