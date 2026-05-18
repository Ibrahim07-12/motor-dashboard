import React, { useState, useEffect } from "react";
import "./ThresholdSettings.css";

/**
 * ThresholdSettings Modal
 * - Edit min/max thresholds for each sensor
 * - Save to backend
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
    power: { min: 0, max: 23000 },
    noise: { min: 0, max: 130 },
    ...currentThresholds,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleThresholdChange = (sensor, field, value) => {
    const numValue = parseFloat(value) || 0;
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

    // Validation
    for (const sensor in thresholds) {
      if (thresholds[sensor].min >= thresholds[sensor].max) {
        setError(`${sensor}: Min harus < Max`);
        return;
      }
    }

    try {
      await onSave(thresholds);
      setSuccess("Thresholds saved successfully!");
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
          <h2>📊 Threshold Settings</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

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
            <label>Total Power (W)</label>
            <div className="threshold-inputs">
              <div className="input-pair">
                <span>Min:</span>
                <input
                  type="number"
                  min="0"
                  value={thresholds.power.min}
                  onChange={(e) =>
                    handleThresholdChange("power", "min", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
              <div className="input-pair">
                <span>Max:</span>
                <input
                  type="number"
                  min="0"
                  value={thresholds.power.max}
                  onChange={(e) =>
                    handleThresholdChange("power", "max", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
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
