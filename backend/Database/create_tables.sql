-- 首先刪除現有表
DROP TABLE IF EXISTS action_history;
DROP TABLE IF EXISTS hand_history;
DROP TABLE IF EXISTS game_history;
DROP TABLE IF EXISTS users;

-- 然後創建用戶表
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    chips INT DEFAULT 1000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- 創建遊戲歷史記錄表
CREATE TABLE game_history (
    game_id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES users(user_id),
    bot_level INTEGER,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    initial_chips INTEGER,
    final_chips INTEGER,
    profit_loss INTEGER
);

-- 創建牌局記錄表
CREATE TABLE hand_history (
    hand_id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES game_history(game_id),
    hand_number INTEGER,
    player_position VARCHAR(10),
    player_cards VARCHAR(10),
    community_cards VARCHAR(25),
    pot_size INTEGER,
    result VARCHAR(20)
);

-- 創建動作記錄表
CREATE TABLE action_history (
    action_id SERIAL PRIMARY KEY,
    hand_id INTEGER REFERENCES hand_history(hand_id),
    street VARCHAR(10),
    actor VARCHAR(10),
    action_type VARCHAR(20),
    amount INTEGER,
    time_stamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);