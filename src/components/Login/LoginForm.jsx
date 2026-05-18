import React, { useState } from "react";
import { authAPI } from "../../services/api";
import "./Login.css";

const LoginForm = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    // Validation sebelum kirim request
    if (!email || !password) {
      setError("Email dan Password harus diisi.");
      return;
    }

    if (isRegistering) {
      if (!confirmPassword) {
        setError("Confirm Password harus diisi.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Password dan Confirm Password harus sama.");
        return;
      }
      if (!registrationCode) {
        setError("Registration Code harus diisi.");
        return;
      }
      if (password.length < 6) {
        setError("Password minimal 6 karakter.");
        return;
      }
    }

    setLoading(true);

    try {
      const response = isRegistering
        ? await authAPI.register(email, password, registrationCode)
        : await authAPI.login(email, password);
      
      console.log("✓ Auth response:", response.data);
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      console.log("✓ Token saved:", token);
      console.log("✓ User saved:", user);

      onLoginSuccess(user);
    } catch (err) {
      console.error("❌ Auth error:", err);
      console.error("❌ Error response:", err.response);
      
      // Convert backend error message ke user-friendly Bahasa Indonesia
      let errorMessage = "Terjadi kesalahan. Silakan coba lagi.";
      const backendError = err.response?.data?.error || err.message || "";
      
      console.log("Backend error string:", backendError);

      if (isRegistering) {
        if (backendError.includes("Invalid registration code")) {
          errorMessage = "Registration Code salah. Cek kembali Registration Code Anda.";
        } else if (backendError.includes("Email already exists")) {
          errorMessage = "Email sudah terdaftar. Gunakan email lain atau login.";
        } else if (backendError.includes("required")) {
          errorMessage = "Email, Password, dan Registration Code harus diisi.";
        } else if (backendError) {
          errorMessage = backendError;
        } else {
          errorMessage = "Registrasi gagal. Silakan coba lagi.";
        }
      } else {
        // Login error - lebih spesifik
        if (backendError.includes("not registered") || backendError.includes("invalid password")) {
          errorMessage = "Email atau Password salah.";
        } else if (backendError.includes("required")) {
          errorMessage = "Email dan Password harus diisi.";
        } else if (backendError.includes("Network") || backendError.includes("ECONNREFUSED")) {
          errorMessage = "Tidak bisa terhubung ke server. Periksa koneksi Anda.";
        } else if (backendError) {
          errorMessage = backendError;
        } else {
          errorMessage = "Login gagal. Silakan coba lagi.";
        }
      }

      console.log("Setting error message:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">{isRegistering ? "Register" : "Login"}</h1>

        <form onSubmit={handleLogin} className="login-form">
          <div className="underline-input">
            <input
              type="text"
              id="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="underline-input">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M3 3l18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10.58 10.58A2 2 0 0 0 13.42 13.42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.88 5.1A10.94 10.94 0 0 1 12 5c5.5 0 9.5 4.4 10.7 7a12.7 12.7 0 0 1-3.19 4.44"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.1 6.1C3.76 7.65 2.04 9.92 1.3 12c1.2 2.6 5.2 7 10.7 7 1.43 0 2.77-.2 4-.58"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="2.75"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              )}
            </button>
          </div>

          {isRegistering && (
            <>
              <div className="underline-input">
                <input
                  type="password"
                  id="confirmPassword"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="underline-input">
                <input
                  type="text"
                  id="registrationCode"
                  placeholder="Registration Code"
                  value={registrationCode}
                  onChange={(e) => setRegistrationCode(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="login-actions">
            <label className="remember">
              <input type="checkbox" /> Remember Me
            </label>
            <button
              type="button"
              className="forgot"
              onClick={() => setIsRegistering((value) => !value)}
            >
              {isRegistering ? "Back to Login" : "Register"}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Processing..." : isRegistering ? "Register" : "Log in"}
          </button>
        </form>

        <p className="login-footer">
          {isRegistering ? "Already have an account" : "Don't have an account"}{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setIsRegistering((value) => !value);
            }}
          >
            {isRegistering ? "Login" : "Register"}
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
