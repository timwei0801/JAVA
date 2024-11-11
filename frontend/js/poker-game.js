// poker-game.js
import { isAuthenticated } from './auth-check.js';
import { startGame as apiStartGame, endGame as apiEndGame } from './api.js';

// 遊戲狀態常量 - 移到最外層
const STAGES = {
    PREFLOP: 'preflop',
    FLOP: 'flop',
    TURN: 'turn',
    RIVER: 'river',
    SHOWDOWN: 'showdown'
};

// 牌型等級常量
const HAND_RANKS = {
    ROYAL_FLUSH: 10,
    STRAIGHT_FLUSH: 9,
    FOUR_OF_A_KIND: 8,
    FULL_HOUSE: 7,
    FLUSH: 6,
    STRAIGHT: 5,
    THREE_OF_A_KIND: 4,
    TWO_PAIR: 3,
    ONE_PAIR: 2,
    HIGH_CARD: 1
};

// 牌型名稱對應
const HAND_NAMES = {
    10: "皇家同花順",
    9: "同花順",
    8: "四條",
    7: "葫蘆",
    6: "同花",
    5: "順子",
    4: "三條",
    3: "兩對",
    2: "一對",
    1: "高牌"
};

// DOM 元素引用 - 先宣告
let elements = {};

// 遊戲狀態 - 先宣告
let gameState = {};

// 牌組常量
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// 遊戲 ID
let currentGameId = null;

// 只在通過驗證後初始化遊戲
if (!isAuthenticated) {
    console.log('Authentication failed, redirecting to login page...'); 
    window.location.href = 'login.html';
} else {
    console.log('poker-game.js loaded');
    // DOM 載入完成後再初始化遊戲
    document.addEventListener('DOMContentLoaded', function() {
        initializeElements();
        initializeGameState();
        updateDisplay();
    });
}

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
        startButton: document.getElementById('start-button'),
        playerPosition: document.getElementById('player-position'),
        botPosition: document.getElementById('bot-position')
    };

    // 檢查每個元素
    for (let key in elements) {
        if (!elements[key]) {
            console.error(`Element not found: ${key}`);
        }
    }

    if (elements.startButton) {
        console.log('Adding start button event listener');
        elements.startButton.onclick = async function() {
            console.log('Start button clicked');
            try {
                await startGame();
            } catch (error) {
                console.error('Error starting game:', error);
            }
        };
    } else {
        console.error('Start button not found!');
    }
}

// 初始化遊戲狀態

function updatePositionMarkers() {
    const dealerText = "莊家(BB)";
    const sbText = "小盲";
    
    if (gameState.isPlayerSmallBlind) {
        document.getElementById('player-position').textContent = sbText;
        document.getElementById('bot-position').textContent = dealerText;
    } else {
        document.getElementById('player-position').textContent = dealerText;
        document.getElementById('bot-position').textContent = sbText;
    }
}

// 記錄操作
function logAction(player, action, amount = null) {
    const entry = {
        player,
        action,
        amount,
        timestamp: new Date().getTime()
    };
    gameState.currentHandActions.push(entry);
    updateActionLog();
}

// 更新操作記錄顯示
function updateActionLog() {
    const logContent = document.getElementById('log-content');
    if (!logContent) return;

    const currentHandDiv = document.createElement('div');
    currentHandDiv.className = 'current-hand';
    currentHandDiv.innerHTML = `<strong>第 ${gameState.handNumber} 手</strong>`;

    // 初始化當前階段
    let currentStage = STAGES.PREFLOP;
    let currentStageDiv = null;
    
    // 將階段名稱轉換為中文
    const stageNames = {
        'preflop': '翻牌前',
        'flop': '翻牌',
        'turn': '轉牌',
        'river': '河牌',
        'showdown': '攤牌'
    };

    // 創建新的階段標題
    function createStageTitle(stage) {
        const stageTitle = document.createElement('div');
        stageTitle.className = 'stage-title';
        stageTitle.style.backgroundColor = '#f0f0f0';
        stageTitle.style.padding = '5px';
        stageTitle.style.marginTop = '10px';
        stageTitle.style.marginBottom = '5px';
        stageTitle.style.borderRadius = '4px';
        stageTitle.style.fontWeight = 'bold';
        stageTitle.textContent = `===== ${stageNames[stage]} =====`;
        return stageTitle;
    }

    // 添加初始階段標題
    currentStageDiv = document.createElement('div');
    currentHandDiv.appendChild(createStageTitle(currentStage));
    currentHandDiv.appendChild(currentStageDiv);

    // 遍歷所有動作
    gameState.currentHandActions.forEach(entry => {
        if (entry.stageChange) {
            // 如果是階段變化，創建新的階段區塊
            currentStage = entry.stage;
            currentStageDiv = document.createElement('div');
            currentHandDiv.appendChild(createStageTitle(currentStage));
            currentHandDiv.appendChild(currentStageDiv);
        } else {
            // 一般動作
            const actionDiv = document.createElement('div');
            actionDiv.className = `action-entry ${(entry.player || '').toLowerCase()}`;
            const amountText = entry.amount ? ` ${amountToBB(entry.amount, gameState.bigBlind)}` : '';
            actionDiv.textContent = `${entry.player}: ${entry.action}${amountText}`;
            currentStageDiv.appendChild(actionDiv);
        }
    });

    // 清空並更新日誌內容
    logContent.innerHTML = '';
    logContent.appendChild(currentHandDiv);
    logContent.scrollTop = logContent.scrollHeight;
}

