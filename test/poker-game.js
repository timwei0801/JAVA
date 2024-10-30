// 遊戲狀態常量
const STAGES = {
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown'
};

// 牌組常量
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// 遊戲狀態
let gameState = {
  deck: [],
  playerHand: [],
  botHand: [],
  communityCards: [],
  stage: STAGES.PREFLOP,
  pot: 30,                // 初始底池
  playerChips: 1000,
  botChips: 1000,
  currentBet: 20,         // 當前下注金額（初始為大盲注）
  smallBlind: 10,         // 小盲注金額
  bigBlind: 20,          // 大盲注金額
  isPlayerSmallBlind: false,  // 玩家是否為小盲注位
  isPlayerTurn: true,
  needResponse: false,
  roundFirstAction: true,
  lastRaise: 0
};

// DOM 元素
let elements = {
  playerChips: null,
  botChips: null,
  pot: null,
  gameStatus: null,
  playerHand: null,
  botHand: null,
  community: null,
  controls: null,
  startButton: null
};

// 初始化 DOM 元素
function initializeElements() {
  elements = {
      playerChips: document.getElementById('player-chips'),
      botChips: document.getElementById('bot-chips'),
      pot: document.getElementById('pot'),
      gameStatus: document.getElementById('game-status'),
      playerHand: document.getElementById('player-hand'),
      botHand: document.getElementById('bot-hand'),
      community: document.getElementById('community'),
      controls: document.getElementById('controls-container'),
      startButton: document.getElementById('start-button')
  };

  // 添加開始按鈕事件監聽器
  if (elements.startButton) {
      elements.startButton.addEventListener('click', startGame);
  }
}

// 初始化遊戲狀態
function initializeGameState() {
  gameState = {
      deck: [],
      playerHand: [],
      botHand: [],
      communityCards: [],
      stage: STAGES.PREFLOP,
      pot: 0,
      playerChips: 1000,
      botChips: 1000,
      currentBet: 0,
      smallBlind: 10,
      bigBlind: 20,
      isPlayerSmallBlind: false,
      isPlayerTurn: false,
      needResponse: false,
      roundFirstAction: true,
      lastRaise: 0
  };
}

// 初始化牌組
function initializeDeck() {
  const deck = [];
  SUITS.forEach(suit => {
      RANKS.forEach(rank => {
          deck.push({ suit, rank });
      });
  });
  return shuffleDeck(deck);
}

