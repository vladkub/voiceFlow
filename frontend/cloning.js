/**
 * 🎙️ Voice Cloning Frontend Logic
 * ✅ Загрузка образцов, управление голосами, тестирование
 * ✅ Лимит 10 голосов
 * ✅ Удаление голосов
 */

const API_BASE = '/api/clone';
let voicesList = null, uploadForm = null, dropZone = null, audioInput = null, uploadStatus = null;
let testBtn = null, testResult = null, testStatus = null;

// 🔥 Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // 🔹 Получаем элементы
    voicesList = document.getElementById('voicesList');
    uploadForm = document.getElementById('uploadForm');
    dropZone = document.getElementById('dropZone');
    audioInput = document.getElementById('audioInput');
    uploadStatus = document.getElementById('uploadStatus');
    testBtn = document.getElementById('testBtn');
    testResult = document.getElementById('testResult');
    testStatus = document.getElementById('testStatus');
    
    // 🔹 Проверяем, что элементы найдены
    if (!voicesList || !uploadForm || !dropZone) {
        console.error('❌ Не найдены элементы интерфейса. Проверьте cloning.html');
        return;
    }
    
    loadVoices();
    setupEventListeners();
    checkModelStatus();
});

// 🔥 Настройка обработчиков
function setupEventListeners() {
    // 🔹 Drag & Drop для загрузки
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); });
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'));
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'));
    });
    dropZone.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length) { audioInput.files = files; updateFileName(files[0].name); }
    });
    dropZone.addEventListener('click', () => audioInput.click());
    audioInput.addEventListener('change', e => { if (e.target.files[0]) updateFileName(e.target.files[0].name); });
    
    // 🔹 Отправка формы
    if (uploadForm) uploadForm.addEventListener('submit', async e => { e.preventDefault(); await uploadVoiceSample(); });
    
    // 🔹 Тестирование голоса
    const testVoiceSelect = document.getElementById('testVoice');
    if (testVoiceSelect) testVoiceSelect.addEventListener('change', updateTestButton);
    const testSpeed = document.getElementById('testSpeed');
    if (testSpeed) testSpeed.addEventListener('input', e => { const val = document.getElementById('speedValue'); if (val) val.textContent = e.target.value; });
    if (testBtn) testBtn.addEventListener('click', testClonedVoice);
    
    // 🔹 Проверка модели
    const checkModelBtn = document.getElementById('checkModelBtn');
    if (checkModelBtn) checkModelBtn.addEventListener('click', checkModelStatus);
}

// 🔥 Обновление индикатора лимита голосов
function updateVoiceLimitIndicator(current, max) {
    const countEl = document.getElementById('voiceCount');
    const maxEl = document.getElementById('voiceMax');
    const warningEl = document.getElementById('limitWarning');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadFormEl = document.getElementById('uploadForm');
    
    if (countEl) countEl.textContent = current;
    if (maxEl) maxEl.textContent = max;
    
    if (warningEl && uploadBtn && uploadFormEl) {
        if (current >= max) {
            warningEl.style.display = 'inline';
            uploadBtn.disabled = true;
            uploadFormEl.style.opacity = '0.5';
            uploadFormEl.style.pointerEvents = 'none';
        } else {
            warningEl.style.display = 'none';
            uploadBtn.disabled = false;
            uploadFormEl.style.opacity = '1';
            uploadFormEl.style.pointerEvents = 'auto';
        }
    }
}

function updateFileName(name) {
    const textEl = document.getElementById('dropZoneText');
    if (textEl) {
        textEl.innerHTML = `<strong>✅ ${escapeHtml(name)}</strong>`;
    }
}

function showStatus(element, message, type = 'info') {
    if (!element) return;
    element.textContent = message;
    element.className = `status ${type}`;
    element.classList.remove('hidden');
}

function hideStatus(element) { if (element) element.classList.add('hidden'); }

// 🔥 Загрузка списка голосов
async function loadVoices() {
    if (!voicesList) return;
    try {
        const resp = await fetch(`${API_BASE}/voices`);
        if (!resp.ok) throw new Error('Failed to load voices');
        const data = await resp.json();
        renderVoicesList(data.voices);
        populateTestSelect(data.voices);
    } catch (e) {
        voicesList.innerHTML = `<div style="color: var(--red); text-align: center;">❌ Ошибка загрузки: ${e.message}</div>`;
        console.error('Load voices error:', e);
        // 🔥 Даже при ошибке показываем индикатор (с нулями)
        updateVoiceLimitIndicator(0, 10);
    }
}

