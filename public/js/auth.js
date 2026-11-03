/**
 * Módulo de Autenticação e Isolamento Estrito de Sessão — Lista de Compras Compartilhada
 */
const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

window.AuthService = {
  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_DATA_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || (!parsed.id && !parsed._id) || !parsed.nome) {
        return null;
      }
      return {
        ...parsed,
        id: String(parsed.id || parsed._id),
        _id: String(parsed._id || parsed.id),
        lists: Array.isArray(parsed.lists) ? parsed.lists : [],
      };
    } catch (e) {
      return null;
    }
  },

  saveSession(token, user) {
    const normalizedUser = {
      id: String(user.id || user._id),
      _id: String(user._id || user.id),
      nome: String(user.nome || '').trim(),
      lists: Array.isArray(user.lists) ? user.lists : [],
    };
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(normalizedUser));
  },

  clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.clear();
    sessionStorage.clear();
  },

  async logout() {
    const token = this.getToken();
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      // Continua limpeza mesmo se offline
    } finally {
      this.clearSession();
    }
  },

  async fetchWithAuth(url, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearSession();
      if (typeof window.mostrarTelaAuth === 'function') {
        window.mostrarTelaAuth('Sua sessão expirou. Faça login novamente.');
      }
      throw new Error('Sessão expirada ou inválida.');
    }

    return response;
  },

  async loginOuRegistrar(nome, senha, endpoint = '/api/auth/login') {
    const nomeLimpo = String(nome || '').trim();
    const senhaLimpa = String(senha || '');

    if (nomeLimpo.length < 3) {
      throw new Error('O nome de usuário deve ter pelo menos 3 caracteres.');
    }
    if (senhaLimpa.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }

    // Limpa qualquer resquício de sessão anterior antes de autenticar novo usuário
    this.clearSession();

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nomeLimpo,
        senha: senhaLimpa,
        autoRegister: true,
      }),
    });

    const payload = await res.json();
    if (!res.ok || !payload.success) {
      throw new Error(payload.error || 'Falha na autenticação.');
    }

    const token = payload.token || payload.data?.token;
    const user = payload.user || payload.data?.user;
    this.saveSession(token, user);
    return this.getCurrentUser();
  },
};
