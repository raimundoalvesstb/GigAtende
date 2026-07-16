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
 * @file src/app/admin/adminEstado.js
 * @description Estado Global da Administração.
 * Mantém em memória (RAM) a cópia sincronizada dos dados armazenados localmente (Chrome Storage).
 * Evita múltiplas chamadas assíncronas de leitura ao banco de dados durante a renderização.
 */

'use strict';

window.AdminEstado = {
  /** @type {Array} Lista global de categorias cadastradas. */
  categories: [],
  
  /** @type {Array} Lista global de mensagens (templates) cadastradas. */
  messages: [],
  
  /** @type {Object} Configurações globais (ex: tema visual, espaçamento/densidade). */
  settings: {},
  
  /** @type {Array} Perfis de sites com seletores CSS customizados. */
  siteProfiles: [],
  
  /**
   * Lê todos os dados atuais do banco de dados (GoArmazenamento) e os carrega na memória.
   * @async
   */
  carregarTudo: async function() {
    const data = await window.GoArmazenamento.obterDados();
    this.categories = data.categories || [];
    this.messages = data.messages || [];
    this.settings = data.settings || { theme: 'light' };
    this.siteProfiles = data.siteProfiles || [];
  },
  
  /**
   * Gera um ID único aleatório baseado em um prefixo (útil para criar chaves de categorias e mensagens).
   * @param {string} prefixo - Prefixo a ser utilizado (ex: 'cat' ou 'msg').
   * @returns {string} ID único. Ex: 'cat_8f2g5b'
   */
  gerarId: function(prefixo) {
    return prefixo + '_' + Math.random().toString(36).substr(2, 9);
  }
};

