import {
  User,
  StoredFile,
  ConversionJob,
  AuditLog,
  SecurityEvent,
  DashboardStats,
  ConversionCapability,
  AdminUserSummary,
} from '../types/client';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    // Parse JSON safely
    let data: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { text };
    }

    if (!response.ok) {
      const errorMsg = data?.error?.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMsg) as any;
      error.status = response.status;
      error.code = data?.error?.code || 'UNKNOWN_ERROR';
      error.details = data?.error?.details;
      error.data = data;
      throw error;
    }

    return data as T;
  }

  // AUTH
  public async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  public async register(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  public async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      this.setToken(null);
    }
  }

  // FILES
  public async uploadFile(file: File): Promise<{ message: string; file: StoredFile }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ message: string; file: StoredFile }>('/api/files/upload', {
      method: 'POST',
      body: formData,
    });
  }

  public async getFiles(): Promise<{ files: StoredFile[] }> {
    return this.request<{ files: StoredFile[] }>('/api/files');
  }

  public async deleteFile(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/files/${id}`, {
      method: 'DELETE',
    });
  }

  // CONVERSIONS
  public async getCapabilities(): Promise<{ capabilities: ConversionCapability[] }> {
    return this.request<{ capabilities: ConversionCapability[] }>('/api/conversions/capabilities');
  }

  public async createConversion(fileId: string, targetFormat: string): Promise<{ conversion: ConversionJob }> {
    return this.request<{ conversion: ConversionJob }>('/api/conversions', {
      method: 'POST',
      body: JSON.stringify({ fileId, targetFormat }),
    });
  }

  public async getConversions(): Promise<{ conversions: ConversionJob[] }> {
    return this.request<{ conversions: ConversionJob[] }>('/api/conversions');
  }

  public async getConversion(id: string): Promise<{ conversion: ConversionJob }> {
    return this.request<{ conversion: ConversionJob }>(`/api/conversions/${id}`);
  }

  public async downloadConversion(id: string, filename: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`/api/conversions/${id}/download`, { headers });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // AUDIT & STATS
  public async getAuditLogs(filter?: string, limit: number = 100): Promise<{ logs: AuditLog[] }> {
    const params = new URLSearchParams();
    if (filter && filter !== 'ALL') params.set('filter', filter);
    if (limit) params.set('limit', String(limit));
    return this.request<{ logs: AuditLog[] }>(`/api/audit?${params.toString()}`);
  }

  public async getSecurityEvents(limit: number = 100): Promise<{ events: SecurityEvent[] }> {
    return this.request<{ events: SecurityEvent[] }>(`/api/security/events?limit=${limit}`);
  }

  public async getStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/api/stats');
  }

  // ADMIN USER MANAGEMENT
  public async getAdminUsers(): Promise<{ users: AdminUserSummary[] }> {
    return this.request<{ users: AdminUserSummary[] }>('/api/admin/users');
  }

  public async banUser(userId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public async unbanUser(userId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/admin/users/${userId}/unban`, {
      method: 'POST',
    });
  }

  // SECURITY DEMO CALLS
  public async testSqlInjection(testInput: string): Promise<any> {
    return this.request('/api/security-demo/sql-injection', {
      method: 'POST',
      body: JSON.stringify({ testInput }),
    });
  }

  public async testRateLimit(): Promise<any> {
    return this.request('/api/security-demo/rate-limit', {
      method: 'POST',
    });
  }

  public async testUploadSecurity(scenario: string, custom?: { filename: string; mime: string; size: number }): Promise<any> {
    return this.request('/api/security-demo/upload', {
      method: 'POST',
      body: JSON.stringify({
        scenario,
        customFilename: custom?.filename,
        customMime: custom?.mime,
        customSize: custom?.size,
      }),
    });
  }

  public async testErrorHandling(errorType: string): Promise<any> {
    return this.request('/api/security-demo/errors', {
      method: 'POST',
      body: JSON.stringify({ errorType }),
    });
  }
}

export const api = new ApiService();
