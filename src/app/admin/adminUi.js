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
 * @file src/app/admin/adminUi.js
 * @description Componentes e Utilitários Globais de Interface (UI).
 * Fornece bibliotecas de ícones SVG, paletas de cores, agrupamento de emojis
 * e funções genéricas como Toasts (notificações) e Modais de Confirmação.
 */

'use strict';

window.AdminUI = {
  /**
   * Coleção de ícones SVG padronizados (Material Design) usados na interface.
   * @type {Array<{id: string, svg: string}>}
   */
  icones: [
    { id: 'icon-01', svg: '<path d="M12,18A6,6 0 0,1 6,12C6,11 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12A8,8 0 0,0 12,20V23L16,19L12,15M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,13 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12A8,8 0 0,0 12,4Z" fill="currentColor"/>' },
    { id: 'icon-02', svg: '<path d="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.6,4.7C0.4,7.1 0.9,10.1 2.9,12.1C4.8,14 7.5,14.5 9.8,13.6L18.9,22.7C19.3,23.1 19.9,23.1 20.3,22.7L22.6,20.4C23.1,20 23.1,19.3 22.7,19Z" fill="currentColor"/>' },
    { id: 'icon-03', svg: '<path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20M16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z" fill="currentColor"/>' },
    { id: 'icon-04', svg: '<path d="M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2M14.59,8L12,10.59L9.41,8L8,9.41L10.59,12L8,14.59L9.41,16L12,13.41L14.59,16L16,14.59L13.41,12L16,9.41L14.59,8Z" fill="currentColor"/>' },
    { id: 'icon-05', svg: '<path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" fill="currentColor"/>' },
    { id: 'icon-06', svg: '<path d="M21,11C21,16.55 17.16,21.74 12,23C6.84,21.74 3,16.55 3,11V5L12,1L21,5V11M12,21C15.75,20 19,15.54 19,11.22V6.3L12,3.18L5,6.3V11.22C5,15.54 8.25,20 12,21M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9" fill="currentColor"/>' },
    { id: 'icon-07', svg: '<path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" fill="currentColor"/>' },
    { id: 'icon-08', svg: '<path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16" fill="currentColor"/>' },
    { id: 'icon-09', svg: '<path d="M19,7V11H5.83L9.41,7.41L8,6L2,12L8,18L9.41,16.58L5.83,13H21V7H19Z" fill="currentColor"/>' },
    { id: 'icon-10', svg: '<path d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6M6,4H13V9H18V20H6V4M8,12V14H16V12H8M8,16V18H13V16H8Z" fill="currentColor"/>' }
  ],
  

  
  /**
   * Paleta de cores oficial recomendada para as Categorias.
   * @type {string[]}
   */
  swatches: ['#F44336','#E91E63','#9C27B0','#673AB7','#3F51B5','#2196F3','#03A9F4','#00BCD4','#009688','#4CAF50','#76B82A','#8BC34A','#CDDC39','#FFC107','#FF9800','#FF5722','#795548','#9E9E9E'],
  
  /**
   * Logo padrão (GigAtende) utilizando PNG com máscara CSS para manter efeitos de cor.
   * @param {string} color - Cor a ser aplicada no logo
   * @returns {string} HTML do logo
   */
  getFallbackLogo: function(color = '#1565C0') {
    return `<span class="cat-card-icon" style="display:inline-block; width:18px; height:18px; background-color:${color}; -webkit-mask: url('../../../assets/icon48.png') center/contain no-repeat; mask: url('../../../assets/icon48.png') center/contain no-repeat; vertical-align:middle; margin-right:4px;"></span>`;
  },

  /**
   * Exibe um Toast (notificação temporária não-intrusiva) na tela.
   * @param {string} msg - Mensagem a ser exibida.
   * @param {string} [tipo='default'] - Tipo da notificação ('success', 'error', 'warn', 'default').
   * @param {number} [duracao=3000] - Tempo em milissegundos antes de desaparecer.
   */
  toast: function(msg, tipo = 'default', duracao = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${tipo}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 250); // Aguarda animação de fade-out
    }, duracao);
  },

  /** @type {Function|null} Armazena o callback a ser executado ao clicar em "Ok" num modal de confirmação. */
  confirmCallback: null,
  
  /**
   * Abre um modal central de Confirmação exigindo ação do usuário.
   * @param {string} titulo - Título do modal (ex: "Atenção").
   * @param {string} texto - Texto descritivo/pergunta.
   * @param {Function} onOk - Função assíncrona/síncrona executada se o usuário clicar no botão de confirmar.
   */
  mostrarConfirmacao: function(titulo, texto, onOk) {
    document.getElementById('confirmTitle').textContent = titulo;
    document.getElementById('confirmText').textContent  = texto;
    this.confirmCallback = onOk;
    document.getElementById('modalConfirm').style.display = 'flex';
  },

  /**
   * Atualiza as pílulas (badges) indicativas de quantidade na barra de navegação (Topnav).
   */
  renderizarBadges: function() {
    const navBadgeMessages = document.getElementById('navBadgeMessages');
    const navBadgeCategories = document.getElementById('navBadgeCategories');
    if (navBadgeMessages) {
      navBadgeMessages.textContent = window.AdminEstado.messages.length;
      navBadgeMessages.style.display = window.AdminEstado.messages.length > 0 ? '' : 'none';
    }
    if (navBadgeCategories) {
      navBadgeCategories.textContent = window.AdminEstado.categories.length;
      navBadgeCategories.style.display = window.AdminEstado.categories.length > 0 ? '' : 'none';
    }
  }
};

/* Listeners base para interações do modal de confirmação */
document.addEventListener('DOMContentLoaded', () => {
  const btnConfirmOk = document.getElementById('btnConfirmOk');
  const btnConfirmCancel = document.getElementById('btnConfirmCancel');
  const modalConfirm = document.getElementById('modalConfirm');

  // Botão OK executa a callback injetada
  if (btnConfirmOk) {
    btnConfirmOk.addEventListener('click', async () => {
      modalConfirm.style.display = 'none';
      if (typeof window.AdminUI.confirmCallback === 'function') {
        await window.AdminUI.confirmCallback();
      }
      window.AdminUI.confirmCallback = null;
    });
  }

  // Botão Cancelar apenas fecha o modal e limpa a referência
  if (btnConfirmCancel) {
    btnConfirmCancel.addEventListener('click', () => {
      modalConfirm.style.display = 'none';
      window.AdminUI.confirmCallback = null;
    });
  }

  // Fechar clicando fora da caixa do modal (no overlay escuro)
  if (modalConfirm) {
    modalConfirm.addEventListener('click', e => {
      if (e.target === modalConfirm) { 
        modalConfirm.style.display = 'none'; 
        window.AdminUI.confirmCallback = null; 
      }
    });
  }
});

