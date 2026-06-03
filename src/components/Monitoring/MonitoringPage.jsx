import React, { useState, useEffect } from "react";
import Sidebar from "../Sidebar/Sidebar";
import Dashboard from "../Dashboard/Dashboard_v4";
import Notification from "../Notification/Notification";
import ThresholdSettings from "../Settings/ThresholdSettings";
import EmailSettings from "../Settings/EmailSettings";
import { sensorAPI } from "../../services/api";
import "./MonitoringPage.css";

/**
 * MonitoringPage - Main Container Component
 * - Sidebar with motor selection + notification toggle
 * - Dashboard with gauges + charts
 * - Notification alerts for abnormal conditions
 * - Settings modals (Threshold, Email)
 * - Real-time polling every 2 seconds
 */
const MonitoringPage = ({ user = {}, onLogout = () => {} }) => {
  const [motorId] = useState("motor_main_shakeout");
  const [sensorData, setSensorData] = useState({
    vibration: 0,
    temperature: 0,
    power: 0,
    noise: 0,
    powerPhases: { R: 0, S: 0, T: 0 },
    imbalancePhases: { R: { unbalanced: false, deviation: 0 }, S: { unbalanced: false, deviation: 0 }, T: { unbalanced: false, deviation: 0 } },
  });
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // UI thresholds for gauge color + local warning notifications
  const [thresholds, setThresholds] = useState(() => {
    // Load from localStorage if available, otherwise use defaults
    const saved = localStorage.getItem("motorThresholds");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved thresholds:", e);
      }
    }
    // Default UI thresholds
    return {
      temperature: 70, // °C
      vibration: 25, // m/s²
      noise: 85, // dB
      power: { R: 8000, S: 8000, T: 8000 }, // W
    };
  });

  // imbalance percent threshold (default 20%) - can be moved to settings later
  const IMBALANCE_PERCENT = thresholds.imbalancePercent ?? 20;

  // Compute imbalance: compare each phase to the average of three phases
  const computeImbalance = (phases, percentThreshold) => {
    const vals = [phases.R || 0, phases.S || 0, phases.T || 0];
    const total = vals.reduce((a, b) => a + b, 0);
    const avg = total / 3 || 0;
    const result = { R: { unbalanced: false, deviation: 0 }, S: { unbalanced: false, deviation: 0 }, T: { unbalanced: false, deviation: 0 } };
    if (avg <= 0) return result;
    let any = false;
    let maxDev = { phase: null, percent: 0 };
    Object.keys(phases).forEach((k) => {
      const v = phases[k] || 0;
      const dev = Math.abs((v - avg) / avg) * 100;
      const unbalanced = dev > percentThreshold;
      result[k] = { unbalanced, deviation: dev };
      if (unbalanced) any = true;
      if (dev > maxDev.percent) maxDev = { phase: k, percent: dev };
    });
    result.any = any;
    result.max = maxDev;
    return result;
  };

  // Modals state
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handleToggleNotification = () => {
    setNotificationEnabled(!notificationEnabled);
  };

  const handleSaveThresholds = async (newThresholds) => {
    // Save to state
    setThresholds(newThresholds);
    // Persist to localStorage
    try {
      localStorage.setItem("motorThresholds", JSON.stringify(newThresholds));
      console.log("✓ Thresholds saved to localStorage:", newThresholds);
    } catch (e) {
      console.error("Failed to save thresholds to localStorage:", e);
    }
  };

  // Real-time polling every 2 seconds
  useEffect(() => {
    const fetchLatestSensorData = async () => {
      try {
        const response = await sensorAPI.getLatest(motorId);
        if (response.data?.data) {
          const data = response.data.data;
          const phases = {
            R: data.phase?.R?.power || 0,
            S: data.phase?.S?.power || 0,
            T: data.phase?.T?.power || 0,
          };
          const total = (phases.R + phases.S + phases.T) || 0;
          const imbalance = computeImbalance(phases, IMBALANCE_PERCENT);
          setSensorData({
            vibration: data.vibration || 0,
            temperature: data.temperature || 0,
            power: total,
            noise: data.noise || 0,
            powerPhases: phases,
            imbalancePhases: imbalance,
          });
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    fetchLatestSensorData();
    const interval = setInterval(fetchLatestSensorData, 2000);
    return () => clearInterval(interval);
  }, [motorId]);

  const handleSaveEmails = async (emails) => {
    // Email saving is now handled by EmailSettings component
    // This callback is kept for potential future custom logic
    console.log("Emails updated in backend:", emails);
  };

  return (
    <div className="monitoring-page">
      {/* Sidebar */}
      <Sidebar
        notificationEnabled={notificationEnabled}
        onToggleNotification={handleToggleNotification}
        onOpenThresholdSettings={() => setShowThresholdModal(true)}
        onOpenEmailSettings={() => setShowEmailModal(true)}
        onLogout={onLogout}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        {/* Dashboard */}
        {/* Dummy test controls removed */}
        <Dashboard sensorData={sensorData} motorId={motorId} thresholds={thresholds} />
      </div>

      {/* Notification Alerts */}
      <Notification
        isEnabled={notificationEnabled}
        sensorData={sensorData}
        motorId={motorId}
        thresholds={thresholds}
      />

      {/* Modals */}
      <ThresholdSettings
        isOpen={showThresholdModal}
        onClose={() => setShowThresholdModal(false)}
        onSave={handleSaveThresholds}
      />

      <EmailSettings
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSave={handleSaveEmails}
      />
    </div>
  );
};

export default MonitoringPage;
