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
 * @file src/app/admin/adminSites.js
 * @description Lógica de gerenciamento de Sites e Domínios.
 * Controla os perfis de sites onde a extensão será ativada e 
 * permite customizar seletores CSS para os campos de mensagem (textarea).
 */
'use strict';

window.AdminSites = {
  /** @type {string|null} Guarda o domínio que está sendo editado no modal. */
  dominioAtual: null,
  /** @type {string|null} Guarda o ID do placeholder em edição (agora no contexto do site). */
  placeholderAtualId: null,
  /** @type {Array} Lista temporária de placeholders sendo editada no modal de site. */
  placeholdersTemp: [],

  /**
   * Ponto de entrada do submódulo de sites.
   */
  inicializar: function() {
    this.configurarOuvintes();
  },

  /**
   * Remove acentos, caracteres especiais, transforma espaços em underline e passa para minúsculo
   */
  gerarTaxonomia: function(texto) {
    return texto
      .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-zA-Z0-9\s]/g, "") // Remove caracteres especiais
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase();
  },

  /**
   * Renderiza a lista de placeholders na coluna lateral.
   */
  renderizarPlaceholders: function() {
    const list = document.getElementById('placeholdersList');
    if (!list) return;
    list.innerHTML = '';
    
    if (window.AdminEstado.placeholders.length === 0) {
      list.innerHTML = '<p class="hint-text" style="font-size:0.85rem;">Nenhum placeholder configurado.</p>';
      return;
    }

    window.AdminEstado.placeholders.forEach(p => {
      const el = document.createElement('div');
      el.className = 'placeholder-card';

      el.innerHTML = `
        <div class="placeholder-info">
          <div class="placeholder-name">${window.GigaSanitize.escapeHtml(p.name)}</div>
          <div class="placeholder-id">[${p.id}]</div>
        </div>
        <div style="display:flex; gap: 4px;">
          ${p.fixed ? `<span class="placeholder-fixed-chip">Fixo</span>` : `
            <button class="btn-action edit" data-action="edit-placeholder" data-id="${p.id}" title="Editar" aria-label="Editar">
              <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
            </button>
            <button class="btn-action danger" data-action="delete-placeholder" data-id="${p.id}" title="Remover" aria-label="Remover">
              <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
            </button>
          `}
        </div>
      `;

      if (!p.fixed) {
        el.querySelector('[data-action="edit-placeholder"]').addEventListener('click', () => {
          this.abrirModalPlaceholder(p);
        });

        el.querySelector('[data-action="delete-placeholder"]').addEventListener('click', async () => {
          window.AdminUI.mostrarConfirmacao('Remover Placeholder', `Tem certeza que deseja remover "${p.name}"?`, async () => {
            await window.GigaArmazenamento.deletarPlaceholder(p.id);
            await window.AdminEstado.carregarTudo();
            this.renderizarPlaceholders();
            window.AdminUI.toast('Placeholder removido.', 'success');
          });
        });
      }

      list.appendChild(el);
    });
  },

  /**
   * Renderiza a grade (lista) de sites habilitados para operar com a extensão.
   * Lê os dados do estado global (AdminEstado.siteProfiles).
   */
  renderizarSites: function() {
    const grid = document.getElementById('sitesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (window.AdminEstado.siteProfiles.length === 0) {
      grid.innerHTML = '<p class="hint-text">Nenhum site habilitado ainda. Use o botão &ldquo;Adicionar Site&rdquo; ou habilite sites pelo popup da extensão.</p>';
      return;
    }

    window.AdminEstado.siteProfiles.forEach(sp => {
      const card = document.createElement('div');
      card.className = 'site-card';

      const seletores = Array.isArray(sp.selectors) ? sp.selectors : (sp.selector ? [sp.selector] : []);
      const seletoresHtml = seletores.length
        ? seletores.map(s => `<code style="font-size:10px;background:rgba(0,0,0,0.06);padding:1px 4px;border-radius:3px">${window.GigaSanitize.escapeHtml(s)}</code>`).join(' <span style="color:#9E9E9E">·</span> ')
        : '<span style="font-size:11px;color:var(--c-text-2)">Campo detectado automaticamente por foco</span>';
        
      // Mesclar placeholders e placeholdersMap para exibição backward compatible
      let displayPlaceholders = sp.placeholders ? JSON.parse(JSON.stringify(sp.placeholders)) : [];
      if (sp.placeholdersMap) {
        Object.keys(sp.placeholdersMap).forEach(id => {
          const selector = sp.placeholdersMap[id];
          if (selector && !displayPlaceholders.find(p => p.id === id)) {
            const defs = [
              { id: 'cliente', name: 'Nome do cliente' },
              { id: 'venda_pedido', name: 'Venda/pedido' },
              { id: 'produto', name: 'Produto' }
            ];
            const def = defs.find(d => d.id === id);
            displayPlaceholders.push({
              id: id,
              name: def ? def.name : id,
              selector: selector
            });
          }
        });
      }

      const placeholdersHtml = displayPlaceholders.length
        ? displayPlaceholders.map(p => {
            if (sp.active) {
              return `<div style="display:flex; flex-direction:column; font-size:11px; background:var(--c-bg-subtle, rgba(0,0,0,0.04)); padding:6px 8px; border-radius:4px; border:1px solid var(--c-border); margin-bottom:6px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                  <span style="font-weight:600; color:var(--c-text);">${window.GigaSanitize.escapeHtml(p.name)}</span>
                  <span style="color:var(--c-text-2);">[${window.GigaSanitize.escapeHtml(p.id)}]</span>
                </div>
                ${p.selector ? `<div style="font-family:monospace; font-size:10.5px; color:var(--c-text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; background:rgba(0,0,0,0.03); padding:2px 4px; border-radius:3px;" title="${window.GigaSanitize.escapeHtml(p.selector)}">${window.GigaSanitize.escapeHtml(p.selector)}</div>` : '<div style="font-size:10px; color:var(--c-text-3); font-style:italic;">Sem seletor</div>'}
              </div>`;
            } else {
              const selectorCode = p.selector ? `<code style="font-size:10px;background:rgba(0,0,0,0.06);padding:1px 4px;border-radius:3px;margin-left:4px;color:var(--c-text);">${window.GigaSanitize.escapeHtml(p.selector)}</code>` : '';
              return `<div style="display:inline-flex; align-items:center; gap:4px; font-size:11px; background:var(--c-bg-subtle, rgba(0,0,0,0.04)); padding:2px 6px; border-radius:4px; border:1px solid var(--c-border); margin-right:4px; margin-bottom:4px;">
                <span style="font-weight:600; color:var(--c-text);">${window.GigaSanitize.escapeHtml(p.name)}</span>
                <span style="color:var(--c-text-2);">[${window.GigaSanitize.escapeHtml(p.id)}]</span>${selectorCode}
              </div>`;
            }
          }).join('')
        : '<span style="font-size:11px;color:var(--c-text-2)">Nenhum placeholder definido para este site.</span>';

      card.style.flexDirection = 'column';
      card.style.alignItems = 'stretch';
      card.style.gap = '0'; // gap 0 because we will use padding

      card.innerHTML = `
        <div style="display:flex; flex-direction:column; width: 100%; padding-bottom: 12px;">
          <div class="site-info" style="align-items:flex-start; width:100%;">
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" style="color:${sp.active ? '#388E3C' : '#9E9E9E'}; flex-shrink:0; margin-top:2px;">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>
            </svg>
            <div style="flex:1; display:flex; flex-direction:column; gap:4px; min-width:0;">
              <div class="site-domain">${window.GigaSanitize.escapeHtml(sp.label || sp.domain)}</div>
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:12px;">
                <div class="site-selector" style="flex:1;">${seletoresHtml}</div>
                <div style="display:flex;align-items:center;gap:6px; flex-shrink:0;">
                  <span class="cat-status-chip ${sp.active ? 'active' : 'inactive'}">${sp.active ? 'Ativo' : 'Inativo'}</span>
                  <button class="btn-action edit" data-action="edit-site" data-domain="${window.GigaSanitize.escapeHtml(sp.domain)}" title="Editar configuração do site" aria-label="Editar site">
                    <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                  </button>
                  <button class="btn-action danger" data-action="delete-site" data-domain="${window.GigaSanitize.escapeHtml(sp.domain)}" title="Remover site" aria-label="Remover site">
                    <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="site-placeholders" style="padding-top:12px; border-top: 1px solid var(--c-border); width: 100%;">
          <div style="font-size:10px; font-weight:600; text-transform:uppercase; color:var(--c-text-3); margin-bottom:6px;">Placeholders</div>
          ${placeholdersHtml}
        </div>`;

      // Botão de Editar Perfil do Site
      card.querySelector('[data-action="edit-site"]').addEventListener('click', e => {
        const domain = e.currentTarget.dataset.domain;
        const profile = window.AdminEstado.siteProfiles.find(p => p.domain === domain);
        if (profile) this.abrirModalSite(profile);
      });

      // Botão de Excluir Perfil do Site
      card.querySelector('[data-action="delete-site"]').addEventListener('click', async e => {
        const domain = e.currentTarget.dataset.domain;
        window.AdminUI.mostrarConfirmacao('Remover site', `Remover o perfil de "${domain}"?`, async () => {
          await window.GigaArmazenamento.excluirPerfilSite(domain);
          await window.AdminEstado.carregarTudo();
          this.renderizarSites();
          window.AdminUI.toast('Site removido.', 'success');
        });
      });

      grid.appendChild(card);
    });
  },

  /**
   * Configura os ouvintes de evento principais para o modal de sites.
   */
  configurarOuvintes: function() {
    const btnAddSite = document.getElementById('btnAddSite');
    const modalSite = document.getElementById('modalSite');
    const btnCloseSiteModal = document.getElementById('btnCloseSiteModal');
    const btnCancelSite = document.getElementById('btnCancelSite');
    const btnSaveSite = document.getElementById('btnSaveSite');
    const btnAddSelector = document.getElementById('btnAddSelector');

    if (modalSite && btnAddSite) {
      btnAddSite.addEventListener('click', () => this.abrirModalSite(null));
      
      // Função utilitária para fechar o modal e limpar estado
      const closeSiteModal = () => { 
        modalSite.style.display = 'none'; 
        this.dominioAtual = null; 
      };

      if(btnCloseSiteModal) btnCloseSiteModal.addEventListener('click', closeSiteModal);
      if(btnCancelSite) btnCancelSite.addEventListener('click', closeSiteModal);
      modalSite.addEventListener('click', e => { if (e.target === modalSite) closeSiteModal(); });

      // Botão que adiciona uma nova linha em branco de Seletor CSS
      if(btnAddSelector) btnAddSelector.addEventListener('click', () => this.adicionarLinhaSeletor(''));
      
      // Salvar Site
      if(btnSaveSite) btnSaveSite.addEventListener('click', () => this.salvarSite());
    }

    // ==========================================
    // Eventos de Placeholders (dentro do site)
    // ==========================================
    const btnAddSitePlaceholder = document.getElementById('btnAddSitePlaceholder');
    if (btnAddSitePlaceholder) {
      btnAddSitePlaceholder.addEventListener('click', () => {
        this.adicionarLinhaPlaceholder('', '', '', false);
      });
    }
  },

  /**
   * Renderiza a lista temporária de placeholders dentro do modal de edição do site.
   */
  renderizarPlaceholdersSite: function() {
    const list = document.getElementById('sitePlaceholdersList');
    if (!list) return;
    list.innerHTML = '';

    const defaultIds = ['cliente', 'venda_pedido', 'produto'];

    // Renderiza apenas os placeholders que já estão na lista do site (habilitados para ele)
    this.placeholdersTemp.forEach(p => {
      // É considerado fixo (não pode mudar o nome/id) se for um dos padrões ou se já veio com a flag fixed
      const isFixed = p.fixed || defaultIds.includes(p.id);
      this.adicionarLinhaPlaceholder(p.name, p.id, p.selector || '', isFixed);
    });
  },

  /**
   * Injeta no DOM uma nova linha de input para placeholder.
   */
  adicionarLinhaPlaceholder: function(nome, id, seletor, isFixed) {
    const list = document.getElementById('sitePlaceholdersList');
    const row = document.createElement('div');
    row.className = 'selector-row';
    row.dataset.fixed = isFixed ? 'true' : 'false';

    const disabledAttr = isFixed ? 'disabled style="background:var(--c-bg-subtle, rgba(0,0,0,0.04));"' : '';
    const namePlaceholder = isFixed ? '' : 'Nome';
    const idPlaceholder = isFixed ? '' : 'ID (ex: cpf)';

    row.innerHTML = `
      <input type="text" class="form-input ph-name" placeholder="${namePlaceholder}" value="${window.GigaSanitize.escapeHtml(nome)}" ${disabledAttr} style="flex:1" title="Nome do placeholder" />
      <input type="text" class="form-input ph-id" placeholder="${idPlaceholder}" value="${window.GigaSanitize.escapeHtml(id)}" ${disabledAttr} style="flex:0.8; font-family:monospace;" title="ID interno" />
      <input type="text" class="form-input ph-selector" placeholder="Seletor CSS (ex: .nome, #cli)" value="${window.GigaSanitize.escapeHtml(seletor)}" style="flex:1.5" title="Para recuperar o valor em mais de um local, separe os seletores com vírgula" />
      <button type="button" class="selector-remove" title="Remover placeholder" aria-label="Remover placeholder">&times;</button>
    `;

    // O botão de remover agora é sempre funcional, permitindo excluir até mesmo os padrões
    row.querySelector('.selector-remove').addEventListener('click', () => row.remove());

    if (!isFixed) {
      const inputName = row.querySelector('.ph-name');
      const inputId = row.querySelector('.ph-id');
      
      inputName.addEventListener('input', () => {
        if (!inputId.dataset.manuallyEdited && !id) {
          inputId.value = this.gerarTaxonomia(inputName.value);
        }
      });
      inputId.addEventListener('input', () => {
        inputId.dataset.manuallyEdited = "true";
      });
    }


    list.appendChild(row);
    if (!isFixed && !nome) {
      row.querySelector('.ph-name').focus();
    }
  },

  /**
   * Abre o Modal de Placeholder. Preenche os campos se for edição.
   * @param {Object|null} p - Dados do placeholder. null se for novo.
   */
  abrirModalPlaceholder: function(p) {
    const modalPlaceholder = document.getElementById('modalPlaceholder');
    const inputPlaceholderName = document.getElementById('placeholderName');
    const inputPlaceholderId = document.getElementById('placeholderId');
    const titleEl = modalPlaceholder.querySelector('.modal-header h2');
    
    this.placeholderAtualId = p?.id || null;
    titleEl.textContent = p ? 'Editar Placeholder' : 'Novo Placeholder';
    
    inputPlaceholderName.value = p?.name || '';
    inputPlaceholderId.value = p?.id || '';
    
    // O ID é bloqueado para edição sempre, pois é gerado ou é chave existente
    
    modalPlaceholder.style.display = 'flex';
    inputPlaceholderName.focus();
  },

  /**
   * Abre o Modal de Perfil de Site. Preenche os campos se for edição.
   * @param {Object|null} perfil - Dados do site. null se for novo.
   */
  abrirModalSite: function(perfil) {
    const modalSite = document.getElementById('modalSite');
    const titleEl = document.getElementById('modalSiteTitle');
    const domainEl = document.getElementById('siteDomain');
    const labelEl = document.getElementById('siteLabel');
    const enabledEl = document.getElementById('siteEnabled');
    const listEl = document.getElementById('selectorsList');

    this.dominioAtual = perfil?.domain || null;
    titleEl.textContent = perfil ? 'Editar Site' : 'Adicionar Site';
    
    domainEl.value = perfil?.domain || '';
    labelEl.value = perfil?.label || '';
    enabledEl.checked = perfil?.active ?? false;
    
    // Clonar placeholders do perfil e mesclar com placeholdersMap (backward compatibility)
    let tempPlaceholders = perfil?.placeholders ? JSON.parse(JSON.stringify(perfil.placeholders)) : [];
    
    if (perfil?.placeholdersMap) {
      Object.keys(perfil.placeholdersMap).forEach(id => {
        const selector = perfil.placeholdersMap[id];
        if (selector) {
          const existe = tempPlaceholders.find(p => p.id === id);
          if (existe) {
            existe.selector = existe.selector || selector;
          } else {
            const defs = [
              { id: 'cliente', name: 'Nome do cliente', fixed: true },
              { id: 'venda_pedido', name: 'Venda/pedido', fixed: true },
              { id: 'produto', name: 'Produto', fixed: true }
            ];
            const def = defs.find(d => d.id === id);
            tempPlaceholders.push({
              id: id,
              name: def ? def.name : id,
              selector: selector,
              fixed: !!def
            });
          }
        }
      });
    }
    
    this.placeholdersTemp = tempPlaceholders;
    this.renderizarPlaceholdersSite();
    
    // O domínio primário é chave primária e não pode ser editado depois de criado
    domainEl.readOnly = !!perfil;
    domainEl.style.opacity = perfil ? '0.6' : '1';

    // Montar as linhas de seletores
    listEl.innerHTML = '';
    const seletores = Array.isArray(perfil?.selectors) ? perfil.selectors : (perfil?.selector ? [perfil.selector] : []);
    
    if (seletores.length) {
      seletores.forEach(s => this.adicionarLinhaSeletor(s));
    } else {
      // Começa com um em branco se estiver vazio
      this.adicionarLinhaSeletor('');
    }

    modalSite.style.display = 'flex';
    (perfil ? labelEl : domainEl).focus();
  },

  /**
   * Injeta no DOM (dentro do modal) uma nova linha de input para seletor CSS.
   * @param {string} valor - Valor inicial (ex: '#reply-box').
   */
  adicionarLinhaSeletor: function(valor) {
    const list = document.getElementById('selectorsList');
    const row = document.createElement('div');
    row.className = 'selector-row';
    row.innerHTML = `
      <input type="text" class="form-input" placeholder="Ex: #reply-editor, textarea[name='body']" value="${window.GigaSanitize.escapeHtml(valor)}"/>
      <button type="button" class="selector-remove" title="Remover seletor" aria-label="Remover seletor">&times;</button>`;
      
    // Botão remover a linha específica
    row.querySelector('.selector-remove').addEventListener('click', () => row.remove());
    list.appendChild(row);
    row.querySelector('input').focus();
  },

  /**
   * Extrai os valores digitados no modal, sanitiza e persiste no armazenamento local.
   * @async
   */
  salvarSite: async function() {
    const domain = document.getElementById('siteDomain').value.trim().toLowerCase();
    const label = document.getElementById('siteLabel').value.trim();
    const enabled = document.getElementById('siteEnabled').checked;
    const list = document.getElementById('selectorsList');
    const isNew = !this.dominioAtual;

    if (!domain) { 
      window.AdminUI.toast('Domínio obrigatório.', 'error'); 
      document.getElementById('siteDomain').focus(); 
      return; 
    }
    if (/https?:\/\//.test(domain)) { 
      window.AdminUI.toast('Use apenas o hostname (sem http:// ou https://).', 'error'); 
      return; 
    }

    // Pega todos os inputs da lista, tira os espaços e remove os em branco
    const selectors = Array.from(list.querySelectorAll('input'))
      .map(i => i.value.trim())
      .filter(Boolean);

    const placeholders = [];
    const listPh = document.getElementById('sitePlaceholdersList');
    if (listPh) {
      listPh.querySelectorAll('.selector-row').forEach(row => {
        const isFixed = row.dataset.fixed === 'true';
        const name = row.querySelector('.ph-name').value.trim();
        const id = row.querySelector('.ph-id').value.trim();
        const selector = row.querySelector('.ph-selector').value.trim();

        if (id && name) {
          if (!isFixed || selector) {
            placeholders.push({ id, name, selector, fixed: isFixed });
          }
        }
      });
    }

    const newPlaceholdersMap = {};
    placeholders.forEach(p => {
      newPlaceholdersMap[p.id] = p.selector;
    });

    await window.GigaArmazenamento.atualizarPerfilSite(domain, { 
      label: label || domain, 
      active: enabled, 
      selectors: selectors,
      placeholders: placeholders,
      placeholdersMap: newPlaceholdersMap
    });
    
    await window.AdminEstado.carregarTudo();
    this.renderizarSites();
    
    document.getElementById('modalSite').style.display = 'none';
    this.dominioAtual = null;
    window.AdminUI.toast(isNew ? 'Site adicionado!' : 'Site atualizado!', 'success');
  }
};

