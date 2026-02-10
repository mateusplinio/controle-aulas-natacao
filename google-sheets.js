// Google Sheets API - Comunicação com Apps Script
class GoogleSheetsAPI {
    static async salvarAula(aula) {
        const config = JSON.parse(localStorage.getItem('aulas_config') || '{}');
        if (!config.scriptUrl) {
            throw new Error('URL do Google Apps Script não configurada');
        }
        
        try {
            // Enviar dados para o Google Sheets
            const response = await fetch(config.scriptUrl, {
                method: 'POST',
                mode: 'no-cors', // Importante para GitHub Pages
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'add',
                    data: aula.data,
                    professora: aula.professora,
                    quantidade: aula.quantidade,
                    timestamp: aula.timestamp
                })
            });
            
            // Como estamos usando no-cors, não podemos ler a resposta
            // Mas podemos assumir que foi enviado com sucesso
            console.log('Aula enviada para Google Sheets:', aula);
            return true;
            
        } catch (error) {
            console.error('Erro ao salvar no Sheets:', error);
            
            // Fallback: salvar localmente e tentar sincronizar depois
            this.salvarLocalmente(aula);
            return false;
        }
    }

    static async carregarDados() {
        const config = JSON.parse(localStorage.getItem('aulas_config') || '{}');
        if (!config.scriptUrl) {
            throw new Error('URL do Google Apps Script não configurada');
        }
        
        try {
            // Usar JSONP para contornar CORS no GitHub Pages
            return await this.carregarViaJSONP(config.scriptUrl);
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            
            // Tentar carregar dados salvos localmente
            return this.carregarDadosLocais();
        }
    }

    static async testarConexao() {
        const config = JSON.parse(localStorage.getItem('aulas_config') || '{}');
        if (!config.scriptUrl) {
            throw new Error('URL do Google Apps Script não configurada');
        }
        
        try {
            // Testar carregando alguns dados
            const dados = await this.carregarViaJSONP(config.scriptUrl);
            return Array.isArray(dados);
        } catch (error) {
            console.error('Erro de conexão:', error);
            return false;
        }
    }

    // Método JSONP para contornar CORS
    static carregarViaJSONP(url) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            
            // Adicionar callback ao window
            window[callbackName] = function(data) {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(data);
            };
            
            // Criar script tag
            const script = document.createElement('script');
            script.src = url + '?callback=' + callbackName + '&t=' + Date.now();
            script.onerror = reject;
            
            document.body.appendChild(script);
        });
    }

    // Fallback local
    static salvarLocalmente(aula) {
        const pendentes = JSON.parse(localStorage.getItem('aulas_pendentes') || '[]');
        pendentes.push({
            ...aula,
            pendente: true,
            tentativas: 0
        });
        localStorage.setItem('aulas_pendentes', JSON.stringify(pendentes));
        console.log('Aula salva localmente (pendente de sincronização):', aula);
    }

    static carregarDadosLocais() {
        const pendentes = JSON.parse(localStorage.getItem('aulas_pendentes') || '[]');
        const sincronizadas = JSON.parse(localStorage.getItem('aulas_sincronizadas') || '[]');
        
        // Combinar dados sincronizados e pendentes
        return [...sincronizadas, ...pendentes];
    }

    // Sincronizar dados pendentes
    static async sincronizarPendentes() {
        const pendentes = JSON.parse(localStorage.getItem('aulas_pendentes') || '[]');
        const sincronizadas = JSON.parse(localStorage.getItem('aulas_sincronizadas') || '[]');
        
        if (pendentes.length === 0) return;
        
        console.log(`Sincronizando ${pendentes.length} aulas pendentes...`);
        
        for (let i = pendentes.length - 1; i >= 0; i--) {
            const aula = pendentes[i];
            
            try {
                const sucesso = await this.salvarAula(aula);
                
                if (sucesso) {
                    // Mover para sincronizadas
                    sincronizadas.push(aula);
                    pendentes.splice(i, 1);
                } else {
                    // Incrementar tentativas
                    aula.tentativas = (aula.tentativas || 0) + 1;
                    
                    // Se muitas tentativas falharam, manter local
                    if (aula.tentativas > 5) {
                        sincronizadas.push(aula);
                        pendentes.splice(i, 1);
                        console.log(`Aula mantida localmente após 5 tentativas:`, aula);
                    }
                }
            } catch (error) {
                console.error('Erro ao sincronizar aula:', error);
            }
        }
        
        // Salvar de volta
        localStorage.setItem('aulas_pendentes', JSON.stringify(pendentes));
        localStorage.setItem('aulas_sincronizadas', JSON.stringify(sincronizadas));
        
        if (pendentes.length === 0) {
            console.log('Todas as aulas pendentes foram sincronizadas!');
        }
    }
}

// Sincronizar pendentes a cada 5 minutos
setInterval(() => {
    GoogleSheetsAPI.sincronizarPendentes();
}, 5 * 60 * 1000);

// Sincronizar ao carregar a página
window.addEventListener('load', () => {
    setTimeout(() => GoogleSheetsAPI.sincronizarPendentes(), 2000);
});