import React, { useEffect, useState } from "react";
import "./Notification.css";

/**
 * Notification Component - Red alert notification at bottom-right
 * Shows abnormal condition warnings based on sensor thresholds
 * Blinks: 3s visible, 5s hidden, repeats
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

  // Display name mapping for motor IDs
  const getMotorDisplayName = (id) => {
    const nameMap = {
      motor_main_shakeout: "Mainshakeout",
      motor_auxiliary: "Auxiliary",
      motor_backup: "Backup",
    };
    return nameMap[id] || id;
  };

  // Check for abnormal conditions
  useEffect(() => {
    if (!isEnabled) {
      setAlerts([]);
      return;
    }

    const abnormalParams = [];
    const powerPhaseAlerts = [];

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
    const powerThreshold = thresholds.power;
    const phasesSrc = sensorData.phase || sensorData.powerPhases || {};
    if (typeof powerThreshold === "object") {
      const phaseValue = (phaseKey) => {
        if (phasesSrc?.[phaseKey] && typeof phasesSrc[phaseKey] === "object") {
          return Number(phasesSrc[phaseKey].power || 0);
        }
        return Number(sensorData?.powerPhases?.[phaseKey] || phasesSrc?.[phaseKey] || 0);
      };

      if (phaseValue("R") > Number(powerThreshold.R || 0)) {
        powerPhaseAlerts.push("R");
      }
      if (phaseValue("S") > Number(powerThreshold.S || 0)) {
        powerPhaseAlerts.push("S");
      }
      if (phaseValue("T") > Number(powerThreshold.T || 0)) {
        powerPhaseAlerts.push("T");
      }
      // also check total if provided
      if (sensorData.power && powerThreshold.total && sensorData.power > powerThreshold.total) {
        abnormalParams.push("Daya Total");
      }
    } else {
      if (sensorData.power && sensorData.power > (powerThreshold || 0)) {
        abnormalParams.push("Daya");
      }
    }

    // Generate notification message for parameter threshold exceedances
    const alertsToSet = [];
    if (abnormalParams.length > 0) {
      let message = "";
      const motorDisplay = getMotorDisplayName(motorId);

      if (abnormalParams.length === 1) {
        message = `${abnormalParams[0]} Motor ${motorDisplay} melebihi batas aman.`;
      } else if (abnormalParams.length === 2) {
        message = `${abnormalParams[0]} dan ${abnormalParams[1]} Motor ${motorDisplay} melebihi batas aman.`;
      } else if (abnormalParams.length === 3) {
        message = `${abnormalParams[0]}, ${abnormalParams[1]} dan ${abnormalParams[2]} Motor ${motorDisplay} melebihi batas aman.`;
      } else if (abnormalParams.length === 4) {
        message = `${abnormalParams[0]}, ${abnormalParams[1]}, ${abnormalParams[2]} dan ${abnormalParams[3]} Motor ${motorDisplay} melebihi batas aman.`;
      }

      alertsToSet.push({ id: `alert-${Date.now()}`, message, type: "warning", timestamp: new Date() });
    }

    if (powerPhaseAlerts.length > 0) {
      const motorDisplay = getMotorDisplayName(motorId);
      powerPhaseAlerts.forEach((phase) => {
        alertsToSet.push({
          id: `power-${phase}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          message: `Daya ${phase} Motor ${motorDisplay} melebihi batas aman.`,
          type: "warning",
          timestamp: new Date(),
        });
      });
    }

    // Generate separate alerts for imbalance (one per unbalanced phase)
    const imbalance = sensorData.imbalancePhases;
    if (imbalance && imbalance.any) {
      const motorDisplay = getMotorDisplayName(motorId);
      Object.keys(imbalance).forEach((k) => {
        if (k === 'any' || k === 'max') return;
        if (imbalance[k] && imbalance[k].unbalanced) {
          alertsToSet.push({
            id: `imbalance-${k}-${Date.now()}`,
            message: `Phase ${k} Power Unbalance on Motor ${motorDisplay}`,
            type: "warning",
            timestamp: new Date(),
          });
        }
      });
    }

    setAlerts(alertsToSet);
  }, [sensorData, isEnabled, motorId, thresholds]);

  if (!isEnabled || alerts.length === 0) {
    return null;
  }

  return (
    <div className="notifications-container">
      {alerts.map((alert) => (
        <div key={alert.id} className={`notification notification-${alert.type} notification-blink`}>
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
