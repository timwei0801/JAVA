// api.js
const API_BASE_URL = 'http://localhost:3000/api';

async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '請求失敗');
        }
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}


// 用戶註冊
async function registerUser(username, password) {
    return await apiRequest('/register', 'POST', { username, password });
}

// 用戶登入
async function loginUser(username, password) {
    return await apiRequest('/login', 'POST', { username, password });
}

// 開始新遊戲
async function startGame(botLevel, initialChips) {
    return await apiRequest('/game/start', 'POST', { botLevel, initialChips });
}

// 結束遊戲
async function endGame(gameId, finalChips) {
    return await apiRequest('/game/end', 'POST', { gameId, finalChips });
}

// 匯出函數
export {
    registerUser,
    loginUser,
    startGame,
    endGame
};