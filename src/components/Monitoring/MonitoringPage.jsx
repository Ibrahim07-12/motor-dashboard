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
    vibration: 12.5,
    temperature: 45.0,
    power: 8900,
    noise: 78.5,
    powerPhases: {
      R: 0,
      S: 0,
      T: 0,
    },
  });
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Thresholds for warning notifications
  const [thresholds, setThresholds] = useState({
    temperature: 70, // °C
    vibration: 25, // m/s²
    noise: 85, // dB
    power: 8000, // W (8 kW)
  });

  // Modals state
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Real-time polling every 2 seconds
  useEffect(() => {
    const fetchLatestSensorData = async () => {
      try {
        const response = await sensorAPI.getLatest(motorId);
        if (response.data?.data) {
          const data = response.data.data;
          setSensorData({
            vibration: data.vibration || 0,
            temperature: data.temperature || 0,
            power: data.power?.totalPower || 0,
            noise: data.noise || 0,
            powerPhases: {
              R: data.phase?.R?.power || 0,
              S: data.phase?.S?.power || 0,
              T: data.phase?.T?.power || 0,
            },
          });
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Fetch immediately on mount
    fetchLatestSensorData();

    // Then poll every 2 seconds
    const interval = setInterval(fetchLatestSensorData, 2000);
    return () => clearInterval(interval);
  }, [motorId]);

  const handleToggleNotification = () => {
    setNotificationEnabled(!notificationEnabled);
    // Optionally save to backend: await settingsAPI.updateNotifications({ enabled: !notificationEnabled })
  };

  const handleSaveThresholds = async (newThresholds) => {
    // Update thresholds
    setThresholds(newThresholds);
    console.log("Saving thresholds:", newThresholds);
    // await settingsAPI.updateThresholds(newThresholds);
  };

  const handleSaveEmails = async (emails) => {
    // Optionally save to backend in future
    console.log("Saving emails:", emails);
    // await settingsAPI.updateEmails(emails);
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
