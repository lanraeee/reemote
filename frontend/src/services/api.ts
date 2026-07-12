import axios, { AxiosInstance, AxiosError } from 'axios';

class APIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = '/api/v1') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth-store');
      if (token) {
        try {
          const authData = JSON.parse(token);
          if (authData.state?.token) {
            config.headers.Authorization = `Bearer ${authData.state.token}`;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth-store');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string | null) {
    if (token) {
      this.client.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.Authorization;
    }
  }

  clearAuthToken() {
    delete this.client.defaults.headers.Authorization;
  }

  get(url: string, config?: any) {
    return this.client.get(url, config);
  }

  post(url: string, data?: any, config?: any) {
    return this.client.post(url, data, config);
  }

  put(url: string, data?: any, config?: any) {
    return this.client.put(url, data, config);
  }

  delete(url: string, config?: any) {
    return this.client.delete(url, config);
  }

  async listVMs(limit = 50, offset = 0) {
    const response = await this.get('/vms', {
      params: { limit, offset },
    });
    return response.data;
  }

  async getVM(vmId: string) {
    const response = await this.get(`/vms/${vmId}`);
    return response.data;
  }

  async connectConsole(vmId: string) {
    const response = await this.post(`/vms/${vmId}/console/connect`);
    return response.data;
  }

  async sendConsoleMessage(sessionId: string, type: string, data: any) {
    const response = await this.post(`/console/${sessionId}/message`, {
      type,
      data,
    });
    return response.data;
  }

  async getConsoleStats(sessionId: string) {
    const response = await this.get(`/console/${sessionId}/stats`);
    return response.data;
  }

  async disconnectConsole(sessionId: string) {
    const response = await this.post(`/console/${sessionId}/disconnect`);
    return response.data;
  }

  async validateEmail(email: string) {
    const response = await this.post('/email/validate', { email });
    return response.data;
  }

  async sendEmail(to: string | string[], subject: string, body: string, html?: string, replyTo?: string) {
    const response = await this.post('/email/send', { to, subject, body, html, replyTo });
    return response.data;
  }
}

export default new APIClient();
