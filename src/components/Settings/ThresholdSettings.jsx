import React, { useState, useEffect } from "react";
import "./ThresholdSettings.css";

/**
 * ThresholdSettings Modal
 * - Edit min/max thresholds for each sensor (UI)
 * - Save thresholds for gauge color + local warning notifications
 * Clean and simple form
 */
const ThresholdSettings = ({
  isOpen,
  onClose,
  currentThresholds = {},
  onSave,
  isLoading = false,
}) => {
  const [thresholds, setThresholds] = useState({
    vibration: { min: 0, max: 150 },
    temperature: { min: 0, max: 150 },
    power: {
      R: { min: 0, max: 23000 },
      S: { min: 0, max: 23000 },
      T: { min: 0, max: 23000 },
    },
    noise: { min: 0, max: 130 },
    ...currentThresholds,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleThresholdChange = (sensor, field, value) => {
    const numValue = parseFloat(value) || 0;
    // support nested power phases
    if (sensor.startsWith("power.")) {
      const [, phase] = sensor.split(".");
      setThresholds((prev) => ({
        ...prev,
        power: {
          ...prev.power,
          [phase]: {
            ...prev.power[phase],
            [field]: numValue,
          },
        },
      }));
      return;
    }

    setThresholds((prev) => ({
      ...prev,
      [sensor]: {
        ...prev[sensor],
        [field]: numValue,
      },
    }));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    // Validate simple sensors
    for (const sensor of ["vibration", "temperature", "noise"]) {
      if (thresholds[sensor].min >= thresholds[sensor].max) {
        setError(`${sensor}: Min harus < Max`);
        return;
      }
    }

    // Validate power phases (R/S/T)
    for (const phase of ["R", "S", "T"]) {
      if (thresholds.power[phase].min >= thresholds.power[phase].max) {
        setError(`power.${phase}: Min harus < Max`);
        return;
      }
    }

    try {
      // Convert to simple thresholds for monitoring: use max values
      const simple = {
        vibration: thresholds.vibration.max,
        temperature: thresholds.temperature.max,
        noise: thresholds.noise.max,
        power: {
          R: thresholds.power.R.max,
          S: thresholds.power.S.max,
          T: thresholds.power.T.max,
        },
      };

      await onSave(simple);
      setSuccess("UI thresholds saved successfully!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to save thresholds");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content threshold-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>📊 UI Alert Thresholds</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="description">
          Dipakai untuk warna gauge dan notifikasi abnormal parameter di dashboard.
          Tidak mengubah threshold model anomaly detection di Edge Gateway.
        </p>

        {/* Body */}
        <div className="modal-body">
          {/* Vibration */}
          <div className="threshold-group">
            <label>Vibration (m/s²)</label>
            <div className="threshold-inputs">
              <div className="input-pair">
                <span>Min:</span>
                <input
                  type="number"
                  min="0"
                  value={thresholds.vibration.min}
                  onChange={(e) =>
                    handleThresholdChange("vibration", "min", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
              <div className="input-pair">
                <span>Max:</span>
                <input
                  type="number"
                  min="0"
                  value={thresholds.vibration.max}
                  onChange={(e) =>
                    handleThresholdChange("vibration", "max", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Temperature */}
          <div className="threshold-group">
            <label>Temperature (°C)</label>
            <div className="threshold-inputs">
              <div className="input-pair">
                <span>Min:</span>
                <input
                  type="number"
                  value={thresholds.temperature.min}
                  onChange={(e) =>
                    handleThresholdChange("temperature", "min", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
              <div className="input-pair">
                <span>Max:</span>
                <input
                  type="number"
                  value={thresholds.temperature.max}
                  onChange={(e) =>
                    handleThresholdChange("temperature", "max", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Power */}
          <div className="threshold-group">
            <label>Power per Phase (W)</label>
            <div className="threshold-inputs">
              <div className="input-pair">
                <span>R Min:</span>
                <input
                  type="number"
                  min="0"
                  value={thresholds.power.R.min}
                  onChange={(e) =>
                    handleThresholdChange("power.R", "min", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
              <div className="input-pair">
                <span>R Max:</span>
                <input
                  type="number"
                  min="0"
                  value={thresholds.power.R.max}
                  onChange={(e) =>
                    handleThresholdChange("power.R", "max", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="input-pair">
                <span>S Min:</span>
                <input
                  type="number"
                  min="0"
                  value={thresholds.power.S.min}
                  onChange={(e) =>
                    handleThresholdChange("power.S", "min", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
              <div className="input-pair">
                <span>S Max:</span>
                <input
                  type="number"
                  min="0"
                  value={thresholds.power.S.max}
                  onChange={(e) =>
                    handleThresholdChange("power.S", "max", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="input-pair">
                <span>T Min:</span>
                <input
                  type="number"
                  min="0"
                  value={thresholds.power.T.min}
                  onChange={(e) =>
                    handleThresholdChange("power.T", "min", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
              <div className="input-pair">
                <span>T Max:</span>
                <input
                  type="number"
                  min="0"
                  value={thresholds.power.T.max}
                  onChange={(e) =>
                    handleThresholdChange("power.T", "max", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>

              {/* total removed - using per-phase thresholds only */}
            </div>
          </div>

          {/* Noise */}
          <div className="threshold-group">
            <label>Noise (dB)</label>
            <div className="threshold-inputs">
              <div className="input-pair">
                <span>Min:</span>
                <input
                  type="number"
                  min="0"
                  value={thresholds.noise.min}
                  onChange={(e) =>
                    handleThresholdChange("noise", "min", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
              <div className="input-pair">
                <span>Max:</span>
                <input
                  type="number"
                  min="0"
                  value={thresholds.noise.max}
                  onChange={(e) =>
                    handleThresholdChange("noise", "max", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Thresholds"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThresholdSettings;
