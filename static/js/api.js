// static/js/api.js
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

    if (response.status === 401) {
      localStorage.removeItem("access_token");
      window.location.reload();
      throw new Error("Сессия истекла");
    }

    // === КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ ===
    // Если статус 204 (No Content), немедленно возвращаем true/null
    // НЕЛЬЗЯ вызывать response.json(), это повесит скрипт ошибкой SyntaxError
    if (response.status === 204) {
      return null;
    }
    // ===============================

    if (!response.ok) {
      // Пытаемся прочитать ошибку, если сервер прислал JSON
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
    // Пробрасываем ошибку дальше, чтобы main.js знал, что запрос упал
    throw error;
  }
}