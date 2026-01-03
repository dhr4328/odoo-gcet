const API_BASE_URL = "https://unurbane-racemously-apryl.ngrok-free.dev";

export const api = {
  baseURL: API_BASE_URL,

  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("token");
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add token to headers if available
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Add ngrok-skip-browser-warning header to avoid ngrok warning page
    headers["ngrok-skip-browser-warning"] = "true";

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed: ${response.statusText}`);
    }

    return response.json();
  },

  get(endpoint: string, options?: RequestInit) {
    return this.request(endpoint, { ...options, method: "GET" });
  },

  post(endpoint: string, data?: any, options?: RequestInit) {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  put(endpoint: string, data?: any, options?: RequestInit) {
    return this.request(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete(endpoint: string, options?: RequestInit) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  },
};


