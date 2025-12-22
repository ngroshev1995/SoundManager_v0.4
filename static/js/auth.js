import { showNotification } from "./ui.js";
import { apiRequest } from "./api.js";

let onLoginSuccess = () => {};

export function initAuth(handleLoginSuccess) {
  onLoginSuccess = handleLoginSuccess;

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const showRegisterLink = document.getElementById("show-register");
  const showLoginLink = document.getElementById("show-login");
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const loginPasswordInput = document.getElementById("login-password");
  const registerPasswordInput = document.getElementById("register-password");

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

  loginBtn?.addEventListener("click", handleLogin);
  registerBtn?.addEventListener("click", handleRegister);

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

async function handleLogin() {
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");

  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    showNotification("Пожалуйста, введите email и пароль.", "error");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Ошибка входа. Проверьте email и пароль.");
    }

    localStorage.setItem("user_email", email);
    localStorage.setItem("access_token", data.access_token);
    try {
      // Делаем дополнительный запрос, чтобы получить display_name
      const profile = await apiRequest("/api/users/me");
      localStorage.setItem("display_name", profile.display_name || "");
      localStorage.setItem("is_admin", profile.is_admin ? "true" : "false");
    } catch (e) {
      console.error("Не удалось получить профиль после входа:", e);
      localStorage.setItem("is_admin", "false");
    }
    onLoginSuccess();
  } catch (error) {
    showNotification(error.message, "error");
  }
}

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
      const showLoginLink = document.getElementById("show-login");
      showLoginLink?.click();
      return;
    }

    localStorage.setItem("user_email", email);
    localStorage.setItem("access_token", data.access_token);
    try {
      const profile = await apiRequest("/api/users/me");
      localStorage.setItem("display_name", profile.display_name || "");
      localStorage.setItem("is_admin", profile.is_admin ? "true" : "false");
    } catch (e) {
      console.error("Не удалось получить профиль после регистрации:", e);
      localStorage.setItem("is_admin", "false");
    }
    onLoginSuccess();
  } catch (error) {
    console.error("Registration failed:", error);
  }
}