function initializeGameState() {
    console.log('Initializing game state...');
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
      lastRaise: 0,
      currentHandActions: [],
      handNumber: 0
  };
  console.log('Game state initialized');
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
        // 轉換狀態訊息中的金額為 BB
        const bbStatus = status.replace(/\$(\d+)/g, (match, amount) => {
            return amountToBB(parseInt(amount), gameState.bigBlind);
        });
        elements.gameStatus.textContent = bbStatus;
    }
}

// 將金額轉換為 BB 顯示
function amountToBB(amount, bigBlind) {
    const bb = amount / bigBlind;
    return bb % 1 === 0 ? bb + 'BB' : bb.toFixed(1) + 'BB';
}

// 更新顯示
function updateDisplay() {
    // 更新籌碼和底池顯示
    elements.playerChips.textContent = `籌碼: ${amountToBB(gameState.playerChips, gameState.bigBlind)}`;
    elements.botChips.textContent = `籌碼: ${amountToBB(gameState.botChips, gameState.bigBlind)}`;
    elements.pot.textContent = `底池: ${amountToBB(gameState.pot, gameState.bigBlind)}`;

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

// 更新控制按鈕
function updateControls() {
    if (!elements.controls || !gameState.isPlayerTurn) {
        elements.controls.style.display = 'none';
        return;
    }

    elements.controls.innerHTML = '';
    elements.controls.style.display = 'flex';
    elements.controls.style.flexDirection = 'column';
    elements.controls.style.gap = '10px';
    elements.controls.style.padding = '10px';

    const basicActions = document.createElement('div');
    basicActions.style.display = 'flex';
    basicActions.style.gap = '10px';
    basicActions.style.justifyContent = 'center';
    basicActions.style.marginBottom = '10px';

    // 只有在有加注時才顯示棄牌按鈕
    if (gameState.needResponse || gameState.currentBet > 0) {
        const foldButton = document.createElement('button');
        foldButton.textContent = '棄牌';
        foldButton.className = 'action-button';
        foldButton.onclick = () => playerAction('fold');
        basicActions.appendChild(foldButton);
    }

    // 跟注/check按鈕
    const isCheck = !gameState.needResponse && 
    ((gameState.stage === STAGES.PREFLOP && 
      !gameState.isPlayerSmallBlind && 
      gameState.roundFirstAction) || 
     (gameState.stage === STAGES.PREFLOP && 
      gameState.currentBet <= gameState.bigBlind) || 
     gameState.stage !== STAGES.PREFLOP);

const buttonText = isCheck ? 'check' : '跟注';

// 在以下情況不顯示金額：
// 1. 大盲位首次行動
// 2. 對手只補齊大盲的情況
const showAmount = !(gameState.stage === STAGES.PREFLOP && 
                  (!gameState.isPlayerSmallBlind && gameState.roundFirstAction || 
                   gameState.currentBet <= gameState.bigBlind));

const betAmount = showAmount ? gameState.currentBet : 0;

const callButton = document.createElement('button');
callButton.textContent = `${buttonText} ${showAmount && betAmount > 0 ? 
`(${(betAmount/gameState.bigBlind).toFixed(1)}BB $${betAmount})` : ''}`;
callButton.className = 'action-button';
callButton.onclick = () => playerAction('call');
basicActions.appendChild(callButton);

    elements.controls.appendChild(basicActions);

    // 加注選項容器
    const raiseContainer = document.createElement('div');
    raiseContainer.style.width = '100%';
    raiseContainer.style.maxWidth = '400px';
    raiseContainer.style.margin = '0 auto';

    // 建議加注按鈕
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.style.display = 'flex';
    suggestionsDiv.style.flexWrap = 'wrap';
    suggestionsDiv.style.gap = '5px';
    suggestionsDiv.style.marginBottom = '15px';
    suggestionsDiv.style.justifyContent = 'center';

    // 根據階段獲取加注選項
    const bettingOptions = getBettingOptionsForStage();
    // 添加 All-in 選項
    bettingOptions.push({
        text: "All In",
        multiplier: gameState.playerChips / gameState.bigBlind,
        isPercent: false
    });

    bettingOptions.forEach(bet => {
        let amount;
        if (bet.isPercent) {
            amount = Math.floor(bet.multiplier * gameState.pot);
        } else if (bet.text === "All In") {
            amount = gameState.playerChips;
        } else {
            amount = Math.floor(bet.multiplier * gameState.bigBlind);
        }
        amount = Math.min(amount, gameState.playerChips);
        const bbAmount = (amount / gameState.bigBlind).toFixed(1);
        
        const button = document.createElement('button');
        button.textContent = `${bet.text} (${bbAmount}BB $${amount})`;
        button.className = 'suggest-button';
        button.style.backgroundColor = '#90EE90';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.padding = '8px 16px';
        button.style.cursor = 'pointer';
        
        button.onclick = () => {
            slider.value = amount;
            updateBBDisplay();
        };
        
        button.onmouseover = () => button.style.backgroundColor = '#7BC17B';
        button.onmouseout = () => button.style.backgroundColor = '#90EE90';
        
        suggestionsDiv.appendChild(button);
    });

    raiseContainer.appendChild(suggestionsDiv);

    // 加注滑動條容器
    const sliderContainer = document.createElement('div');
    sliderContainer.style.width = '100%';
    sliderContainer.style.padding = '10px 0';

    // BB顯示
    const bbDisplay = document.createElement('div');
    bbDisplay.style.textAlign = 'center';
    bbDisplay.style.marginBottom = '10px';
    bbDisplay.style.fontSize = '1.1em';
    bbDisplay.style.fontWeight = 'bold';

    // 計算加注限制
    const minRaise = gameState.bigBlind;
    // 最大限制改為玩家全部籌碼
    const maxBet = gameState.playerChips;

    // 滑動條
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = minRaise;
    slider.max = maxBet;
    slider.step = gameState.bigBlind / 10;
    slider.value = minRaise;
    slider.style.width = '100%';
    slider.style.marginBottom = '10px';

    // 更新BB顯示
    function updateBBDisplay() {
        const bbAmount = (slider.value / gameState.bigBlind).toFixed(1);
        const isAllIn = parseInt(slider.value) === gameState.playerChips;
        const displayText = isAllIn ? 
            `All In! (${bbAmount}BB $${slider.value})` : 
            `${bbAmount}BB ($${slider.value})`;
        bbDisplay.textContent = displayText;
    }
    updateBBDisplay();

    slider.oninput = updateBBDisplay;

    // 顯示最小和最大值
    const rangeLabels = document.createElement('div');
    rangeLabels.style.display = 'flex';
    rangeLabels.style.justifyContent = 'space-between';
    rangeLabels.style.marginBottom = '5px';

    const minLabel = document.createElement('span');
    minLabel.textContent = `最小: ${(minRaise/gameState.bigBlind).toFixed(1)}BB`;
    
    const maxLabel = document.createElement('span');
    maxLabel.textContent = `最大: ${(maxBet/gameState.bigBlind).toFixed(1)}BB`;

    rangeLabels.appendChild(minLabel);
    rangeLabels.appendChild(maxLabel);

    sliderContainer.appendChild(bbDisplay);
    sliderContainer.appendChild(rangeLabels);
    sliderContainer.appendChild(slider);

    // 確認加注按鈕
    const raiseButton = document.createElement('button');
    raiseButton.textContent = '確認加注';
    raiseButton.className = 'action-button';
    raiseButton.style.width = '100%';
    raiseButton.style.marginTop = '10px';
    raiseButton.style.padding = '10px';
    raiseButton.onclick = () => playerAction('raise', parseInt(slider.value));

    sliderContainer.appendChild(raiseButton);
    raiseContainer.appendChild(sliderContainer);
    elements.controls.appendChild(raiseContainer);

    // 添加樣式
    const style = document.createElement('style');
    style.textContent = `
        .action-button {
            background-color: #e74c3c;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
        }
        .action-button:hover {
            background-color: #c0392b;
        }
        input[type=range] {
            -webkit-appearance: none;
            margin: 18px 0;
            width: 100%;
        }
        input[type=range]::-webkit-slider-runnable-track {
            width: 100%;
            height: 8px;
            cursor: pointer;
            background: #3498db;
            border-radius: 4px;
        }
        input[type=range]::-webkit-slider-thumb {
            height: 24px;
            width: 24px;
            border-radius: 12px;
            background: #2980b9;
            cursor: pointer;
            -webkit-appearance: none;
            margin-top: -8px;
        }
    `;
    document.head.appendChild(style);
}

// 根據遊戲階段獲取加注選項
function getBettingOptionsForStage() {
    if (gameState.stage === STAGES.PREFLOP) {
        return [
            { text: "2BB", multiplier: 2, isPercent: false },
            { text: "3BB", multiplier: 3, isPercent: false },
            { text: "4BB", multiplier: 4, isPercent: false },
            { text: "pot", multiplier: 3.5, isPercent: false }
        ];
    } else {
        return [
            { text: "底池33%", multiplier: 0.33, isPercent: true },
            { text: "底池50%", multiplier: 0.5, isPercent: true },
            { text: "底池75%", multiplier: 0.75, isPercent: true },
            { text: "滿池", multiplier: 1, isPercent: true }
        ];
    }
}

// 設置加注金額
function setRaiseAmount(amount) {
  const input = document.getElementById('raiseInput');
  if (input) {
      input.value = amount;
  }
}

// 開始遊戲函數
async function startGame() {
    console.log('Starting game...');
    try {
        console.log('Initializing game state...');
        // 隱藏開始按鈕
        if (elements.startButton) {
            elements.startButton.style.display = 'none';
        }
        initializeGameState();
        
        // 先調用 API
        console.log('Calling start game API...');
        const result = await apiStartGame(1, gameState.playerChips);
        console.log('API response:', result);
        currentGameId = result.gameId;
        console.log('Game ID:', currentGameId);
        
        // 然後開始新回合
        startNewRound();
    } catch (error) {
        console.error('開始遊戲失敗:', error);
    }
}

// 開始新的一輪
function startNewRound() {
    gameState.currentHandActions = [];
    gameState.handNumber++;
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
  
  // 記錄盲注
  if (gameState.isPlayerSmallBlind) {
        logAction('玩家', '小盲注', gameState.smallBlind);
        logAction('電腦', '大盲注', gameState.bigBlind);
    } else {
        logAction('電腦', '小盲注', gameState.smallBlind);
        logAction('玩家', '大盲注', gameState.bigBlind);
}

updatePositionMarkers();

  // preflop 階段和之後的所有階段都由小盲位先行動
  gameState.isPlayerTurn = gameState.isPlayerSmallBlind;
  gameState.roundFirstAction = true;
  gameState.needResponse = false;
  
  updatePositionMarkers();
  
  // 更新顯示
  if (gameState.isPlayerTurn) {
      setGameStatus('請選擇行動');
  } else {
      setGameStatus('電腦思考中...');
      setTimeout(() => {
          botDecision();
      }, 1000);
  }
  updateDisplay();
}

// 處理玩家行動
function playerAction(action, raiseAmount = null) {
    // 檢查是否可以棄牌
    if (action === 'fold' && !gameState.needResponse && !gameState.currentBet) {
        alert('目前無人加注，不能棄牌');
        return;
    }

    switch (action) {
        case 'fold':
            setGameStatus('玩家選擇棄牌，電腦獲勝！');
            gameState.botChips += gameState.pot;
            gameState.pot = 0;
            gameState.isPlayerTurn = false;
            elements.controls.style.display = 'none';
            updateDisplay();
            setTimeout(resetGame, 2000);
            break;
            
        case 'call':
            handlePlayerCall();
            break;

        case 'raise':
            handlePlayerRaise(raiseAmount);
            break;
    }
    
    updateDisplay();
}

function handlePlayerCall() {
    // 翻牌前小盲位的首次行動
    if (gameState.stage === STAGES.PREFLOP && gameState.isPlayerSmallBlind && gameState.roundFirstAction) {
        // 小盲位第一次行動時，需要補齊到大盲注金額
        const callAmount = gameState.bigBlind - gameState.smallBlind;
        gameState.playerChips -= callAmount;
        gameState.pot += callAmount;
        setGameStatus(`玩家選擇補齊大盲 1BB`);
        logAction('玩家', '跟注', gameState.bigBlind);
        gameState.roundFirstAction = false;
        gameState.isPlayerTurn = false;
        updateDisplay();
        
        setTimeout(() => {
            setGameStatus('電腦思考中...');
            setTimeout(botDecision, 1000);
        }, 1000);
    } 
    // 新增檢查：如果是在翻牌後的新一輪
    else if (!gameState.needResponse && !gameState.currentBet) {
        setGameStatus('玩家選擇 check');
        logAction('玩家', 'Check');
        gameState.roundFirstAction = false;
        gameState.isPlayerTurn = false;
        updateDisplay();
        
        // 直接轉給電腦行動
        setTimeout(() => {
            setGameStatus('電腦思考中...');
            setTimeout(botDecision, 1000);
        }, 1000);
    }
    // 大盲位第一次行動直接 check
    else if (gameState.stage === STAGES.PREFLOP && !gameState.isPlayerSmallBlind && gameState.roundFirstAction) {
        setGameStatus('玩家選擇 check');
        logAction('玩家', 'Check');
        gameState.roundFirstAction = false;
        gameState.needResponse = false;  
        gameState.currentBet = 0;      
        gameState.isPlayerTurn = false;
        updateDisplay();
        
        setTimeout(() => {
            handleRoundEnd();
        }, 1500);
    }
    // 一般的跟注情况
    else {
        const callAmount = gameState.currentBet - (gameState.stage === STAGES.PREFLOP && !gameState.isPlayerSmallBlind ? gameState.bigBlind : 0);
        if (callAmount > gameState.playerChips) {
            handleAllIn('player', gameState.playerChips);
            return;
        }
        
        gameState.playerChips -= callAmount;
        gameState.pot += callAmount;
        const bbAmount = (callAmount / gameState.bigBlind).toFixed(1);
        setGameStatus(`玩家选择跟注 ${bbAmount}BB`);
        logAction('玩家', '跟注', callAmount);
        gameState.needResponse = false;
        gameState.isPlayerTurn = false;
        updateDisplay();
        
        setTimeout(() => {
            handleRoundEnd();
        }, 1500);
    }
}

// 處理玩家加注
function handlePlayerRaise(raiseAmount) {
    if (!raiseAmount || raiseAmount > gameState.playerChips) {
        alert('無效的加注金額');
        return;
    }
    
    if (raiseAmount === gameState.playerChips) {
        // 處理 all-in 情況
        handleAllIn('player', raiseAmount);
        return;
    }
    
    gameState.playerChips -= raiseAmount;
    gameState.pot += raiseAmount;
    gameState.currentBet = raiseAmount;
    gameState.lastRaise = raiseAmount - gameState.currentBet;
    gameState.needResponse = true;
    gameState.roundFirstAction = false;
    gameState.isPlayerTurn = false;
    
    const bbRaiseAmount = (raiseAmount / gameState.bigBlind).toFixed(1);
    setGameStatus(`玩家選擇加注 ${bbRaiseAmount}BB ($${raiseAmount})`);
    logAction('玩家', '加注', raiseAmount);
    updateDisplay();
    
    setTimeout(() => {
        setGameStatus('電腦思考中...');
        setTimeout(botDecision, 1000);
    }, 1000);
}

// 電腦決策
function botDecision() {
    // 如果是翻牌前小盲位的第一次行動
    if (gameState.stage === STAGES.PREFLOP && !gameState.isPlayerSmallBlind && gameState.roundFirstAction) {
        // 補齊大盲
        const callAmount = gameState.bigBlind - gameState.smallBlind;
        gameState.botChips -= callAmount;
        gameState.pot += callAmount;
        setGameStatus('電腦選擇跟注');
        logAction('電腦', '跟注', callAmount);
        gameState.roundFirstAction = false;
        setTimeout(() => {
            gameState.isPlayerTurn = true;
            setGameStatus('輪到玩家行動');
            updateDisplay();
        }, 1500);
        return;
    }

    const randomAction = Math.random();
    
    // 如果沒有當前下注（可以check的情況）
    if (!gameState.currentBet && !gameState.needResponse) {
        if (randomAction < 0.4) {
            setGameStatus('電腦選擇 check');
            logAction('電腦', 'Check');
            gameState.isPlayerTurn = true;
            gameState.roundFirstAction = false;
            
            if (gameState.stage === STAGES.RIVER) {
                setTimeout(() => {
                    handleRoundEnd();
                }, 1500);
            } else {
                setTimeout(() => {
                    if (gameState.isPlayerTurn) {
                        setGameStatus('輪到玩家行動');
                        updateDisplay();
                    } else {
                        handleRoundEnd();
                    }
                }, 1500);
            }
        } else {
            // 選擇加注
            const betAmount = gameState.bigBlind;
            if (betAmount <= gameState.botChips) {
                gameState.botChips -= betAmount;
                gameState.pot += betAmount;
                gameState.currentBet = betAmount;
                gameState.needResponse = true;
                setGameStatus(`電腦選擇加注 ${amountToBB(betAmount, gameState.bigBlind)}BB`);
                logAction('電腦', '加注', betAmount);
                
                setTimeout(() => {
                    gameState.isPlayerTurn = true;
                    setGameStatus('輪到玩家行動');
                    updateDisplay();
                }, 1500);
            } else {
                // 如果沒有足夠籌碼加注，改為 check
                setGameStatus('電腦選擇 check');
                logAction('電腦', 'Check');
                gameState.isPlayerTurn = true;
                
                setTimeout(() => {
                    handleRoundEnd();
                }, 1500);
            }
        }
    } else {
        handleBotResponse(randomAction);
    }
    updateDisplay();
}


// 處理電腦的首次行動
function handleBotFirstAction(randomAction) {
    if (!gameState.isPlayerSmallBlind && gameState.stage === STAGES.PREFLOP && gameState.roundFirstAction) {
        // 電腦在小盲位第一次行動
        const callAmount = gameState.bigBlind - gameState.smallBlind;
        gameState.botChips -= callAmount;
        gameState.pot += callAmount;
        setGameStatus(`電腦選擇補齊大盲 1BB`);
        logAction('電腦', '跟注', gameState.bigBlind); // 記錄總共跟注金額為 1BB
        
        setTimeout(() => {
            gameState.isPlayerTurn = true;
            gameState.roundFirstAction = true;
            setGameStatus('輪到玩家行動');
            updateDisplay();
        }, 1500);
    } else {
        // 改為至少加注 1BB
        const betAmount = Math.max(gameState.bigBlind, 1);  // 確保最低為 1BB
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
        logAction('電腦', '加注', betAmount);
    }
}

// 處理電腦的回應
function handleBotResponse(randomAction) {
    if (gameState.currentBet >= gameState.botChips) {
        handleAllIn('bot', gameState.botChips);
        return;
    }

    if (randomAction < 0.2 && gameState.needResponse) {
        setGameStatus('電腦選擇棄牌，玩家獲勝！');
        logAction('電腦', '棄牌');
        gameState.playerChips += gameState.pot;
        gameState.pot = 0;
        gameState.isPlayerTurn = false;
        elements.controls.style.display = 'none';
        updateDisplay();
        setTimeout(resetGame, 2000);
    }
    else if (randomAction < 0.7 || gameState.lastRaise > gameState.botChips / 4) {
        const callAmount = gameState.currentBet;
        gameState.botChips -= callAmount;
        gameState.pot += callAmount;
        setGameStatus(`電腦選擇跟注 ${amountToBB(callAmount, gameState.bigBlind)}`);
        logAction('電腦', '跟注', callAmount);
        gameState.needResponse = false;
        
        if (gameState.stage === STAGES.RIVER) {
            setTimeout(() => {
                gameState.stage = STAGES.SHOWDOWN;
                determineWinner();
                setTimeout(resetGame, 3000);
            }, 1500);
        } else {
            setTimeout(() => {
                handleRoundEnd();
            }, 1500);
        }
    }
    else {
        handleBotRaise();
    }
    updateDisplay();
}


// 處理電腦加注
function handleBotRaise() {
    // 確保加注金額至少為 1BB
    const currentRaiseAmount = Math.max(gameState.currentBet * 2, gameState.bigBlind);
    if (currentRaiseAmount > gameState.botChips) {
        // 如果沒有足夠籌碼加注，改為 all-in
        handleAllIn('bot', gameState.botChips);
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

// 新增：處理 All-in 情況
function handleAllIn(player, amount) {
    const playerType = player === 'player' ? '玩家' : '電腦';
    setGameStatus(`${playerType}選擇 All-in！`);
    logAction(playerType, 'All-in', amount);
    
    if (player === 'player') {
        gameState.playerChips -= amount;
        gameState.pot += amount;
        gameState.currentBet = amount;
        gameState.needResponse = true;
        gameState.isPlayerTurn = false;
        
        setTimeout(() => {
            setGameStatus('電腦思考中...');
            setTimeout(botDecision, 1000);
        }, 1000);
    } else {
        gameState.botChips -= amount;
        gameState.pot += amount;
        
        if (amount >= gameState.currentBet) {
            // 如果電腦的 all-in 金額足夠跟注
            setTimeout(() => {
                // 直接發完所有公共牌
                while (gameState.stage !== STAGES.SHOWDOWN) {
                    dealCommunityCards();
                }
                // 進行比牌
                determineWinner();
                setTimeout(resetGame, 3000);
            }, 1500);
        } else {
            // 如果電腦的 all-in 金額不足跟注
            gameState.needResponse = true;
            gameState.isPlayerTurn = true;
            setGameStatus('輪到玩家行動');
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
  
    // 在河牌階段結束時直接進入比牌
    if (gameState.stage === STAGES.RIVER) {
        gameState.stage = STAGES.SHOWDOWN;
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
    
    // 每個新階段都由小盲位先行動
    gameState.isPlayerTurn = gameState.isPlayerSmallBlind;
    
    // 更新顯示和狀態
    if (gameState.isPlayerTurn) {
        setGameStatus('輪到玩家行動');
        updateDisplay();
    } else {
        setGameStatus('電腦思考中...');
        updateDisplay();
        // 確保在非玩家回合時執行電腦決策
        setTimeout(() => {
            if (!gameState.isPlayerTurn) {
                botDecision();
            }
        }, 1000);
    }
}

// 發公共牌
function dealCommunityCards() {
    const stageNames = {
      'flop': '翻牌',
      'turn': '轉牌', 
      'river': '河牌',
      'showdown': '攤牌'
    };
  
    switch (gameState.stage) {
        case STAGES.PREFLOP:
            gameState.communityCards = [
                gameState.deck.pop(),
                gameState.deck.pop(),
                gameState.deck.pop()
            ];
            gameState.stage = STAGES.FLOP;
            // 記錄階段變化
            gameState.currentHandActions.push({
                stageChange: true,
                stage: STAGES.FLOP,
                timestamp: new Date().getTime()
            });
            break;
        case STAGES.FLOP:
            gameState.communityCards.push(gameState.deck.pop());
            gameState.stage = STAGES.TURN;
            // 記錄階段變化
            gameState.currentHandActions.push({
                stageChange: true,
                stage: STAGES.TURN,
                timestamp: new Date().getTime()
            });
            break;
        case STAGES.TURN:
            gameState.communityCards.push(gameState.deck.pop());
            gameState.stage = STAGES.RIVER;
            // 記錄階段變化
            gameState.currentHandActions.push({
                stageChange: true,
                stage: STAGES.RIVER,
                timestamp: new Date().getTime()
            });
            break;
        case STAGES.RIVER:
            gameState.stage = STAGES.SHOWDOWN;
            // 記錄階段變化
            gameState.currentHandActions.push({
                stageChange: true,
                stage: STAGES.SHOWDOWN,
                timestamp: new Date().getTime()
            });
            break;
    }
    updateDisplay();
  }


// 評估一手牌
function evaluateHand(playerCards, communityCards) {
    // 合併所有牌
    const allCards = [...playerCards, ...communityCards];
    
    // 從七張牌中選出最好的五張牌
    const bestHand = findBestHand(allCards);
    
    return bestHand;
}

// 找出最佳的五張牌組合
function findBestHand(cards) {
    let bestRank = 0;
    let bestCards = [];
    
    // 檢查皇家同花順和同花順
    const flushCards = checkFlush(cards);
    if (flushCards) {
        const straightFlush = checkStraightFlush(flushCards);
        if (straightFlush) {
            // 檢查是否是皇家同花順
            if (straightFlush[0].rank === 'A') {
                return {
                    rank: HAND_RANKS.ROYAL_FLUSH,
                    name: HAND_NAMES[HAND_RANKS.ROYAL_FLUSH],
                    cards: straightFlush,
                    type: 'royal_flush'
                };
            }
            return {
                rank: HAND_RANKS.STRAIGHT_FLUSH,
                name: HAND_NAMES[HAND_RANKS.STRAIGHT_FLUSH],
                cards: straightFlush,
                type: 'straight_flush'
            };
        }
    }
    
    // 檢查四條
    const fourOfAKind = checkFourOfAKind(cards);
    if (fourOfAKind) {
        return {
            rank: HAND_RANKS.FOUR_OF_A_KIND,
            name: HAND_NAMES[HAND_RANKS.FOUR_OF_A_KIND],
            cards: fourOfAKind,
            type: 'four_of_a_kind'
        };
    }
    
    // 檢查葫蘆
    const fullHouse = checkFullHouse(cards);
    if (fullHouse) {
        return {
            rank: HAND_RANKS.FULL_HOUSE,
            name: HAND_NAMES[HAND_RANKS.FULL_HOUSE],
            cards: fullHouse,
            type: 'full_house'
        };
    }
    
    // 檢查同花
    if (flushCards) {
        return {
            rank: HAND_RANKS.FLUSH,
            name: HAND_NAMES[HAND_RANKS.FLUSH],
            cards: flushCards.slice(0, 5),
            type: 'flush'
        };
    }
    
    // 檢查順子
    const straight = checkStraight(cards);
    if (straight) {
        return {
            rank: HAND_RANKS.STRAIGHT,
            name: HAND_NAMES[HAND_RANKS.STRAIGHT],
            cards: straight,
            type: 'straight'
        };
    }
    
    // 檢查三條
    const threeOfAKind = checkThreeOfAKind(cards);
    if (threeOfAKind) {
        return {
            rank: HAND_RANKS.THREE_OF_A_KIND,
            name: HAND_NAMES[HAND_RANKS.THREE_OF_A_KIND],
            cards: threeOfAKind,
            type: 'three_of_a_kind'
        };
    }
    
    // 檢查兩對
    const twoPair = checkTwoPair(cards);
    if (twoPair) {
        return {
            rank: HAND_RANKS.TWO_PAIR,
            name: HAND_NAMES[HAND_RANKS.TWO_PAIR],
            cards: twoPair,
            type: 'two_pair'
        };
    }
    
    // 檢查一對
    const onePair = checkOnePair(cards);
    if (onePair) {
        return {
            rank: HAND_RANKS.ONE_PAIR,
            name: HAND_NAMES[HAND_RANKS.ONE_PAIR],
            cards: onePair,
            type: 'one_pair'
        };
    }
    
    // 高牌
    const highCards = getHighCards(cards, 5);
    return {
        rank: HAND_RANKS.HIGH_CARD,
        name: HAND_NAMES[HAND_RANKS.HIGH_CARD],
        cards: highCards,
        type: 'high_card'
    };
}

// 檢查同花
function checkFlush(cards) {
    const suitGroups = {};
    cards.forEach(card => {
        if (!suitGroups[card.suit]) {
            suitGroups[card.suit] = [];
        }
        suitGroups[card.suit].push(card);
    });
    
    for (let suit in suitGroups) {
        if (suitGroups[suit].length >= 5) {
            return sortCardsByRank(suitGroups[suit]);
        }
    }
    return null;
}

// 檢查順子
function checkStraight(cards) {
    const sortedCards = sortCardsByRank(cards);
    const uniqueRanks = Array.from(new Set(sortedCards.map(card => RANK_VALUES[card.rank])));
    
    // 處理 A2345 的特殊順子
    if (uniqueRanks.includes(14)) { // 如果有 A
        uniqueRanks.unshift(1); // 在開頭加入值為 1 的 A
    }
    
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) {
            // 找出對應的實際牌
            const straightRanks = uniqueRanks.slice(i, i + 5);
            const straightCards = [];
            straightRanks.forEach(rankValue => {
                // 處理 A 作為 1 的特殊情況
                const targetRank = rankValue === 1 ? 'A' : 
                    Object.keys(RANK_VALUES).find(key => RANK_VALUES[key] === rankValue);
                const card = sortedCards.find(c => c.rank === targetRank);
                straightCards.push(card);
            });
            return straightCards;
        }
    }
    return null;
}

// 檢查同花順
function checkStraightFlush(flushCards) {
    return checkStraight(flushCards);
}

// 檢查四條
function checkFourOfAKind(cards) {
    const rankGroups = groupCardsByRank(cards);
    
    for (let rank in rankGroups) {
        if (rankGroups[rank].length === 4) {
            // 找出最高的一張單牌
            const kicker = getHighCards(
                cards.filter(card => card.rank !== rank),
                1
            )[0];
            return [...rankGroups[rank], kicker];
        }
    }
    return null;
}

// 檢查葫蘆
function checkFullHouse(cards) {
    const rankGroups = groupCardsByRank(cards);
    let threeOfAKind = null;
    let pair = null;
    
    // 先找三條
    for (let rank in rankGroups) {
        if (rankGroups[rank].length >= 3) {
            threeOfAKind = rankGroups[rank];
            break;
        }
    }
    
    if (threeOfAKind) {
        // 再找對子
        for (let rank in rankGroups) {
            if (rank !== threeOfAKind[0].rank && rankGroups[rank].length >= 2) {
                pair = rankGroups[rank];
                break;
            }
        }
    }
    
    if (threeOfAKind && pair) {
        return [...threeOfAKind.slice(0, 3), ...pair.slice(0, 2)];
    }
    return null;
}

// 檢查三條
function checkThreeOfAKind(cards) {
    const rankGroups = groupCardsByRank(cards);
    
    for (let rank in rankGroups) {
        if (rankGroups[rank].length === 3) {
            // 找出最高的兩張單牌
            const kickers = getHighCards(
                cards.filter(card => card.rank !== rank),
                2
            );
            return [...rankGroups[rank], ...kickers];
        }
    }
    return null;
}

// 檢查兩對
function checkTwoPair(cards) {
    const rankGroups = groupCardsByRank(cards);
    const pairs = [];
    
    for (let rank in rankGroups) {
        if (rankGroups[rank].length >= 2) {
            pairs.push(rankGroups[rank]);
        }
    }
    
    if (pairs.length >= 2) {
        // 排序對子，確保選擇最大的兩對
        pairs.sort((a, b) => RANK_VALUES[b[0].rank] - RANK_VALUES[a[0].rank]);
        // 找出最高的一張單牌
        const kicker = getHighCards(
            cards.filter(card => 
                card.rank !== pairs[0][0].rank && 
                card.rank !== pairs[1][0].rank
            ),
            1
        )[0];
        return [...pairs[0].slice(0, 2), ...pairs[1].slice(0, 2), kicker];
    }
    return null;
}

// 檢查一對
function checkOnePair(cards) {
    const rankGroups = groupCardsByRank(cards);
    
    for (let rank in rankGroups) {
        if (rankGroups[rank].length === 2) {
            // 找出最高的三張單牌
            const kickers = getHighCards(
                cards.filter(card => card.rank !== rank),
                3
            );
            return [...rankGroups[rank], ...kickers];
        }
    }
    return null;
}

// 按照牌面大小排序（A最大）
function sortCardsByRank(cards) {
    return [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
}

// 將牌按點數分組
function groupCardsByRank(cards) {
    const groups = {};
    cards.forEach(card => {
        if (!groups[card.rank]) {
            groups[card.rank] = [];
        }
        groups[card.rank].push(card);
    });
    return groups;
}

// 獲取最大的幾張單牌
function getHighCards(cards, count) {
    return sortCardsByRank(cards).slice(0, count);
}

// 比較兩手牌
function compareHands(hand1, hand2) {
    if (hand1.rank !== hand2.rank) {
        return hand1.rank - hand2.rank;
    }
    
    // 如果牌型相同，比較牌點
    for (let i = 0; i < hand1.cards.length; i++) {
        const value1 = RANK_VALUES[hand1.cards[i].rank];
        const value2 = RANK_VALUES[hand2.cards[i].rank];
        if (value1 !== value2) {
            return value1 - value2;
        }
    }
    
    return 0; // 平局
}

// 修改現有的 determineWinner 函數
function determineWinner() {
    const playerHand = evaluateHand(gameState.playerHand, gameState.communityCards);
    const botHand = evaluateHand(gameState.botHand, gameState.communityCards);
    
    const comparison = compareHands(playerHand, botHand);
    
    // 更新對局結果顯示
    if (comparison > 0) {
        setGameStatus(`玩家獲勝！ ${playerHand.name}`);
        gameState.playerChips += gameState.pot;
    } else if (comparison < 0) {
        setGameStatus(`電腦獲勝！ ${botHand.name}`);
        gameState.botChips += gameState.pot;
    } else {
        setGameStatus('平局！');
        // 平分底池
        const halfPot = Math.floor(gameState.pot / 2);
        gameState.playerChips += halfPot;
        gameState.botChips += gameState.pot - halfPot; // 處理奇數籌碼
    }
    
    gameState.pot = 0;
    updateDisplay();
}

async function resetGame() {
    console.log('Resetting game...');
    if (currentGameId) {
        try {
            console.log('Saving game result...', {
                gameId: currentGameId,
                finalChips: gameState.playerChips
            });
            await apiEndGame(currentGameId, gameState.playerChips);
            console.log('Game result saved successfully');
        } catch (error) {
            console.error('保存遊戲記錄失敗:', error);
        }
    }
    
    // 其他重置邏輯...
    const oldState = {
        playerChips: gameState.playerChips,
        botChips: gameState.botChips,
        isPlayerSmallBlind: !gameState.isPlayerSmallBlind
    };
    
    initializeGameState();
    gameState.playerChips = oldState.playerChips;
    gameState.botChips = oldState.botChips;
    gameState.isPlayerSmallBlind = oldState.isPlayerSmallBlind;
    
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
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    initializeGameState();
    updateDisplay();
});