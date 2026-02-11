// Sistema Principal
class AulasSystem {
    constructor() {
        this.aulas = [];
        this.filteredAulas = [];
        this.init();
    }

    async init() {
        // Configurar data atual
        this.setTodayDate();
        
        // Configurar eventos
        this.setupEvents();
        
        // Verificar autenticação inicial
        this.checkAuth();
        
        console.log('Sistema inicializado');
    }

    setTodayDate() {
        const hoje = new Date().toISOString().split('T')[0];
        const dataInput = document.getElementById('data');
        if (dataInput) {
            dataInput.value = hoje;
            dataInput.max = hoje;
        }
    }

    setupEvents() {
        // Formulário de aula
        const form = document.getElementById('aulaForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvarAula();
            });
        }
    }

    checkAuth() {
        // Verificar se está autenticado
        const token = localStorage.getItem('google_access_token');
        if (token) {
            // Simular evento de login
            setTimeout(() => {
                if (window.onGoogleLogin) {
                    window.onGoogleLogin();
                }
            }, 1000);
        }
    }

    async salvarAula() {
        // Verificar autenticação
        if (!localStorage.getItem('google_access_token')) {
            this.showMessage('Faça login com Google primeiro', 'error');
            return;
        }

        // Obter dados do formulário
        const aula = {
            data: document.getElementById('data').value,
            professora: document.getElementById('professora').value,
            quantidade: parseInt(document.getElementById('quantidade').value)
        };

        // Validação
        if (!aula.data || !aula.professora || !aula.quantidade) {
            this.showMessage('Preencha todos os campos', 'error');
            return;
        }

        // Mostrar loading
        this.showLoading('Salvando no Google Sheets...');

        try {
            // Inicializar API
            await GoogleSheetsAPI.initialize();
            
            // Salvar no Google Sheets
            await GoogleSheetsAPI.appendRow(aula);
            
            // Sucesso
            this.showMessage('Aula salva com sucesso!', 'success');
            
            // Atualizar dados
            await this.carregarAulas();
            
            // Limpar formulário (mantém data atual)
            document.getElementById('professora').value = '';
            document.getElementById('quantidade').value = '1';
            
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.showMessage(`Erro: ${error.message}`, 'error');
            
        } finally {
            this.hideLoading();
        }
    }

    async carregarAulas() {
        // Verificar autenticação
        if (!localStorage.getItem('google_access_token')) {
            return;
        }

        // Verificar configuração
        const spreadsheetId = localStorage.getItem('spreadsheet_id');
        if (!spreadsheetId) {
            this.showMessage('Configure o ID da planilha primeiro', 'warning');
            return;
        }

        this.showLoading('Carregando dados...');

        try {
            // Inicializar API
            await GoogleSheetsAPI.initialize();
            
            // Buscar dados da planilha
            const data = await GoogleSheetsAPI.getSheetData();
            
            // Processar dados (ignorar cabeçalho)
            this.aulas = [];
            
            if (data && data.length > 1) {
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (row[0] && row[1] && row[2]) {
                        this.aulas.push({
                            data: row[0],
                            professora: row[1],
                            quantidade: parseInt(row[2]) || 0,
                            timestamp: row[3] || ''
                        });
                    }
                }
            }
            
            // Atualizar interface
            this.atualizarDashboard();
            this.atualizarTabela();
            
            this.showMessage(`Carregado ${this.aulas.length} registros`, 'success');
            
        } catch (error) {
            console.error('Erro ao carregar:', error);
            this.showMessage(`Erro ao carregar dados: ${error.message}`, 'error');
            
        } finally {
            this.hideLoading();
        }
    }

    atualizarDashboard() {
        const hoje = new Date().toISOString().split('T')[0];
        const mesAtual = new Date().getMonth();
        const anoAtual = new Date().getFullYear();

        // Aulas de hoje
        const aulasHoje = this.aulas.filter(a => a.data === hoje);
        const hojeCount = aulasHoje.reduce((sum, a) => sum + a.quantidade, 0);
        
        // Totais por professora
        const danieleCount = this.aulas
            .filter(a => a.professora === 'Daniele')
            .reduce((sum, a) => sum + a.quantidade, 0);
            
        const isabelaCount = this.aulas
            .filter(a => a.professora === 'Isabela')
            .reduce((sum, a) => sum + a.quantidade, 0);

        // Aulas do mês
        const aulasMes = this.aulas.filter(aula => {
            const data = new Date(aula.data);
            return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
        });
        const mesCount = aulasMes.reduce((sum, a) => sum + a.quantidade, 0);

        // Atualizar UI
        this.updateElement('hojeCount', hojeCount);
        this.updateElement('danieleCount', danieleCount);
        this.updateElement('isabelaCount', isabelaCount);
        this.updateElement('mesCount', mesCount);
    }

    atualizarTabela() {
        // Aplicar filtros
        this.filterAulas();
        
        const tbody = document.getElementById('aulasTable');
        if (!tbody) return;
        
        // Limpar tabela
        tbody.innerHTML = '';
        
        // Ordenar por data (mais recente primeiro)
        this.filteredAulas.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        // Adicionar linhas
        this.filteredAulas.forEach(aula => {
            const data = new Date(aula.data);
            const diaSemana = this.getDiaSemana(data.getDay());
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${this.formatarData(aula.data)}</td>
                <td>${diaSemana}</td>
                <td>
                    <span class="teacher-badge ${aula.professora === 'Daniele' ? 'badge-daniele' : 'badge-isabela'}">
                        ${aula.professora}
                    </span>
                </td>
                <td>${aula.quantidade}</td>
                <td>
                    <button onclick="system.removerAula('${aula.data}', '${aula.professora}', ${aula.quantidade})" 
                            class="btn-small btn-danger">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Atualizar resumo
        const totalAulas = this.filteredAulas.reduce((sum, a) => sum + a.quantidade, 0);
        const diasUnicos = new Set(this.filteredAulas.map(a => a.data)).size;
        
        this.updateElement('totalAulas', totalAulas);
        this.updateElement('totalDias', diasUnicos);
    }

    filterAulas() {
        const periodo = document.getElementById('filterPeriod').value;
        const professora = document.getElementById('filterTeacher').value;
        
        let filtered = [...this.aulas];
        
        // Filtrar por período
        const hoje = new Date();
        switch(periodo) {
            case 'today':
                const hojeStr = hoje.toISOString().split('T')[0];
                filtered = filtered.filter(a => a.data === hojeStr);
                break;
            case 'week':
                const umaSemanaAtras = new Date(hoje);
                umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
                filtered = filtered.filter(a => new Date(a.data) >= umaSemanaAtras);
                break;
            case 'month':
                const umMesAtras = new Date(hoje);
                umMesAtras.setMonth(umMesAtras.getMonth() - 1);
                filtered = filtered.filter(a => new Date(a.data) >= umMesAtras);
                break;
            // 'all' não filtra
        }
        
        // Filtrar por professora
        if (professora) {
            filtered = filtered.filter(a => a.professora === professora);
        }
        
        this.filteredAulas = filtered;
    }

    async removerAula(data, professora, quantidade) {
        if (!confirm(`Remover aula de ${professora} no dia ${data}?`)) {
            return;
        }
        
        // Nota: A API do Google Sheets não permite remover linhas específicas facilmente
        // Em um sistema completo, você precisaria reescrever toda a planilha
        this.showMessage('Para remover, edite diretamente no Google Sheets', 'warning');
    }

    async exportarAulas() {
        if (this.aulas.length === 0) {
            this.showMessage('Nenhum dado para exportar', 'warning');
            return;
        }
        
        // Criar CSV
        let csv = 'Data,Dia da Semana,Professora,Quantidade\n';
        
        this.aulas.forEach(aula => {
            const data = new Date(aula.data);
            const diaSemana = this.getDiaSemana(data.getDay());
            csv += `"${this.formatarData(aula.data)}","${diaSemana}","${aula.professora}",${aula.quantidade}\n`;
        });
        
        // Baixar
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `aulas_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showMessage('Dados exportados com sucesso!', 'success');
    }

    salvarConfig() {
        const spreadsheetId = document.getElementById('spreadsheetId').value.trim();
        
        if (!spreadsheetId) {
            this.showMessage('Digite o ID da planilha', 'error');
            return;
        }
        
        localStorage.setItem('spreadsheet_id', spreadsheetId);
        this.showMessage('Configuração salva!', 'success');
        
        // Testar conexão
        setTimeout(() => this.testarConexao(), 1000);
    }

    async testarConexao() {
        const spreadsheetId = localStorage.getItem('spreadsheet_id');
        
        if (!spreadsheetId) {
            this.showMessage('Configure o ID da planilha primeiro', 'warning');
            return;
        }
        
        this.showLoading('Testando conexão...');
        
        try {
            GoogleSheetsAPI.SPREADSHEET_ID = spreadsheetId;
            const sucesso = await GoogleSheetsAPI.testConnection();
            
            if (sucesso) {
                this.showMessage('✅ Conexão estabelecida com sucesso!', 'success');
                // Carregar dados automaticamente
                setTimeout(() => this.carregarAulas(), 1000);
            } else {
                this.showMessage('❌ Erro na conexão. Verifique o ID.', 'error');
            }
            
        } catch (error) {
            this.showMessage(`❌ Erro: ${error.message}`, 'error');
            
        } finally {
            this.hideLoading();
        }
    }

    // Utilitários
    updateElement(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    showMessage(message, type = 'info') {
        // Criar mensagem flutuante
        const msg = document.createElement('div');
        msg.className = `message message-${type}`;
        msg.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Estilos
        msg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(msg);
        
        // Remover após 4 segundos
        setTimeout(() => {
            msg.style.opacity = '0';
            msg.style.transform = 'translateX(100%)';
            msg.style.transition = 'all 0.3s';
            
            setTimeout(() => {
                if (msg.parentNode) {
                    msg.parentNode.removeChild(msg);
                }
            }, 300);
        }, 4000);
    }

    showLoading(message = 'Processando...') {
        const modal = document.getElementById('loadingModal');
        const messageEl = document.getElementById('loadingMessage');
        
        if (modal && messageEl) {
            messageEl.textContent = message;
            modal.style.display = 'flex';
        }
    }

    hideLoading() {
        const modal = document.getElementById('loadingModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    formatarData(dataStr) {
        try {
            const data = new Date(dataStr);
            return data.toLocaleDateString('pt-BR');
        } catch {
            return dataStr;
        }
    }

    getDiaSemana(numero) {
        const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return dias[numero];
    }
}

// Instanciar sistema globalmente
let system;

document.addEventListener('DOMContentLoaded', () => {
    system = new AulasSystem();
});

// Funções globais para o HTML
window.filterAulas = function() {
    if (system) {
        system.filterAulas();
        system.atualizarTabela();
    }
};

window.carregarAulas = function() {
    if (system) {
        system.carregarAulas();
    }
};

window.exportarAulas = function() {
    if (system) {
        system.exportarAulas();
    }
};

window.salvarConfig = function() {
    if (system) {
        system.salvarConfig();
    }
};