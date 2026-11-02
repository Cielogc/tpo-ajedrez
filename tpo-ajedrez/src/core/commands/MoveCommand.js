export class MoveCommand {
  constructor(board, fromPosition, toPosition) {
    this.board = board;
    this.from = fromPosition;
    this.to = toPosition;
    this.movedPiece = null;
    this.capturedPiece = null;
  }

  execute() {
    this.movedPiece = this.board.getPieceAt(this.from);
    this.capturedPiece = this.board.getPieceAt(this.to);

    this.board.setPieceAt(this.to, this.movedPiece);
    this.board.setPieceAt(this.from, null);
  }

  undo() {
    this.board.setPieceAt(this.from, this.movedPiece);
    this.board.setPieceAt(this.to, this.capturedPiece);
  }
}
