const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : '/api');

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

export const api = {
  // Auth
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
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
    const res = await fetch(`${API_BASE}/auth/register`, {
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
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getHeaders(),
      });
    } finally {
      localStorage.removeItem('gold_crm_token');
    }
  },

  async updateShopDetails(details) {
    const res = await fetch(`${API_BASE}/auth/shop-details`, {
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

    const res = await fetch(`${API_BASE}/invoices?${params.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getInvoiceById(id) {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createInvoice(invoiceData) {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(invoiceData),
    });
    return handleResponse(res);
  },

  async updateInvoice(id, invoiceData) {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(invoiceData),
    });
    return handleResponse(res);
  },

  async deleteInvoice(id) {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async searchCustomers(query) {
    if (!query || !query.trim()) return { success: true, customers: [] };
    const res = await fetch(`${API_BASE}/invoices/customers/search?q=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async downloadInvoicePDF(id, invoiceNumber) {
    const safeNumber = (invoiceNumber || 'INVOICE').replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `Invoice_${safeNumber}.pdf`;
    const token = localStorage.getItem('gold_crm_token');

    // 1. Direct native server download (No blob URL!)
    // Directly streams from backend with Content-Type: application/pdf & Content-Disposition
    // avoiding memory Blob conversion, blob: URLs, and download manager corruption.
    if (token) {
      const downloadUrl = `${API_BASE}/invoices/${id}/pdf?token=${encodeURIComponent(token)}`;
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.setAttribute('download', filename);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return;
    }

    // 2. Fallback via authenticated fetch if token is not in localStorage
    const res = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
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
    dynamicAnchor.href = blobUrl;
    dynamicAnchor.download = filename;
    document.body.appendChild(dynamicAnchor);
    dynamicAnchor.click();
    document.body.removeChild(dynamicAnchor);

    // Keep URL alive so browser download manager finishes without corrupting into .blob
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 60000);
  },
};
