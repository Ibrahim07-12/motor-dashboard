import axios from "axios";

const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? import.meta.env.VITE_API_BASE_URL_PROD
    : import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Jangan redirect untuk auth endpoints (login/register/verify)
    const isAuthEndpoint = error.config?.url?.includes("/auth/");
    
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Hanya redirect jika 401 di endpoint yang BUKAN auth
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const authAPI = {
  register: (email, password, registrationCode) =>
    api.post("/auth/register", { email, password, registrationCode }),
  login: (email, password) =>
    api.post("/auth/login", { email, password }),
  verify: () => api.get("/auth/verify"),
};

export const sensorAPI = {
  uploadData: (data) => api.post("/sensor/upload", data),
  getLatest: (motorId = "motor_main_shakeout") =>
    api.get(`/sensor/latest?motorId=${motorId}`),
};

export const dataAPI = {
  getHistory: (motorId, mode, date) =>
    api.get(`/data/history?motorId=${motorId}&mode=${mode}&date=${date}`),
  getWeeklyAverage: (motorId, date) =>
    api.get(`/data/weekly-average?motorId=${motorId}&date=${date}`),
  getMonthlyAverage: (motorId, date) =>
    api.get(`/data/monthly-average?motorId=${motorId}&date=${date}`),
  exportData: (motorId, mode, date) =>
    api.get(
      `/data/export?motorId=${motorId}&mode=${mode}&date=${date}`,
      { responseType: "blob" },
    ),
};

export default api;
