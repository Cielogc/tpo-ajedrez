import { Color } from './models/Color.js';
import { Position } from './models/Position.js';
import { MoveCommand } from './commands/MoveCommand.js';
import { CastlingCommand } from './commands/CastlingCommand.js';
import { EnPassantCommand } from './commands/EnPassantCommand.js';
import { PromotionCommand } from './commands/PromotionCommand.js';
import { StandardBoardFactory } from './factories/StandardBoardFactory.js';

const PROMOTION_TYPES = ['QUEEN', 'ROOK', 'BISHOP', 'KNIGHT'];
const FEN_LETTERS = { PAWN: 'p', ROOK: 'r', KNIGHT: 'n', BISHOP: 'b', QUEEN: 'q', KING: 'k' };
const opponentOf = color => color === Color.WHITE ? Color.BLACK : Color.WHITE;
const homeRowOf = color => color === Color.WHITE ? 7 : 0;
const squareName = pos => `${String.fromCharCode(97 + pos.col)}${8 - pos.row}`;

export class ChessGame {
  constructor(notifier = null) {
    this.notifier = notifier;
    this.restart();
  }

  restart() {
    this.board = StandardBoardFactory.createInitialBoard();
    this.currentTurn = Color.WHITE;
    this.history = [];
    // Posiciones por las que pasó la partida, para detectar la triple repetición
    this.positionKeys = [this.getPositionKey()];
  }

  getCurrentTurn() {
    return this.currentTurn;
  }

  getPieceAt(position) {
    return this.board.getPieceAt(position);
  }

  isPromotion(fromPos, toPos) {
    const piece = this.board.getPieceAt(fromPos);
    return piece?.type === 'PAWN' && (toPos.row === 0 || toPos.row === 7);
  }

  // Un rey o una torre que ya se movió pierde el derecho a enrocar
  hasMoved(piece) {
    return this.history.some(command => command.movedPiece === piece || command.rook === piece);
  }

  // Derechos de enroque en formato FEN: K/Q blancas, k/q negras, '-' si no queda ninguno
  getCastlingRights() {
    let rights = '';
    for (const color of [Color.WHITE, Color.BLACK]) {
      const row = homeRowOf(color);
      const king = this.board.getPieceAt(new Position(row, 4));
      if (king?.type !== 'KING' || king.color !== color || this.hasMoved(king)) continue;

      for (const [col, side] of [[7, 'k'], [0, 'q']]) {
        const rook = this.board.getPieceAt(new Position(row, col));
        if (rook?.type === 'ROOK' && rook.color === color && !this.hasMoved(rook)) {
          rights += color === Color.WHITE ? side.toUpperCase() : side;
        }
      }
    }
    return rights || '-';
  }

  getCastlingMoves(kingPos, king) {
    const row = homeRowOf(king.color);
    if (kingPos.row !== row || kingPos.col !== 4 || this.board.isKingInCheck(king.color)) return [];

    const rights = this.getCastlingRights();
    const enemy = opponentOf(king.color);
    const moves = [];
    // [lado, columnas que deben estar vacías, columnas que cruza el rey, destino del rey]
    for (const [side, empty, crossed, kingCol] of [['k', [5, 6], [5, 6], 6], ['q', [1, 2, 3], [3, 2], 2]]) {
      if (!rights.includes(king.color === Color.WHITE ? side.toUpperCase() : side)) continue;
      if (empty.some(col => this.board.getPieceAt(new Position(row, col)))) continue;
      if (crossed.some(col => this.board.isSquareAttacked(new Position(row, col), enemy))) continue;
      moves.push(new Position(row, kingCol));
    }
    return moves;
  }

  // Casilla salteada por un peón que acaba de avanzar dos lugares
  getEnPassantTarget() {
    const last = this.history.at(-1);
    if (!last || last.movedPiece.type !== 'PAWN' || Math.abs(last.from.row - last.to.row) !== 2) return null;
    return new Position((last.from.row + last.to.row) / 2, last.to.col);
  }

  // Movimientos según la estrategia de la pieza, más los especiales que dependen de la partida
  getCandidateMoves(fromPos, piece) {
    const moves = piece.getValidMoves(fromPos, this.board);

    if (piece.type === 'KING') moves.push(...this.getCastlingMoves(fromPos, piece));

    const target = piece.type === 'PAWN' && piece.color === this.currentTurn && this.getEnPassantTarget();
    const direction = piece.color === Color.WHITE ? -1 : 1;
    if (target && target.row === fromPos.row + direction && Math.abs(target.col - fromPos.col) === 1) moves.push(target);

    return moves;
  }

  // Elige el comando según el tipo de jugada
  createCommand(fromPos, toPos, promotion = 'QUEEN') {
    const piece = this.board.getPieceAt(fromPos);
    if (piece.type === 'KING' && Math.abs(toPos.col - fromPos.col) === 2) return new CastlingCommand(this.board, fromPos, toPos);
    if (piece.type === 'PAWN' && toPos.col !== fromPos.col && !this.board.getPieceAt(toPos)) return new EnPassantCommand(this.board, fromPos, toPos);
    if (this.isPromotion(fromPos, toPos)) return new PromotionCommand(this.board, fromPos, toPos, promotion);
    return new MoveCommand(this.board, fromPos, toPos);
  }

  // Destinos de la pieza que no dejan al propio rey en jaque
  getLegalMovesFrom(fromPos) {
    const piece = this.board.getPieceAt(fromPos);
    if (!piece) return [];

    return this.getCandidateMoves(fromPos, piece).filter(toPos => {
      const command = this.createCommand(fromPos, toPos);
      command.execute();
      const leavesKingInCheck = this.board.isKingInCheck(piece.color);
      command.undo();
      return !leavesKingInCheck;
    });
  }

