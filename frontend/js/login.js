// login.js
import { registerUser, loginUser } from './api.js';

let isLoginMode = true;

// 檢查登入狀態的函數
export function checkAuthStatus() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'login.html';
    }
    return currentUser;
}

// 只在 login.html 頁面執行的初始化邏輯
function initializeLoginPage() {
    // 獲取所有需要的元素
    const authForm = document.getElementById('authForm');
    const formTitle = document.getElementById('formTitle');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const submitButton = document.getElementById('submitButton');
    const switchModeBtn = document.getElementById('switchModeBtn');
    const errorMessage = document.getElementById('errorMessage');

    // 如果不在登入頁面，直接返回
    if (!authForm) return;

    // 切換登入/註冊模式的函數
    function toggleMode() {
        isLoginMode = !isLoginMode;
        formTitle.textContent = isLoginMode ? '登入' : '註冊';
        submitButton.textContent = isLoginMode ? '登入' : '註冊';
        switchModeBtn.textContent = isLoginMode ? '還沒有帳號？立即註冊' : '已有帳號？立即登入';
        confirmPasswordGroup.style.display = isLoginMode ? 'none' : 'block';
        errorMessage.textContent = '';  // 清除錯誤訊息
    }

    // 顯示錯誤信息
    function showError(message, type = 'error') {
        errorMessage.textContent = message;
        errorMessage.style.color = type === 'success' ? '#28a745' : '#dc3545';
    }

    // 表單提交處理
    async function handleSubmit(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        try {
            if (isLoginMode) {
                const result = await loginUser(username, password);
                localStorage.setItem('currentUser', username);
                localStorage.setItem('userId', result.userId);
                window.location.href = 'poker_2.html';
            } else {
                // 註冊邏輯
                if (password !== confirmPassword) {
                    showError('密碼確認不符');
                    return;
                }
                const result = await registerUser(username, password);
                console.log('註冊結果:', result);
                showError('註冊成功！請登入', 'success');
                isLoginMode = true;
                toggleMode();
            }
        } catch (error) {
            console.error('Error:', error);
            showError(error.message || '操作失敗');
        }
    }

    // 註冊事件監聽器
    switchModeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        toggleMode();
    });

    authForm.addEventListener('submit', handleSubmit);
}

// 在 DOM 載入完成後初始化登入頁面
document.addEventListener('DOMContentLoaded', function() {
    // 檢查當前是否在登入頁面
    if (document.getElementById('authForm')) {
        initializeLoginPage();
    }
});