import React, { useState, useEffect } from "react";
import "./EmailSettings.css";

/**
 * EmailSettings Modal
 * - Add/Remove email recipients for alerts
 * - Enable/Disable email notifications
 * Clean and simple form
 */
const EmailSettings = ({
  isOpen,
  onClose,
  currentEmails = [],
  onSave,
  isLoading = false,
}) => {
  const [emails, setEmails] = useState(currentEmails);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Validation regex for email
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddEmail = () => {
    setError("");

    if (!newEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    if (!isValidEmail(newEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    if (emails.includes(newEmail)) {
      setError("Email already added");
      return;
    }

    setEmails([...emails, newEmail]);
    setNewEmail("");
  };

  const handleRemoveEmail = (emailToRemove) => {
    setEmails(emails.filter((email) => email !== emailToRemove));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (emails.length === 0) {
      setError("Please add at least one email address");
      return;
    }

    try {
      await onSave(emails);
      setSuccess("Email settings saved successfully!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to save email settings");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAddEmail();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content email-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>📧 Email Settings</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <p className="description">
            Add email addresses to receive alert notifications when thresholds
            are exceeded.
          </p>

          {/* Add Email Input */}
          <div className="email-input-group">
            <input
              type="email"
              placeholder="Enter email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="email-input"
            />
            <button
              className="btn-add"
              onClick={handleAddEmail}
              disabled={isLoading}
            >
              Add
            </button>
          </div>

          {/* Email List */}
          <div className="email-list">
            <h3>Recipients ({emails.length})</h3>
            {emails.length === 0 ? (
              <p className="empty-message">No emails added yet</p>
            ) : (
              <div className="emails">
                {emails.map((email, index) => (
                  <div key={index} className="email-item">
                    <span>{email}</span>
                    <button
                      className="btn-remove"
                      onClick={() => handleRemoveEmail(email)}
                      disabled={isLoading}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            disabled={isLoading || emails.length === 0}
          >
            {isLoading ? "Saving..." : "Save Emails"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailSettings;
