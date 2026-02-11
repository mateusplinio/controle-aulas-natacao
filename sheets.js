// Google Sheets API v4 Integration
class GoogleSheetsAPI {
    static SPREADSHEET_ID = null;
    
    static async initialize() {
        // Carregar ID da planilha salvo
        this.SPREADSHEET_ID = localStorage.getItem('spreadsheet_id');
        
        if (!this.SPREADSHEET_ID) {
            console.warn('ID da planilha não configurado');
            return false;
        }
        
        return true;
    }
    
    static async getAccessToken() {
        const token = localStorage.getItem('google_access_token');
        if (!token) {
            throw new Error('Usuário não autenticado');
        }
        return token;
    }
    
    static async getSheetData(range = 'A:C') {
        try {
            const token = await this.getAccessToken();
            
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${range}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }
            
            const data = await response.json();
            return data.values || [];
            
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            throw error;
        }
    }
    
    static async appendRow(data) {
        try {
            const token = await this.getAccessToken();
            
            // Formatar dados para a planilha
            const values = [[
                data.data,
                data.professora,
                data.quantidade,
                new Date().toISOString()
            ]];
            
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/A:D:append?valueInputOption=USER_ENTERED`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        values: values,
                        range: 'A:D'
                    })
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro ao salvar: ${JSON.stringify(errorData)}`);
            }
            
            const result = await response.json();
            console.log('Dados salvos:', result);
            return true;
            
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            throw error;
        }
    }
    
    static async createSheetIfNeeded() {
        try {
            const token = await this.getAccessToken();
            
            // Verificar se a planilha existe e tem cabeçalhos
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            
            if (response.status === 404) {
                throw new Error('Planilha não encontrada. Verifique o ID.');
            }
            
            if (!response.ok) {
                throw new Error(`Erro ao acessar planilha: ${response.status}`);
            }
            
            // Verificar se tem dados
            const data = await this.getSheetData('A1:D1');
            
            if (!data || data.length === 0) {
                // Adicionar cabeçalhos
                await this.appendRow({
                    data: 'Data',
                    professora: 'Professora',
                    quantidade: 'Quantidade'
                });
                console.log('Cabeçalhos criados');
            }
            
            return true;
            
        } catch (error) {
            console.error('Erro ao verificar planilha:', error);
            throw error;
        }
    }
    
    static async testConnection() {
        try {
            if (!this.SPREADSHEET_ID) {
                throw new Error('ID da planilha não configurado');
            }
            
            await this.getSheetData('A1:A1'); // Teste simples
            return true;
            
        } catch (error) {
            console.error('Erro de conexão:', error);
            return false;
        }
    }
    
    static async batchAppend(rows) {
        try {
            const token = await this.getAccessToken();
            
            const values = rows.map(row => [
                row.data,
                row.professora,
                row.quantidade,
                new Date().toISOString()
            ]);
            
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/A:D:append?valueInputOption=USER_ENTERED`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        values: values,
                        range: 'A:D'
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error('Erro ao salvar dados em lote');
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Erro no batch append:', error);
            throw error;
        }
    }
}

// Exportar para uso global
window.GoogleSheetsAPI = GoogleSheetsAPI;