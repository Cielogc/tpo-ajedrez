import { Position } from '../core/models/Position.js';
import { Color } from '../core/models/Color.js';

export class WebAdapter {
  constructor(game) {
    this.game = game;
    this.selectedPosition = null;

    this.boardElement = document.getElementById('board');
    this.turnIndicator = document.getElementById('turn-indicator');
    this.checkAlert = document.getElementById('check-alert');
    this.historyElement = document.getElementById('history');
    this.undoBtn = document.getElementById('undo-btn');
    this.restartBtn = document.getElementById('restart-btn');

    this.initEvents();
    this.render();
  }

  initEvents() {
    this.undoBtn.addEventListener('click', () => {
      this.game.undoLastMove();
      this.selectedPosition = null;
      this.render();
    });

    this.restartBtn.addEventListener('click', () => {
      this.game.restart();
      this.selectedPosition = null;
      this.render();
    });
  }

  handleSquareClick(row, col) {
    const clickedPos = new Position(row, col);

    if (this.selectedPosition) {
      if (this.selectedPosition.equals(clickedPos)) {
        this.selectedPosition = null;
      } else {
        const moved = this.game.makeMove(this.selectedPosition, clickedPos);
        this.selectedPosition = null;
      }
    } else {
      const piece = this.game.getPieceAt(clickedPos);
      if (piece && piece.color === this.game.getCurrentTurn()) {
        this.selectedPosition = clickedPos;
      }
    }

    this.render();
  }

  render() {
    this.boardElement.innerHTML = '';
    const turn = this.game.getCurrentTurn();
    this.turnIndicator.textContent = turn === Color.WHITE ? 'BLANCAS' : 'NEGRAS';
    this.turnIndicator.style.color = turn === Color.WHITE ? '#ffffff' : '#aaaaaa';

    let validMoves = [];
    if (this.selectedPosition) {
      const piece = this.game.getPieceAt(this.selectedPosition);
      if (piece) {
        validMoves = piece.getValidMoves(this.selectedPosition, this.game.board);
      }
    }

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const pos = new Position(r, c);
        const square = document.createElement('div');
        const isWhiteSquare = (r + c) % 2 === 0;
        square.className = `square ${isWhiteSquare ? 'white' : 'black'}`;

        if (this.selectedPosition && this.selectedPosition.equals(pos)) {
          square.classList.add('selected');
        }

        const isValidMove = validMoves.some(m => m.equals(pos));
        const piece = this.game.getPieceAt(pos);

        if (isValidMove) {
          if (piece) {
            square.classList.add('valid-capture');
          } else {
            square.classList.add('valid-move');
          }
        }

        if (piece) {
          square.textContent = piece.symbol;
          square.style.color = piece.color === Color.WHITE ? '#ffffff' : '#000000';
          if (piece.color === Color.WHITE) {
            square.style.textShadow = '0 0 3px #000, 0 0 3px #000';
          }
        }

        square.addEventListener('click', () => this.handleSquareClick(r, c));
        this.boardElement.appendChild(square);
      }
    }

    this.renderHistory();
  }

  renderHistory() {
    this.historyElement.innerHTML = '';
    this.game.history.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      const p = cmd.movedPiece;
      const fromStr = `${String.fromCharCode(97 + cmd.from.col)}${8 - cmd.from.row}`;
      const toStr = `${String.fromCharCode(97 + cmd.to.col)}${8 - cmd.to.row}`;
      item.textContent = `${idx + 1}. ${p.color} ${p.type} (${fromStr} ➔ ${toStr})`;
      this.historyElement.appendChild(item);
    });
    this.historyElement.scrollTop = this.historyElement.scrollHeight;
  }
}
