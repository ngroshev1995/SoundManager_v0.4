import { showNotification } from "./ui.js";

const API_BASE = "";

export async function apiRequest(endpoint, method = "GET", body = null) {
  const token = localStorage.getItem("access_token");
  const headers = {};

  if (method === 'GET') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
  }

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

    // Обработка 401 остается как была
    if (response.status === 401) {
      if (token) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user_email");
          localStorage.removeItem("is_admin");
          window.location.reload();
      }
      throw new Error("Доступ запрещен (401)");
    }

    // Обработка 204 (No Content) остается как была
    if (response.status === 204) {
      return null;
    }

    // --- НАЧАЛО ЕДИНСТВЕННОГО ИСПРАВЛЕНИЯ ---

    const contentType = response.headers.get("content-type");

    // Если сервер вернул JSON, парсим его
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      // Если при этом запрос неуспешный, выбрасываем ошибку из JSON
      if (!response.ok) {
        let msg = data.detail || "Ошибка запроса";
        if (Array.isArray(data.detail)) {
            msg = data.detail.map(e => e.msg).join("; ");
        }
        throw new Error(msg);
      }
      // Если запрос успешный, возвращаем JSON-данные
      return data;
    }
    
    // Если сервер НЕ вернул JSON (например, для счетчика)
    const textData = await response.text();
    if (!response.ok) {
        // Если неуспешно, выбрасываем ошибку с текстом статуса
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
    }
    // Если успешно, возвращаем ответ как текст
    return textData;

    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}