const API_BASE = '/api';

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
    const res = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to download PDF (${res.status})`);
    }

    // Receive invoice data response as blob format
    const blob = await res.blob();

    // Create temporary link with window.URL.createObjectURL
    const blobUrl = window.URL.createObjectURL(blob);

    // Set that link in dynamic anchor link
    const dynamicAnchor = document.createElement('a');
    dynamicAnchor.href = blobUrl;

    // Set extension .pdf on that particular link
    const safeNumber = (invoiceNumber || 'INVOICE').replace(/[/\\?%*:|"<>]/g, '_');
    dynamicAnchor.download = `Invoice_${safeNumber}.pdf`;

    // Download the PDF
    document.body.appendChild(dynamicAnchor);
    dynamicAnchor.click();
    document.body.removeChild(dynamicAnchor);

    // Revoke object URL
    window.URL.revokeObjectURL(blobUrl);
  },
};
