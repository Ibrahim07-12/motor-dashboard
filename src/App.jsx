import React, { useState, useEffect } from "react";
import LoginForm from "./components/Login/LoginForm";
import MonitoringPage from "./components/Monitoring/MonitoringPage";
import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      setIsLoggedIn(true);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = (loginUser) => {
    setUser(loginUser);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <div className="app">
      {isLoggedIn ? (
        <MonitoringPage user={user} onLogout={handleLogout} />
      ) : (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
