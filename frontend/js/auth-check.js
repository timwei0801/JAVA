// auth-check.js
import { checkAuthStatus } from './login.js';

// 立即執行驗證
function checkAuth() {
    try {
        const currentUser = checkAuthStatus();
        if (!currentUser) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// 執行驗證
const isAuthenticated = checkAuth();

// 導出驗證結果，以供其他模組使用
export { isAuthenticated };