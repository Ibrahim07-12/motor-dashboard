import React from "react";
import "./Sidebar.css";

/**
 * Sidebar Component
 * - Notification toggle
 * - Settings buttons (Threshold, Email)
 * - Logout button
 */
const Sidebar = ({
  notificationEnabled = true,
  onToggleNotification,
  onOpenThresholdSettings,
  onOpenEmailSettings,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <h2 className="sidebar-title">Monitoring</h2>
        <button
          className="toggle-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? "→" : "←"}
        </button>
      </div>

      {/* Sections */}
      <div className="sidebar-sections">
        {/* Notification Toggle */}
        <div className="sidebar-section">
          <label className="section-title">Notifications</label>
          <div className="notification-toggle">
            <button
              className={`toggle-switch ${notificationEnabled ? "on" : "off"}`}
              onClick={onToggleNotification}
            >
              {notificationEnabled ? "ON" : "OFF"}
            </button>
            <span className="toggle-status">
              {notificationEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        {/* Settings Buttons */}
        <div className="sidebar-section">
          <label className="section-title">Settings</label>
          <button
            className="settings-btn threshold-btn"
            onClick={onOpenThresholdSettings}
          >
            Thresholds
          </button>
          <button
            className="settings-btn email-btn"
            onClick={onOpenEmailSettings}
          >
            Email Settings
          </button>
        </div>
      </div>

      {/* Logout Button */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
