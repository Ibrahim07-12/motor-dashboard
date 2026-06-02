import React, { useState, useEffect } from "react";
import "./EmailSettings.css";

/**
 * EmailSettings Modal
 * - Add/Remove email recipients for alerts
 * - Fetch from backend on open
 * - Save to backend
 */
const EmailSettings = ({
  isOpen,
  onClose,
  currentEmails = [],
  onSave,
  isLoading: externalLoading = false,
}) => {
  const [emails, setEmails] = useState(currentEmails);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Load emails from backend when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchEmails();
    }
  }, [isOpen]);

  const fetchEmails = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found");
        return;
      }

      const response = await fetch(
        "https://backend-motor-foundry.vercel.app/api/auth/notification-emails",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch emails");
      }

      const data = await response.json();
      setEmails(data.emails || []);
      setError("");
    } catch (err) {
      console.error("Error fetching emails:", err);
      setError("Failed to load email settings");
    }
  };

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

  const handleRemoveEmail = async (emailToRemove) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch(
        `https://backend-motor-foundry.vercel.app/api/auth/notification-emails/${encodeURIComponent(emailToRemove)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove email");
      }

      const data = await response.json();
      setEmails(data.emails || []);
      setSuccess("Email removed successfully");
    } catch (err) {
      console.error("Error removing email:", err);
      setError("Failed to remove email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (emails.length === 0) {
      setError("Please add at least one email address");
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(
        "https://backend-motor-foundry.vercel.app/api/auth/notification-emails",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emails }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save emails");
      }

      const data = await response.json();
      setEmails(data.emails || []);
      setSuccess("Email settings saved successfully!");

      if (onSave) {
        await onSave(emails);
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error saving emails:", err);
      setError(err.message || "Failed to save email settings");
    } finally {
      setIsLoading(false);
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
          <button className="close-btn" onClick={onClose} disabled={isLoading}>
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
              disabled={isLoading || externalLoading}
              className="email-input"
            />
            <button
              className="btn-add"
              onClick={handleAddEmail}
              disabled={isLoading || externalLoading}
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
                      disabled={isLoading || externalLoading}
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
          <button
            className="btn-cancel"
            onClick={onClose}
            disabled={isLoading || externalLoading}
          >
            Cancel
          </button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={isLoading || externalLoading || emails.length === 0}
          >
            {isLoading ? "Saving..." : "Save Emails"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailSettings;
