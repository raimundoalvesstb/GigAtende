/*
 * Projeto: GoAtende
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
 * @file src/app/popup/popup.js
 * @description Lógica do Popup da Extensão GoAtende.
 * Gerencia o estado do popup: ativa/desativa o site atual, aciona o modo
 * de seleção de campo e exibe o status atual da extensão no domínio aberto.
 */
'use strict';

(async function () {
  // Referências do DOM
  const textoDominio = document.getElementById('textoDominio');
  const badgeStatus = document.getElementById('badgeStatus');
  const pontoStatus = document.getElementById('pontoStatus');
  const rotuloStatus = document.getElementById('rotuloStatus');
  const alternarSite = document.getElementById('alternarSite');
  const btnSelecionarInfo = document.getElementById('btnSelecionarInfo');
  const secaoCampo = document.getElementById('secaoCampo');
  const textoStatusCampo = document.getElementById('textoStatusCampo');
  const iconeCampo = document.getElementById('iconeCampo');
  const btnAdmin = document.getElementById('btnAdmin');
  const avisoSelecao = document.getElementById('avisoSelecao');
  const btnCancelarSelecao = document.getElementById('btnCancelarSelecao');

  let dominioAtual = null;
  let siteProfile = null;
  let selecionando = false;

  /* ── Inicialização ─────────────────────────────────────────────────────── */
  /**
   * Inicializa o popup identificando o domínio atual e buscando suas preferências.
   */
  async function inicializar() {
    const resposta = await enviarBg({ tipo: 'OBTER_DOMINIO_ATUAL' });
    dominioAtual = resposta?.domain || resposta?.dominio;

    if (!dominioAtual || dominioAtual === 'newtab' || dominioAtual === '') {
      textoDominio.textContent = 'Nenhum site detectado';
      secaoCampo.classList.add('desativado');
      return;
    }

    textoDominio.textContent = dominioAtual;
    const dados = await window.GoArmazenamento.obterDados();
    siteProfile = dados.siteProfiles?.find(p => p.domain === dominioAtual) || null;
    const settings = dados.settings || {};
    
    if (settings.brandName) {
      document.querySelector('.marca-nome').textContent = settings.brandName + ' - GoAtende';
    }
    if (settings.brandLogo) {
      document.querySelector('.icone-svg').src = settings.brandLogo;
    }
    
    renderizarStatus();
  }

  /**
   * Atualiza a interface do popup para refletir o status atual do site (ativo/inativo).
   */
  function renderizarStatus() {
    const ativo = siteProfile?.active === true;
    alternarSite.checked = ativo;

    if (ativo) {
      badgeStatus.classList.add('ativo');
      pontoStatus.classList.add('ativo');
      rotuloStatus.textContent = 'Ativo';
      secaoCampo.classList.remove('desativado');
    } else {
      badgeStatus.classList.remove('ativo');
      pontoStatus.classList.remove('ativo');
      rotuloStatus.textContent = 'Desativado';
      secaoCampo.classList.add('desativado');
    }

    /* Exibe status do campo selecionado. */
    if (siteProfile?.placeholdersMap && Object.keys(siteProfile.placeholdersMap).length > 0) {
      const quantidade = Object.keys(siteProfile.placeholdersMap).length;
      textoStatusCampo.textContent = `${quantidade} info${quantidade !== 1 ? 's' : ''} mapeada${quantidade !== 1 ? 's' : ''} ✓`;
      iconeCampo.classList.add('sucesso');
      iconeCampo.querySelector('path').setAttribute('fill', '#388E3C');
      btnSelecionarInfo.textContent = 'Adicionar Informações';
    } else {
      /* Modo automático por foco: não requer seletor manual */
      textoStatusCampo.textContent = 'Automático (por foco) ✓';
      iconeCampo.classList.add('sucesso');
      iconeCampo.querySelector('path').setAttribute('fill', '#1565C0');
      btnSelecionarInfo.textContent = 'Selecionar informações';
    }
  }

  /* ── Alternar ativação do site ─────────────────────────────────────────── */
  alternarSite.addEventListener('change', async () => {
    const ativo = alternarSite.checked;
    siteProfile = await window.GoArmazenamento.atualizarPerfilSite(dominioAtual, { active: ativo });
    renderizarStatus();
    await enviarBg({ tipo: 'RECARREGAR_INJETOR', active: ativo });
  });

  /* ── Selecionar informações ──────────────────────────────────────────────────── */
  btnSelecionarInfo.addEventListener('click', async () => {
    if (!siteProfile?.active) return;
    selecionando = true;
    avisoSelecao.style.display = 'flex';

    const resultado = await enviarBg({ tipo: 'ATIVAR_SELECAO_INFO' });
    if (!resultado?.sucesso) {
      exibirErro(resultado?.erro || 'Erro ao ativar seleção. Recarregue a página.');
      redefinirEstadoSelecao();
    }
  });

  btnCancelarSelecao.addEventListener('click', async () => {
    await enviarBg({ tipo: 'CANCELAR_SELECAO_CAMPO' });
    redefinirEstadoSelecao();
  });

  function redefinirEstadoSelecao() {
    selecionando = false;
    avisoSelecao.style.display = 'none';
  }

  // Ouve mensagem de 'campo selecionado' do content script → background
  chrome.runtime.onMessage.addListener((mensagem) => {
    if (mensagem.tipo === 'FIELD_SELECTED_POPUP' || mensagem.tipo === 'CAMPO_SELECIONADO_POPUP') {
      siteProfile = mensagem.perfil || mensagem.profile;
      redefinirEstadoSelecao();
      renderizarStatus();
    }
  });

  /* ── Abrir Admin ───────────────────────────────────────────────────────── */
  btnAdmin.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  /* ── Funções Auxiliares ────────────────────────────────────────────────── */
  /**
   * Envia uma mensagem para o script de background e aguarda a resposta.
   * @param {Object} mensagem 
   * @returns {Promise<any>}
   */
  function enviarBg(mensagem) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(mensagem, (resposta) => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(resposta);
      });
    });
  }

  /**
   * Exibe uma mensagem de erro genérica na UI do popup.
   * @param {string} msg 
   */
  function exibirErro(msg) {
    const el = document.createElement('div');
    el.style.cssText = 'margin:4px 10px;padding:8px 10px;background:#FFEBEE;color:#B71C1C;border-radius:6px;font-size:11px;border:1px solid #FFCDD2;';
    el.textContent = msg;
    document.querySelector('.popup-raiz').appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  await inicializar();

  /* ── Verificação de Atualização ────────────────────────────────────────── */
  /**
   * Lê o status de atualização armazenado pelo background.js e exibe o aviso
   * discreto no rodapé do popup se houver uma versão mais nova disponível.
   */
  (async function verificarAvisoAtualizacao() {
    try {
      const resultado = await chrome.storage.local.get('goAtende_update');
      const info = resultado?.goAtende_update;
      if (info?.updateAvailable && info?.latestVersion) {
        const el = document.getElementById('avisoAtualizacao');
        if (el) {
          el.textContent = `Atualização disponível (v${info.latestVersion})`;
          el.style.display = '';
        }
      }
    } catch (e) {
      // Falha silenciosa
    }
  })();
})();

