import { showNotification } from "./ui.js";

const API_BASE = "";

export async function apiRequest(endpoint, method = "GET", body = null) {
  const token = localStorage.getItem("access_token");
  const headers = {};

  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = { method, headers };

  if (body) {
    options.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);

    // === ЗАЩИТА ОТ БЕСКОНЕЧНОЙ ПЕРЕЗАГРУЗКИ ===
    if (response.status === 401) {
      if (token) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user_email");
          localStorage.removeItem("is_admin"); // <--- ДОБАВЛЕНО
          window.location.reload();
      }
      throw new Error("Доступ запрещен (401)");
    }
    // ===========================================

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        let msg = errorData.detail || "Ошибка запроса";
        if (Array.isArray(errorData.detail)) {
            msg = errorData.detail.map(e => e.msg).join("; ");
        }
        throw new Error(msg);
      } else {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
    }

    return response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}