// 洗牌
function shuffleDeck(deck) {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

// 創建卡牌元素
function createCardElement(card, isHidden = false) {
  const cardElement = document.createElement('div');
  cardElement.className = 'card';
  
  if (isHidden) {
      cardElement.innerHTML = '?<br>?';
      cardElement.classList.add('hidden-card');
  } else {
      const color = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
      cardElement.classList.add(color);
      cardElement.innerHTML = `${card.rank}<br>${card.suit}`;
  }
  
  return cardElement;
}

// 設置遊戲狀態文字
function setGameStatus(status) {
  if (elements.gameStatus) {
      elements.gameStatus.textContent = status;
  }
}

// 更新顯示
function updateDisplay() {
  // 更新籌碼和底池顯示
  elements.playerChips.textContent = `籌碼: $${gameState.playerChips}`;
  elements.botChips.textContent = `籌碼: $${gameState.botChips}`;
  elements.pot.textContent = `底池: $${gameState.pot}`;

  // 更新玩家手牌
  elements.playerHand.innerHTML = '';
  gameState.playerHand.forEach(card => {
      elements.playerHand.appendChild(createCardElement(card));
  });

  // 更新電腦手牌
  elements.botHand.innerHTML = '';
  gameState.botHand.forEach(card => {
      elements.botHand.appendChild(createCardElement(card, gameState.stage !== STAGES.SHOWDOWN));
  });

  // 更新公共牌
  elements.community.innerHTML = '';
  gameState.communityCards.forEach(card => {
      elements.community.appendChild(createCardElement(card));
  });

  // 更新控制項
  if (gameState.isPlayerTurn) {
      updateControls();
  } else {
      elements.controls.style.display = 'none';
  }
}

// Window onload 初始化
window.onload = function() {
  initializeElements();
};
// 更新控制按鈕
function updateControls() {
  if (!elements.controls) {
      console.error('Controls container not found');
      return;
  }

  if (!gameState.isPlayerTurn) {
      elements.controls.style.display = 'none';
      return;
  }

  // 清空現有內容
  elements.controls.innerHTML = '';
  
  // 設置基本樣式
  elements.controls.style.display = 'flex';
  elements.controls.style.flexDirection = 'column';
  elements.controls.style.gap = '10px';

  // 基本動作區域（棄牌和跟注按鈕）
  const basicActions = document.createElement('div');
  basicActions.className = 'basic-actions';

  // 棄牌按鈕
  const foldButton = document.createElement('button');
  foldButton.textContent = '棄牌';
  foldButton.className = 'action-button';
  foldButton.onclick = () => playerAction('fold');
  basicActions.appendChild(foldButton);

  // 跟注/check按鈕
  const isFirstAction = !gameState.needResponse && 
      (gameState.stage === STAGES.PREFLOP ? gameState.currentBet === gameState.bigBlind : true);
  const buttonText = isFirstAction ? 'check' : '跟注';
  const betAmount = isFirstAction ? 0 : gameState.currentBet;

  const callButton = document.createElement('button');
  callButton.textContent = `${buttonText} ${betAmount > 0 ? `($${betAmount})` : ''}`;
  callButton.className = 'action-button';
  callButton.onclick = () => playerAction('call');
  basicActions.appendChild(callButton);

  elements.controls.appendChild(basicActions);

  // 加注區域
  const raiseContainer = document.createElement('div');
  raiseContainer.className = 'raise-container';

  // 計算加注限制
  const minRaise = Math.max(gameState.currentBet * 2, gameState.bigBlind * 2);
  const maxBet = Math.min(gameState.playerChips, gameState.pot * 4);

  // 加注輸入框
  const raiseInputDiv = document.createElement('div');
  raiseInputDiv.className = 'raise-input';
  const raiseInput = document.createElement('input');
  raiseInput.type = 'number';
  raiseInput.id = 'raiseInput';
  raiseInput.className = 'raise-amount-input';
  raiseInput.min = minRaise;
  raiseInput.max = maxBet;
  raiseInput.value = minRaise;
  raiseInput.step = gameState.bigBlind;
  raiseInputDiv.appendChild(raiseInput);
  raiseContainer.appendChild(raiseInputDiv);

  // 加注建議按鈕
  const suggestionsDiv = document.createElement('div');
  suggestionsDiv.className = 'raise-suggestions';
  
  // 常用的加注倍數
  const suggestedBets = [
      { text: "底池的1/2", multiplier: 0.5 },
      { text: "底池的3/4", multiplier: 0.75 },
      { text: "底池", multiplier: 1 },
      { text: "全下", multiplier: Infinity }
  ];

  suggestedBets.forEach(bet => {
      const amount = bet.multiplier === Infinity ? maxBet : 
          Math.min(Math.round(gameState.pot * bet.multiplier), maxBet);
      const button = document.createElement('button');
      button.textContent = `${bet.text} ($${amount})`;
      button.className = 'suggest-button';
      button.onclick = () => setRaiseAmount(amount);
      suggestionsDiv.appendChild(button);
  });
  raiseContainer.appendChild(suggestionsDiv);

  // 確認加注按鈕
  const confirmRaiseButton = document.createElement('button');
  confirmRaiseButton.textContent = '確認加注';
  confirmRaiseButton.className = 'action-button';
  confirmRaiseButton.onclick = () => playerAction('raise');
  raiseContainer.appendChild(confirmRaiseButton);

  elements.controls.appendChild(raiseContainer);
}

// 設置加注金額
function setRaiseAmount(amount) {
  const input = document.getElementById('raiseInput');
  if (input) {
      input.value = amount;
  }
}

// 開始遊戲函數
function startGame() {
  // 隱藏開始按鈕
  if (elements.startButton) {
      elements.startButton.style.display = 'none';
  }

  // 重置遊戲狀態為初始值
  initializeGameState();
  
  // 啟動第一局
  startNewRound();
}

// 開始新的一輪
function startNewRound() {
  // 設置遊戲階段
  gameState.stage = STAGES.PREFLOP;
  
  // 發新牌
  gameState.deck = initializeDeck();
  gameState.playerHand = [gameState.deck.pop(), gameState.deck.pop()];
  gameState.botHand = [gameState.deck.pop(), gameState.deck.pop()];
  gameState.communityCards = [];
  
  // 設置底池和盲注
  gameState.pot = gameState.bigBlind + gameState.smallBlind;
  gameState.currentBet = gameState.bigBlind;
  
  // 扣除盲注籌碼
  if (gameState.isPlayerSmallBlind) {
      gameState.playerChips -= gameState.smallBlind;
      gameState.botChips -= gameState.bigBlind;
  } else {
      gameState.playerChips -= gameState.bigBlind;
      gameState.botChips -= gameState.smallBlind;
  }
  
  // 設置玩家回合
  gameState.isPlayerTurn = !gameState.isPlayerSmallBlind;
  gameState.roundFirstAction = true;
  gameState.needResponse = false;
  
  // 更新顯示
  setGameStatus(gameState.isPlayerTurn ? '請選擇行動' : '電腦回合');
  updateDisplay();
  
  // 如果是電腦回合，啟動電腦決策
  if (!gameState.isPlayerTurn) {
      setTimeout(() => {
          setGameStatus('電腦思考中...');
          setTimeout(botDecision, 1000);
      }, 1000);
  }
}

// 處理玩家行動
function playerAction(action) {
  switch (action) {
      case 'fold':
          setGameStatus('玩家選擇棄牌，電腦獲勝！');
          gameState.botChips += gameState.pot;
          gameState.pot = 0;  // 清空底池
          gameState.isPlayerTurn = false;  // 確保玩家不能繼續操作
          elements.controls.style.display = 'none';
          updateDisplay();
          setTimeout(resetGame, 2000);
          break;
          
      case 'call':
          if (gameState.roundFirstAction && !gameState.needResponse) {
              // check
              setGameStatus('玩家選擇 check');
              gameState.roundFirstAction = false;
              gameState.isPlayerTurn = false;
              updateDisplay();
              
              setTimeout(() => {
                  setGameStatus('電腦思考中...');
                  setTimeout(botDecision, 1000);
              }, 1000);
          } else {
              // 跟注
              const callAmount = gameState.currentBet;
              if (callAmount > gameState.playerChips) {
                  alert('籌碼不足');
                  return;
              }
              
              gameState.playerChips -= callAmount;
              gameState.pot += callAmount;
              setGameStatus(`玩家選擇跟注 $${callAmount}`);
              gameState.needResponse = false;
              gameState.isPlayerTurn = false;
              updateDisplay();
              
              setTimeout(() => {
                  handleRoundEnd();
              }, 1500);
          }
          break;

      case 'raise':
          const raiseInput = document.getElementById('raiseInput');
          if (!raiseInput) return;
          
          const raiseAmount = parseInt(raiseInput.value);
          if (isNaN(raiseAmount) || raiseAmount > gameState.playerChips) {
              alert('無效的加注金額');
              return;
          }
          
          if (raiseAmount < gameState.currentBet * 2) {
              alert('加注金額必須至少為當前注碼的兩倍');
              return;
          }
          
          gameState.playerChips -= raiseAmount;
          gameState.pot += raiseAmount;
          gameState.currentBet = raiseAmount;
          gameState.lastRaise = raiseAmount - gameState.currentBet;
          gameState.needResponse = true;
          gameState.roundFirstAction = false;
          gameState.isPlayerTurn = false;
          
          setGameStatus(`玩家選擇加注 $${raiseAmount}`);
          updateDisplay();
          
          setTimeout(() => {
              setGameStatus('電腦思考中...');
              setTimeout(botDecision, 1000);
          }, 1000);
          break;
  }
  
  updateDisplay();
}
// 電腦決策
function botDecision() {
  const randomAction = Math.random();
  
  // 如果是回合第一次行動且沒有需要回應的加注
  if (gameState.roundFirstAction && !gameState.needResponse) {
      if (randomAction < 0.4) {
          // 40%機率check
          setGameStatus('電腦選擇 check');
          gameState.roundFirstAction = false;
          setTimeout(() => {
              gameState.isPlayerTurn = true;
              setGameStatus('輪到玩家行動');
              updateDisplay();
          }, 1500);
      } else {
          // 60%機率加注
          const betAmount = gameState.bigBlind;
          gameState.botChips -= betAmount;
          gameState.pot += betAmount;
          gameState.currentBet = betAmount;
          gameState.needResponse = true;
          setGameStatus(`電腦選擇加注 $${betAmount}`);
          setTimeout(() => {
              gameState.isPlayerTurn = true;
              setGameStatus('輪到玩家行動');
              updateDisplay();
          }, 1500);
      }
  } else {
      // 需要回應對手的加注
      if (randomAction < 0.2) {
          // 20%機率棄牌
          setGameStatus('電腦選擇棄牌，玩家獲勝！');
          gameState.playerChips += gameState.pot;
          gameState.pot = 0; // 清空底池
          gameState.isPlayerTurn = false;
          elements.controls.style.display = 'none';
          updateDisplay();
          setTimeout(resetGame, 2000);
      }
      else if (randomAction < 0.7 || gameState.lastRaise > gameState.botChips / 4) {
          // 50%機率跟注，或者當加注金額超過籌碼1/4時
          const callAmount = gameState.currentBet;
          gameState.botChips -= callAmount;
          gameState.pot += callAmount;
          setGameStatus(`電腦選擇跟注 $${callAmount}`);
          gameState.needResponse = false;
          updateDisplay();
          setTimeout(() => {
              handleRoundEnd();
          }, 1500);
      }
      else {
          // 30%機率再加注
          const currentRaiseAmount = gameState.currentBet * 2;
          if (currentRaiseAmount > gameState.botChips) {
              // 如果沒有足夠籌碼加注，改為跟注
              const callAmount = gameState.currentBet;
              gameState.botChips -= callAmount;
              gameState.pot += callAmount;
              setGameStatus(`電腦選擇跟注 $${callAmount}`);
              gameState.needResponse = false;
              updateDisplay();
              setTimeout(() => {
                  handleRoundEnd();
              }, 1500);
          } else {
              gameState.botChips -= currentRaiseAmount;
              gameState.pot += currentRaiseAmount;
              gameState.currentBet = currentRaiseAmount;
              gameState.lastRaise = currentRaiseAmount - gameState.currentBet;
              gameState.needResponse = true;
              
              setGameStatus(`電腦選擇加注到 $${currentRaiseAmount}`);
              updateDisplay();
              
              setTimeout(() => {
                  gameState.isPlayerTurn = true;
                  setGameStatus('輪到玩家行動');
                  updateDisplay();
              }, 1500);
          }
      }
  }
  updateDisplay();
}

// 處理回合結束
function handleRoundEnd() {
  // 檢查遊戲是否結束
  if (checkGameEnd()) {
      return;
  }

  if (gameState.stage === STAGES.SHOWDOWN) {
      // 顯示比牌結果
      determineWinner();
      setTimeout(resetGame, 3000);
      return;
  }
  
  // 清除當前回合的狀態
  gameState.currentBet = 0;
  gameState.lastRaise = 0;
  gameState.needResponse = false;
  gameState.roundFirstAction = true;
  
  // 發公共牌
  dealCommunityCards();
  
  // 設置新回合的玩家
  gameState.isPlayerTurn = true; // 每個新階段都從玩家開始
  
  // 更新顯示
  setGameStatus('新回合開始，請選擇行動');
  updateDisplay();
}

// 發公共牌
function dealCommunityCards() {
  switch (gameState.stage) {
      case STAGES.PREFLOP:
          gameState.communityCards = [
              gameState.deck.pop(),
              gameState.deck.pop(),
              gameState.deck.pop()
          ];
          gameState.stage = STAGES.FLOP;
          break;
      case STAGES.FLOP:
          gameState.communityCards.push(gameState.deck.pop());
          gameState.stage = STAGES.TURN;
          break;
      case STAGES.TURN:
          gameState.communityCards.push(gameState.deck.pop());
          gameState.stage = STAGES.RIVER;
          break;
      case STAGES.RIVER:
          gameState.stage = STAGES.SHOWDOWN;
          break;
  }
  updateDisplay();
}

// 簡單的勝負判定
function determineWinner() {
  // 這裡我們用一個簡單的隨機邏輯來決定勝負
  const isPlayerWin = Math.random() > 0.5;
  
  if (isPlayerWin) {
      setGameStatus('玩家獲勝！');
      gameState.playerChips += gameState.pot;
  } else {
      setGameStatus('電腦獲勝！');
      gameState.botChips += gameState.pot;
  }
  
  gameState.pot = 0;
  updateDisplay();
}

function resetGame() {
  // 保存當前籌碼和盲注狀態
  const oldState = {
      playerChips: gameState.playerChips,
      botChips: gameState.botChips,
      isPlayerSmallBlind: !gameState.isPlayerSmallBlind // 交換盲注位置
  };
  
  // 重置基礎遊戲狀態
  initializeGameState();
  
  // 恢復保存的狀態
  gameState.playerChips = oldState.playerChips;
  gameState.botChips = oldState.botChips;
  gameState.isPlayerSmallBlind = oldState.isPlayerSmallBlind;
  
  // 開始新的一局
  startNewRound();
}

function checkGameEnd() {
  if (gameState.playerChips <= 0) {
      setGameStatus('遊戲結束，電腦獲勝！');
      showRestartButton();
      return true;
  }
  if (gameState.botChips <= 0) {
      setGameStatus('遊戲結束，玩家獲勝！');
      showRestartButton();
      return true;
  }
  return false;
}

// 顯示重新開始按鈕
function showRestartButton() {
  if (elements.startButton) {
      elements.startButton.style.display = 'block';
      elements.startButton.textContent = '重新開始';
  }
}

// 添加按鈕和卡牌樣式
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .card {
      width: 60px;
      height: 90px;
      border: 2px solid #333;
      border-radius: 8px;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      margin: 0 5px;
      background-color: white;
      font-size: 1.2em;
      font-weight: bold;
      text-align: center;
      line-height: 1.2;
  }

  .card.red {
      color: red;
  }

  .card.black {
      color: black;
  }

  .card.hidden-card {
      background-color: #b8d4e3;
      color: #2c5282;
  }
`;
document.head.appendChild(styleSheet);