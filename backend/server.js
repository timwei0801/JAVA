// server.js
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cors = require('cors');
const dotenv = require('dotenv');

// 載入環境變數
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// CORS 設置
app.use(cors({
    origin: 'http://127.0.0.1:5500',  // Live Server 的地址
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 中間件設置
app.use(express.json());
app.use(session({
    secret: 'your_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        sameSite: 'lax'
    }
}));

// PostgreSQL 連接設置
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// 測試數據庫連接
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Successfully connected to database');
    release();
});

// 用戶註冊
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('註冊請求:', { username });
        
        // 檢查用戶名是否已存在
        const userCheck = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        
        if (userCheck.rows.length > 0) {
            console.log('用戶名已存在');
            return res.status(400).json({ error: '用戶名已存在' });
        }
        
        // 密碼加密
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 創建新用戶
        const result = await pool.query(
            'INSERT INTO users (username, password_hash, chips) VALUES ($1, $2, $3) RETURNING user_id, username',
            [username, hashedPassword, 1000]
        );
        
        console.log('新用戶創建成功:', result.rows[0]);
        res.status(201).json({ 
            message: '註冊成功', 
            userId: result.rows[0].user_id 
        });
    } catch (error) {
        console.error('註冊錯誤:', error);
        res.status(500).json({ error: '服務器錯誤' });
    }
});

// 用戶登入
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 查找用戶
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: '用戶名或密碼錯誤' });
        }
        
        const user = result.rows[0];
        
        // 驗證密碼
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: '用戶名或密碼錯誤' });
        }
        
        // 更新最後登入時間
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
            [user.user_id]
        );
        
        // 設置session
        req.session.userId = user.user_id;
        
        res.json({ 
            message: '登入成功',
            userId: user.user_id,
            chips: user.chips
        });
    } catch (error) {
        console.error('登入錯誤:', error);
        res.status(500).json({ error: '服務器錯誤' });
    }
});

// 遊戲歷史記錄
app.post('/api/game/start', async (req, res) => {
    try {
        const userId = req.session.userId;
        console.log('Starting new game for user:', userId);

        const { botLevel, initialChips } = req.body;
        console.log('Game params:', { botLevel, initialChips });
        
        const result = await pool.query(
            'INSERT INTO game_history (player_id, bot_level, initial_chips) VALUES ($1, $2, $3) RETURNING game_id',
            [userId, botLevel, initialChips]
        );
        
        console.log('Game created:', result.rows[0]);
        res.json({ gameId: result.rows[0].game_id });
    } catch (error) {
        console.error('創建遊戲記錄錯誤:', error);
        res.status(500).json({ error: '服務器錯誤' });
    }
});

// 記錄遊戲結果
app.post('/api/game/end', async (req, res) => {
    try {
        const { gameId, finalChips } = req.body;
        console.log('Ending game:', { gameId, finalChips });

        const result = await pool.query(
            'UPDATE game_history SET end_time = CURRENT_TIMESTAMP, final_chips = $1, profit_loss = $1 - initial_chips WHERE game_id = $2 RETURNING *',
            [finalChips, gameId]
        );
        
        console.log('Game updated:', result.rows[0]);
        res.json({ message: '遊戲記錄已更新' });
    } catch (error) {
        console.error('更新遊戲記錄錯誤:', error);
        res.status(500).json({ error: '服務器錯誤' });
    }
});

// 取得用戶資料
app.get('/api/user/profile', async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ error: '請先登入' });
        }

        const result = await pool.query(
            'SELECT username, chips, created_at, last_login FROM users WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: '用戶不存在' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('獲取用戶資料錯誤:', error);
        res.status(500).json({ error: '服務器錯誤' });
    }
});

// 啟動服務器
app.listen(port, () => {
    console.log(`服務器運行在 http://localhost:${port}`);
});