function renderVoicesList(voices) {
    if (!voicesList) return;
    
    // 🔥 Обновляем индикатор лимита
    const maxLimit = 10;
    updateVoiceLimitIndicator(voices?.length || 0, maxLimit);
    
    if (!voices || !voices.length) {
        voicesList.innerHTML = `<div style="text-align: center; color: var(--muted); padding: 2rem;">У вас пока нет клонированных голосов.<br>Загрузите образец выше, чтобы начать.</div>`;
        return;
    }
    
    voicesList.innerHTML = voices.map(voice => `
        <div class="voice-item" data-id="${voice.id}">
            <div class="voice-info">
                <div class="voice-name">🎤 ${escapeHtml(voice.name)}</div>
                <div class="voice-meta">
                    ${voice.language === 'auto' ? '🔄 Авто' : (voice.language === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN')}
                    • ${voice.sample_duration?.toFixed(1) || '?'} сек
                    • ${new Date(voice.created_at).toLocaleDateString('ru-RU')}
                </div>
            </div>
            <div class="voice-actions">
                <button class="btn btn-sm" onclick="window.testVoiceFromList('${voice.id}', '${escapeHtml(voice.name)}')">🔊 Тест</button>
                <button class="btn btn-sm btn-red" onclick="window.deleteVoice('${voice.id}', '${escapeHtml(voice.name)}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function populateTestSelect(voices) {
    const select = document.getElementById('testVoice');
    if (!select) return;
    select.innerHTML = '<option value="">-- Выберите голос --</option>' + 
        (voices || []).map(v => `<option value="${v.id}">${escapeHtml(v.name)}</option>`).join('');
    updateTestButton();
}

function updateTestButton() {
    const voiceId = document.getElementById('testVoice')?.value;
    if (testBtn) testBtn.disabled = !voiceId;
}

// 🔥 Загрузка образца голоса
async function uploadVoiceSample() {
    const file = audioInput?.files?.[0];
    const name = document.getElementById('voiceName')?.value.trim();
    const language = document.getElementById('voiceLanguage')?.value;
    
    // 🔥 Проверка обязательных полей
    if (!file) {
        showStatus(uploadStatus, '❌ Выберите аудио-файл', 'error');
        return;
    }
    if (!name) {
        showStatus(uploadStatus, '❌ Введите название голоса', 'error');
        return;
    }
    
    const btn = document.getElementById('uploadBtn');
    const originalBtnText = btn?.innerHTML;
    
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading"></span>Обработка...'; }
        hideStatus(uploadStatus);
        
        console.log('📤 Отправка:', { filename: file.name, size: file.size, name, language });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name);
        formData.append('language', language || 'auto');
        
        const resp = await fetch(`${API_BASE}/upload-sample`, { method: 'POST', body: formData });
        const result = await resp.json().catch(() => ({ detail: 'Unknown error', message: 'Server error' }));
        
        if (resp.ok) {
            showStatus(uploadStatus, `✅ ${result.message}`, 'success');
            
            // 🔥 Обновляем лимит если сервер вернул информацию
            if (result.limit) {
                updateVoiceLimitIndicator(result.limit.current, result.limit.max);
            }
            
            if (uploadForm) uploadForm.reset();
            const dropText = document.getElementById('dropZoneText');
            if (dropText) dropText.innerHTML = '<strong>Перетащите аудио-файл сюда</strong>';
            await loadVoices();
            const testSelect = document.getElementById('testVoice');
            if (testSelect && result.voice_id) { testSelect.value = result.voice_id; updateTestButton(); }
        } else {
            const errorMsg = result.detail || result.message || `Ошибка ${resp.status}`;
            console.error('❌ Server error:', result);
            
            // 🔥 Специальная обработка ошибки лимита
            if (errorMsg.includes('Достигнут лимит') || errorMsg.includes('limit')) {
                showStatus(uploadStatus, `⚠️ ${errorMsg}`, 'error');
                updateVoiceLimitIndicator(10, 10);
            } else {
                showStatus(uploadStatus, `❌ ${errorMsg}`, 'error');
            }
        }
    } catch (e) {
        console.error('❌ Network error:', e);
        showStatus(uploadStatus, `❌ Ошибка сети: ${e.message}`, 'error');
    } finally {
        const btn = document.getElementById('uploadBtn');
        if (btn && originalBtnText) { btn.disabled = false; btn.innerHTML = originalBtnText; }
    }
}

// 🔥 Тестирование голоса
async function testClonedVoice() {
    const voiceId = document.getElementById('testVoice')?.value;
    const text = document.getElementById('testText')?.value.trim();
    const speed = parseFloat(document.getElementById('testSpeed')?.value || 1);
    
    if (!voiceId || !text) {
        showStatus(testStatus, 'Выберите голос и введите текст', 'error');
        return;
    }
    
    const btn = testBtn;
    const originalBtnText = btn?.innerHTML;
    
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading"></span>Генерация...'; }
        hideStatus(testStatus);
        if (testResult) testResult.innerHTML = '';
        
        const resp = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voice_id: voiceId, text, speed })
        });
        
        if (resp.ok) {
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            if (testResult) {
                testResult.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 1rem; margin-top: 1rem;">
                        <button class="btn btn-sm" onclick="this.parentElement.querySelector('audio').play(); this.textContent='▶️ Играет';" onblur="this.textContent='▶️ Воспроизвести'">▶️ Воспроизвести</button>
                        <audio src="${url}" style="flex: 1;"></audio>
                        <a href="${url}" download="cloned_${voiceId}.wav" class="btn btn-sm">⬇️ Скачать</a>
                    </div>`;
            }
            const duration = resp.headers.get('X-Cloning-Duration');
            showStatus(testStatus, `✅ Сгенерировано (${duration || '?'} сек)`, 'success');
        } else {
            const error = await resp.json().catch(() => ({}));
            showStatus(testStatus, `❌ ${error.detail || 'Ошибка генерации'}`, 'error');
        }
    } catch (e) {
        showStatus(testStatus, `❌ Ошибка: ${e.message}`, 'error');
        console.error('Test error:', e);
    } finally {
        if (btn && originalBtnText) { btn.disabled = false; btn.innerHTML = originalBtnText; }
    }
}

