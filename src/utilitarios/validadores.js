/* src/utilitarios/validadores.js â€“ Validadores de Dados do GigAtende
 * Exposto globalmente como window.GigaValidator.
 */
(function () {
  'use strict';

  function validateCategory(categoria) {
    const erros = [];
    if (!categoria || typeof categoria !== 'object') {
        return ['Dados de categoria invÃ¡lidos.'];
    }
    if (!categoria.name || !categoria.name.trim()) {
        erros.push('O nome da categoria Ã© obrigatÃ³rio.');
    }
    if (!categoria.color || !/^#[0-9A-Fa-f]{6}$/.test(categoria.color)) {
        erros.push('Cor invÃ¡lida (use o formato #RRGGBB).');
    }
    return erros;
  }

  function validateMessage(mensagem) {
    const erros = [];
    if (!mensagem || typeof mensagem !== 'object') {
        return ['Dados de mensagem invÃ¡lidos.'];
    }
    if (!mensagem.title || !mensagem.title.trim()) {
        erros.push('O tÃ­tulo Ã© obrigatÃ³rio.');
    }
    if (!mensagem.contentText && !mensagem.contentHtml) {
        erros.push('O conteÃºdo Ã© obrigatÃ³rio.');
    }
    return erros;
  }

  function validateImportData(dados) {
    const erros = [];
    if (!dados || typeof dados !== 'object') {
      return ['Arquivo invÃ¡lido: nÃ£o Ã© um objeto JSON.'];
    }
    if (dados.versao && typeof dados.versao !== 'string') {
      erros.push('O campo "versao" deve ser um texto (string).');
    }
    if (dados.categorias !== undefined && !Array.isArray(dados.categorias)) {
      erros.push('O campo "categorias" deve ser uma lista (array).');
    }
    if (dados.mensagens !== undefined && !Array.isArray(dados.mensagens)) {
      erros.push('O campo "mensagens" deve ser uma lista (array).');
    }
    if (!Array.isArray(dados.categorias) && !Array.isArray(dados.mensagens)) {
      erros.push('Nenhuma categoria ou mensagem foi encontrada no arquivo.');
    }
    return erros;
  }

  function validateColor(cor) {
    return /^#[0-9A-Fa-f]{6}$/.test(cor);
  }

  window.GigaValidator = {
    validateCategory,
    validateMessage,
    validateImportData,
    validateColor
  };
})();


