import { MoveCommand } from './MoveCommand.js';
import { Position } from '../models/Position.js';

// Enroque: el rey avanza dos casillas y la torre salta a su lado
export class CastlingCommand extends MoveCommand {
  constructor(board, kingFrom, kingTo) {
    super(board, kingFrom, kingTo);
    const kingside = kingTo.col > kingFrom.col;
    this.rookFrom = new Position(kingFrom.row, kingside ? 7 : 0);
    this.rookTo = new Position(kingFrom.row, kingside ? 5 : 3);
    this.castling = kingside ? 'O-O' : 'O-O-O';
    this.rook = null;
  }

  execute() {
    super.execute();
    this.rook = this.board.getPieceAt(this.rookFrom);
    this.board.setPieceAt(this.rookTo, this.rook);
    this.board.setPieceAt(this.rookFrom, null);
  }

  undo() {
    this.board.setPieceAt(this.rookFrom, this.rook);
    this.board.setPieceAt(this.rookTo, null);
    super.undo();
  }
}
