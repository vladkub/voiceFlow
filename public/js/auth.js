// public/js/auth.js
const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let authListeners = [];
let authCheckPending = false;

// 🔥 Универсальный fetch с обработкой 401
async function fetchWithAuth(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, { 
        ...options, 
        credentials: 'include', 
        headers: { 'Content-Type': 'application/json', ...options.headers } 
    });
    
    // 🔥 Если 401 — очищаем currentUser и уведомляем
    if (response.status === 401) {
        currentUser = null;
        notifyListeners();
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Не авторизован');
    }
    
    if (!response.ok) { 
        const error = await response.json().catch(() => ({})); 
        throw new Error(error.error || 'Ошибка запроса'); 
    }
    return response.json();
}

async function fetchAPI(endpoint, options = {}) {
    return fetchWithAuth(endpoint, options);
}

async function checkAuth() {
    if (authCheckPending) return currentUser;
    authCheckPending = true;
    try { 
        const user = await fetchAPI('/auth/me'); 
        currentUser = user; 
        notifyListeners(); 
        return user; 
    }
    catch (err) { 
        currentUser = null; 
        notifyListeners(); 
        return null; 
    }
    finally { authCheckPending = false; }
}

async function register(name, email, password) { 
    const result = await fetchAPI('/auth/register', { 
        method: 'POST', 
        body: JSON.stringify({ name, email, password }) 
    }); 
    currentUser = result.user; 
    notifyListeners(); 
    return result; 
}

async function login(email, password) { 
    const result = await fetchAPI('/auth/login', { 
        method: 'POST', 
        body: JSON.stringify({ email, password }) 
    }); 
    currentUser = result.user; 
    notifyListeners(); 
    return result; 
}

async function doLogout() {
    try { 
        await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }); 
    }
    catch (e) { console.warn('Logout error:', e); }
    currentUser = null;
    notifyListeners();
}

// 🔥 Обновлённый logout с редиректом
window.logout = async function() {
    await doLogout();
    
    // 🔥 Если на защищённой странице — редирект на главную
    if (window.location.pathname.includes('dashboard')) {
        window.location.href = '/?logged_out=1';
    } else {
        // 🔥 Обновить навигацию на главной
        if (window.refreshAuthNav) window.refreshAuthNav();
    }
};

async function googleLogin() { 
    const { url } = await fetchAPI('/auth/google'); 
    window.location.href = url; 
}

function onAuthChange(callback) { 
    authListeners.push(callback); 
    callback(currentUser, authCheckPending); 
    if (!authCheckPending && currentUser === null) checkAuth(); 
}

function notifyListeners() { 
    authListeners.forEach(cb => { 
        try { cb(currentUser, authCheckPending); } 
        catch (e) { console.error('Auth listener error:', e); } 
    }); 
}

function isAuthenticated() { return currentUser !== null; }
function isAuthChecked() { return authCheckPending; }
function getCurrentUser() { return currentUser; }

window.handleLogin = async function() { 
    const email = document.getElementById('loginEmail')?.value; 
    const password = document.getElementById('loginPassword')?.value; 
    const messageEl = document.getElementById('loginMessage');
    
    if (!email || !password) { 
        if (messageEl) {
            messageEl.textContent = '❌ Заполните email и пароль';
            messageEl.style.background = 'rgba(239,68,68,0.1)';
            messageEl.style.color = '#ef4444';
            messageEl.style.display = 'block';
        } else {
            alert('Заполните email и пароль');
        }
        return; 
    } 
    
    try { 
        const result = await login(email, password); 
        
        if (messageEl) {
            messageEl.textContent = '✅ Успешный вход!';
            messageEl.style.background = 'rgba(34,197,94,0.1)';
            messageEl.style.color = '#22c55e';
            messageEl.style.display = 'block';
        }
        
        setTimeout(() => {
            if (typeof closeLoginModal === 'function') closeLoginModal();
            if (window.refreshAuthNav) window.refreshAuthNav();
            
            // 🔥 Открываем чат с user_id в URL
            const userId = result.user?.id;
            if (userId) {
                window.open(`http://localhost:8000/ui?user_id=${userId}`, '_blank');
            } else {
                window.location.href = '/dashboard.html';
            }
        }, 1000);
        
    } catch (err) { 
        if (messageEl) {
            messageEl.textContent = '❌ ' + err.message;
            messageEl.style.background = 'rgba(239,68,68,0.1)';
            messageEl.style.color = '#ef4444';
            messageEl.style.display = 'block';
        } else {
            alert(err.message);
        }
    } 
};

window.handleRegister = async function() { 
    const name = document.getElementById('regName')?.value; 
    const email = document.getElementById('regEmail')?.value; 
    const password = document.getElementById('regPassword')?.value; 
    const messageEl = document.getElementById('registerMessage');
    
    if (!name || !email || !password) { 
        if (messageEl) {
            messageEl.textContent = '❌ Заполните все поля';
            messageEl.style.background = 'rgba(239,68,68,0.1)';
            messageEl.style.color = '#ef4444';
            messageEl.style.display = 'block';
        } else {
            alert('Заполните все поля');
        }
        return; 
    } 
    
    try { 
        await register(name, email, password); 
        
        if (messageEl) {
            messageEl.textContent = '✅ Аккаунт создан!';
            messageEl.style.background = 'rgba(34,197,94,0.1)';
            messageEl.style.color = '#22c55e';
            messageEl.style.display = 'block';
        }
        
        setTimeout(() => {
            if (typeof closeRegisterModal === 'function') closeRegisterModal();
            if (typeof openLoginModal === 'function') {
                openLoginModal();
                document.getElementById('loginEmail').value = email;
            }
        }, 1500);
        
    } catch (err) { 
        if (messageEl) {
            messageEl.textContent = '❌ ' + err.message;
            messageEl.style.background = 'rgba(239,68,68,0.1)';
            messageEl.style.color = '#ef4444';
            messageEl.style.display = 'block';
        } else {
            alert(err.message);
        }
    } 
};

window.handleGoogleLogin = function() { googleLogin(); };

// 🔥 Привязка обработчиков через addEventListener (надёжнее чем onclick)
document.addEventListener('DOMContentLoaded', () => {
    // 🔥 Проверка авторизации при загрузке
    checkAuth();
    
    // 🔥 Форма входа - находим по ID кнопки
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            window.handleLogin();
        });
    }
    
    // 🔥 Форма регистрации
    const registerSubmitBtn = document.getElementById('registerSubmitBtn');
    if (registerSubmitBtn) {
        registerSubmitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            window.handleRegister();
        });
    }
    
    // 🔥 Анимация спиннера для кнопок загрузки
    const style = document.createElement('style');
    style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        checkAuth, onAuthChange, isAuthenticated, isAuthChecked, 
        getCurrentUser, doLogout, fetchAPI 
    }; 
}