import { MoveCommand } from './MoveCommand.js';
import { PieceFactory } from '../factories/PieceFactory.js';

// Coronación: el peón que llega a la última fila se reemplaza por la pieza elegida
export class PromotionCommand extends MoveCommand {
  constructor(board, fromPosition, toPosition, promotionType) {
    super(board, fromPosition, toPosition);
    this.promotionType = promotionType;
    this.promotedPiece = null;
  }

  execute() {
    super.execute();
    this.promotedPiece ??= PieceFactory.create(this.promotionType, this.movedPiece.color);
    this.board.setPieceAt(this.to, this.promotedPiece);
  }

  // MoveCommand.undo ya devuelve el peón a su origen y la pieza capturada a su casilla
}
