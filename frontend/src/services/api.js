const rawBackend = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
const rawBase = import.meta.env.VITE_API_URL || (rawBackend ? `${rawBackend}/api` : '/api');
const API_BASE = rawBase.replace(/([^:]\/)\/+/g, '$1').replace(/\/+$/, '');

const getHeaders = () => {
  const token = localStorage.getItem('gold_crm_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

// Wrapper to include credentials on every request (enables cross-origin cookies)
const apiFetch = (url, options = {}) => {
  return fetch(url, { ...options, credentials: 'include' });
};

export const api = {
  // Auth
  async login(email, password) {
    const res = await apiFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    if (data.token) {
      localStorage.setItem('gold_crm_token', data.token);
    }
    return data;
  },

  async register(email, password, name) {
    const res = await apiFetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await handleResponse(res);
    if (data.token) {
      localStorage.setItem('gold_crm_token', data.token);
    }
    return data;
  },

  async getMe() {
    const res = await apiFetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async logout() {
    try {
      await apiFetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getHeaders(),
      });
    } finally {
      localStorage.removeItem('gold_crm_token');
    }
  },

  async updateShopDetails(details) {
    const res = await apiFetch(`${API_BASE}/auth/shop-details`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(details),
    });
    return handleResponse(res);
  },

  // Invoices
  async getInvoices({ search = '', date = '', startDate = '', endDate = '', page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (date) params.append('date', date);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);

    const res = await apiFetch(`${API_BASE}/invoices?${params.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getInvoiceById(id) {
    const res = await apiFetch(`${API_BASE}/invoices/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createInvoice(invoiceData) {
    const res = await apiFetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(invoiceData),
    });
    return handleResponse(res);
  },

  async updateInvoice(id, invoiceData) {
    const res = await apiFetch(`${API_BASE}/invoices/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(invoiceData),
    });
    return handleResponse(res);
  },

  async deleteInvoice(id) {
    const res = await apiFetch(`${API_BASE}/invoices/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async searchCustomers(query) {
    if (!query || !query.trim()) return { success: true, customers: [] };
    const res = await apiFetch(`${API_BASE}/invoices/customers/search?q=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async downloadInvoicePDF(id, invoiceNumber) {
    const safeNumber = (invoiceNumber || 'INVOICE').replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `Invoice_${safeNumber}.pdf`;

    // Fetch official backend PDF with Bearer token header (compatible with production server)
    const res = await apiFetch(`${API_BASE}/invoices/${id}/pdf`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to download PDF (${res.status})`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const blobUrl = window.URL.createObjectURL(pdfBlob);

    const dynamicAnchor = document.createElement('a');
    dynamicAnchor.style.display = 'none';
    dynamicAnchor.href = blobUrl;
    dynamicAnchor.download = filename;
    document.body.appendChild(dynamicAnchor);
    dynamicAnchor.click();
    document.body.removeChild(dynamicAnchor);

    // Keep URL alive for 60s so browser download manager / IDM finishes cleanly without naming it .blob
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 60000);
  },
};
