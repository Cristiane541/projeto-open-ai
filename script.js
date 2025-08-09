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
  };

  // Falha rápida se algo essencial não existir
  if (!els.apiKey || !els.modelSelect || !els.question || !els.askBtn || !els.error) {
    alert('IDs não encontrados no HTML. Verifique todos os IDs necessários.');
    return;
  }

  let isLoading = false;

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

  // Limpa todo o histórico do chat da tela
  function clearChat() {
    if (!els.answerArea || !els.answerContent) return;
    els.answerContent.innerHTML = '';
    els.answerArea.hidden = true;
  }
  
  // Adiciona uma nova mensagem (pergunta ou resposta) ao chat
  function appendMessage(text, sender) {
    if (!els.answerContent) return;

    const messageWrapper = document.createElement('div');
    // 'sender' será 'user' ou 'ai'
    messageWrapper.className = `message-wrapper ${sender}-wrapper`;

    const messageBubble = document.createElement('div');
    messageBubble.className = `message-bubble message-${sender}`;

    // Usa <pre> para a resposta da IA para preservar quebras de linha
    if (sender === 'ai') {
      const pre = document.createElement('pre');
      pre.textContent = text;
      messageBubble.appendChild(pre);
    } else {
      messageBubble.textContent = text;
    }

    messageWrapper.appendChild(messageBubble);
    els.answerContent.appendChild(messageWrapper);

    // Garante que a área de chat esteja visível e rola para a nova mensagem
    els.answerArea.hidden = false;
    messageWrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  function validate() {
    const q = (els.question.value || '').trim();
    const k = (els.apiKey.value || '').trim();
    if (!q && !k) return 'Preencha a pergunta e a API Key.';
    if (!q) return 'Preencha a pergunta.';
    if (!k) return 'Preencha a API Key.';
    return '';
  }

  async function handleAsk() {
    clearError();

    const error = validate();
    if (error) {
      showError(error);
      return;
    }

    setLoading(true);

    const question = els.question.value.trim();
    const apiKey = els.apiKey.value.trim();
    const model = els.modelSelect.value;
    
    // Adiciona a mensagem do usuário ao chat imediatamente
    appendMessage(question, 'user');
    
    // Limpa o campo de input e atualiza o contador
    els.question.value = '';
    els.charCounter.textContent = `0 / ${els.question.maxLength}`;

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: question
            }]
          }]
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
      } else {
        throw new Error('A API não retornou uma resposta no formato esperado.');
      }

    } catch (err) {
      console.error('Erro na chamada da API:', err);
      showError(`Ocorreu um erro: ${err.message}`);
      // Adiciona uma mensagem de erro também no chat para feedback visual
      appendMessage(`Desculpe, ocorreu um erro: ${err.message}`, 'ai');
    } finally {
      setLoading(false);
    }
  }

  els.askBtn.addEventListener('click', (e) => {
    e.preventDefault(); // garante que não submeta form
    if (!isLoading) handleAsk();
  });

  document.addEventListener('keydown', (e) => {
    const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';
    if (isCtrlEnter && !isLoading) {
      e.preventDefault();
      handleAsk();
    }
  });

  // limpa a pergunta e a resposta
  els.clearBtn.addEventListener('click', () => {
    els.question.value = '';
    clearChat();
    clearError();
    els.question.focus();
  });

  // Atualiza o contador de caracteres
  els.question.addEventListener('input', () => {
    const currentLength = els.question.value.length;
    const maxLength = els.question.maxLength;
    els.charCounter.textContent = `${currentLength} / ${maxLength}`;
  });

  // Salva a API Key no localStorage 
  els.apiKey.addEventListener('input', () => {
    localStorage.setItem('gemini-api-key', els.apiKey.value);
  });

  
  const savedApiKey = localStorage.getItem('gemini-api-key');
  if (savedApiKey) {
    els.apiKey.value = savedApiKey;
  }

  // Copia a resposta para a área de transferência
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

  // Estado inicial
  setLoading(false);
  clearError();
  clearChat();
});


