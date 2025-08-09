document.addEventListener('DOMContentLoaded', () => {
  const els = {
    apiKey: document.getElementById('api-key'),
    question: document.getElementById('user-question'),
    askBtn: document.getElementById('ask-button'),
    answerArea: document.getElementById('response-area'),
    answerContent: document.getElementById('response-content'),
    error: document.getElementById('error-message'),
    loadingIcon: document.querySelector('.loading-icon'),
    clearBtn: document.getElementById('clear-button')
  };

  // Falha rápida se algo essencial não existir
  if (!els.apiKey || !els.question || !els.askBtn || !els.error) {
    alert('IDs não encontrados no HTML. Verifique api-key, user-question, ask-button e error-message.');
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

  function renderAnswer(text) {
    if (!els.answerArea || !els.answerContent) return;
    els.answerContent.textContent = text || '';
    els.answerArea.hidden = !text;
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
    renderAnswer('');

    const error = validate();
    if (error) { showError(error); return; }

    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 800)); // simulação
      renderAnswer(`(Simulado) Resposta para: ${els.question.value.trim()}`);
    } catch {
      showError('Ocorreu um erro ao processar sua solicitação.');
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
    renderAnswer('');
    clearError();
    els.question.focus();
  });

  // Estado inicial
  setLoading(false);
  clearError();
  renderAnswer('');
});


