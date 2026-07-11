/*
 * Projeto: GigAtende
 * Copyright (c) 2026 Raimundo Alves Santa Brigida
 *
 * Licensed under the PolyForm Noncommercial License 1.0.0.
 *
 * You may use, study, modify and redistribute this software.
 *
 * Commercial use, resale, sublicensing or inclusion in commercial
 * products or services is prohibited.
 *
 * Full license:
 * https://polyformproject.org/licenses/noncommercial/1.0.0/
 */
/**
 * @file src/app/admin/adminMensagens.js
 * @description Lógica do painel de Mensagens Rápidas.
 * Gerencia a renderização, paginação de abas de categorias,
 * campo de busca, marcação de favoritos, edição com preview em tempo real,
 * seletor de emojis e integração com os ícones SVG.
 */
'use strict';

window.AdminMensagens = {
  /** @type {Object} Estado dos filtros ativos no painel de mensagens. */
  filtroMsg: { search: '', categoryId: '', favorite: false },

  /** @type {number} Índice da página atual do carrossel (bar) de categorias. */
  paginaCatAtual: 0,

  /** @type {string|null} ID da mensagem atualmente em edição (modal). */
  msgAtualId: null,


  /** @type {string|null} Identifica onde o emoji deve ser inserido ('title' ou 'content'). */
  alvoEmoji: null,

  /**
   * Inicializa o módulo, conectando os listeners de interface.
   */
  inicializar: function () {
    this.configurarOuvintes();
  },

  /**
   * Renderiza a barra de rolagem horizontal (carrossel) com os "chips" de Categorias
   * permitindo filtrar a listagem de mensagens.
   */
  renderizarFiltrosCategorias: function () {
    const catFilterBar = document.getElementById('catFilterBar');
    if (!catFilterBar) return;

    catFilterBar.innerHTML = '';
    this.paginaCatAtual = this.paginaCatAtual || 0;

    // Constrói a lista combinando a opção "Todas" com as categorias ativas armazenadas
    const todosItens = [
      { id: '', name: 'Todas', count: window.AdminEstado.messages.length, icon: null },
      ...window.AdminEstado.categories.filter(c => c.active).sort((a, b) => (a.order || 0) - (b.order || 0)).map(cat => ({
        id: cat.id,
        name: cat.name,
        count: window.AdminEstado.messages.filter(m => (m.categoryIds || []).includes(cat.id)).length,
        icon: cat.icon || null
      }))
    ];

    if (todosItens.length === 0) {
      this.atualizarBotoesNavCategorias(0);
      return;
    }

    todosItens.forEach(item => {
      catFilterBar.appendChild(this.criarCardFiltroCategoria(item.id, item.name, item.count, item.icon));
    });

    // Lógica de paginação do carrossel baseada no tamanho do viewport
    requestAnimationFrame(() => {
      const viewport = document.getElementById('catFilterViewport');
      if (!viewport || catFilterBar.children.length === 0) return;

      const largura = viewport.clientWidth;
      const maxScroll = Math.max(0, catFilterBar.scrollWidth - largura);
      const totalPaginas = largura > 0 ? Math.ceil(catFilterBar.scrollWidth / largura) : 1;

      if (this.paginaCatAtual >= totalPaginas) this.paginaCatAtual = Math.max(0, totalPaginas - 1);

      let offset = this.paginaCatAtual * largura;
      if (offset > maxScroll) offset = maxScroll;
      if (offset < 0) offset = 0;

      catFilterBar.style.transform = `translateX(-${offset}px)`;
      this.atualizarBotoesNavCategorias(totalPaginas);
    });
  },

  /**
   * Atualiza a exibição dos botões < (Anterior) e > (Próximo) no carrossel de categorias.
   * @param {number} totalPaginas - Total de páginas calculadas pelo requestAnimationFrame.
   */
  atualizarBotoesNavCategorias: function (totalPaginas) {
    const prev = document.getElementById('catFilterPrev');
    const next = document.getElementById('catFilterNext');
    if (prev) prev.style.display = this.paginaCatAtual > 0 ? 'flex' : 'none';
    if (next) next.style.display = this.paginaCatAtual < totalPaginas - 1 ? 'flex' : 'none';
  },

  /**
   * Cria o elemento do botão "chip" de filtro de categoria.
   * @param {string} catId - ID da categoria.
   * @param {string} nome - Nome exibido.
   * @param {number} count - Quantidade de mensagens nela.
   * @param {string} iconId - ID do ícone vinculado.
   * @returns {HTMLElement}
   */
  criarCardFiltroCategoria: function (catId, nome, count, iconId) {
    const card = document.createElement('button');
    card.className = 'cat-filter-card';
    card.dataset.cat = catId;
    card.setAttribute('title', nome);

    let htmlIcone;
    const cat = window.AdminEstado.categories.find(c => c.id === catId);
    const iconColor = (catId === this.filtroMsg.categoryId) ? '#fff' : (cat?.color || '#1565C0');

    if (iconId) {
      const def = window.AdminCategoryIcons.find(i => i.id === iconId);
      htmlIcone = def 
        ? `<svg class="cat-card-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" style="color:${iconColor}">${def.svg}</svg>` 
        : window.AdminUI.getFallbackLogo(iconColor);
    } else {
      htmlIcone = window.AdminUI.getFallbackLogo(iconColor);
    }

    card.innerHTML = `${htmlIcone}<span class="cat-card-name" style="color:${catId === this.filtroMsg.categoryId ? '#fff' : (cat?.color || '#1565C0')}">${window.GigaSanitize.escapeHtml(nome)}</span><span class="cat-card-count">${count}</span>`;

    // Aplica a cor da categoria (se ativa) ao filtro para facilitar identificação visual
    if (catId === this.filtroMsg.categoryId) {
      card.classList.add('active');
      const cat = window.AdminEstado.categories.find(c => c.id === catId);
      if (cat && cat.color) card.style.backgroundColor = cat.color;
      else if (catId === '') card.style.backgroundColor = '#1565C0';
    }

    // Ação ao clicar: define o filtro e re-renderiza
    card.addEventListener('click', () => {
      this.filtroMsg.categoryId = catId;
      this.renderizarFiltrosCategorias();
      this.renderizarMensagens();
    });
    return card;
  },

  /**
   * Lê as mensagens do estado global, aplica os filtros ativos (Busca, Favoritos, Categoria)
   * e renderiza os cartões (cards) na grade principal (Grid).
   */
  renderizarMensagens: function () {
    const mensagensFiltradas = this.aplicarFiltros(window.AdminEstado.messages, this.filtroMsg);
    const grid = document.getElementById('messagesGrid');
    const msgEmptyState = document.getElementById('msgEmptyState');

    if (!grid || !msgEmptyState) return;

    // Esvazia o grid de mensagens
    grid.innerHTML = '';

    // Se não há mensagens após o filtro, mostra o estado vazio (Zero State) de forma segura
    if (mensagensFiltradas.length === 0) {
      grid.style.display = 'none';
      const emptyText = msgEmptyState.querySelector('p');
      if (emptyText) {
        if (this.filtroMsg.categoryId) {
          emptyText.textContent = 'Esta categoria não possui mensagens.';
        } else if (this.filtroMsg.search) {
          emptyText.textContent = 'Nenhuma mensagem encontrada para esta busca.';
        } else {
          emptyText.textContent = 'Nenhuma mensagem encontrada.';
        }
      }
      msgEmptyState.style.display = 'flex';
      return;
    }

    grid.style.display = 'grid';
    msgEmptyState.style.display = 'none';

    // Adiciona os cards construídos ao DOM
    mensagensFiltradas.forEach(msg => { grid.appendChild(this.construirCardMensagem(msg)); });
    
    this.configurarDragAndDrop(grid);
  },

  /**
   * Executa a lógica de filtragem local (in-memory) da matriz de mensagens.
   * @param {Array} msgs - Lista original.
   * @param {Object} filtro - Objeto contendo categoryId, search string e boolean favorite.
   * @returns {Array} Lista filtrada e ordenada.
   */
  aplicarFiltros: function (msgs, filtro) {
    let resultado = [...msgs];

    if (filtro.categoryId) {
      resultado = resultado.filter(m => {
        const cats = Array.isArray(m.categoryIds) ? m.categoryIds : (m.categoryIds ? [m.categoryIds] : []);
        return cats.includes(filtro.categoryId);
      });
    }

    if (filtro.search) {
      const q = filtro.search.toLowerCase();
      resultado = resultado.filter(m => {
        const title = (m.title || '').toLowerCase();
        const content = (m.contentText || m.contentHtml || '').toLowerCase();
        const tags = Array.isArray(m.tags) ? m.tags : (m.tags ? [m.tags] : []);
        return title.includes(q) || content.includes(q) || tags.some(t => (t || '').toLowerCase().includes(q));
      });
    }

    if (filtro.favorite) {
      resultado = resultado.filter(m => m.favorite);
    }

    // A ordem manual do array é absoluta, portanto não ordenamos por favoritos.
    return resultado;

    return resultado;
  },

  /**
   * Constrói o HTML (DOM) para um único cartão de Mensagem.
   * @param {Object} msg - Objeto da mensagem.
   * @returns {HTMLElement} Elemento div pronto para o Grid.
   */
  construirCardMensagem: function (msg) {
    const card = document.createElement('div');
    card.className = 'msg-card';
    card.dataset.id = msg.id;
    card.setAttribute('draggable', 'true');

    const cats = (msg.categoryIds || []).map(cid => window.AdminEstado.categories.find(c => c.id === cid)).filter(Boolean);
    const catBadgesHtml = cats.map(c => `<span class="cat-badge" style="background:${c.color}">${window.GigaSanitize.escapeHtml(c.name)}</span>`).join('');

    const tagsHtml = (msg.tags || []).map(t => `<span class="tag">${window.GigaSanitize.escapeHtml(t)}</span>`).join('');
    const preview = msg.contentText || window.GigaSanitize.htmlToText(msg.contentHtml || '');
    const updated = msg.updatedAt ? new Date(msg.updatedAt).toLocaleDateString('pt-BR') : '';

    const htmlSvgIcone = msg.icon ? `<svg viewBox="0 0 24 24" width="18" height="18" style="vertical-align: middle; margin-right: 4px; color: ${msg.iconColor || '#1565C0'}" xmlns="http://www.w3.org/2000/svg">${((window.AdminIcons || []).find(i => i.id === msg.icon) || { svg: '' }).svg}</svg>` : '';

    card.innerHTML = `
      <div class="msg-card-header">
        <span class="msg-title">${htmlSvgIcone}${window.GigaSanitize.escapeHtml(msg.title)}</span>
        <button class="msg-favorite ${msg.favorite ? 'active' : ''}" data-action="favorite" title="Favorito">
          <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="${msg.favorite ? '#FFA000' : 'none'}" stroke="${msg.favorite ? '#FFA000' : '#BDBDBD'}" stroke-width="1.5"/></svg>
        </button>
      </div>
      ${catBadgesHtml ? `<div class="msg-tags">${catBadgesHtml}</div>` : ''}
      <p class="msg-preview">${window.GigaSanitize.escapeHtml(preview)}</p>
      ${tagsHtml ? `<div class="msg-tags" style="margin-top:2px">${tagsHtml}</div>` : ''}
      <div class="msg-card-footer">
        <span class="msg-meta">${updated}</span>
        <div class="card-actions">
          <button class="btn-action move" style="cursor: grab;" title="Mover mensagem"><svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z" fill="currentColor"/></svg></button>
          <button class="btn-action copy" data-action="copy" title="Copiar"><svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/></svg></button>
          <button class="btn-action dup" data-action="duplicate" title="Duplicar"><svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H14.82C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 13h-5v-2h5v2zm1-4H9v-2h6v2zm0-4H9V8h6v2z" fill="currentColor"/></svg></button>
          <button class="btn-action edit" data-action="edit" title="Editar"><svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg></button>
          <button class="btn-action danger" data-action="delete" title="Excluir"><svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg></button>
        </div>
      </div>`;

    // Event Delegation: Ouvinte geral para os botões do card
    card.addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset?.action;
      if (!action) return;
      e.stopPropagation();
      this.executarAcaoMensagem(action, msg);
    });

    return card;
  },

  /**
   * Roteador de ações executadas a partir de botões em um cartão de Mensagem.
   * @param {string} action - Ação ('edit', 'copy', 'duplicate', 'delete', 'favorite').
   * @param {Object} msg - Objeto da mensagem a ser manipulada.
   * @async
   */
  executarAcaoMensagem: async function (action, msg) {
    if (action === 'edit') {
      this.abrirModalMensagem(msg);
    } else if (action === 'copy') {
      const text = msg.contentText || window.GigaSanitize.htmlToText(msg.contentHtml || '');
      try {
        await navigator.clipboard.writeText(text);
        window.AdminUI.toast('Mensagem copiada para a área de transferência!', 'success');
      } catch (e) {
        window.AdminUI.toast('Não foi possível copiar.', 'error');
      }
    } else if (action === 'duplicate') {
      await window.GigaArmazenamento.duplicarMensagem(msg.id);
      await this.recarregarMensagens();
      window.AdminUI.toast('Mensagem duplicada!', 'success');
    } else if (action === 'delete') {
      window.AdminUI.mostrarConfirmacao('Excluir mensagem', `Deseja excluir "${msg.title}"?`, async () => {
        await window.GigaArmazenamento.excluirMensagem(msg.id);
        await this.recarregarMensagens();
        window.AdminUI.toast('Mensagem excluída.', 'success');
      });
    } else if (action === 'favorite') {
      // Alterna o status do favorito e salva diretamente
      if (!msg.favorite) {
        const totalFavoritos = window.AdminEstado.messages.filter(m => m.favorite).length;
        if (totalFavoritos >= 21) {
          window.AdminUI.toast('Atenção: Você atingiu 21 favoritos. Esta mensagem não aparecerá nas mensagens rápidas do botão flutuante.', 'warning');
        }
      }
      const atualizada = { ...msg, favorite: !msg.favorite };
      await window.GigaArmazenamento.salvarMensagem(atualizada);
      await this.recarregarMensagens();
    }
  },

  /**
   * Dispara o recarregamento do estado global a partir do banco e 
   * redesenha a tela de mensagens e filtros.
   * @async
   */
  recarregarMensagens: async function () {
    await window.AdminEstado.carregarTudo();
    this.renderizarFiltrosCategorias();
    this.renderizarMensagens();
    window.AdminUI.renderizarBadges();
  },

  /**
   * Popula os dados no modal de Adição/Edição de Mensagem.
   * Se 'msg' for null, limpa os campos para criar uma nova.
   * @param {Object|null} msg 
   */
  abrirModalMensagem: function (msg) {
    this.msgAtualId = msg?.id || null;
    document.getElementById('modalMsgTitle').textContent = msg ? 'Editar Mensagem' : 'Nova Mensagem';

    // Atualiza Select de categorias baseado nas categorias ativas daquele momento
    const selCat = document.getElementById('msgCategory');
    selCat.innerHTML = '<option value="">— Sem categoria —</option>';
    window.AdminEstado.categories.filter(c => c.active).forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      selCat.appendChild(opt);
    });

    if (msg) {
      document.getElementById('msgTitle').value = msg.title || '';
      document.getElementById('msgCategory').value = (msg.categoryIds || [])[0] || '';
      document.getElementById('msgTags').value = (msg.tags || []).join(', ');

      // Insere o HTML sanitizado no div contenteditable
      document.getElementById('msgEditor').innerHTML = window.GigaSanitize.sanitizeHtml(msg.contentHtml || '');
      document.getElementById('msgFavorite').checked = !!msg.favorite;

      if (document.getElementById('msgIcon')) document.getElementById('msgIcon').value = msg.icon || '';
      if (document.getElementById('msgIconColor')) document.getElementById('msgIconColor').value = msg.iconColor || '#757575';
      if (document.getElementById('msgIconColorPicker')) document.getElementById('msgIconColorPicker').value = msg.iconColor || '#757575';

      const adminSelectedIconSvg = document.getElementById('adminSelectedIconSvg');
      if (adminSelectedIconSvg) {
        const icon = (window.AdminIcons || []).find(i => i.id === msg.icon);
        adminSelectedIconSvg.innerHTML = icon ? icon.svg : '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>';
        adminSelectedIconSvg.style.color = msg.iconColor || '#757575';
      }
    } else {
      document.getElementById('msgTitle').value = '';
      document.getElementById('msgCategory').value = '';
      document.getElementById('msgTags').value = '';
      document.getElementById('msgEditor').innerHTML = '';
      document.getElementById('msgFavorite').checked = false;

      if (document.getElementById('msgIcon')) document.getElementById('msgIcon').value = '';
      if (document.getElementById('msgIconColor')) document.getElementById('msgIconColor').value = '#757575';

      const adminSelectedIconSvg = document.getElementById('adminSelectedIconSvg');
      if (adminSelectedIconSvg) {
        adminSelectedIconSvg.innerHTML = '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>';
        adminSelectedIconSvg.style.color = '#757575';
      }
    }

    document.getElementById('adminIconPickerPanel').style.display = 'none';
    this.fecharPickerEmoji();
    this.atualizarPrevia();
    document.getElementById('modalMessage').style.display = 'flex';
    document.getElementById('msgTitle').focus();
  },

  /** Fecha o modal sem salvar as edições parciais. */
  fecharModalMensagem: function () {
    document.getElementById('modalMessage').style.display = 'none';
    this.fecharPickerEmoji();
    this.msgAtualId = null;
  },

  /** Dispara a atualização visual do card mockado que mostra como a mensagem ficará (Preview). */
  atualizarPrevia: function () {
    document.getElementById('msgPreview').innerHTML = window.GigaSanitize.sanitizeHtml(document.getElementById('msgEditor').innerHTML);
  },

  /**
   * Extrai dados, sanitiza HTML para segurança, valida regras de negócio 
   * (campos obrigatórios) e persiste a Mensagem criada/editada.
   * @async
   */
  salvarMensagem: async function () {
    const titulo = document.getElementById('msgTitle').value.trim();
    if (!titulo) { window.AdminUI.toast('Título obrigatório.', 'error'); return; }

    const conteudoHtml = window.GigaSanitize.sanitizeHtml(document.getElementById('msgEditor').innerHTML.trim());
    if (!conteudoHtml || conteudoHtml === '<br>') { window.AdminUI.toast('Conteúdo obrigatório.', 'error'); return; }

    const catId = document.getElementById('msgCategory').value;

    const isFavoriteNow = document.getElementById('msgFavorite').checked;
    const msgObj = {
      id: this.msgAtualId || window.GigaArmazenamento.gerarId('msg'),
      title: titulo,
      icon: (document.getElementById('msgIcon')?.value || '').trim() || null,
      iconColor: (document.getElementById('msgIconColor')?.value || '').trim() || null,
      contentHtml: conteudoHtml,
      contentText: window.GigaSanitize.htmlToText(conteudoHtml), // Texto plano p/ facilitar a busca e Ctrl+C nativo
      categoryIds: catId ? [catId] : [],
      tags: document.getElementById('msgTags').value.split(',').map(t => t.trim()).filter(Boolean),
      favorite: isFavoriteNow,
      updatedAt: new Date().toISOString()
    };

    const wasFavorite = this.msgAtualId ? (window.AdminEstado.messages.find(m => m.id === this.msgAtualId)?.favorite || false) : false;
    if (isFavoriteNow && !wasFavorite) {
      const totalFavoritos = window.AdminEstado.messages.filter(m => m.favorite).length;
      if (totalFavoritos >= 21) {
        window.AdminUI.toast('Atenção: Você atingiu 21 favoritos. Esta mensagem não aparecerá nas mensagens rápidas do botão flutuante.', 'warning');
      }
    }

    await window.GigaArmazenamento.salvarMensagem(msgObj);
    await this.recarregarMensagens();
    this.fecharModalMensagem();
    window.AdminUI.toast(this.msgAtualId ? 'Mensagem atualizada!' : 'Mensagem criada!', 'success');
  },

  /**
   * Registra todos os listeners (botões de ação e modais) envolvidos na página de Mensagens.
   */
  configurarOuvintes: function () {
    // Nova Mensagem
    document.getElementById('btnNewMessage')?.addEventListener('click', () => this.abrirModalMensagem(null));
    document.getElementById('btnNewMessageEmpty')?.addEventListener('click', () => this.abrirModalMensagem(null));

    // Filtros principais
    document.getElementById('msgSearch')?.addEventListener('input', e => {
      this.filtroMsg.search = e.target.value;
      this.renderizarMensagens();
    });
    document.getElementById('filterFavorites')?.addEventListener('change', e => {
      this.filtroMsg.favorite = e.target.checked;
      this.renderizarMensagens();
    });

    // Paginação das Categorias
    const catPrev = document.getElementById('catFilterPrev');
    const catNext = document.getElementById('catFilterNext');
    if (catPrev) catPrev.addEventListener('click', () => { if (this.paginaCatAtual > 0) { this.paginaCatAtual--; this.renderizarFiltrosCategorias(); } });
    if (catNext) catNext.addEventListener('click', () => { this.paginaCatAtual++; this.renderizarFiltrosCategorias(); });

    // Modais e Salvar
    document.getElementById('btnCloseMsgModal')?.addEventListener('click', () => this.fecharModalMensagem());
    document.getElementById('btnCancelMsg')?.addEventListener('click', () => this.fecharModalMensagem());
    document.getElementById('btnSaveMsg')?.addEventListener('click', () => this.salvarMensagem());

    const mod = document.getElementById('modalMessage');
    if (mod) mod.addEventListener('click', e => { if (e.target === mod) this.fecharModalMensagem(); });

    // Atualização em Tempo Real do Preview de Mensagem ao Digitar
    document.getElementById('msgEditor')?.addEventListener('input', () => this.atualizarPrevia());

    // Botões nativos de Rich Text (Negrito, Itálico, Sublinhado) usando document.execCommand
    document.querySelectorAll('.toolbar-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.execCommand(btn.dataset.cmd, false, null);
        document.getElementById('msgEditor').focus();
        this.atualizarPrevia();
      });
    });

    // Inserção da variável via botão auxiliar
    const btnMsgPlaceholder = document.getElementById('btnMsgPlaceholder');
    const panelMsgPlaceholder = document.getElementById('placeholderPickerPanel');
    if (btnMsgPlaceholder && panelMsgPlaceholder) {
      btnMsgPlaceholder.addEventListener('click', (e) => {
        e.stopPropagation();
        if (panelMsgPlaceholder.style.display === 'block') {
          panelMsgPlaceholder.style.display = 'none';
          return;
        }

        // Agregar placeholders padrão e de todos os sites
        const allPlaceholders = [
          { id: 'cliente', name: 'Nome do cliente' },
          { id: 'venda_pedido', name: 'Venda/pedido' },
          { id: 'produto', name: 'Produto' }
        ];

        window.AdminEstado.siteProfiles.forEach(sp => {
          if (sp.placeholders) {
            sp.placeholders.forEach(p => {
              if (!allPlaceholders.some(ap => ap.id === p.id)) {
                allPlaceholders.push(p);
              }
            });
          }
        });

        panelMsgPlaceholder.innerHTML = '';
        if (allPlaceholders.length === 0) {
          panelMsgPlaceholder.innerHTML = '<div style="padding:8px; font-size:12px; color:var(--c-text-2);">Nenhum placeholder configurado.</div>';
        } else {
          allPlaceholders.forEach(p => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.style.cssText = 'display:block; width:100%; text-align:left; padding:6px 8px; font-size:12px; background:none; border:none; cursor:pointer; color:var(--c-text); border-radius:4px;';
            btn.innerHTML = `<strong>${window.GigaSanitize.escapeHtml(p.name)}</strong> <span style="color:var(--c-text-2);font-size:10px;">[${p.id}]</span>`;

            btn.addEventListener('mouseenter', () => btn.style.background = 'var(--c-bg-subtle)');
            btn.addEventListener('mouseleave', () => btn.style.background = 'none');

            btn.addEventListener('click', () => {
              const editor = document.getElementById('msgEditor');
              editor.focus();
              document.execCommand('insertText', false, `[${p.id}]`);
              this.atualizarPrevia();
              panelMsgPlaceholder.style.display = 'none';
            });
            panelMsgPlaceholder.appendChild(btn);
          });
        }
        panelMsgPlaceholder.style.display = 'block';
      });

      // Fecha o dropdown se clicar fora
      document.addEventListener('click', (e) => {
        if (!panelMsgPlaceholder.contains(e.target) && e.target !== btnMsgPlaceholder) {
          panelMsgPlaceholder.style.display = 'none';
        }
      });
    }

    // Ouvinte p/ Emoji Picker no Corpo da Mensagem
    const btnMsgEmoji = document.getElementById('btnMsgEmoji');
    if (btnMsgEmoji) btnMsgEmoji.addEventListener('click', async e => {
      e.stopPropagation();
      const pickerExistente = document.getElementById('giga-whatsapp-emoji-picker');
      if (pickerExistente && this.alvoEmoji === 'content') { this.fecharPickerEmoji(); return; }
      this.fecharPickerEmoji();
      this.alvoEmoji = 'content';
      this.abrirPickerEmoji(btnMsgEmoji, await window.GigaArmazenamento.obterEmojisRecentes());
    });

    // Ouvinte p/ Emoji Picker no Título da Mensagem
    const btnMsgTitleEmoji = document.getElementById('btnMsgTitleEmoji');
    if (btnMsgTitleEmoji) btnMsgTitleEmoji.addEventListener('click', async e => {
      e.stopPropagation();
      const pickerExistente = document.getElementById('giga-whatsapp-emoji-picker');
      if (pickerExistente && this.alvoEmoji === 'title') { this.fecharPickerEmoji(); return; }
      this.fecharPickerEmoji();
      this.alvoEmoji = 'title';
      this.abrirPickerEmoji(btnMsgTitleEmoji, await window.GigaArmazenamento.obterEmojisRecentes());
    });

    // Toggle para o Icon Picker Genérico (SVG)
    const btnMsgIconPicker = document.getElementById('btnMsgIconPicker');
    if (btnMsgIconPicker) {
      btnMsgIconPicker.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = document.getElementById('adminIconPickerPanel');
        p.style.display = p.style.display === 'none' ? 'block' : 'none';

        const grid = document.getElementById('adminIconGrid');
        if (grid && grid.innerHTML === '' && window.AdminIcons) {
          window.AdminIcons.forEach(icon => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-icon-sm';
            btn.style.width = '24px';
            btn.style.height = '24px';
            btn.style.padding = '2px';
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" style="color:currentColor">${icon.svg}</svg>`;
            btn.addEventListener('click', () => {
              document.getElementById('msgIcon').value = icon.id;
              const selectedSvg = document.getElementById('adminSelectedIconSvg');
              selectedSvg.innerHTML = icon.svg;

              const color = document.getElementById('msgIconColorPicker').value;
              document.getElementById('msgIconColor').value = color;
              selectedSvg.style.color = color;
              p.style.display = 'none';
            });
            grid.appendChild(btn);
          });
        }
      });

      // Fecha o picker ao clicar fora
      document.addEventListener('click', (e) => {
        const p = document.getElementById('adminIconPickerPanel');
        if (p && p.style.display === 'block' && !p.contains(e.target) && !btnMsgIconPicker.contains(e.target)) {
          p.style.display = 'none';
        }
      });
    }

    const colorPicker = document.getElementById('msgIconColorPicker');
    if (colorPicker) {
      colorPicker.addEventListener('input', (e) => {
        document.getElementById('msgIconColor').value = e.target.value;
        const selectedSvg = document.getElementById('adminSelectedIconSvg');
        if (selectedSvg) selectedSvg.style.color = e.target.value;
      });
    }
  },

  /**
   * Abre a janela pop-up (flutuante) do Seletor de Emojis, posicionando
   * ela de acordo com as coordenadas do botão âncora clicado.
   * @param {HTMLElement} ancora - O botão clicado, serve de guia para calcular posX/Y.
   * @param {string[]} recentes - Array com os emojis mais recentes salvos.
   */
  abrirPickerEmoji: function (ancora, recentes) {
    if (window.GigaEmojiPicker) {
      window.GigaEmojiPicker.abrir(ancora, recentes, async (emoji) => {
        // Inserção depende de qual botão engatilhou (title x content)
        if (this.alvoEmoji === 'title') {
          const t = document.getElementById('msgTitle');
          const s = t.selectionStart || 0, f = t.selectionEnd || 0;
          t.value = t.value.slice(0, s) + emoji + t.value.slice(f);
          t.setSelectionRange(s + [...emoji].length, s + [...emoji].length);
          t.focus();
        } else {
          document.getElementById('msgEditor').focus();
          document.execCommand('insertText', false, emoji);
          this.atualizarPrevia();
        }

        // Adiciona na base de favoritos
        await window.GigaArmazenamento.adicionarEmojiRecente(emoji);
        this.fecharPickerEmoji();
      });
    }
  },

  /** Remove o elemento flutuante (Emoji Picker) do DOM. */
  fecharPickerEmoji: function () {
    if (window.GigaEmojiPicker) {
      window.GigaEmojiPicker.fechar();
    }
  },

  /**
   * Configura os ouvintes de Drag & Drop para o grid de mensagens.
   * @param {HTMLElement} grid - O elemento container das mensagens.
   */
  configurarDragAndDrop: function (grid) {
    let dragSrcEl = null;

    const handleDragStart = (e) => {
      // Se não clicou no botão "move" ou na área permitida, não inicia o drag se preferir.
      // O HTML5 D&D ativa com clique na área draggable.
      dragSrcEl = e.currentTarget;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragSrcEl.dataset.id);
      dragSrcEl.classList.add('dragging');
      // Timeout para que a opacidade caia depois do navegador criar o ghost image
      setTimeout(() => { if (dragSrcEl) dragSrcEl.style.opacity = '0.4'; }, 0);
    };

    const handleDragOver = (e) => {
      e.preventDefault(); 
      e.dataTransfer.dropEffect = 'move';
      
      const targetEl = e.currentTarget;
      const bounding = targetEl.getBoundingClientRect();
      const offset = e.clientX - bounding.left;
      
      if (offset > bounding.width / 2) {
        targetEl.classList.remove('drag-over-before');
        targetEl.classList.add('drag-over-after');
      } else {
        targetEl.classList.remove('drag-over-after');
        targetEl.classList.add('drag-over-before');
      }
      return false;
    };

    const handleDragEnter = (e) => {
      // Deixamos o dragover lidar com as classes para evitar flickering
    };

    const handleDragLeave = (e) => {
      e.currentTarget.classList.remove('drag-over-before', 'drag-over-after');
    };

    const handleDrop = (e) => {
      e.stopPropagation();
      const targetEl = e.currentTarget;
      
      const isAfter = targetEl.classList.contains('drag-over-after');
      targetEl.classList.remove('drag-over-before', 'drag-over-after');

      if (dragSrcEl !== targetEl) {
        const sourceId = dragSrcEl.dataset.id;
        const targetId = targetEl.dataset.id;
        this.moverMensagem(sourceId, targetId, isAfter);
      }
      return false;
    };

    const handleDragEnd = (e) => {
      e.currentTarget.classList.remove('dragging');
      e.currentTarget.style.opacity = '1';
      const cards = grid.querySelectorAll('.msg-card');
      cards.forEach(card => card.classList.remove('drag-over-before', 'drag-over-after'));
    };

    const cards = grid.querySelectorAll('.msg-card');
    cards.forEach(card => {
      card.addEventListener('dragstart', handleDragStart);
      card.addEventListener('dragenter', handleDragEnter);
      card.addEventListener('dragover', handleDragOver);
      card.addEventListener('dragleave', handleDragLeave);
      card.addEventListener('drop', handleDrop);
      card.addEventListener('dragend', handleDragEnd);
    });
  },

  /**
   * Move a mensagem no array global e salva.
   * @param {string} sourceId - ID da mensagem arrastada
   * @param {string} targetId - ID da mensagem alvo
   * @param {boolean} isAfter - Se true, insere depois do target
   */
  moverMensagem: async function(sourceId, targetId, isAfter) {
    const msgs = window.AdminEstado.messages;
    const fromIndex = msgs.findIndex(m => m.id === sourceId);
    let toIndex = msgs.findIndex(m => m.id === targetId);
    
    if (fromIndex === -1 || toIndex === -1) return;
    
    // Se isAfter é true, queremos inserir DEPOIS do alvo.
    if (isAfter) {
      toIndex++;
    }

    // Se o elemento fonte vem antes do destino, e vamos colocar no toIndex, o toIndex real precisa ser ajustado porque a remoção vai deslocar o array.
    if (fromIndex < toIndex) {
      toIndex--;
    }

    // Realiza o splice para mover diretamente através da nova API que criamos
    await window.GigaArmazenamento.moverMensagem(sourceId, toIndex);
    
    // Recarrega o estado atualizado para refletir
    await window.AdminEstado.carregarTudo();
    this.renderizarMensagens();
  }
};

