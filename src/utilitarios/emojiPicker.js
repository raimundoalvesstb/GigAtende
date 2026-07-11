window.GigaEmojiPicker = (function () {
  let pickerEl = null;
  let currentOnSelect = null;
  let allEmojis = []; // Flattened list for search

  // Adiciona CSS necessário ao body de forma isolada
  function injetarEstilos() {
    if (document.getElementById('giga-emoji-picker-styles')) return;
    const style = document.createElement('style');
    style.id = 'giga-emoji-picker-styles';
    style.innerHTML = `
      #giga-whatsapp-emoji-picker {
        position: fixed;
        z-index: 999999;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        width: 320px;
        max-height: 400px;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        overflow: hidden;
      }
      .giga-emoji-header {
        background: #f0f2f5;
        padding: 8px;
        border-bottom: 1px solid #ddd;
        flex-shrink: 0;
      }
      .giga-emoji-nav {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .giga-emoji-nav-btn {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        color: #54656f;
        opacity: 0.6;
        transition: opacity 0.2s, background 0.2s;
      }
      .giga-emoji-nav-btn:hover, .giga-emoji-nav-btn.active {
        opacity: 1;
        background: #e9edef;
      }
      .giga-emoji-search-container {
        position: relative;
      }
      .giga-emoji-search-input {
        width: 100%;
        box-sizing: border-box;
        padding: 6px 12px 6px 30px;
        border-radius: 8px;
        border: 1px solid #d1d7db;
        background: #ffffff;
        font-size: 14px;
        outline: none;
      }
      .giga-emoji-search-input:focus {
        border-color: #00a884;
      }
      .giga-emoji-search-icon {
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 14px;
        pointer-events: none;
        opacity: 0.5;
      }
      .giga-emoji-body {
        flex-grow: 1;
        overflow-y: auto;
        padding: 8px;
        background: #ffffff;
      }
      .giga-emoji-body::-webkit-scrollbar {
        width: 6px;
      }
      .giga-emoji-body::-webkit-scrollbar-thumb {
        background: #cccccc;
        border-radius: 3px;
      }
      .giga-emoji-category-title {
        font-size: 12px;
        font-weight: 600;
        color: #8696a0;
        margin: 8px 0 4px 4px;
        text-transform: uppercase;
      }
      .giga-emoji-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 2px;
      }
      .giga-emoji-btn {
        background: none;
        border: none;
        font-size: 20px;
        padding: 4px;
        cursor: pointer;
        border-radius: 4px;
        text-align: center;
        transition: background 0.1s;
      }
      .giga-emoji-btn:hover {
        background: #f0f2f5;
      }
      .giga-emoji-empty {
        text-align: center;
        padding: 20px;
        color: #8696a0;
        font-size: 13px;
      }
    `;
    document.head.appendChild(style);
  }

  function fechar() {
    if (pickerEl) {
      pickerEl.remove();
      pickerEl = null;
    }
    document.removeEventListener('click', cliqueFora, true);
  }

  function cliqueFora(e) {
    if (pickerEl && !pickerEl.contains(e.target)) {
      fechar();
    }
  }

  function renderizarCorpo(categorias, termoBusca = '') {
    const container = pickerEl.querySelector('.giga-emoji-body');
    let html = '';

    termoBusca = termoBusca.toLowerCase().trim();

    if (termoBusca) {
      // Filtrar
      const filtrados = allEmojis.filter(e => e.k.includes(termoBusca));
      if (filtrados.length === 0) {
        html = '<div class="giga-emoji-empty">Nenhum emoji encontrado</div>';
      } else {
        html += '<div class="giga-emoji-category-title">Resultados da busca</div>';
        html += '<div class="giga-emoji-grid">';
        filtrados.forEach(e => {
          html += `<button class="giga-emoji-btn" data-emoji="${e.char}" title="${e.k}">${e.char}</button>`;
        });
        html += '</div>';
      }
    } else {
      // Mostrar normal
      categorias.forEach(cat => {
        if (!cat.emojis || cat.emojis.length === 0) return;
        html += `<div id="giga-cat-${cat.id}" class="giga-emoji-category-title">${cat.name}</div>`;
        html += '<div class="giga-emoji-grid">';
        cat.emojis.forEach(e => {
          const char = typeof e === 'string' ? e : e.char;
          const k = typeof e === 'string' ? '' : e.k;
          html += `<button class="giga-emoji-btn" data-emoji="${char}" title="${k}">${char}</button>`;
        });
        html += '</div>';
      });
    }

    container.innerHTML = html;
  }

  function inicializarDados(recentes) {
    allEmojis = [];
    const catData = [];

    // Adiciona Recentes como primeira categoria se houver
    if (recentes && recentes.length > 0) {
      catData.push({
        id: 'recent',
        name: 'Recentes',
        icon: '🕐',
        emojis: recentes.map(r => ({ char: r, k: 'recente' }))
      });
    }

    // Adiciona as categorias base
    const baseData = window.GigaEmojiData || [];
    baseData.forEach(cat => {
      catData.push(cat);
      cat.emojis.forEach(e => allEmojis.push(e));
    });

    return catData;
  }

  function abrir(ancora, recentes, onSelectCallback) {
    fechar();
    injetarEstilos();

    currentOnSelect = onSelectCallback;
    const catData = inicializarDados(recentes);

    pickerEl = document.createElement('div');
    pickerEl.id = 'giga-whatsapp-emoji-picker';
    
    // Header
    let navHtml = '<div class="giga-emoji-nav">';
    catData.forEach((cat, idx) => {
      navHtml += `<button class="giga-emoji-nav-btn ${idx===0?'active':''}" data-target="giga-cat-${cat.id}" title="${cat.name}">${cat.icon}</button>`;
    });
    navHtml += '</div>';

    pickerEl.innerHTML = `
      <div class="giga-emoji-header">
        ${navHtml}
        <div class="giga-emoji-search-container">
          <span class="giga-emoji-search-icon">🔍</span>
          <input type="text" class="giga-emoji-search-input" placeholder="Pesquisar emoji" />
        </div>
      </div>
      <div class="giga-emoji-body"></div>
    `;

    document.body.appendChild(pickerEl);
    renderizarCorpo(catData);

    // Posicionamento
    const rect = ancora.getBoundingClientRect();
    const left = Math.max(4, Math.min(rect.left, window.innerWidth - 324));
    const topPos = (rect.bottom + 6 < window.innerHeight - 400) ? rect.bottom + 6 : Math.max(4, rect.top - 406);
    pickerEl.style.left = left + 'px';
    pickerEl.style.top = topPos + 'px';

    // Eventos
    pickerEl.addEventListener('click', e => {
      const btnEmoji = e.target.closest('.giga-emoji-btn');
      if (btnEmoji) {
        if (currentOnSelect) currentOnSelect(btnEmoji.dataset.emoji);
        return;
      }

      const btnNav = e.target.closest('.giga-emoji-nav-btn');
      if (btnNav) {
        const targetId = btnNav.dataset.target;
        const targetEl = pickerEl.querySelector('#' + targetId);
        if (targetEl) {
          const body = pickerEl.querySelector('.giga-emoji-body');
          body.scrollTo({ top: targetEl.offsetTop - body.offsetTop, behavior: 'smooth' });
          
          pickerEl.querySelectorAll('.giga-emoji-nav-btn').forEach(b => b.classList.remove('active'));
          btnNav.classList.add('active');
        }
      }
    });

    // Pesquisa
    const inputBusca = pickerEl.querySelector('.giga-emoji-search-input');
    inputBusca.addEventListener('input', e => {
      renderizarCorpo(catData, e.target.value);
    });

    // Impede que clique no input propague e feche (se houver outro listener)
    pickerEl.addEventListener('click', e => e.stopPropagation());

    setTimeout(() => {
      document.addEventListener('click', cliqueFora, { capture: true });
    }, 50);
  }

  return {
    abrir,
    open: abrir,
    fechar,
    close: fechar
  };
})();
