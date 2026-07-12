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
 * @file src/servicos/background.js
 * @description Service Worker (Background) da Extensão GigAtende.
 * Gerencia o estado do ícone da extensão baseado no domínio atual da aba,
 * rastreamento de abas e troca de mensagens assíncronas entre os scripts de contexto.
 */
'use strict';

const CHAVE_ARMAZENAMENTO = 'gigaAtende_data';

/**
 * Atualiza o ícone e o título (tooltip) da extensão na barra do navegador.
 * Verifica se o domínio atual está na lista de perfis ativos.
 * @async
 * @param {number} idAba - ID da aba do Chrome.
 * @param {string} dominio - Domínio (hostname) do site atual.
 */
async function atualizarIconeAba(idAba, dominio) {
  try {
    const resultado = await chrome.storage.local.get(CHAVE_ARMAZENAMENTO);
    const dados = resultado[CHAVE_ARMAZENAMENTO] || {};
    
    // Suporte ao nome legado para garantir que não haja erros (perfisSites vs siteProfiles)
    const perfis = dados.siteProfiles || dados.perfisSites || [];
    const perfil = perfis.find(p => p.domain === dominio);
    const ativo = perfil?.active === true;

    if (ativo) {
      await chrome.action.setIcon({
        tabId: idAba,
        path: { 16: 'assets/icon16.png', 48: 'assets/icon48.png', 128: 'assets/icon128.png' }
      });
      await chrome.action.setTitle({ tabId: idAba, title: `GigAtende – Ativo em ${dominio}` });
    } else {
      await chrome.action.setIcon({
        tabId: idAba,
        path: { 16: 'assets/icon16_gray.png', 48: 'assets/icon48_gray.png', 128: 'assets/icon128_gray.png' }
      });
      await chrome.action.setTitle({ tabId: idAba, title: 'GigAtende – Desativado neste site' });
    }
  } catch (e) {
    // Falha silenciosa: a aba pode ter sido fechada antes do ícone ser atualizado
  }
}

/**
 * Listener acionado quando o usuário alterna entre abas (foca em outra aba).
 */
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const aba = await chrome.tabs.get(tabId);
    if (aba.url) {
      const dominio = extrairDominio(aba.url);
      if (dominio) await atualizarIconeAba(tabId, dominio);
    }
  } catch (e) {}
});

/**
 * Listener acionado quando a página dentro de uma aba termina de carregar.
 */
chrome.tabs.onUpdated.addListener(async (tabId, informacaoMudanca, aba) => {
  if (informacaoMudanca.status === 'complete' && aba.url) {
    const dominio = extrairDominio(aba.url);
    if (dominio) await atualizarIconeAba(tabId, dominio);
  }
});

/**
 * Listener principal para comunicação via mensagens (Message Passing) entre 
 * Popup, Painel Admin, Content Script e este Background Script.
 */
chrome.runtime.onMessage.addListener((mensagem, remetente, enviarResposta) => {
  (async () => {
    try {
      switch (mensagem.tipo) {
        
        /** Atualiza o ícone da extensão forçadamente para a aba atual */
        case 'ATUALIZAR_ICONE': {
          const abas = await chrome.tabs.query({ active: true, currentWindow: true });
          if (abas[0]) {
            const dominio = extrairDominio(abas[0].url);
            if (dominio) await atualizarIconeAba(abas[0].id, dominio);
          }
          enviarResposta({ sucesso: true });
          break;
        }

        /** Dispara a UI de Seleção de Elemento (Seletor CSS via mouse) no content script da aba atual */
        case 'ATIVAR_SELECAO_INFO': {
          const abas = await chrome.tabs.query({ active: true, currentWindow: true });
          if (abas[0]?.id) {
            try {
              await chrome.tabs.sendMessage(abas[0].id, { tipo: 'ENTRAR_MODO_SELECAO' });
              enviarResposta({ sucesso: true });
            } catch (e) {
              enviarResposta({ sucesso: false, erro: 'Script de conteúdo não encontrado. Recarregue a página.' });
            }
          } else {
            enviarResposta({ sucesso: false, erro: 'Nenhuma aba ativa encontrada.' });
          }
          break;
        }

        /** Cancela a UI de Seleção de Elemento no content script */
        case 'CANCELAR_SELECAO_CAMPO': {
          const abas = await chrome.tabs.query({ active: true, currentWindow: true });
          if (abas[0]?.id) {
            try {
              await chrome.tabs.sendMessage(abas[0].id, { tipo: 'SAIR_MODO_SELECAO' });
            } catch (e) {}
          }
          enviarResposta({ sucesso: true });
          break;
        }

        /** Retorna o domínio da aba que está ativa no momento */
        case 'OBTER_DOMINIO_ATUAL': {
          const abas = await chrome.tabs.query({ active: true, currentWindow: true });
          const dominio = abas[0]?.url ? extrairDominio(abas[0].url) : null;
          enviarResposta({ dominio });
          break;
        }

        /** Notifica o content script que o site foi ativado/desativado para re-avaliar injeção do botão */
        case 'RECARREGAR_INJETOR': {
          const abas = await chrome.tabs.query({ active: true, currentWindow: true });
          if (abas[0]?.id) {
            try {
              await chrome.tabs.sendMessage(abas[0].id, { tipo: 'STATUS_SITE_ALTERADO', active: mensagem.active });
            } catch (e) {}
          }
          if (abas[0]) {
            const dominio = extrairDominio(abas[0].url);
            if (dominio) await atualizarIconeAba(abas[0].id, dominio);
          }
          enviarResposta({ sucesso: true });
          break;
        }

        default:
          enviarResposta({ sucesso: false, erro: 'Tipo de mensagem desconhecido' });
      }
    } catch (e) {
      enviarResposta({ sucesso: false, erro: e.message });
    }
  })();
  
  // Retorna true para indicar ao Chrome que enviarResposta será chamado de forma assíncrona
  return true; 
});

