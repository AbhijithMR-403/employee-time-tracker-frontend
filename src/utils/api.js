const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// API client with authentication
class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication
  async login(email, password) {
    const response = await this.request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout/', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  // Admin Users
  async getAdminUsers() {
    return this.request('/auth/admin-users/');
  }

  async createAdminUser(userData) {
    return this.request('/auth/admin-users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateAdminUser(id, userData) {
    return this.request(`/auth/admin-users/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteAdminUser(id) {
    return this.request(`/auth/admin-users/${id}/`, {
      method: 'DELETE',
    });
  }

  // Employees
  async getEmployees(params) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.department) searchParams.append('department', params.department);
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    
    const query = searchParams.toString();
    return this.request(`/employees/${query ? `?${query}` : ''}`);
  }

  async getEmployeeByEmail(email) {
    return this.request(`/employees/by_email/?email=${encodeURIComponent(email)}`);
  }

  async createEmployee(employeeData) {
    return this.request('/employees/', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  }

  async updateEmployee(id, employeeData) {
    return this.request(`/employees/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(employeeData),
    });
  }

  async getDepartments() {
    return this.request('/employees/departments/');
  }

  // Business Hours
  async getCurrentBusinessHours() {
    return this.request('/employees/business-hours/current/');
  }

  async updateBusinessHours(businessHoursData) {
    if (!this.token) {
      throw new Error('Authentication required for admin access');
    }
    return this.request('/employees/business-hours/', {
      method: 'POST',
      body: JSON.stringify(businessHoursData),
    });
  }

  // Time Tracking
  async punchAction(punchData) {
    return this.request('/timetracking/punch/', {
      method: 'POST',
      body: JSON.stringify(punchData),
    });
  }

  async getWorkStatus(employeeId) {
    return this.request(`/timetracking/status/${employeeId}/`);
  }

  async getTimeEntries(params) {
    const searchParams = new URLSearchParams();
    if (params?.employee_id) searchParams.append('employee_id', params.employee_id);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.type) searchParams.append('type', params.type);
    
    const query = searchParams.toString();
    return this.request(`/timetracking/entries/${query ? `?${query}` : ''}`);
  }

  async getWorkSessions(params) {
    const searchParams = new URLSearchParams();
    if (params?.employee_id) searchParams.append('employee_id', params.employee_id);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    
    const query = searchParams.toString();
    return this.request(`/timetracking/sessions/${query ? `?${query}` : ''}`);
  }

  // Reports
  async getReportsOverview(params) {
    if (!this.token) {
      throw new Error('Authentication required for admin access');
    }
    const searchParams = new URLSearchParams();
    searchParams.append('start_date', params.start_date);
    searchParams.append('end_date', params.end_date);
    if (params.employee_id) searchParams.append('employee_id', params.employee_id);
    
    return this.request(`/reports/overview/?${searchParams.toString()}`);
  }

  async getEmployeeReports(params) {
    const searchParams = new URLSearchParams();
    searchParams.append('start_date', params.start_date);
    searchParams.append('end_date', params.end_date);
    if (params.employee_id) searchParams.append('employee_id', params.employee_id);
    
    return this.request(`/reports/employees/?${searchParams.toString()}`);
  }

  async getDailyReports(params) {
    const searchParams = new URLSearchParams();
    searchParams.append('start_date', params.start_date);
    searchParams.append('end_date', params.end_date);
    if (params.employee_id) searchParams.append('employee_id', params.employee_id);
    
    return this.request(`/reports/daily/?${searchParams.toString()}`);
  }

  async exportCSV(params) {
    const response = await fetch(`${API_BASE_URL}/reports/export/csv/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.blob();
  }
}

export const apiClient = new ApiClient();