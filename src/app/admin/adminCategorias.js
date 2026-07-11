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
 * @file src/app/admin/adminCategorias.js
 * @description Lógica de gerenciamento das Categorias de mensagens.
 * Gerencia a renderização do grid de categorias, formulário de adição/edição,
 * seletor de cores, seletor de ícones e exclusão de categorias.
 */
'use strict';

window.AdminCategorias = {
  /** @type {number} Página atual da paginação das categorias (se houver). */
  paginaAtual: 0,

  /**
   * Ponto de entrada do submódulo. Registra eventos de clique na interface
   * e renderiza os seletores de cores disponíveis.
   */
  inicializar: function () {
    this.configurarOuvintes();
    this.renderizarSwatchesDeCores();
  },

  /**
   * Lê o estado global (AdminEstado.categories) e constrói a grade de 
   * cartões (cards) de categorias na interface da aba "Categorias".
   */
  renderizarCategorias: function () {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (window.AdminEstado.categories.length === 0) {
      grid.innerHTML = '<p class="hint-text">Nenhuma categoria criada ainda.</p>';
      return;
    }

    // Clona o array, ordena pela ordem e itera para desenhar os cartões
    [...window.AdminEstado.categories].sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(cat => {
      // Conta quantas mensagens pertencem a essa categoria
      const qtdMsgs = window.AdminEstado.messages.filter(m => (m.categoryIds || []).includes(cat.id)).length;

      const card = document.createElement('div');
      card.className = 'cat-card';
      card.style.borderLeftColor = cat.color || '#2196F3';

      const badgeFixoHtml = cat.fixed ? '<span class="cat-fixed-badge" title="Categoria fixa – não pode ser excluída">🔒 Fixa</span>' : '';

      card.innerHTML = `
        <div class="cat-color-bar" style="background:${cat.color || '#2196F3'}"></div>
        <div class="cat-info">
          <div class="cat-name">${window.GigaSanitize.escapeHtml(cat.name)} ${badgeFixoHtml}</div>
          <div class="cat-meta">${qtdMsgs} mensagem${qtdMsgs !== 1 ? 's' : ''}${cat.siteScope ? ' · ' + cat.siteScope : ''}</div>
        </div>
        <span class="cat-status-chip ${cat.active ? 'active' : 'inactive'}">${cat.active ? 'Ativa' : 'Inativa'}</span>
        <div class="card-actions-wrapper" style="display:flex; flex-direction:column; gap:4px; align-items:flex-end;">
          <div class="card-actions" style="display:flex; gap:8px;">
            <button class="btn-action edit" data-action="edit" title="Editar categoria" aria-label="Editar categoria">
              <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
            </button>
            <button class="btn-action danger" data-action="delete" title="${cat.fixed ? 'Categoria fixa – não pode ser excluída' : 'Excluir categoria'}" aria-label="Excluir categoria" ${cat.fixed ? 'disabled aria-disabled="true"' : ''}>
              <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
            </button>
          </div>
          <div class="card-actions reorder-actions" style="display:flex; gap:4px;">
            <button class="btn-action" data-action="move-prev" title="Mover para esquerda/cima" aria-label="Mover para esquerda" style="padding:2px; border:1px solid #ddd; background:#fafafa; border-radius:4px; color:#666;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <button class="btn-action" data-action="move-next" title="Mover para direita/baixo" aria-label="Mover para direita" style="padding:2px; border:1px solid #ddd; background:#fafafa; border-radius:4px; color:#666;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
            </button>
          </div>
        </div>`;

      // Event delegation para os botões do cartão (Editar / Deletar)
      card.addEventListener('click', e => {
        const action = e.target.closest('[data-action]')?.dataset?.action;
        if (!action) return;

        if (action === 'edit') {
          this.abrirModalCategoria(cat);
        } else if (action === 'delete') {
          if (cat.fixed) { window.AdminUI.toast('Esta categoria não pode ser excluída.', 'error'); return; }

          window.AdminUI.mostrarConfirmacao(
            'Excluir categoria',
            `Excluir a categoria "${cat.name}"? As mensagens vinculadas serão mantidas sem categoria.`,
            async () => {
              const ok = await window.GigaArmazenamento.excluirCategoria(cat.id);
              if (ok) {
                await this.recarregarCategorias();
                window.AdminUI.toast('Categoria excluída.', 'success');
              } else {
                window.AdminUI.toast('Esta categoria não pôde ser excluída.', 'error');
              }
            }
          );
        } else if (action === 'move-prev' || action === 'move-next') {
          const dir = action === 'move-prev' ? 'prev' : 'next';
          window.GigaArmazenamento.moverCategoria(cat.id, dir).then(moved => {
            if (moved) this.recarregarCategorias();
          });
        }
      });
      grid.appendChild(card);
    });
  },

  /**
   * Conecta os eventos dos botões de interface relacionados às Categorias 
   * (Adicionar, Salvar, Cancelar) e lida com os seletores de cor e ícone.
   */
  configurarOuvintes: function () {
    const btnNewCategory = document.getElementById('btnNewCategory');
    const btnCloseCatModal = document.getElementById('btnCloseCatModal');
    const btnCancelCat = document.getElementById('btnCancelCat');
    const modalCategory = document.getElementById('modalCategory');
    const btnSaveCat = document.getElementById('btnSaveCat');

    if (btnNewCategory) btnNewCategory.addEventListener('click', () => this.abrirModalCategoria(null));
    if (btnCloseCatModal) btnCloseCatModal.addEventListener('click', () => this.fecharModalCategoria());
    if (btnCancelCat) btnCancelCat.addEventListener('click', () => this.fecharModalCategoria());

    // Fechar modal ao clicar fora da área principal
    if (modalCategory) modalCategory.addEventListener('click', e => {
      if (e.target === modalCategory) this.fecharModalCategoria();
    });

    if (btnSaveCat) btnSaveCat.addEventListener('click', () => this.salvarCategoria());

    // --- Seletor de Cores ---
    const catColor = document.getElementById('catColor');
    const catColorPicker = document.getElementById('catColorPicker');
    const catColorPreview = document.getElementById('catColorPreview');

    if (catColor) {
      catColor.addEventListener('input', () => {
        const val = catColor.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          catColorPicker.value = val;
          catColorPreview.style.background = val;
        }
      });
    }
    
    if (catColorPicker) {
      catColorPicker.addEventListener('input', () => {
        catColor.value = catColorPicker.value;
        catColorPreview.style.background = catColorPicker.value;
      });
    }

    // --- Seletor de Ícones (AdminUI.icones) ---
    const btnCatIconPicker = document.getElementById('btnCatIconPicker');
    const catIconPickerPanel = document.getElementById('catIconPickerPanel');
    const catIconGrid = document.getElementById('catIconGrid');
    const catIconValue = document.getElementById('catIconValue');
    const catSelectedIconSvg = document.getElementById('catSelectedIconSvg');

    // Injeta os ícones padrão na grade do modal, caso ainda não tenha sido populada
    if (catIconGrid && catIconGrid.childElementCount === 0) {
      window.AdminCategoryIcons.forEach(icon => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-icon-sm cat-icon-item';
        btn.dataset.iconId = icon.id;
        btn.style.width = '24px';
        btn.style.height = '24px';
        btn.style.padding = '2px';
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" style="color:currentColor">${icon.svg}</svg>`;

        btn.addEventListener('click', () => {
          catIconValue.value = icon.id;

          if (catSelectedIconSvg) {
            catSelectedIconSvg.innerHTML = icon.svg;
            catSelectedIconSvg.style.color = '#757575'; 
          }

          catIconPickerPanel.style.display = 'none';
        });
        catIconGrid.appendChild(btn);
      });
    }

    // Toggle para mostrar/esconder o painel de ícones
    if (btnCatIconPicker) {
      btnCatIconPicker.addEventListener('click', (e) => {
        e.stopPropagation();
        const visible = catIconPickerPanel.style.display !== 'none';
        catIconPickerPanel.style.display = visible ? 'none' : 'block';
        btnCatIconPicker.setAttribute('aria-expanded', String(!visible));
      });

      // Fecha o picker ao clicar fora
      document.addEventListener('click', (e) => {
        if (catIconPickerPanel && catIconPickerPanel.style.display === 'block' && !catIconPickerPanel.contains(e.target) && !btnCatIconPicker.contains(e.target)) {
          catIconPickerPanel.style.display = 'none';
          btnCatIconPicker.setAttribute('aria-expanded', 'false');
        }
      });
    }
  },

  renderizarSwatchesDeCores: function() {
    const colorSwatches = document.getElementById('colorSwatches');
    if (!colorSwatches) return;
    
    window.AdminUI.swatches.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.background = color;
      swatch.title = color;
      
      swatch.addEventListener('click', () => {
        document.getElementById('catColor').value = color;
        document.getElementById('catColorPicker').value = color;
        document.getElementById('catColorPreview').style.background = color;
        
        colorSwatches.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
      });
      colorSwatches.appendChild(swatch);
    });
  },

  /** @type {string|null} Guarda o ID da categoria que está sendo editada no momento, null se for criação. */
  catAtualId: null,

  /**
   * Preenche os campos e exibe o formulário (modal) de Criação ou Edição de Categoria.
   * @param {Object|null} cat - Objeto da Categoria a editar. Se null, entra no modo "Nova Categoria".
   */
  abrirModalCategoria: function (cat) {
    this.catAtualId = cat?.id || null;
    document.getElementById('modalCatTitle').textContent = cat ? 'Editar Categoria' : 'Nova Categoria';
    document.getElementById('catName').value = cat?.name || '';
    
    const catColor = cat?.color || '#2196F3';
    
    document.getElementById('catColor').value = catColor;
    document.getElementById('catColorPicker').value = catColor;
    const catColorPreview = document.getElementById('catColorPreview');
    if (catColorPreview) catColorPreview.style.background = catColor;

    document.getElementById('catScope').value = cat?.siteScope || '';
    document.getElementById('catActive').checked = cat?.active !== false;

    // Reseta/Aplica o ícone
    const savedIcon = cat?.icon || '';
    const catIconValue = document.getElementById('catIconValue');
    if (catIconValue) catIconValue.value = savedIcon;

    const catSelectedIconSvg = document.getElementById('catSelectedIconSvg');
    if (catSelectedIconSvg) {
      const iconDef = window.AdminCategoryIcons.find(i => i.id === savedIcon);
      catSelectedIconSvg.innerHTML = iconDef ? iconDef.svg : '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>';
      catSelectedIconSvg.style.color = savedIcon ? '#1565C0' : '#757575';
    }

    const catIconPickerPanel = document.getElementById('catIconPickerPanel');
    if (catIconPickerPanel) catIconPickerPanel.style.display = 'none';

    document.getElementById('modalCategory').style.display = 'flex';
    document.getElementById('catName').focus();
  },

  /**
   * Fecha o modal de categoria e reseta o ID interno.
   */
  fecharModalCategoria: function () {
    document.getElementById('modalCategory').style.display = 'none';
    this.catAtualId = null;
  },

  /**
   * Extrai os valores do modal, valida as entradas e envia os dados para o Armazenamento.
   * Cria uma nova categoria ou atualiza uma existente.
   * @async
   */
  salvarCategoria: async function () {
    const nome = document.getElementById('catName').value.trim();
    const icon = document.getElementById('catIconValue').value;
    const cor = document.getElementById('catColor').value.trim();

    if (!nome || !cor) {
      window.AdminUI.toast('Por favor, preencha o nome e a cor da categoria.', 'error');
      if (!nome) document.getElementById('catName').focus();
      else document.getElementById('catColor').focus(); 
      return;
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(cor)) {
      window.AdminUI.toast('Cor inválida. Use o formato HEX #RRGGBB.', 'error');
      document.getElementById('catColor').focus();
      return;
    }

    const catObj = {
      id: this.catAtualId || window.GigaArmazenamento.gerarId('cat'),
      name: nome,
      color: cor,
      icon: icon || null,
      siteScope: document.getElementById('catScope').value.trim() || null,
      active: document.getElementById('catActive').checked,
      order: this.catAtualId ? (window.AdminEstado.categories.find(c => c.id === this.catAtualId)?.order || 99) : window.AdminEstado.categories.length
    };

    await window.GigaArmazenamento.salvarCategoria(catObj);
    await this.recarregarCategorias();
    this.fecharModalCategoria();
    window.AdminUI.toast(this.catAtualId ? 'Categoria atualizada!' : 'Categoria criada!', 'success');
  },

  /**
   * Dispara o recarregamento do estado global a partir do banco e 
   * redesenha a tela de categorias (bem como os botões de filtros nas mensagens).
   * @async
   */
  recarregarCategorias: async function () {
    await window.AdminEstado.carregarTudo();
    this.renderizarCategorias();
    // Como editamos uma categoria, isso afeta os filtros na aba de Mensagens, então também recarregamos:
    if (window.AdminMensagens) window.AdminMensagens.renderizarFiltrosCategorias();
    window.AdminUI.renderizarBadges();
  }
};

