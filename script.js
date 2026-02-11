// ============================================
// SISTEMA DE CONTROLE DE AULAS - GOOGLE SHEETS
// ============================================

// CONFIGURAÇÃO - EDITE APENAS ESTA PARTE!
const CONFIG = {
    // ID da sua planilha (encontre na URL do Google Sheets)
    SPREADSHEET_ID: '1bJyd3TF5DepaIZWR5lKi48CIBbCa-W8M9awZkQrbsEQ',
    
    // Nomes das abas na planilha
    SHEET_NAMES: {
        DADOS: 'Aulas',
        CONFIG: 'Config'
    },
    
    // URLs do Google Apps Script (não mude)
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyRVyhn7P-tSxJEnVt2JQ6NshQdKjNFb7riM0qB8U96PhP7Alaig_mj3G9UqgE8Q2tX/exec'
};

// Variáveis globais
let aulas = [];
let charts = {
    professoras: null,
    semanal: null
};
let filtrosAtuais = {
    periodo: 'hoje',
    professora: ''
};

// ============================================
// INICIALIZAÇÃO DO SISTEMA
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando sistema de controle de aulas...');
    
    // Configurar data atual
    setTodayDate();
    
    // Inicializar gráficos
    inicializarGraficos();
    
    // Configurar eventos
    configurarEventos();
    
    // Carregar dados iniciais
    setTimeout(() => {
        carregarDoGoogleSheets();
    }, 1000);
    
    console.log('Sistema inicializado com sucesso!');
});

function setTodayDate() {
    const hoje = new Date().toISOString().split('T')[0];
    const dataInput = document.getElementById('data');
    if (dataInput) {
        dataInput.value = hoje;
        dataInput.max = hoje;
    }
}

function configurarEventos() {
    // Formulário de lançamento
    const form = document.getElementById('aulaForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            salvarAula();
        });
    }
    
    // Configurar modal de confirmação
    document.getElementById('confirmYes').addEventListener('click', confirmarAcao);
    document.getElementById('confirmNo').addEventListener('click', cancelarAcao);
    
    // Fechar modais ao clicar fora
    window.addEventListener('click', function(e) {
        const loadingModal = document.getElementById('loadingModal');
        const confirmModal = document.getElementById('confirmModal');
        
        if (e.target === loadingModal) {
            loadingModal.style.display = 'none';
        }
        if (e.target === confirmModal) {
            confirmModal.style.display = 'none';
        }
    });
}

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

async function salvarAula() {
    // Obter dados do formulário
    const aula = {
        data: document.getElementById('data').value,
        professora: document.getElementById('professora').value,
        quantidade: parseInt(document.getElementById('quantidade').value)
    };
    
    // Validação
    if (!aula.data || !aula.professora || !aula.quantidade) {
        mostrarMensagem('Preencha todos os campos!', 'error');
        return;
    }
    
    if (aula.quantidade < 1 || aula.quantidade > 10) {
        mostrarMensagem('Quantidade deve ser entre 1 e 10', 'error');
        return;
    }
    
    mostrarLoading('Salvando aula no Google Sheets...');
    
    try {
        // Salvar usando Google Apps Script
        const sucesso = await salvarNoGoogleSheets(aula);
        
        if (sucesso) {
            mostrarMensagem('Aula salva com sucesso!', 'success');
            
            // Atualizar dados
            await carregarDoGoogleSheets();
            
            // Limpar formulário (mantém data)
            document.getElementById('professora').value = '';
            document.getElementById('quantidade').value = '1';
            
        } else {
            mostrarMensagem('Erro ao salvar. Tente novamente.', 'error');
        }
        
    } catch (error) {
        console.error('Erro ao salvar:', error);
        mostrarMensagem('Erro: ' + error.message, 'error');
        
        // Tentar salvar localmente como fallback
        salvarLocalmente(aula);
        
    } finally {
        esconderLoading();
    }
}

