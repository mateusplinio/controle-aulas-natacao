// Google Apps Script para integração com GitHub Pages
const SHEET_NAME = 'Página1'; // Mude se sua planilha tiver outro nome

// Configuração CORS para GitHub Pages
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return createResponse(400, { error: 'Planilha não encontrada' });
    }
    
    // Se for GET, retornar dados
    if (e.queryString) {
      return getData(sheet);
    }
    
    // Se for POST, adicionar dados
    if (e.postData) {
      return addData(sheet, e.postData.contents);
    }
    
    return createResponse(400, { error: 'Requisição inválida' });
    
  } catch (error) {
    console.error('Erro:', error);
    return createResponse(500, { error: error.toString() });
  }
}

function getData(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Converter para JSON
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // Só adicionar se tiver data
      result.push({
        data: formatDate(row[0]),
        professora: row[1] || '',
        quantidade: row[2] || 0,
        timestamp: row[3] || new Date().toISOString()
      });
    }
  }
  
  // Se veio via JSONP, retornar como callback
  const callback = ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
    
  // Permitir CORS do GitHub Pages
  callback.setHeader('Access-Control-Allow-Origin', '*');
  return callback;
}

function addData(sheet, postData) {
  try {
    const data = JSON.parse(postData);
    
    // Validar dados
    if (!data.data || !data.professora || !data.quantidade) {
      return createResponse(400, { error: 'Dados incompletos' });
    }
    
    // Adicionar à planilha
    sheet.appendRow([
      data.data,
      data.professora,
      Number(data.quantidade),
      new Date().toISOString()
    ]);
    
    // Limpar células vazias
    const lastRow = sheet.getLastRow();
    const range = sheet.getRange(1, 1, lastRow, 4);
    range.sort({ column: 1, ascending: false }); // Ordenar por data
    
    return createResponse(200, { 
      success: true, 
      message: 'Aula salva com sucesso!' 
    });
    
  } catch (error) {
    return createResponse(400, { error: 'Erro ao processar dados: ' + error.toString() });
  }
}

function createResponse(status, data) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
    
  // Headers CORS para GitHub Pages
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  return output;
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  
  if (dateValue instanceof Date) {
    return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  
  // Tentar converter string para data
  try {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
  } catch (e) {
    // Ignorar erro
  }
  
  return dateValue.toString();
}

// Função de inicialização (opcional)
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Configuração')
    .addItem('Configurar API', 'showConfigDialog')
    .addToUi();
}

function showConfigDialog() {
  const html = HtmlService.createHtmlOutput(`
    <div style="padding: 20px;">
      <h3>API Configurada!</h3>
      <p>Seu sistema está pronto para receber dados.</p>
      <p><strong>URL da Web App:</strong></p>
      <code id="url">Carregando...</code>
      <p style="margin-top: 20px; color: #666;">
        Copie esta URL e cole no sistema web.
      </p>
    </div>
    <script>
      google.script.run.withSuccessHandler(function(url) {
        document.getElementById('url').textContent = url;
      }).getScriptUrl();
    </script>
  `)
  .setWidth(400)
  .setHeight(200);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Configuração da API');
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}