import { MoveCommand } from './MoveCommand.js';
import { Position } from '../models/Position.js';

// Captura al paso: el peón capturado está al costado del origen, no en el destino
export class EnPassantCommand extends MoveCommand {
  constructor(board, fromPosition, toPosition) {
    super(board, fromPosition, toPosition);
    this.capturePosition = new Position(fromPosition.row, toPosition.col);
    this.enPassant = true;
  }

  execute() {
    super.execute();
    this.capturedPiece = this.board.getPieceAt(this.capturePosition);
    this.board.setPieceAt(this.capturePosition, null);
  }

  undo() {
    this.board.setPieceAt(this.from, this.movedPiece);
    this.board.setPieceAt(this.to, null);
    this.board.setPieceAt(this.capturePosition, this.capturedPiece);
  }
}
