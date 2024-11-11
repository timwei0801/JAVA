-- 插入測試用戶
INSERT INTO users (username, password_hash, chips) 
VALUES 
('test_user1', 'hashed_password123', 1000),
('test_user2', 'hashed_password456', 1000);

-- 插入測試遊戲記錄
INSERT INTO game_history (player_id, bot_level, initial_chips, final_chips, profit_loss) 
VALUES 
(1, 1, 1000, 1200, 200);

