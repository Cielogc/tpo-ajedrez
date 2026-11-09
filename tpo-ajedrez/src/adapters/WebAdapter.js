import { Position } from '../core/models/Position.js';
import { Color } from '../core/models/Color.js';
import { PieceFactory } from '../core/factories/PieceFactory.js';

const names={PAWN:'peón',ROOK:'torre',KNIGHT:'caballo',BISHOP:'alfil',QUEEN:'dama',KING:'rey'};
const squareName=pos=>`${String.fromCharCode(97+pos.col)}${8-pos.row}`;
const drawTexts={STALEMATE:'Tablas por ahogado',THREEFOLD_REPETITION:'Tablas por triple repetición',FIFTY_MOVES:'Tablas por la regla de 50 movimientos',INSUFFICIENT_MATERIAL:'Tablas por material insuficiente'};
const moveText=cmd=>cmd.castling?`${cmd.movedPiece.symbol} ${cmd.castling}`:
  `${cmd.movedPiece.symbol} ${squareName(cmd.from)}${cmd.capturedPiece?'×':'–'}${squareName(cmd.to)}${cmd.promotedPiece?`=${cmd.promotedPiece.symbol}`:''}${cmd.enPassant?' a.p.':''}`;
const moveNote=cmd=>{
  if(!cmd)return null;
  const who=cmd.movedPiece.color===Color.WHITE?'Las blancas':'Las negras';
  if(cmd.castling)return `${who} enrocaron ${cmd.castling==='O-O'?'corto':'largo'}.`;
  if(cmd.enPassant)return `${who} capturaron al paso en ${squareName(cmd.to)}.`;
  if(cmd.promotedPiece)return `${who} coronaron ${names[cmd.promotedPiece.type]} en ${squareName(cmd.to)}.`;
  return null;
};
const moveTitle=cmd=>cmd.castling?`Enroque ${cmd.castling==='O-O'?'corto':'largo'}`:
  `${names[cmd.movedPiece.type]}: ${squareName(cmd.from)} a ${squareName(cmd.to)}${cmd.enPassant?', captura al paso':''}${cmd.promotedPiece?`, corona ${names[cmd.promotedPiece.type]}`:''}`;
