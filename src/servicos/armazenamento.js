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
 * @file src/servicos/armazenamento.js
 * @description Serviço de Armazenamento Central.
 * Expõe window.GigaArmazenamento para content, popup e admin.
 * Interage diretamente com a API do chrome.storage.local.
 */
(function () {
  'use strict';

  const VERSAO_ESQUEMA = '1.1';
  const CHAVE_ARMAZENAMENTO = 'gigaAtende_data';

  /** @type {Object} Estado inicial/padrão que é injetado na primeira instalação ou falha na leitura. */
  const DADOS_PADRAO = {
    versao: VERSAO_ESQUEMA,
    settings: { theme: 'light' },
    siteProfiles: [],
    placeholders: [
      { id: 'campo_de_mensagens', name: 'Campo de mensagens', fixed: true },
      { id: 'cliente', name: 'Nome do cliente', fixed: true }
    ],
    categories: [
      { id: 'cat-greeting', name: 'Saudação', color: '#4CAF50', order: 0, active: true, fixed: true },
      { id: 'cat-signature', name: 'Assinatura', color: '#9C27B0', order: 1, active: true, fixed: true }
    ],
    messages: [
      {
        id: 'msg-demo-greeting',
        title: 'Primeira Saudação',
        icon: null,
        contentHtml: '<p>Olá! Tudo bem? 👋<br>Em que posso ajudar?</p>',
        contentText: 'Olá! Tudo bem? 👋\nEm que posso ajudar?',
        categoryIds: ['cat-greeting'],
        tags: ['saudação', 'padrão'],
        favorite: false,
        updatedAt: new Date().toISOString()
      },
      {
        id: 'msg-demo-signature',
        title: 'Primeira Assinatura',
        icon: null,
        contentHtml: '<p>Atenciosamente,<br>Funcionário<br>Setor</p>',
        contentText: 'Atenciosamente,\nFuncionário\nSetor',
        categoryIds: ['cat-signature'],
        tags: ['assinatura', 'padrão'],
        favorite: false,
        updatedAt: new Date().toISOString()
      }
    ],
    templates: [],
    estadoUi: { ultimoDominioSite: '', ultimoIdCategoria: '', textoBusca: '', emojisRecentes: [] },
    historico: []
  };

  /**
   * Obtém todo o banco de dados do armazenamento local.
   * @async
   * @returns {Promise<Object>} Dados processados e mesclados com os padrões.
   */
  async function obterDados() {
    return new Promise(resolve => {
      try {
        if (!chrome?.runtime?.id) throw new Error('Context invalidated');
        chrome.storage.local.get(CHAVE_ARMAZENAMENTO, result => {
          if (chrome.runtime.lastError) {
             return resolve(JSON.parse(JSON.stringify(DADOS_PADRAO)));
          }
          const cru = result[CHAVE_ARMAZENAMENTO];
          if (!cru) return resolve(JSON.parse(JSON.stringify(DADOS_PADRAO)));
          try {
            const dados = typeof cru === 'string' ? JSON.parse(cru) : cru;
            resolve(mesclarComPadroes(dados));
          } catch (e) {
            resolve(JSON.parse(JSON.stringify(DADOS_PADRAO)));
          }
        });
      } catch(e) {
        /* Extension context invalidated (extensão recarregada/atualizada) */
        resolve(JSON.parse(JSON.stringify(DADOS_PADRAO)));
      }
    });
  }

  /**
   * Escreve o banco de dados inteiro no armazenamento local.
   * @async
   * @param {Object} dados - O objeto inteiro a ser salvo.
   * @returns {Promise<boolean>} True se sucesso.
   */
  async function definirDados(dados) {
    return new Promise((resolve) => {
      try {
        if (!chrome?.runtime?.id) throw new Error('Context invalidated');
        chrome.storage.local.set({ [CHAVE_ARMAZENAMENTO]: dados }, () => {
          if (chrome.runtime.lastError) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (e) {
        /* Contexto invalidado (extensão foi atualizada ou desativada no meio do uso) */
        resolve(false);
      }
    });
  }

  /**
   * Garante a compatibilidade com esquemas antigos e mescla chaves ausentes.
   * Suporta retrocompatibilidade para backups que usavam "categorias" / "mensagens" etc.
   * @param {Object} dados - Dados brutos do Storage ou arquivo.
   * @returns {Object} Dados padronizados na versão atual.
   */
  function mesclarComPadroes(dados) {
    const padrao = JSON.parse(JSON.stringify(DADOS_PADRAO));
    const perfisSites = (Array.isArray(dados.siteProfiles || dados.perfisSites) ? (dados.siteProfiles || dados.perfisSites) : []).map(normalizarPerfilSite);
    
    let categorias = Array.isArray(dados.categories || dados.categorias) ? (dados.categories || dados.categorias) : padrao.categories;
    categorias = garantirCategoriasFixas(categorias, padrao.categories);

    return {
      versao: dados.versao || padrao.versao,
      settings: { ...padrao.settings, ...(dados.settings || dados.configuracoes || {}) },
      siteProfiles: perfisSites,
      categories: categorias,
      placeholders: Array.isArray(dados.placeholders) ? dados.placeholders : padrao.placeholders,
      messages: Array.isArray(dados.messages || dados.mensagens) ? (dados.messages || dados.mensagens) : padrao.messages,
      templates: Array.isArray(dados.templates) ? dados.templates : padrao.templates,
      estadoUi: { ...padrao.estadoUi, ...(dados.estadoUi || dados.uiState || {}) },
      historico: Array.isArray(dados.historico || dados.history) ? (dados.historico || dados.history) : []
    };
  }

  /**
   * Normaliza o modelo de um perfil de site (Suporta migração de 'seletor' para array 'selectors').
   * @param {Object} ps - Perfil parcial.
   * @returns {Object} Perfil completo e padronizado.
   */
  function normalizarPerfilSite(ps) {
    const norm = { ...ps };
    if (!Array.isArray(norm.selectors)) {
      norm.selectors = typeof norm.seletor === 'string' ? [norm.seletor] : [];
    }
    delete norm.seletor;
    
    // Migração para placeholdersMap
    if (!norm.placeholdersMap) {
      norm.placeholdersMap = {};
      if (norm.selectors && norm.selectors.length > 0) {
        norm.placeholdersMap['campo_de_mensagens'] = norm.selectors[0];
      }
    }
    // Não precisamos mais do selectors antigo, mas podemos mantê-lo para evitar quebras silenciosas em outros lugares
    
    if (!norm.label) norm.label = norm.domain || '';
    if (!norm.buttonPosition) norm.buttonPosition = null;
    if (typeof norm.active !== 'boolean') norm.active = false;
    if (!norm.editorType) norm.editorType = 'auto';
    if (!norm.notas) norm.notas = '';
    return norm;
  }

  /**
   * Garante que categorias críticas de sistema ('fixed: true') não sejam apagadas acidentalmente.
   * @param {Array} categorias - Categorias do usuário.
   * @param {Array} padroes - Categorias originais com a flag fixed.
   * @returns {Array} Categorias validadas.
   */
  function garantirCategoriasFixas(categorias, padroes) {
    const fixas = padroes.filter(c => c.fixed);
    fixas.forEach(catFixa => {
      const idx = categorias.findIndex(c => c.id === catFixa.id);
      if (idx === -1) categorias.unshift(catFixa);
      else categorias[idx].fixed = true;
    });
    return categorias;
  }

  // === MÉTODOS DE SITES === //

  async function obterPerfilSite(dominio) {
    const dados = await obterDados();
    return dados.siteProfiles.find(p => p.domain === dominio) || null;
  }

  async function atualizarPerfilSite(dominio, atualizacoes) {
    const dados = await obterDados();
    const idx = dados.siteProfiles.findIndex(p => p.domain === dominio);
    if (idx === -1) {
      dados.siteProfiles.push(normalizarPerfilSite({ 
        domain: dominio, label: dominio, active: false, editorType: 'auto', selectors: [], placeholdersMap: {}, buttonPosition: null, notas: '', ...atualizacoes 
      }));
    } else {
      dados.siteProfiles[idx] = normalizarPerfilSite({ ...dados.siteProfiles[idx], ...atualizacoes });
    }
    await definirDados(dados);
    return dados.siteProfiles.find(p => p.domain === dominio);
  }

  async function excluirPerfilSite(dominio) {
    const dados = await obterDados();
    dados.siteProfiles = dados.siteProfiles.filter(p => p.domain !== dominio);
    await definirDados(dados);
  }

  async function salvarPosicaoBotao(dominio, posicao) {
    return atualizarPerfilSite(dominio, { buttonPosition: posicao });
  }


  // === MÉTODOS DE CATEGORIAS === //

  async function obterCategorias() {
    const dados = await obterDados();
    return [...dados.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async function salvarCategoria(cat) {
    const dados = await obterDados();
    const idx = dados.categories.findIndex(c => c.id === cat.id);
    if (idx === -1) {
      const maxOrdem = dados.categories.reduce((m, c) => Math.max(m, c.order || 0), -1);
      dados.categories.push({ ...cat, order: maxOrdem + 1 });
    } else {
      dados.categories[idx] = { ...dados.categories[idx], ...cat, fixed: dados.categories[idx].fixed };
    }
    await definirDados(dados);
  }

  async function excluirCategoria(id) {
    const dados = await obterDados();
    const cat = dados.categories.find(c => c.id === id);
    if (cat?.fixed) return false;
    
    dados.categories = dados.categories.filter(c => c.id !== id);
    // Remove o ID da categoria que foi deletada de todas as mensagens
    dados.messages = dados.messages.map(m => ({
      ...m,
      categoryIds: (m.categoryIds || []).filter(cid => cid !== id)
    }));
    
    await definirDados(dados);
    return true;
  }

  async function moverCategoria(id, direcao) {
    const dados = await obterDados();
    dados.categories.sort((a, b) => (a.order || 0) - (b.order || 0));
    dados.categories.forEach((c, i) => c.order = i); // Normaliza ordem

    const idx = dados.categories.findIndex(c => c.id === id);
    if (idx === -1) return false;

    if (direcao === 'prev' && idx > 0) {
      const temp = dados.categories[idx].order;
      dados.categories[idx].order = dados.categories[idx - 1].order;
      dados.categories[idx - 1].order = temp;
    } else if (direcao === 'next' && idx < dados.categories.length - 1) {
      const temp = dados.categories[idx].order;
      dados.categories[idx].order = dados.categories[idx + 1].order;
      dados.categories[idx + 1].order = temp;
    } else {
      return false; 
    }

    await definirDados(dados);
    return true;
  }

  // === MÉTODOS DE MENSAGENS === //

  async function obterMensagens(filtros = {}) {
    const dados = await obterDados();
    let msgs = [...dados.messages];
    
    if (filtros.idCategoria) msgs = msgs.filter(m => (m.categoryIds || []).includes(filtros.idCategoria));
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      msgs = msgs.filter(m => m.title.toLowerCase().includes(q) || (m.contentText || '').toLowerCase().includes(q) || (m.tags || []).some(t => t.toLowerCase().includes(q)));
    }
    if (filtros.favorite) msgs = msgs.filter(m => m.favorite);
    
    // A ordem manual do array é absoluta, portanto não ordenamos por favoritos.
    return msgs;
  }

  async function salvarMensagem(msg) {
    const dados = await obterDados();
    const idx = dados.messages.findIndex(m => m.id === msg.id);
    const completa = { ...msg, updatedAt: new Date().toISOString() };
    if (idx === -1) dados.messages.push(completa);
    else dados.messages[idx] = { ...dados.messages[idx], ...completa };
    await definirDados(dados);
    return completa;
  }

  async function excluirMensagem(id) {
    const dados = await obterDados();
    dados.messages = dados.messages.filter(m => m.id !== id);
    await definirDados(dados);
  }

  async function duplicarMensagem(id) {
    const dados = await obterDados();
    const orig = dados.messages.find(m => m.id === id);
    if (!orig) return null;
    const copia = { ...orig, id: 'msg-' + Date.now(), title: orig.title + ' (cópia)', updatedAt: new Date().toISOString(), favorite: false };
    dados.messages.push(copia);
    await definirDados(dados);
    return copia;
  }

  async function moverMensagem(id, targetIndex) {
    const dados = await obterDados();
    const msgs = dados.messages;
    const realSourceIndex = msgs.findIndex(m => m.id === id);
    if (realSourceIndex === -1) return false;

    const [movedItem] = msgs.splice(realSourceIndex, 1);
    
    const safeTargetIndex = Math.max(0, Math.min(targetIndex, msgs.length));
    msgs.splice(safeTargetIndex, 0, movedItem);

    await definirDados(dados);
    return true;
  }

  // === MÉTODOS DIVERSOS E UI === //

  async function obterConfiguracoes() { return (await obterDados()).settings; }
  
  async function salvarConfiguracoes(cfg) {
    const dados = await obterDados();
    dados.settings = { ...dados.settings, ...cfg };
    await definirDados(dados);
    return dados.settings;
  }

  async function adicionarHistorico(idMensagem, dominio) {
    const dados = await obterDados();
    dados.historico.unshift({ idMensagem, dominio, usadoEm: new Date().toISOString() });
    
    const noventaDiasAtras = new Date();
    noventaDiasAtras.setDate(noventaDiasAtras.getDate() - 90);
    dados.historico = dados.historico.filter(item => new Date(item.usadoEm) >= noventaDiasAtras);
    
    await definirDados(dados);
  }

  async function obterHistoricoFiltrado(dias = 30) {
    const dados = await obterDados();
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);
    return dados.historico.filter(item => new Date(item.usadoEm) >= dataLimite);
  }

  async function adicionarEmojiRecente(emoji) {
    const dados = await obterDados();
    const recentes = (dados.estadoUi.emojisRecentes || []).filter(e => e !== emoji);
    dados.estadoUi.emojisRecentes = [emoji, ...recentes].slice(0, 16); // Salva até 16
    await definirDados(dados);
  }

  async function obterEmojisRecentes() { return (await obterDados()).estadoUi?.emojisRecentes || []; }

  // === IMPORT/EXPORT (Backup) === //

  async function exportarDados() { return JSON.stringify(await obterDados(), null, 2); }

  async function importarDados(jsonString, modo = 'replace') {
    const entrada = JSON.parse(jsonString);
    if (!entrada || typeof entrada !== 'object' || (!Array.isArray(entrada.categories || entrada.categorias) && !Array.isArray(entrada.messages || entrada.mensagens))) throw new Error('Dados inválidos ou corrompidos.');
    
    if (modo === 'replace') {
      const mesclado = mesclarComPadroes(entrada);
      await definirDados(mesclado);
      return mesclado;
    }
    
    // Modo merge
    const atual = await obterDados();
    const idsCat = new Set(atual.categories.map(c => c.id));
    const idsMsg = new Set(atual.messages.map(m => m.id));
    
    const novasCats = entrada.categories || entrada.categorias || [];
    const novasMsgs = entrada.messages || entrada.mensagens || [];
    
    novasCats.forEach(c => { if (!idsCat.has(c.id)) atual.categories.push(c); });
    novasMsgs.forEach(m => { if (!idsMsg.has(m.id)) atual.messages.push(m); });
    
    const padrao = JSON.parse(JSON.stringify(DADOS_PADRAO));
    atual.categories = garantirCategoriasFixas(atual.categories, padrao.categories);
    
    await definirDados(atual);
    return atual;
  }

  async function obterEstadoUi() { return (await obterDados()).estadoUi || {}; }
  async function salvarEstadoUi(atualizacoes) {
    const dados = await obterDados();
    dados.estadoUi = { ...dados.estadoUi, ...atualizacoes };
    await definirDados(dados);
  }

  function gerarId(prefixo = 'id') { return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

  // Expõe a API globalmente (Namespace GigaArmazenamento)
  window.GigaArmazenamento = {
    obterDados, definirDados,
    obterPerfilSite, atualizarPerfilSite, excluirPerfilSite, salvarPosicaoBotao,
    obterCategorias, salvarCategoria, excluirCategoria, moverCategoria,
    obterMensagens, salvarMensagem, excluirMensagem, duplicarMensagem, moverMensagem,
    obterConfiguracoes, salvarConfiguracoes,
    adicionarHistorico, obterHistoricoFiltrado,
    adicionarEmojiRecente, obterEmojisRecentes,
    exportarDados, importarDados,
    obterEstadoUi, salvarEstadoUi,
    gerarId,
    DADOS_PADRAO, VERSAO_ESQUEMA
  };
})();

