let loginModal, registerModal, appModal;

function openLoginModal() { if (loginModal) loginModal.style.display = 'flex'; }
function closeLoginModal() { if (loginModal) loginModal.style.display = 'none'; }
function openRegisterModal() { closeLoginModal(); if (registerModal) registerModal.style.display = 'flex'; }
function closeRegisterModal() { if (registerModal) registerModal.style.display = 'none'; }
function openAppModal() { if (appModal) appModal.style.display = 'flex'; }
function closeAppModal() { if (appModal) appModal.style.display = 'none'; }

document.addEventListener('DOMContentLoaded', () => {
    loginModal = document.getElementById('loginModal');
    registerModal = document.getElementById('registerModal');
    appModal = document.getElementById('appModal');
    
    const authBtn = document.getElementById('authBtn');
    const heroLaunchBtn = document.getElementById('heroLaunchBtn');
    const dashboardLaunchBtn = document.getElementById('dashboardLaunchBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (authBtn) {
        authBtn.addEventListener('click', () => {
            if (window.isAuthenticated && window.isAuthenticated()) {
                window.location.href = '/dashboard.html';
            } else {
                openLoginModal();
            }
        });
    }
    
    if (heroLaunchBtn) heroLaunchBtn.addEventListener('click', openAppModal);
    if (dashboardLaunchBtn) dashboardLaunchBtn.addEventListener('click', openAppModal);
    if (logoutBtn) logoutBtn.addEventListener('click', () => window.logout());
    
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) closeLoginModal();
        if (e.target === registerModal) closeRegisterModal();
        if (e.target === appModal) closeAppModal();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (appModal && appModal.style.display === 'flex') closeAppModal();
        }
    });
    
    const googleBtns = document.querySelectorAll('#googleLoginBtn, #googleRegisterBtn');
    googleBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', () => window.handleGoogleLogin());
    });
});

window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.closeAppModal = closeAppModal;