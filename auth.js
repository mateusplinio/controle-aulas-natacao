// Google OAuth 2.0 Authentication
class GoogleAuth {
    constructor() {
        this.clientId = '159635553439-4ab76bigfg6cokvteg57otllm9gq8ifq.apps.googleusercontent.com'; // Substitua pelo seu Client ID
        this.apiKey = 'AIzaSyDMEluam8tK-YBOK2Go4U1traAhmPI-KYs';     // Substitua pela sua API Key
        this.tokenClient = null;
        this.user = null;
        this.init();
    }

    async init() {
        try {
            // Inicializar Google Identity Services
            await this.loadGsi();
            
            // Verificar se já está logado
            this.checkExistingLogin();
            
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.updateStatus('Erro ao carregar autenticação');
        }
    }

    async loadGsi() {
        return new Promise((resolve) => {
            if (window.google) {
                this.initTokenClient();
                resolve();
            } else {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    this.initTokenClient();
                    resolve();
                };
                document.head.appendChild(script);
            }
        });
    }

    initTokenClient() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: (response) => this.handleTokenResponse(response),
        });
    }

    handleTokenResponse(response) {
        if (response.error) {
            console.error('Erro de autenticação:', response);
            this.updateStatus('Erro na autenticação');
            return;
        }

        // Salvar token
        localStorage.setItem('google_access_token', response.access_token);
        
        // Obter informações do usuário
        this.getUserInfo();
    }

    async getUserInfo() {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('google_access_token')}`
                }
            });
            
            this.user = await response.json();
            this.onLoginSuccess();
            
        } catch (error) {
            console.error('Erro ao obter info do usuário:', error);
        }
    }

    checkExistingLogin() {
        const token = localStorage.getItem('google_access_token');
        if (token) {
            // Verificar se o token ainda é válido
            this.getUserInfo();
        }
    }

    login() {
        if (this.tokenClient) {
            this.tokenClient.requestAccessToken();
        }
    }

    logout() {
        const token = localStorage.getItem('google_access_token');
        if (token) {
            google.accounts.oauth2.revoke(token, () => {
                console.log('Token revogado');
            });
        }
        
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('user_info');
        
        this.user = null;
        this.onLogout();
    }

    async getAccessToken() {
        let token = localStorage.getItem('google_access_token');
        
        if (!token) {
            throw new Error('Usuário não autenticado');
        }
        
        // Verificar se o token ainda é válido (simplificado)
        // Em produção, você deve verificar a expiração
        return token;
    }

    onLoginSuccess() {
        // Salvar informações do usuário
        localStorage.setItem('user_info', JSON.stringify(this.user));
        
        // Atualizar interface
        document.getElementById('signinButton').style.display = 'none';
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('userName').textContent = this.user.name || this.user.email;
        
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('loginMessage').style.display = 'none';
        
        this.updateStatus('Conectado ao Google Sheets');
        
        // Carregar configuração salva
        const spreadsheetId = localStorage.getItem('spreadsheet_id');
        if (spreadsheetId) {
            document.getElementById('spreadsheetId').value = spreadsheetId;
        }
        
        // Notificar sistema principal
        if (window.onGoogleLogin) {
            window.onGoogleLogin();
        }
    }

    onLogout() {
        // Atualizar interface
        document.getElementById('signinButton').style.display = 'block';
        document.getElementById('userInfo').style.display = 'none';
        
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('loginMessage').style.display = 'block';
        
        this.updateStatus('Desconectado');
        
        // Notificar sistema principal
        if (window.onGoogleLogout) {
            window.onGoogleLogout();
        }
    }

    updateStatus(message) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerHTML = `<i class="fas fa-circle"></i> ${message}`;
            
            if (message.includes('Conectado')) {
                statusEl.style.background = '#e8f5e9';
                statusEl.style.color = '#2e7d32';
            } else if (message.includes('Erro')) {
                statusEl.style.background = '#ffebee';
                statusEl.style.color = '#c62828';
            } else {
                statusEl.style.background = '#fff3e0';
                statusEl.style.color = '#ef6c00';
            }
        }
    }

    isAuthenticated() {
        return !!localStorage.getItem('google_access_token');
    }

    getUser() {
        return this.user;
    }
}

// Instanciar autenticação globalmente
let googleAuth;

document.addEventListener('DOMContentLoaded', () => {
    googleAuth = new GoogleAuth();
    
    // Configurar botão de login
    document.getElementById('signinButton').addEventListener('click', () => {
        googleAuth.login();
    });
});

// Funções globais para o HTML
window.fazerLogout = function() {
    if (googleAuth) {
        googleAuth.logout();
    }
};

window.onGoogleLogin = function() {
    console.log('Usuário logado com sucesso');
    // O sistema principal será notificado
};

window.onGoogleLogout = function() {
    console.log('Usuário deslogado');
    // O sistema principal será notificado
};