async function carregarDoGoogleSheets() {
    mostrarLoading('Carregando dados do Google Sheets...');
    
    try {
        // Carregar dados do Google Sheets via API
        const dados = await carregarDadosDaAPI();
        
        if (dados && Array.isArray(dados)) {
            aulas = dados;
            console.log('Dados carregados:', aulas.length, 'registros');
            
            // Atualizar interface
            atualizarDashboard();
            filtrarTabela();
            atualizarGraficos();
            atualizarResumos();
            
            mostrarMensagem('Dados atualizados com sucesso!', 'success');
            
        } else {
            throw new Error('Formato de dados inválido');
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        
        // Tentar carregar dados locais
        const dadosLocais = carregarDadosLocais();
        if (dadosLocais.length > 0) {
            aulas = dadosLocais;
            atualizarDashboard();
            filtrarTabela();
            atualizarGraficos();
            atualizarResumos();
            
            mostrarMensagem('Usando dados locais (sem conexão)', 'warning');
        } else {
            mostrarMensagem('Erro ao carregar dados do Google Sheets', 'error');
        }
        
    } finally {
        esconderLoading();
    }
}

function filtrarTabela() {
    if (!aulas || aulas.length === 0) {
        document.getElementById('tabelaRegistros').innerHTML = 
            '<tr><td colspan="5" class="no-data">Nenhum registro encontrado</td></tr>';
        return;
    }
    
    // Obter filtros
    const periodo = document.getElementById('filtroPeriodo').value;
    const professora = document.getElementById('filtroProfessora').value;
    
    filtrosAtuais = { periodo, professora };
    
    // Aplicar filtros
    let dadosFiltrados = [...aulas];
    
    // Filtrar por período
    const hoje = new Date();
    switch(periodo) {
        case 'hoje':
            const hojeStr = hoje.toISOString().split('T')[0];
            dadosFiltrados = dadosFiltrados.filter(a => a.data === hojeStr);
            break;
        case 'semana':
            const umaSemanaAtras = new Date(hoje);
            umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
            dadosFiltrados = dadosFiltrados.filter(a => new Date(a.data) >= umaSemanaAtras);
            break;
        case 'mes':
            const umMesAtras = new Date(hoje);
            umMesAtras.setMonth(umMesAtras.getMonth() - 1);
            dadosFiltrados = dadosFiltrados.filter(a => new Date(a.data) >= umMesAtras);
            break;
        // 'todos' não filtra
    }
    
    // Filtrar por professora
    if (professora) {
        dadosFiltrados = dadosFiltrados.filter(a => a.professora === professora);
    }
    
    // Ordenar por data (mais recente primeiro)
    dadosFiltrados.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    // Atualizar tabela
    const tbody = document.getElementById('tabelaRegistros');
    tbody.innerHTML = '';
    
    dadosFiltrados.forEach(aula => {
        const data = new Date(aula.data);
        const diaSemana = getDiaSemana(data.getDay());
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatarData(aula.data)}</td>
            <td>${diaSemana}</td>
            <td>
                <span class="${aula.professora === 'Daniele' ? 'badge badge-daniele' : 'badge badge-isabela'}">
                    ${aula.professora}
                </span>
            </td>
            <td>${aula.quantidade}</td>
            <td>${formatarHora(aula.registro || '')}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Atualizar totais
    const totalPeriodo = dadosFiltrados.reduce((sum, a) => sum + a.quantidade, 0);
    document.getElementById('totalPeriodo').textContent = totalPeriodo;
    document.getElementById('totalRegistros').textContent = dadosFiltrados.length;
}

// ============================================
// DASHBOARD E ESTATÍSTICAS
// ============================================

function atualizarDashboard() {
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    
    // Aulas de hoje
    const aulasHoje = aulas.filter(a => a.data === hoje);
    const totalHoje = aulasHoje.reduce((sum, a) => sum + a.quantidade, 0);
    
    // Totais por professora
    const totalDaniele = aulas
        .filter(a => a.professora === 'Daniele')
        .reduce((sum, a) => sum + a.quantidade, 0);
        
    const totalIsabela = aulas
        .filter(a => a.professora === 'Isabela')
        .reduce((sum, a) => sum + a.quantidade, 0);
    
    // Aulas deste mês
    const aulasMes = aulas.filter(aula => {
        const data = new Date(aula.data);
        return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    });
    const totalMes = aulasMes.reduce((sum, a) => sum + a.quantidade, 0);
    
    // Atualizar UI
    document.getElementById('totalHoje').textContent = totalHoje;
    document.getElementById('totalDaniele').textContent = totalDaniele;
    document.getElementById('totalIsabela').textContent = totalIsabela;
    document.getElementById('totalMes').textContent = totalMes;
}

function atualizarResumos() {
    const hoje = new Date();
    const umMesAtras = new Date(hoje);
    umMesAtras.setMonth(umMesAtras.getMonth() - 1);
    
    // Daniele
    const aulasDaniele = aulas.filter(a => a.professora === 'Daniele');
    const totalDaniele = aulasDaniele.reduce((sum, a) => sum + a.quantidade, 0);
    
    const danieleMes = aulasDaniele
        .filter(a => new Date(a.data) >= umMesAtras)
        .reduce((sum, a) => sum + a.quantidade, 0);
    
    const diasDaniele = new Set(aulasDaniele.map(a => a.data)).size;
    const mediaDaniele = diasDaniele > 0 ? (totalDaniele / diasDaniele).toFixed(1) : 0;
    
    // Isabela
    const aulasIsabela = aulas.filter(a => a.professora === 'Isabela');
    const totalIsabela = aulasIsabela.reduce((sum, a) => sum + a.quantidade, 0);
    
    const isabelaMes = aulasIsabela
        .filter(a => new Date(a.data) >= umMesAtras)
        .reduce((sum, a) => sum + a.quantidade, 0);
    
    const diasIsabela = new Set(aulasIsabela.map(a => a.data)).size;
    const mediaIsabela = diasIsabela > 0 ? (totalIsabela / diasIsabela).toFixed(1) : 0;
    
    // Atualizar UI
    document.getElementById('resumoTotalDaniele').textContent = totalDaniele;
    document.getElementById('danieleMes').textContent = danieleMes;
    document.getElementById('danieleMedia').textContent = mediaDaniele;
    document.getElementById('danieleDias').textContent = diasDaniele;
    
    document.getElementById('resumoTotalIsabela').textContent = totalIsabela;
    document.getElementById('isabelaMes').textContent = isabelaMes;
    document.getElementById('isabelaMedia').textContent = mediaIsabela;
    document.getElementById('isabelaDias').textContent = diasIsabela;
}

// ============================================
// GRÁFICOS
// ============================================

function inicializarGraficos() {
    // Gráfico de distribuição por professora
    const ctxProfessora = document.getElementById('chartProfessoras');
    if (ctxProfessora) {
        charts.professora = new Chart(ctxProfessora, {
            type: 'doughnut',
            data: {
                labels: ['Daniele', 'Isabela'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#9C27B0', '#009688'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Gráfico semanal
    const ctxSemanal = document.getElementById('chartSemanal');
    if (ctxSemanal) {
        charts.semanal = new Chart(ctxSemanal, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Daniele',
                        data: [],
                        backgroundColor: '#9C27B0'
                    },
                    {
                        label: 'Isabela',
                        data: [],
                        backgroundColor: '#009688'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

function atualizarGraficos() {
    // Gráfico de distribuição
    if (charts.professora) {
        const totalDaniele = aulas
            .filter(a => a.professora === 'Daniele')
            .reduce((sum, a) => sum + a.quantidade, 0);
            
        const totalIsabela = aulas
            .filter(a => a.professora === 'Isabela')
            .reduce((sum, a) => sum + a.quantidade, 0);
        
        charts.professora.data.datasets[0].data = [totalDaniele, totalIsabela];
        charts.professora.update();
    }
    
    // Gráfico semanal (últimos 7 dias)
    if (charts.semanal) {
        const hoje = new Date();
        const dias = [];
        const dadosDaniele = [];
        const dadosIsabela = [];
        
        for (let i = 6; i >= 0; i--) {
            const data = new Date(hoje);
            data.setDate(data.getDate() - i);
            const dataStr = data.toISOString().split('T')[0];
            
            const diaFormatado = formatarDataAbreviada(data);
            dias.push(diaFormatado);
            
            const aulasDia = aulas.filter(a => a.data === dataStr);
            const danieleDia = aulasDia
                .filter(a => a.professora === 'Daniele')
                .reduce((sum, a) => sum + a.quantidade, 0);
                
            const isabelaDia = aulasDia
                .filter(a => a.professora === 'Isabela')
                .reduce((sum, a) => sum + a.quantidade, 0);
            
            dadosDaniele.push(danieleDia);
            dadosIsabela.push(isabelaDia);
        }
        
        charts.semanal.data.labels = dias;
        charts.semanal.data.datasets[0].data = dadosDaniele;
        charts.semanal.data.datasets[1].data = dadosIsabela;
        charts.semanal.update();
    }
}

// ============================================
// GOOGLE SHEETS API
// ============================================

async function salvarNoGoogleSheets(aula) {
    try {
        // Adicionar timestamp
        aula.registro = new Date().toISOString();
        
        // Enviar para Google Apps Script
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Importante para GitHub Pages
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'add',
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                data: aula
            })
        });
        
        // Como usamos no-cors, não podemos ver a resposta
        // Mas assumimos que foi enviado
        console.log('Aula enviada para Google Sheets:', aula);
        
        // Salvar localmente também
        salvarLocalmente(aula);
        
        return true;
        
    } catch (error) {
        console.error('Erro ao salvar no Google Sheets:', error);
        
        // Fallback: salvar localmente
        salvarLocalmente(aula);
        
        return false;
    }
}

async function carregarDadosDaAPI() {
    try {
        // Usar Google Apps Script para buscar dados
        const response = await fetch(
            `${CONFIG.APPS_SCRIPT_URL}?action=get&spreadsheetId=${CONFIG.SPREADSHEET_ID}&t=${Date.now()}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
            return data.data;
        } else {
            throw new Error(data.error || 'Erro ao carregar dados');
        }
        
    } catch (error) {
        console.error('Erro na API:', error);
        throw error;
    }
}

async function testarConexaoSheets() {
    mostrarLoading('Testando conexão com Google Sheets...');
    
    try {
        const response = await fetch(
            `${CONFIG.APPS_SCRIPT_URL}?action=test&spreadsheetId=${CONFIG.SPREADSHEET_ID}`
        );
        
        const data = await response.json();
        
        if (data.success) {
            mostrarMensagem('✅ Conexão com Google Sheets estabelecida!', 'success');
            return true;
        } else {
            mostrarMensagem('❌ ' + (data.error || 'Erro na conexão'), 'error');
            return false;
        }
        
    } catch (error) {
        console.error('Erro ao testar conexão:', error);
        mostrarMensagem('❌ Erro de conexão: ' + error.message, 'error');
        return false;
        
    } finally {
        esconderLoading();
    }
}

// ============================================
// ARMAZENAMENTO LOCAL (FALLBACK)
// ============================================

function salvarLocalmente(aula) {
    try {
        // Carregar dados existentes
        const dadosExistentes = JSON.parse(localStorage.getItem('aulas_locais') || '[]');
        
        // Adicionar ID único
        aula.id = Date.now();
        
        // Adicionar novo registro
        dadosExistentes.push(aula);
        
        // Salvar de volta
        localStorage.setItem('aulas_locais', JSON.stringify(dadosExistentes));
        
        console.log('Aula salva localmente:', aula);
        
    } catch (error) {
        console.error('Erro ao salvar localmente:', error);
    }
}

function carregarDadosLocais() {
    try {
        const dados = JSON.parse(localStorage.getItem('aulas_locais') || '[]');
        console.log('Dados locais carregados:', dados.length, 'registros');
        return dados;
    } catch (error) {
        console.error('Erro ao carregar dados locais:', error);
        return [];
    }
}

function limparCacheLocal() {
    if (confirmar('Tem certeza que deseja limpar o cache local?')) {
        localStorage.removeItem('aulas_locais');
        aulas = [];
        atualizarDashboard();
        filtrarTabela();
        atualizarGraficos();
        mostrarMensagem('Cache local limpo com sucesso!', 'success');
    }
}

// ============================================
// EXPORTAÇÃO
// ============================================

function exportarParaCSV() {
    if (aulas.length === 0) {
        mostrarMensagem('Nenhum dado para exportar', 'warning');
        return;
    }
    
    // Criar cabeçalhos
    let csv = 'Data,Dia da Semana,Professora,Quantidade,Registrado em\n';
    
    // Adicionar dados
    aulas.forEach(aula => {
        const data = new Date(aula.data);
        const diaSemana = getDiaSemana(data.getDay());
        csv += `"${formatarData(aula.data)}","${diaSemana}","${aula.professora}",${aula.quantidade},"${formatarHora(aula.registro || '')}"\n`;
    });
    
    // Adicionar totais
    const totalDaniele = aulas
        .filter(a => a.professora === 'Daniele')
        .reduce((sum, a) => sum + a.quantidade, 0);
        
    const totalIsabela = aulas
        .filter(a => a.professora === 'Isabela')
        .reduce((sum, a) => sum + a.quantidade, 0);
    
    csv += '\n\nRESUMO\n';
    csv += `Total de registros: ${aulas.length}\n`;
    csv += `Total de aulas: ${totalDaniele + totalIsabela}\n`;
    csv += `Daniele: ${totalDaniele} aulas\n`;
    csv += `Isabela: ${totalIsabela} aulas\n`;
    csv += `Exportado em: ${new Date().toLocaleString('pt-BR')}`;
    
    // Criar e baixar arquivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `aulas_natacao_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarMensagem('Dados exportados com sucesso!', 'success');
}

// ============================================
// UTILITÁRIOS
// ============================================

function mostrarMensagem(texto, tipo = 'info') {
    // Remover mensagens anteriores
    const mensagensAntigas = document.querySelectorAll('.mensagem-flutuante');
    mensagensAntigas.forEach(msg => msg.remove());
    
    // Criar nova mensagem
    const mensagem = document.createElement('div');
    mensagem.className = `mensagem-flutuante ${tipo}`;
    mensagem.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${texto}</span>
    `;
    
    // Estilos
    mensagem.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#4caf50' : tipo === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
        max-width: 400px;
    `;
    
    document.body.appendChild(mensagem);
    
    // Adicionar animação CSS se não existir
    if (!document.getElementById('animacao-mensagem')) {
        const style = document.createElement('style');
        style.id = 'animacao-mensagem';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remover após 4 segundos
    setTimeout(() => {
        mensagem.style.opacity = '0';
        mensagem.style.transform = 'translateX(100%)';
        mensagem.style.transition = 'all 0.3s';
        
        setTimeout(() => {
            if (mensagem.parentNode) {
                mensagem.parentNode.removeChild(mensagem);
            }
        }, 300);
    }, 4000);
}

function mostrarLoading(texto = 'Processando...') {
    const modal = document.getElementById('loadingModal');
    const textoEl = document.getElementById('loadingText');
    
    if (modal && textoEl) {
        textoEl.textContent = texto;
        modal.style.display = 'flex';
    }
}

function esconderLoading() {
    const modal = document.getElementById('loadingModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function confirmar(mensagem) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titulo = document.getElementById('confirmTitle');
        const texto = document.getElementById('confirmMessage');
        
        if (modal && titulo && texto) {
            texto.textContent = mensagem;
            modal.style.display = 'flex';
            
            // Configurar callbacks
            window.confirmCallback = (resultado) => {
                modal.style.display = 'none';
                resolve(resultado);
            };
        } else {
            resolve(false);
        }
    });
}

function confirmarAcao() {
    if (window.confirmCallback) {
        window.confirmCallback(true);
    }
}

function cancelarAcao() {
    if (window.confirmCallback) {
        window.confirmCallback(false);
    }
}

function formatarData(dataStr) {
    try {
        const data = new Date(dataStr);
        return data.toLocaleDateString('pt-BR');
    } catch {
        return dataStr;
    }
}

function formatarDataAbreviada(data) {
    const dia = data.getDate();
    const mes = data.toLocaleDateString('pt-BR', { month: 'short' });
    return `${dia} ${mes}`;
}

function formatarHora(dataStr) {
    if (!dataStr) return '';
    
    try {
        const data = new Date(dataStr);
        return data.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch {
        return dataStr;
    }
}

function getDiaSemana(numero) {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return dias[numero];
}

// ============================================
// EXPORTAR FUNÇÕES PARA ESCOPO GLOBAL
// ============================================

window.filtrarTabela = filtrarTabela;
window.carregarDoGoogleSheets = carregarDoGoogleSheets;
window.exportarParaCSV = exportarParaCSV;
window.testarConexaoSheets = testarConexaoSheets;
window.limparCacheLocal = limparCacheLocal;