/**
 * Função utilitária para extrair apenas o Hostname (ex: www.google.com) de uma URL completa.
 * @param {string} url - A URL completa
 * @returns {string|null} - Hostname extraído ou null se a URL for inválida
 */
function extrairDominio(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* VERIFICAÇÃO DE ATUALIZAÇÃO VIA GITHUB                                    */
/* ══════════════════════════════════════════════════════════════════════════ */

/** @constant {string} URL da API pública do GitHub para a última release */
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/raimundoalvesstb/GigAtende/releases/latest';

/** @constant {string} Chave usada no chrome.storage.local para armazenar o status de atualização */
const CHAVE_ATUALIZACAO = 'gigaAtende_update';

/** @constant {string} Nome do alarme periódico de verificação */
const ALARME_ATUALIZACAO = 'verificarAtualizacao';

/** @constant {number} Intervalo de verificação em minutos (6 horas) */
const INTERVALO_VERIFICACAO_MINUTOS = 360;

/**
 * Compara duas strings de versão semântica (ex: "1.3.0" vs "1.2.2").
 * @param {string} versaoLocal - Versão instalada localmente.
 * @param {string} versaoRemota - Versão disponível no GitHub.
 * @returns {boolean} true se versaoRemota for maior que versaoLocal.
 */
function versaoRemotaMaior(versaoLocal, versaoRemota) {
  const partesLocal = versaoLocal.split('.').map(Number);
  const partesRemota = versaoRemota.split('.').map(Number);
  const tamanho = Math.max(partesLocal.length, partesRemota.length);

  for (let i = 0; i < tamanho; i++) {
    const l = partesLocal[i] || 0;
    const r = partesRemota[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

/**
 * Consulta a API do GitHub para verificar se existe uma versão mais recente da extensão.
 * Armazena o resultado (updateAvailable + latestVersion) em chrome.storage.local.
 * @async
 */
async function verificarAtualizacaoGitHub() {
  try {
    const resposta = await fetch(GITHUB_RELEASES_URL, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });

    if (!resposta.ok) return; // Falha silenciosa (rate limit, rede, etc.)

    const dados = await resposta.json();
    const tagName = dados.tag_name || '';

    // Remove o prefixo "v" se existir (ex: "v1.3.0" → "1.3.0")
    const versaoRemota = tagName.replace(/^v/i, '');
    const versaoLocal = chrome.runtime.getManifest().version;

    const atualizacaoDisponivel = versaoRemotaMaior(versaoLocal, versaoRemota);

    await chrome.storage.local.set({
      [CHAVE_ATUALIZACAO]: {
        updateAvailable: atualizacaoDisponivel,
        latestVersion: versaoRemota,
        checkedAt: Date.now()
      }
    });
  } catch (e) {
    // Falha silenciosa: sem internet ou erro de rede
  }
}

/**
 * Cria (ou recria) o alarme periódico de verificação de atualização.
 * Executa também uma verificação imediata na primeira vez.
 */
async function agendarVerificacaoAtualizacao() {
  // Cria o alarme periódico (a cada 6 horas)
  chrome.alarms.create(ALARME_ATUALIZACAO, {
    delayInMinutes: 1, // Primeira verificação 1 minuto após a extensão carregar
    periodInMinutes: INTERVALO_VERIFICACAO_MINUTOS
  });
}

/** Listener para o alarme de verificação de atualização */
chrome.alarms.onAlarm.addListener((alarme) => {
  if (alarme.name === ALARME_ATUALIZACAO) {
    verificarAtualizacaoGitHub();
  }
});

/** Ao instalar ou atualizar a extensão, agendar a verificação */
chrome.runtime.onInstalled.addListener(() => {
  agendarVerificacaoAtualizacao();
});

/** Ao iniciar o service worker, garantir que o alarme existe */
chrome.runtime.onStartup.addListener(() => {
  agendarVerificacaoAtualizacao();
});

