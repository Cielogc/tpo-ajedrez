const promotionLetters={QUEEN:'q',ROOK:'r',BISHOP:'b',KNIGHT:'n'};
const names={PAWN:'peón',ROOK:'torre',KNIGHT:'caballo',BISHOP:'alfil',QUEEN:'dama',KING:'rey'};
const squareName=pos=>`${String.fromCharCode(97+pos.col)}${8-pos.row}`;
// Sirve para jugadas legales ({promotion}) y para comandos del historial ({promotedPiece})
const toUci=move=>squareName(move.from)+squareName(move.to)+(promotionLetters[move.promotion??move.promotedPiece?.type]??'');

// La jugada del rival en palabras, para que la chicana reaccione a lo que pasó.
function describe(command,givesCheck) {
  if(!command)return '';
  let text=command.castling?`enroque ${command.castling==='O-O'?'corto':'largo'}`:`${names[command.movedPiece.type]} de ${squareName(command.from)} a ${squareName(command.to)}`;
  if(command.capturedPiece)text+=`, capturando ${names[command.capturedPiece.type]}${command.enPassant?' al paso':''}`;
  if(command.promotedPiece)text+=`, coronando ${names[command.promotedPiece.type]}`;
  return text+(givesCheck?', dando jaque':'');
}

// Adaptador de salida: le pide la jugada (y la chicana) al servidor, que consulta a Groq con la API key.
export class GroqAIPlayer {
  constructor(endpoint='/api/ai-move') {
    this.endpoint=endpoint;
  }

  async chooseMove(game,{opponentName,recentComments=[],signal}={}) {
    const legalMoves=game.getLegalMoves();
    const lastMove=describe(game.history.at(-1),game.board.isKingInCheck(game.getCurrentTurn()));
    const response=await fetch(this.endpoint,{
      method:'POST',headers:{'Content-Type':'application/json'},signal,
      body:JSON.stringify({color:game.getCurrentTurn(),fen:game.toFen(),history:game.history.map(toUci),legalMoves:legalMoves.map(toUci),opponentName,lastMove,recentComments})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`el servidor respondió ${response.status}`);
    const move=legalMoves.find(candidate=>toUci(candidate)===data.move);
    if(!move)throw new Error('jugada inválida');
    return {...move,comment:data.comment||''};
  }
}
