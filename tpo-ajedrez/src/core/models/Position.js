export class Position {
  constructor(row, col) {
    this.row = row; // 0 a 7
    this.col = col; // 0 a 7
  }

  isValid() {
    return this.row >= 0 && this.row < 8 && this.col >= 0 && this.col < 8;
  }

  equals(other) {
    return other && this.row === other.row && this.col === other.col;
  }
}
