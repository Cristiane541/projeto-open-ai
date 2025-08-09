document.addEventListener('DOMContentLoaded', () => {
    const els = {
        apiKey: document.getElementById('api-key'),
        modelSelect: document.getElementById('model-select'),
        question: document.getElementById('user-question'),
        charCounter: document.getElementById('char-counter'),
        askBtn: document.getElementById('ask-button'),
        clearBtn: document.getElementById('clear-button'),
        copyBtn: document.getElementById('copy-button'),
        answerArea: document.getElementById('response-area'),
        answerContent: document.getElementById('response-content'),
        error: document.getElementById('error-message'),
        loadingIcon: document.querySelector('.loading-icon'),
        // Novos elementos da UI
        historySidebar: document.getElementById('history-sidebar'),
        historyList: document.getElementById('history-list'),
        newChatBtn: document.getElementById('new-chat-button'),
    };

    let isLoading = false;
    let conversations = JSON.parse(localStorage.getItem('gemini-conversations')) || {};
    let activeChatId = localStorage.getItem('gemini-active-chat-id') || null;

    function setLoading(flag) {
        isLoading = flag;
        els.askBtn.disabled = flag;
        if (els.loadingIcon) els.loadingIcon.hidden = !flag;
        const label = els.askBtn.querySelector('.button-text');
        if (label) label.textContent = flag ? 'Carregando...' : 'Enviar';
    }

    function showError(message) {
        els.error.textContent = message || '';
        els.error.hidden = !message;
    }

    function clearError() { showError(''); }

    function clearChatDisplay() {
        if (!els.answerArea || !els.answerContent) return;
        els.answerContent.innerHTML = '';
        els.answerArea.hidden = true;
    }

    function appendMessage(text, sender) {
        if (!els.answerContent) return;
        const messageWrapper = document.createElement('div');
        messageWrapper.className = `message-wrapper ${sender}-wrapper`;
        const messageBubble = document.createElement('div');
        messageBubble.className = `message-bubble message-${sender}`;
        if (sender === 'ai') {
            const pre = document.createElement('pre');
            pre.textContent = text;
            messageBubble.appendChild(pre);
        } else {
            messageBubble.textContent = text;
        }
        messageWrapper.appendChild(messageBubble);
        els.answerContent.appendChild(messageWrapper);
        els.answerArea.hidden = false;
        messageWrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    function updateSidebarVisibility() {
        const hasSavedConversations = Object.values(conversations).some(conv => conv.messages.length > 0);
        els.historySidebar.hidden = !hasSavedConversations;

        // Adiciona ou remove a classe para controlar a largura do container
        document.querySelector('.app-container').classList.toggle('with-sidebar', hasSavedConversations);
    }

    function saveConversations() {
        localStorage.setItem('gemini-conversations', JSON.stringify(conversations));
        updateSidebarVisibility();
    }

    function setActiveChat(chatId) {
        activeChatId = chatId;
        localStorage.setItem('gemini-active-chat-id', chatId);
        renderChatHistory();
        renderConversation();
    }

    function renderConversation() {
        clearChatDisplay();
        if (activeChatId && conversations[activeChatId]) {
            conversations[activeChatId].messages.forEach(msg => {
                appendMessage(msg.text, msg.sender);
            });
        }
    }

    function renderChatHistory() {
        els.historyList.innerHTML = '';
        Object.keys(conversations).forEach(chatId => {
            const conversation = conversations[chatId];
            if (conversation.messages.length === 0) return; // Não mostra chats vazios

            const listItem = document.createElement('li');
            listItem.className = 'history-item';
            listItem.textContent = conversation.title;
            listItem.dataset.chatId = chatId;
            if (chatId === activeChatId) {
                listItem.classList.add('active');
            }
            listItem.addEventListener('click', () => {
                setActiveChat(chatId);
            });
            els.historyList.appendChild(listItem);
        });
    }

    function createNewChat() {
        const newChatId = `chat_${Date.now()}`;
        conversations[newChatId] = {
            title: 'Novo Chat',
            messages: [],
        };
        setActiveChat(newChatId);
    }

    function validate() {
        const q = (els.question.value || '').trim();
        const k = (els.apiKey.value || '').trim();
        if (!k) return 'Preencha a API Key.';
        if (!q) return 'Preencha a pergunta.';
        return '';
    }

    async function handleAsk() {
        clearError();
        if (!activeChatId) {
            createNewChat();
        }
        const error = validate();
        if (error) {
            showError(error);
            return;
        }
        setLoading(true);
        const question = els.question.value.trim();
        const apiKey = els.apiKey.value.trim();
        const model = els.modelSelect.value;
        const currentConversation = conversations[activeChatId];
        appendMessage(question, 'user');
        currentConversation.messages.push({ sender: 'user', text: question });
        if (currentConversation.messages.length === 1) {
            currentConversation.title = question.substring(0, 30) + (question.length > 30 ? '...' : '');
            els.historySidebar.hidden = false; // Mostra a barra na primeira mensagem
        }
        saveConversations();
        renderChatHistory();
        els.question.value = '';
        els.charCounter.textContent = `0 / ${els.question.maxLength}`;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: question }] }]
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const message = errorData?.error?.message || `Erro HTTP: ${response.status}`;
                throw new Error(message);
            }
            const data = await response.json();
            const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (answer) {
                appendMessage(answer, 'ai');
                currentConversation.messages.push({ sender: 'ai', text: answer });
                saveConversations();
            } else {
                throw new Error('A API não retornou uma resposta no formato esperado.');
            }
        } catch (err) {
            console.error('Erro na chamada da API:', err);
            const errorMessage = `Ocorreu um erro: ${err.message}`;
            showError(errorMessage);
            appendMessage(`Desculpe, ${errorMessage}`, 'ai');
            currentConversation.messages.push({ sender: 'ai', text: `Desculpe, ${errorMessage}` });
            saveConversations();
        } finally {
            setLoading(false);
        }
    }

    els.askBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!isLoading) handleAsk();
    });

    els.newChatBtn.addEventListener('click', createNewChat);

    els.clearBtn.addEventListener('click', () => {
        if (activeChatId) {
            if (confirm('Tem certeza de que deseja apagar esta conversa?')) {
                delete conversations[activeChatId];
                saveConversations();
                const remainingIds = Object.keys(conversations);
                const newActiveId = remainingIds.length > 0 ? remainingIds[0] : null;
                setActiveChat(newActiveId);
                if (!newActiveId) {
                    clearChatDisplay();
                    createNewChat(); // Cria um novo chat vazio se todos foram apagados
                }
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';
        if (isCtrlEnter && !isLoading) {
            e.preventDefault();
            handleAsk();
        }
    });

    els.question.addEventListener('input', () => {
        const currentLength = els.question.value.length;
        const maxLength = els.question.maxLength;
        els.charCounter.textContent = `${currentLength} / ${maxLength}`;
    });

    els.apiKey.addEventListener('input', () => {
        localStorage.setItem('gemini-api-key', els.apiKey.value);
    });

    const savedApiKey = localStorage.getItem('gemini-api-key');
    if (savedApiKey) {
        els.apiKey.value = savedApiKey;
    }

    els.copyBtn.addEventListener('click', () => {
        const textToCopy = els.answerContent.textContent;
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = els.copyBtn.querySelector('span').textContent;
            els.copyBtn.querySelector('span').textContent = 'Copiado!';
            els.copyBtn.classList.add('copied');
            els.copyBtn.querySelector('i').className = 'fas fa-check';
            setTimeout(() => {
                els.copyBtn.querySelector('span').textContent = originalText;
                els.copyBtn.classList.remove('copied');
                els.copyBtn.querySelector('i').className = 'fas fa-copy';
            }, 2000);
        }).catch(err => {
            console.error('Falha ao copiar texto: ', err);
            showError('Não foi possível copiar o texto.');
        });
    });

    function initialize() {
        setLoading(false);
        clearError();
        if (Object.keys(conversations).length === 0) {
            createNewChat();
        } else {
            if (!activeChatId || !conversations[activeChatId]) {
                setActiveChat(Object.keys(conversations)[0]);
            } else {
                setActiveChat(activeChatId);
            }
        }
        updateSidebarVisibility();
    }

    initialize();
});


