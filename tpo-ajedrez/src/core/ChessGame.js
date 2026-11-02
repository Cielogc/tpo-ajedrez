import { Color } from './models/Color.js';
import { MoveCommand } from './commands/MoveCommand.js';
import { StandardBoardFactory } from './factories/StandardBoardFactory.js';

export class ChessGame {
  constructor(notifier = null) {
    this.notifier = notifier;
    this.restart();
  }

  restart() {
    this.board = StandardBoardFactory.createInitialBoard();
    this.currentTurn = Color.WHITE;
    this.history = [];
  }

  getCurrentTurn() {
    return this.currentTurn;
  }

  getPieceAt(position) {
    return this.board.getPieceAt(position);
  }

  makeMove(fromPos, toPos) {
    const piece = this.board.getPieceAt(fromPos);

    if (!piece || piece.color !== this.currentTurn) {
      return false;
    }

    const validMoves = piece.getValidMoves(fromPos, this.board);
    const isValid = validMoves.some(m => m.equals(toPos));

    if (!isValid) return false;

    const command = new MoveCommand(this.board, fromPos, toPos);
    command.execute();

    if (this.board.isKingInCheck(this.currentTurn)) {
      command.undo(); // Movimiento ilegal por Jaque
      return false;
    }

    this.history.push(command);
    this.currentTurn = this.currentTurn === Color.WHITE ? Color.BLACK : Color.WHITE;

    if (this.board.isKingInCheck(this.currentTurn)) {
      if (this.notifier) this.notifier.notifyCheck(this.currentTurn);
    } else {
      if (this.notifier) this.notifier.clearCheck();
    }

    return true;
  }

  undoLastMove() {
    const command = this.history.pop();
    if (command) {
      command.undo();
      this.currentTurn = this.currentTurn === Color.WHITE ? Color.BLACK : Color.WHITE;

      if (this.board.isKingInCheck(this.currentTurn)) {
        if (this.notifier) this.notifier.notifyCheck(this.currentTurn);
      } else {
        if (this.notifier) this.notifier.clearCheck();
      }
    }
  }
}
