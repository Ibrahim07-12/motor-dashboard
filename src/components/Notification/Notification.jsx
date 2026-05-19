import React, { useEffect, useState } from "react";
import "./Notification.css";

/**
 * Notification Component - Red alert notification at top-right
 * Shows abnormal condition warnings based on sensor thresholds
 */
const Notification = ({
  isEnabled = true,
  sensorData = {},
  motorId = "motor_main_shakeout",
  thresholds = {
    temperature: 70,
    vibration: 25,
    noise: 85,
    power: 8000,
  },
}) => {
  const [alerts, setAlerts] = useState([]);

  // Check for abnormal conditions
  useEffect(() => {
    if (!isEnabled) {
      setAlerts([]);
      return;
    }

    const abnormalParams = [];

    // Check Temperature
    if (sensorData.temperature && sensorData.temperature > thresholds.temperature) {
      abnormalParams.push("Suhu");
    }

    // Check Vibration
    if (sensorData.vibration && sensorData.vibration > thresholds.vibration) {
      abnormalParams.push("Getaran");
    }

    // Check Noise
    if (sensorData.noise && sensorData.noise > thresholds.noise) {
      abnormalParams.push("Suara");
    }

    // Check Power
    if (sensorData.power && sensorData.power > thresholds.power) {
      abnormalParams.push("Daya");
    }

    // Generate notification message
    if (abnormalParams.length > 0) {
      let message = "";

      if (abnormalParams.length === 1) {
        message = `${abnormalParams[0]} Motor ${motorId} melebihi batas aman.`;
      } else if (abnormalParams.length === 2) {
        message = `${abnormalParams[0]} dan ${abnormalParams[1]} Motor ${motorId} melebihi batas aman.`;
      } else if (abnormalParams.length === 3) {
        message = `${abnormalParams[0]}, ${abnormalParams[1]} dan ${abnormalParams[2]} Motor ${motorId} melebihi batas aman.`;
      } else if (abnormalParams.length === 4) {
        message = `${abnormalParams[0]}, ${abnormalParams[1]}, ${abnormalParams[2]} dan ${abnormalParams[3]} Motor ${motorId} melebihi batas aman.`;
      }

      setAlerts([
        {
          id: `alert-${Date.now()}`,
          message,
          type: "warning",
          timestamp: new Date(),
        },
      ]);
    } else {
      setAlerts([]);
    }
  }, [sensorData, isEnabled, motorId, thresholds]);

  if (!isEnabled || alerts.length === 0) {
    return null;
  }

  return (
    <div className="notifications-container">
      {alerts.map((alert) => (
        <div key={alert.id} className={`notification notification-${alert.type}`}>
          <div className="notification-icon">⚠️</div>
          <div className="notification-content">
            <div className="notification-message">{alert.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Notification;