  // Destinos legales con lo que la interfaz necesita para señalarlos
  getLegalMoveDetails(fromPos) {
    return this.getLegalMovesFrom(fromPos).map(toPos => {
      const command = this.createCommand(fromPos, toPos);
      return {
        to: toPos,
        capture: Boolean(this.board.getPieceAt(toPos) || command.enPassant),
        castling: command.castling ?? null,
        rookFrom: command.rookFrom ?? null,
        rookTo: command.rookTo ?? null,
        enPassant: Boolean(command.enPassant),
        capturePosition: command.capturePosition ?? null,
        promotion: command instanceof PromotionCommand
      };
    });
  }

  // Todas las jugadas legales del turno actual como { from, to } (más promotion al coronar)
  getLegalMoves() {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const fromPos = new Position(r, c);
        const piece = this.board.getPieceAt(fromPos);
        if (!piece || piece.color !== this.currentTurn) continue;

        for (const toPos of this.getLegalMovesFrom(fromPos)) {
          if (this.isPromotion(fromPos, toPos)) {
            for (const promotion of PROMOTION_TYPES) moves.push({ from: fromPos, to: toPos, promotion });
          } else {
            moves.push({ from: fromPos, to: toPos });
          }
        }
      }
    }
    return moves;
  }

  // Jugadas seguidas sin mover un peón ni capturar (regla de los 50 movimientos)
  getHalfmoveClock() {
    let count = 0;
    for (let i = this.history.length - 1; i >= 0; i--) {
      const command = this.history[i];
      if (command.movedPiece.type === 'PAWN' || command.capturedPiece) break;
      count++;
    }
    return count;
  }

  // Nadie puede dar mate: reyes solos, un alfil o caballo, o solo alfiles del mismo color de casilla
  hasInsufficientMaterial() {
    const minors = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board.grid[r][c];
        if (!piece || piece.type === 'KING') continue;
        if (piece.type !== 'BISHOP' && piece.type !== 'KNIGHT') return false;
        minors.push({ type: piece.type, squareColor: (r + c) % 2 });
      }
    }
    if (minors.length <= 1) return true;
    return minors.every(m => m.type === 'BISHOP' && m.squareColor === minors[0].squareColor);
  }

  // Tablas por reglamento, que no dependen de quedarse sin jugadas
  getDrawReason() {
    if (this.hasInsufficientMaterial()) return 'INSUFFICIENT_MATERIAL';
    if (this.getHalfmoveClock() >= 100) return 'FIFTY_MOVES';
    const current = this.positionKeys.at(-1);
    if (this.positionKeys.filter(key => key === current).length >= 3) return 'THREEFOLD_REPETITION';
    return null;
  }

  // null mientras la partida sigue; si no, CHECKMATE, STALEMATE o el motivo de las tablas
  getOutcome() {
    if (this.getLegalMoves().length === 0) {
      return this.board.isKingInCheck(this.currentTurn) ? 'CHECKMATE' : 'STALEMATE';
    }
    return this.getDrawReason();
  }

  // Notación FEN de la posición (la usa la IA y, sin los contadores, la triple repetición)
  toFen() {
    const rows = this.board.grid.map(row => {
      let fen = '', empty = 0;
      for (const piece of row) {
        if (!piece) { empty++; continue; }
        if (empty) { fen += empty; empty = 0; }
        fen += piece.color === Color.WHITE ? FEN_LETTERS[piece.type].toUpperCase() : FEN_LETTERS[piece.type];
      }
      return fen + (empty || '');
    });

    // Al paso solo cuenta si algún peón puede capturar de verdad: si no, la posición es la misma
    const target = this.getEnPassantTarget();
    const enPassant = target && [-1, 1].some(dc => {
      const from = new Position(target.row + (this.currentTurn === Color.WHITE ? 1 : -1), target.col + dc);
      return this.board.getPieceAt(from)?.type === 'PAWN' && this.getLegalMovesFrom(from).some(m => m.equals(target));
    });

    const turn = this.currentTurn === Color.WHITE ? 'w' : 'b';
    return `${rows.join('/')} ${turn} ${this.getCastlingRights()} ${enPassant ? squareName(target) : '-'} ${this.getHalfmoveClock()} ${Math.floor(this.history.length / 2) + 1}`;
  }

  getPositionKey() {
    return this.toFen().split(' ').slice(0, 4).join(' ');
  }

  makeMove(fromPos, toPos, promotion = 'QUEEN') {
    const piece = this.board.getPieceAt(fromPos);

    if (!piece || piece.color !== this.currentTurn || this.getDrawReason() || !PROMOTION_TYPES.includes(promotion)) {
      return false;
    }

    // getLegalMovesFrom ya descarta lo que deja al rey en jaque
    if (!this.getLegalMovesFrom(fromPos).some(m => m.equals(toPos))) return false;

    const command = this.createCommand(fromPos, toPos, promotion);
    command.execute();

    this.history.push(command);
    this.currentTurn = opponentOf(this.currentTurn);
    this.positionKeys.push(this.getPositionKey());
    this.notifyCheckState();

    return true;
  }

  undoLastMove() {
    const command = this.history.pop();
    if (!command) return;

    command.undo();
    this.positionKeys.pop();
    this.currentTurn = opponentOf(this.currentTurn);
    this.notifyCheckState();
  }

  notifyCheckState() {
    if (!this.notifier) return;
    if (this.board.isKingInCheck(this.currentTurn)) this.notifier.notifyCheck(this.currentTurn);
    else this.notifier.clearCheck();
  }
}
