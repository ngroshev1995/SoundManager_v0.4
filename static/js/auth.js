import { showNotification } from "./ui.js";
import { apiRequest } from "./api.js";

let onLoginSuccess = () => {};

/**
 * Инициализирует всю логику на странице аутентификации.
 * @param {function} handleLoginSuccess - Колбэк, который будет вызван после успешного входа.
 */
export function initAuth(handleLoginSuccess) {
  onLoginSuccess = handleLoginSuccess;

  // Получаем все необходимые элементы
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const showRegisterLink = document.getElementById("show-register");
  const showLoginLink = document.getElementById("show-login");
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const loginPasswordInput = document.getElementById("login-password");
  const registerPasswordInput = document.getElementById("register-password");

  // Переключение между формами входа и регистрации
  showRegisterLink?.addEventListener("click", (e) => {
    e.preventDefault();
    if (loginForm) loginForm.style.display = "none";
    if (registerForm) registerForm.style.display = "block";
  });

  showLoginLink?.addEventListener("click", (e) => {
    e.preventDefault();
    if (loginForm) loginForm.style.display = "block";
    if (registerForm) registerForm.style.display = "none";
  });

  // Обработчики кликов по кнопкам
  loginBtn?.addEventListener("click", handleLogin);
  registerBtn?.addEventListener("click", handleRegister);

  // Обработчики нажатия Enter в полях пароля
  loginPasswordInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  });

  registerPasswordInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleRegister();
    }
  });
}

/**
 * Обрабатывает попытку входа пользователя.
 */
async function handleLogin() {
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");

  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    showNotification("Пожалуйста, введите email и пароль.", "error");
    return;
  }

  // Для эндпоинта /login FastAPI ожидает данные в формате `application/x-www-form-urlencoded`.
  // `URLSearchParams` идеально для этого подходит.
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  try {
    // Используем `fetch` напрямую, так как `apiRequest` по умолчанию отправляет JSON,
    // а для этого конкретного эндпоинта нужен другой Content-Type.
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      // Используем `data.detail` для получения сообщения об ошибке от FastAPI.
      throw new Error(data.detail || "Ошибка входа. Проверьте email и пароль.");
    }

    localStorage.setItem("user_email", email);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("is_admin", data.is_admin ? "true" : "false");
    onLoginSuccess();
  } catch (error) {
    showNotification(error.message, "error");
  }
}

/**
 * Обрабатывает попытку регистрации нового пользователя.
 */
async function handleRegister() {
  const emailInput = document.getElementById("register-email");
  const passwordInput = document.getElementById("register-password");

  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    showNotification("Пожалуйста, введите email и пароль.", "error");
    return;
  }

  try {
    await apiRequest("/api/auth/register", "POST", { email, password });

    showNotification(
      "Регистрация прошла успешно! Теперь вы можете войти.",
      "success"
    );

    // --- ИСПРАВЛЕНИЕ: Автоматически логиним пользователя после регистрации ---
    // Это лучший UX, чем заставлять его вводить данные снова.
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
        // Если авто-логин не удался, просто просим войти вручную
        const showLoginLink = document.getElementById("show-login");
        showLoginLink?.click();
        return;
    }

    // Сохраняем и email, и токен, как при обычном логине
    localStorage.setItem("user_email", email);
    localStorage.setItem("access_token", data.access_token);
    onLoginSuccess();
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

  } catch (error) {
    console.error("Registration failed:", error);
  }
}