const pick=list=>list[Math.floor(Math.random()*list.length)];
// Lo que dice el rival cuando no le toca mover; en cada jugada la chicana la escribe la IA.
const rivalLines={
  greeting:[n=>`Dale, ${n}, arrancá vos que yo te espero. Total, esto dura poquito.`,n=>`¿Así que vos sos ${n}? Me dijeron que jugabas bien. Me mintieron, seguro.`,n=>`Pasá a la cancha, ${n}. Traé pañuelitos por las dudas.`],
  undo:[n=>`¿Te arrepentiste, ${n}? Dale, probá otra, que igual te gano.`,n=>`Uh, ${n}, ¿volvés para atrás? Ni el VAR te salva.`],
  defeat:[n=>`Bueno, ${n}, ganaste. Fue de suerte, que quede claro. Quiero la revancha ya.`,n=>`No te la creas, ${n}. Hasta un reloj roto da bien la hora dos veces por día.`],
  draw:[n=>`Tablas, ${n}. Te salvaste por un pelo, eh.`,n=>`¿Tablas, ${n}? Andá a contarle a todos que empataste conmigo, dale.`]
};
const nameKey='tpo-ajedrez:nombre';
const cleanName=value=>value.replace(/[^\p{L}\p{N} .'-]/gu,'').replace(/\s+/g,' ').trim().slice(0,24);
const storedName=()=>{try{return localStorage.getItem(nameKey)||'';}catch{return '';}};

export class WebAdapter {
  constructor(game,aiPlayer) {
    this.game=game;
    this.aiPlayer=aiPlayer;
    this.aiColor=Color.BLACK;
    this.vsAI=false;
    this.aiThinking=false;
    this.aiAbort=null;
    this.aiError=null;
    this.playerName=storedName();
    this.taunt=null;
    this.recentTaunts=[];
    this.selectedPosition=null;
    this.boardElement=document.getElementById('board');
    this.turnIndicator=document.getElementById('turn-indicator');
    this.checkAlert=document.getElementById('check-alert');
    this.historyElement=document.getElementById('history');
    this.undoBtn=document.getElementById('undo-btn');
    this.restartBtn=document.getElementById('restart-btn');
    this.initEvents();
    this.render();
    this.initScene();
  }

  async initScene() {
    try {
      const {ChessScene}=await import('../view/ChessScene.js');
      this.scene=new ChessScene(this.boardElement,(row,col)=>this.handleSquareClick(row,col));
      this.boardElement.querySelectorAll('.square').forEach(square=>square.remove());
      this.boardElement.classList.remove('fallback');
      this.render();
    } catch(error) {
      console.error('No se pudo iniciar la vista 3D:',error);
      this.scene=null;
      this.boardElement.querySelector('canvas')?.remove();
      document.getElementById('render-error').hidden=false;
      document.getElementById('view-btn').disabled=true;
      document.getElementById('reset-view-btn').disabled=true;
      document.getElementById('view-hint').textContent='Seleccioná una pieza y su destino';
      this.render();
    }
  }

  initEvents() {
    this.undoBtn.addEventListener('click',()=>{
      this.cancelAI();this.game.undoLastMove();
      // Contra la IA se deshace también su respuesta, para volver a tu turno.
      while(this.vsAI&&this.game.getCurrentTurn()===this.aiColor&&this.game.history.length)this.game.undoLastMove();
      if(this.vsAI)this.taunt=pick(rivalLines.undo)(this.playerName);
      this.selectedPosition=null;this.render();
    });
    this.restartBtn.addEventListener('click',()=>{
      this.cancelAI();this.game.restart();this.selectedPosition=null;
      this.recentTaunts=[];this.taunt=this.vsAI?pick(rivalLines.greeting)(this.playerName):null;
      this.render();
    });
    const nameDialog=document.getElementById('name-dialog'),nameInput=document.getElementById('name-input');
    document.getElementById('mode-btn').addEventListener('click',()=>{
      if(this.vsAI){this.cancelAI();this.vsAI=false;this.taunt=null;this.selectedPosition=null;this.render();return;}
      // Antes de jugar contra la IA se pide tu nombre, para que el rival lo use al chicanearte.
      nameInput.value=this.playerName;nameDialog.returnValue='';nameDialog.showModal();
    });
    document.getElementById('name-cancel').addEventListener('click',()=>nameDialog.close());
    const promotionDialog=document.getElementById('promotion-dialog');
    document.getElementById('promotion-cancel').addEventListener('click',()=>promotionDialog.close());
    promotionDialog.addEventListener('close',()=>{
      const pending=this.pendingPromotion;this.pendingPromotion=null;
      if(pending&&promotionDialog.returnValue)this.playHumanMove(pending.from,pending.to,promotionDialog.returnValue);
      else this.render();
    });
    nameDialog.addEventListener('close',()=>{
      if(nameDialog.returnValue!=='ok')return;
      this.playerName=cleanName(nameInput.value)||'Jugador';
      try{localStorage.setItem(nameKey,this.playerName);}catch{}
      this.cancelAI();this.vsAI=true;this.selectedPosition=null;
      this.recentTaunts=[];this.taunt=pick(rivalLines.greeting)(this.playerName);
      this.render();this.playAITurn();
    });
    document.getElementById('view-btn').addEventListener('click',event=>{
      if(!this.scene)return;
      const top=this.scene.toggleView();
      event.currentTarget.textContent=top?'3D':'2D';
      event.currentTarget.setAttribute('aria-pressed',String(top));
      event.currentTarget.title=top?'Volver a vista 3D':'Cambiar a vista desde arriba';
      document.getElementById('view-hint').textContent=top?'Vista superior · Seleccioná tu próxima jugada':'Arrastrá para recorrer la plaza · Deslizá para acercar';
    });
    document.getElementById('flip-btn').addEventListener('click',()=>{
      if(this.scene){this.scene.flip();this.renderPerspectiveLabel();}
      else{this.fallbackFlipped=!this.fallbackFlipped;this.render();}
    });
    document.getElementById('reset-view-btn').addEventListener('click',()=>this.scene?.resetCamera({animate:true}));
    this.boardElement.addEventListener('keyboard-position',event=>{
      this.render();
      const pos=new Position(event.detail.row,event.detail.col),piece=this.game.getPieceAt(pos);
      document.getElementById('selection-hint').classList.remove('notice');
      document.getElementById('selection-hint').textContent=`${squareName(pos)}: ${piece?`${names[piece.type]} ${piece.color===Color.WHITE?'blanco':'negro'}`:'vacía'}`;
    });
  }

  handleSquareClick(row,col) {
    if(this.scene?.isAnimating||this.isAITurn()||this.game.getOutcome())return;
    const clickedPos=new Position(row,col);
    const piece=this.game.getPieceAt(clickedPos);
    this.aiError=null;
    if(this.selectedPosition?.equals(clickedPos)) {
      this.selectedPosition=null;
    }else if(piece?.color===this.game.getCurrentTurn()){
      this.selectedPosition=clickedPos;
    }else if(this.selectedPosition){
      const from=this.selectedPosition;
      if(this.validMoves().some(move=>move.to.equals(clickedPos))){
        // Al coronar, primero se elige la pieza.
        if(this.game.isPromotion(from,clickedPos))this.askPromotion(from,clickedPos);
        else this.playHumanMove(from,clickedPos);
        return;
      }
      this.render();
      document.getElementById('selection-hint').textContent='Ese movimiento no es válido. Elegí otro destino.';
      return;
    }
    this.render();
  }

  playHumanMove(from,to,promotion) {
    if(!this.game.makeMove(from,to,promotion))return;
    this.selectedPosition=null;
    const outcome=this.vsAI&&this.game.getOutcome();
    if(outcome)this.taunt=pick(outcome==='CHECKMATE'?rivalLines.defeat:rivalLines.draw)(this.playerName);
    this.render();
    this.playAITurn();
  }

  askPromotion(from,to) {
    const dialog=document.getElementById('promotion-dialog'),color=this.game.getCurrentTurn();
    for(const button of dialog.querySelectorAll('.promotion-options button'))button.textContent=PieceFactory.symbolOf(button.value,color);
    this.pendingPromotion={from,to};
    dialog.returnValue='';dialog.showModal();
  }

  isAITurn() {
    return this.vsAI&&this.game.getCurrentTurn()===this.aiColor;
  }

  async playAITurn() {
    if(!this.isAITurn()||this.aiThinking||this.game.getOutcome())return;
    const abort=new AbortController();
    this.aiAbort=abort;this.aiThinking=true;this.aiError=null;this.render();
    let move;
    try{move=await this.aiPlayer.chooseMove(this.game,{opponentName:this.playerName,recentComments:this.recentTaunts,signal:abort.signal});}
    catch(error){
      if(abort.signal.aborted)return;
      // Si Groq falla, la partida sigue con una jugada legal al azar y se avisa en pantalla.
      const moves=this.game.getLegalMoves();
      move=moves[Math.floor(Math.random()*moves.length)];
      this.aiError=`La IA no respondió (${error.message}). Jugó una movida al azar.`;
    }
    // Deja terminar la animación de tu jugada antes de mostrar la respuesta.
    while(this.scene?.isAnimating)await new Promise(requestAnimationFrame);
    if(abort.signal.aborted)return;
    this.aiAbort=null;this.aiThinking=false;
    this.game.makeMove(move.from,move.to,move.promotion);
    this.taunt=move.comment||null;
    if(move.comment)this.recentTaunts=[...this.recentTaunts,move.comment].slice(-4);
    this.render();
  }

  cancelAI() {
    this.aiAbort?.abort();
    this.aiAbort=null;this.aiThinking=false;this.aiError=null;
  }

  // Destinos de la pieza elegida, con su tipo (captura, enroque, al paso, coronación)
  validMoves() {
    return this.selectedPosition?this.game.getLegalMoveDetails(this.selectedPosition):[];
  }

  render() {
    const turn=this.game.getCurrentTurn();
    const outcome=this.game.getOutcome();
    if(outcome==='CHECKMATE')this.turnIndicator.textContent=`Jaque mate · ganan las ${turn===Color.WHITE?'negras':'blancas'}`;
    else if(outcome)this.turnIndicator.textContent=drawTexts[outcome];
    else this.turnIndicator.textContent=`Juegan las ${turn===Color.WHITE?'blancas':'negras'}`;
    const modeBtn=document.getElementById('mode-btn');
    modeBtn.setAttribute('aria-pressed',String(this.vsAI));
    modeBtn.classList.toggle('thinking',this.aiThinking);
    modeBtn.title=this.vsAI?'Volver a dos jugadores':'Jugar contra la IA';
    document.getElementById('mode-name').textContent=this.vsAI?'Contra la IA':'Partida local';
    document.getElementById('mode-detail').textContent=this.vsAI?'Jugás con blancas':'Dos jugadores';
    document.querySelector('#player-black h2').textContent=this.vsAI?'Negras · IA':'Negras';
    document.querySelector('#player-white h2').textContent=this.vsAI?`Blancas · ${this.playerName}`:'Blancas';
    this.renderTaunt();
    const inCheck=this.game.board.isKingInCheck(turn);
    this.checkAlert.hidden=!inCheck;
    this.checkAlert.textContent=`¡Jaque al rey ${turn===Color.WHITE?'blanco':'negro'}!`;
    document.getElementById('player-white').classList.toggle('active',turn===Color.WHITE);
    document.getElementById('player-black').classList.toggle('active',turn===Color.BLACK);
    const counts={WHITE:0,BLACK:0};
    for(const row of this.game.board.grid)for(const piece of row)if(piece)counts[piece.color]++;
    document.getElementById('white-count').textContent=`${counts.WHITE} piezas en juego`;
    document.getElementById('black-count').textContent=`${counts.BLACK} piezas en juego`;
    this.undoBtn.disabled=this.game.history.length===0;
    const moves=this.validMoves();
    const selected=this.selectedPosition&&this.game.getPieceAt(this.selectedPosition);
    // Sin pieza elegida, se anuncia la última jugada si fue especial.
    const note=!outcome&&!this.aiThinking&&!this.aiError&&!selected&&moveNote(this.game.history.at(-1));
    const hint=document.getElementById('selection-hint');
    hint.textContent=
      outcome?'Partida terminada. Tocá «Nueva partida» para volver a jugar.':
      this.aiThinking?'La IA está pensando…':
      this.aiError??(selected?`${names[selected.type][0].toUpperCase()+names[selected.type].slice(1)} en ${squareName(this.selectedPosition)} · Elegí un destino.`:note||'Elegí una pieza para comenzar.');
    hint.classList.toggle('notice',!!note);
    if(this.scene)this.scene.update(this.game,this.selectedPosition,moves);
    this.syncPerspective(turn);
    if(!this.scene)this.renderFallback(moves);
    this.renderLegend(moves);
    this.renderHistory();
  }

  syncPerspective(turn) {
    const previous=this.perspectiveState;
    const changed=!previous||previous.board!==this.game.board||previous.turn!==turn||previous.vsAI!==this.vsAI||previous.scene!==this.scene;
    if(changed){
      // Local play follows the turn. Against the AI, return to the human's side.
      const flipped=!this.vsAI&&turn===Color.BLACK;
      this.fallbackFlipped=flipped;
      this.scene?.setOrientation(flipped);
      this.perspectiveState={board:this.game.board,turn,vsAI:this.vsAI,scene:this.scene};
      if(previous&&previous.turn!==turn&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        this.turnAnimation?.cancel();
        this.turnAnimation=this.turnIndicator.animate([
          {opacity:.25,transform:'translateY(8px)'},
          {opacity:1,transform:'translateY(0)'}
        ],{duration:380,easing:'ease-out'});
      }
    }
    this.renderPerspectiveLabel();
  }

  renderPerspectiveLabel() {
    const flipped=this.scene?this.scene.flipped:this.fallbackFlipped;
    document.getElementById('perspective-name').textContent=`Vista de ${flipped?'negras':'blancas'}`;
    document.getElementById('perspective-detail').textContent=this.vsAI?'Contra la IA':'Giro automático por turno';
    document.getElementById('perspective-indicator').classList.toggle('black-view',!!flipped);
  }

  // Explica abajo del tablero las jugadas especiales de la pieza elegida, con la misma forma y color que su marca.
  renderLegend(moves) {
    const items=[];
    for(const move of moves){
      if(move.castling)items.push(['castling','□',`Enroque ${move.castling==='O-O'?'corto':'largo'}: rey a ${squareName(move.to)}, la torre de ${squareName(move.rookFrom)} pasa sola a ${squareName(move.rookTo)}`]);
      if(move.enPassant)items.push(['en-passant','◯',`Captura al paso en ${squareName(move.to)}: te comés el peón de ${squareName(move.capturePosition)}`]);
    }
    if(moves.some(move=>move.promotion))items.push(['promotion','◇','Coronación: al llegar a la última fila elegís la pieza']);
    const legend=document.getElementById('move-legend');
    legend.replaceChildren(...items.map(([kind,glyph,text])=>{
      const item=document.createElement('span'),icon=document.createElement('i');
      item.className=`legend-item ${kind}`;icon.textContent=glyph;item.append(icon,text);return item;
    }));
    legend.hidden=!items.length;
    document.getElementById('view-hint').hidden=items.length>0;
  }

  renderTaunt() {
    const taunt=this.vsAI?this.taunt:null,bubble=document.getElementById('ai-taunt');
    document.getElementById('table-eyebrow').textContent=taunt?'TU RIVAL DICE':'UNA PARTIDA AL SOL';
    document.getElementById('table-title').hidden=!!taunt;
    bubble.hidden=!taunt;
    if(!taunt||bubble.textContent===taunt)return;
    bubble.textContent=taunt;
    // Reinicia la animación de entrada con cada chicana nueva.
    bubble.classList.remove('pop');void bubble.offsetWidth;bubble.classList.add('pop');
  }

  renderFallback(moves) {
    this.boardElement.innerHTML='';this.boardElement.classList.add('fallback');
    for(let i=0;i<64;i++){
      const index=this.fallbackFlipped?63-i:i;
      const row=Math.floor(index/8),col=index%8,pos=new Position(row,col);
      const square=document.createElement('button'),piece=this.game.getPieceAt(pos);
      square.className=`square ${(row+col)%2?'black':'white'}`;
      square.setAttribute('aria-label',`${squareName(pos)}${piece?`, ${names[piece.type]} ${piece.color===Color.WHITE?'blanco':'negro'}`:', vacía'}`);
      if(this.selectedPosition?.equals(pos))square.classList.add('selected');
      const move=moves.find(candidate=>candidate.to.equals(pos));
      if(move)square.classList.add(move.castling?'valid-castle':move.capture?'valid-capture':move.promotion?'valid-promotion':'valid-move');
      if(move?.promotion&&move.capture)square.classList.add('valid-promotion');
      if(moves.some(candidate=>candidate.rookFrom?.equals(pos)))square.classList.add('castle-rook');
      if(moves.some(candidate=>candidate.enPassant&&candidate.capturePosition.equals(pos)))square.classList.add('en-passant-victim');
      if(piece?.type==='KING'&&piece.color===this.game.getCurrentTurn()&&this.game.board.isKingInCheck(piece.color))square.classList.add('in-check');
      if(piece){square.textContent=piece.symbol;square.classList.add(piece.color===Color.WHITE?'white-piece-text':'black-piece-text');}
      square.addEventListener('click',()=>this.handleSquareClick(row,col));this.boardElement.appendChild(square);
    }
  }

  renderHistory() {
    const last=this.game.history.at(-1);
    if(this.historyBoard===this.game.board&&this.historyLast===last)return;
    const animateLast=this.historyBoard===this.game.board&&this.game.history.length===this.historyLength+1;
    this.historyBoard=this.game.board;this.historyLast=last;this.historyLength=this.game.history.length;
    this.historyElement.innerHTML='';
    document.getElementById('move-count').textContent=String(this.game.history.length).padStart(2,'0');
    if(!this.game.history.length){
      const empty=document.createElement('div');empty.className='history-empty';
      const icon=document.createElement('span');icon.textContent='♙';
      empty.append(icon,document.createTextNode('La historia empieza con tu primera jugada.'));this.historyElement.appendChild(empty);return;
    }
    for(let i=0;i<this.game.history.length;i+=2){
      const item=document.createElement('div');item.className='history-item';
      const number=document.createElement('span');number.textContent=String(i/2+1).padStart(2,'0');item.appendChild(number);
      for(let j=0;j<2;j++){
        const cell=document.createElement('span'),cmd=this.game.history[i+j];
        if(cmd){cell.textContent=moveText(cmd);cell.title=moveTitle(cmd);if(animateLast&&cmd===last)cell.classList.add('new-move');}
        else cell.textContent='—';
        item.appendChild(cell);
      }
      this.historyElement.appendChild(item);
    }
    this.historyElement.scrollTop=this.historyElement.scrollHeight;
  }
}
