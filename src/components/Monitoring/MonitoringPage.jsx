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
    imbalancePhases: { R: { unbalanced: false, deviation: 0 }, S: { unbalanced: false, deviation: 0 }, T: { unbalanced: false, deviation: 0 } },
  });
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Thresholds for warning notifications
  const [thresholds, setThresholds] = useState({
    temperature: 70, // °C
    vibration: 25, // m/s²
    noise: 85, // dB
    power: { R: 8000, S: 8000, T: 8000 }, // W
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

  const [dummyRunning, setDummyRunning] = useState(false);
  const dummyRef = React.useRef(null);

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

  // Dummy test runner: cycles through sample sets to validate alerts and gauges
  const startDummyTest = () => {
    if (dummyRunning) return;
    setDummyRunning(true);

    const samples = [];
    // sample 1: all normal
    samples.push({
      vibration: Math.max(0, thresholds.vibration - 5),
      temperature: Math.max(0, thresholds.temperature - 10),
      noise: Math.max(0, thresholds.noise - 5),
      powerPhases: { R: Math.max(0, thresholds.power.R - 500), S: Math.max(0, thresholds.power.S - 400), T: Math.max(0, thresholds.power.T - 300) },
    });
    // sample 2: phase R overload
    samples.push({
      vibration: thresholds.vibration - 2,
      temperature: thresholds.temperature - 5,
      noise: thresholds.noise - 2,
      powerPhases: { R: thresholds.power.R + 2000, S: Math.max(0, thresholds.power.S - 200), T: Math.max(0, thresholds.power.T - 200) },
    });
    // sample 3: temperature overload
    samples.push({
      vibration: thresholds.vibration - 2,
      temperature: thresholds.temperature + 10,
      noise: thresholds.noise - 2,
      powerPhases: { R: Math.max(0, thresholds.power.R - 200), S: Math.max(0, thresholds.power.S - 200), T: Math.max(0, thresholds.power.T - 200) },
    });
    // sample 4: noise overload
    samples.push({
      vibration: thresholds.vibration - 2,
      temperature: thresholds.temperature - 2,
      noise: thresholds.noise + 10,
      powerPhases: { R: Math.max(0, thresholds.power.R - 200), S: Math.max(0, thresholds.power.S - 200), T: Math.max(0, thresholds.power.T - 200) },
    });
    // sample 5: vibration overload
    samples.push({
      vibration: thresholds.vibration + 8,
      temperature: thresholds.temperature - 2,
      noise: thresholds.noise - 2,
      powerPhases: { R: Math.max(0, thresholds.power.R - 200), S: Math.max(0, thresholds.power.S - 200), T: Math.max(0, thresholds.power.T - 200) },
    });

    let i = 0;
    dummyRef.current = setInterval(() => {
      const s = samples[i % samples.length];
      const phases = s.powerPhases || { R: 0, S: 0, T: 0 };
      const total = phases.R + phases.S + phases.T;
      const imbalance = computeImbalance(phases, IMBALANCE_PERCENT);
      setSensorData((prev) => ({
        ...prev,
        vibration: s.vibration,
        temperature: s.temperature,
        noise: s.noise,
        power: total,
        powerPhases: phases,
        imbalancePhases: imbalance,
      }));
      i += 1;
    }, 2000);
  };

  const stopDummyTest = () => {
    if (dummyRef.current) {
      clearInterval(dummyRef.current);
      dummyRef.current = null;
    }
    setDummyRunning(false);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div />
          <div>
            {!dummyRunning ? (
              <button className="btn-export" onClick={startDummyTest}>Start Dummy Test</button>
            ) : (
              <button className="btn-export" onClick={stopDummyTest}>Stop Dummy Test</button>
            )}
          </div>
        </div>
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