// 🔥 Удаление голоса (глобальная функция)
window.deleteVoice = async function(voiceId, voiceName) {
    if (!confirm(`Удалить голос "${voiceName}"?\n\nЭто действие нельзя отменить.`)) return;
    
    try {
        const resp = await fetch(`${API_BASE}/voices/${voiceId}`, { method: 'DELETE' });
        
        if (resp.ok) {
            const result = await resp.json();
            alert(`✅ ${result.message}`);
            
            // 🔥 Обновляем индикатор лимита если сервер вернул информацию
            if (result.limit) {
                updateVoiceLimitIndicator(result.limit.current, result.limit.max);
            }
            
            // 🔥 Перезагружаем список голосов
            await loadVoices();
        } else {
            const error = await resp.json().catch(() => ({}));
            alert(`❌ Ошибка: ${error.detail || 'Не удалось удалить'}`);
        }
    } catch (e) {
        alert(`❌ Ошибка сети: ${e.message}`);
    }
};

// 🔥 Быстрый тест из списка (глобальная функция)
window.testVoiceFromList = function(voiceId, voiceName) {
    const select = document.getElementById('testVoice');
    const textarea = document.getElementById('testText');
    if (select) select.value = voiceId;
    if (textarea) textarea.value = `Привет! Это тест голоса "${voiceName}".`;
    updateTestButton();
    document.querySelector('.test-section')?.scrollIntoView({ behavior: 'smooth' });
    textarea?.focus();
};

// 🔥 Проверка готовности модели
async function checkModelStatus() {
    const btn = document.getElementById('checkModelBtn');
    const statusEl = document.getElementById('modelStatus');
    if (!btn || !statusEl) return;
    
    btn.disabled = true;
    statusEl.classList.remove('hidden');
    statusEl.className = 'status info';
    statusEl.innerHTML = '<span class="loading"></span>Проверка модели...';
    
    try {
        const resp = await fetch(`${API_BASE}/test`);
        const data = await resp.json();
        if (resp.ok) {
            statusEl.className = 'status success';
            statusEl.textContent = `✅ ${data.message}`;
        } else {
            statusEl.className = 'status error';
            statusEl.textContent = `❌ ${data.detail || 'Модель недоступна'}`;
        }
    } catch (e) {
        statusEl.className = 'status error';
        statusEl.textContent = `❌ Ошибка подключения: ${e.message}`;
    } finally {
        btn.disabled = false;
    }
}

// 🔥 Утилита: экранирование HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}