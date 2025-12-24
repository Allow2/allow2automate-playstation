/**
 * Configuration UI Component for PlayStation Plugin
 *
 * React component for configuring PlayStation Network credentials
 * and mapping PSN accounts to Allow2 children.
 */

import React, { useState, useEffect } from 'react';

export default function PlayStationConfig({ config, onSave, allow2Children }) {
  const [npsso, setNpsso] = useState(config?.npsso || '');
  const [region, setRegion] = useState(config?.region || 'en-us');
  const [accountMapping, setAccountMapping] = useState(config?.accountMapping || []);
  const [psnAccounts, setPsnAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);

  /**
   * Test PSN connection
   */
  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);

    try {
      // Call plugin method to test connection
      const response = await fetch('/api/plugins/playstation/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npsso, region })
      });

      const result = await response.json();

      if (result.success) {
        setTestResult({ success: true, message: 'Connection successful!' });
        setPsnAccounts(result.accounts || []);
      } else {
        setError(result.error || 'Connection test failed');
      }
    } catch (err) {
      setError(`Connection error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Add account mapping
   */
  const addMapping = () => {
    setAccountMapping([
      ...accountMapping,
      { childId: '', psnAccountId: '' }
    ]);
  };

  /**
   * Update account mapping
   */
  const updateMapping = (index, field, value) => {
    const updated = [...accountMapping];
    updated[index][field] = value;
    setAccountMapping(updated);
  };

  /**
   * Remove account mapping
   */
  const removeMapping = (index) => {
    setAccountMapping(accountMapping.filter((_, i) => i !== index));
  };

  /**
   * Save configuration
   */
  const handleSave = () => {
    // Validate
    if (!npsso) {
      setError('NPSSO token is required');
      return;
    }

    if (accountMapping.length === 0) {
      setError('At least one account mapping is required');
      return;
    }

    // Check for incomplete mappings
    const incomplete = accountMapping.some(m => !m.childId || !m.psnAccountId);
    if (incomplete) {
      setError('All account mappings must be complete');
      return;
    }

    // Save
    onSave({
      npsso,
      region,
      accountMapping
    });
  };

  return (
    <div className="playstation-config">
      <h2>PlayStation Network Configuration</h2>

      {/* NPSSO Token */}
      <div className="config-section">
        <h3>Authentication</h3>
        <div className="form-group">
          <label htmlFor="npsso">
            NPSSO Token
            <span className="help-icon" title="Get this from your PSN browser cookies">?</span>
          </label>
          <input
            id="npsso"
            type="password"
            value={npsso}
            onChange={(e) => setNpsso(e.target.value)}
            placeholder="Enter your NPSSO token"
            className="form-control"
          />
          <small className="form-text">
            Your NPSSO token is used to authenticate with PlayStation Network.
            <a href="#" onClick={() => window.open('/docs/psn-npsso-guide.html')}>
              How to get your NPSSO token
            </a>
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="region">Region</label>
          <select
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="form-control"
          >
            <option value="en-us">United States (en-us)</option>
            <option value="en-gb">United Kingdom (en-gb)</option>
            <option value="en-au">Australia (en-au)</option>
            <option value="de-de">Germany (de-de)</option>
            <option value="fr-fr">France (fr-fr)</option>
            <option value="es-es">Spain (es-es)</option>
            <option value="it-it">Italy (it-it)</option>
            <option value="ja-jp">Japan (ja-jp)</option>
          </select>
        </div>

        <button
          onClick={testConnection}
          disabled={isLoading || !npsso}
          className="btn btn-secondary"
        >
          {isLoading ? 'Testing...' : 'Test Connection'}
        </button>

        {testResult && (
          <div className="alert alert-success">
            {testResult.message}
          </div>
        )}

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}
      </div>

      {/* Account Mapping */}
      <div className="config-section">
        <h3>Account Mapping</h3>
        <p className="help-text">
          Map your PlayStation child accounts to Allow2 children.
        </p>

        {accountMapping.map((mapping, index) => (
          <div key={index} className="mapping-row">
            <div className="form-group">
              <label>Allow2 Child</label>
              <select
                value={mapping.childId}
                onChange={(e) => updateMapping(index, 'childId', e.target.value)}
                className="form-control"
              >
                <option value="">Select a child...</option>
                {allow2Children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>PlayStation Account</label>
              <select
                value={mapping.psnAccountId}
                onChange={(e) => updateMapping(index, 'psnAccountId', e.target.value)}
                className="form-control"
              >
                <option value="">Select PSN account...</option>
                {psnAccounts.map((account) => (
                  <option key={account.accountId} value={account.accountId}>
                    {account.displayName} ({account.accountId})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => removeMapping(index)}
              className="btn btn-danger btn-sm"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          onClick={addMapping}
          className="btn btn-secondary"
          disabled={psnAccounts.length === 0}
        >
          Add Mapping
        </button>

        {psnAccounts.length === 0 && (
          <p className="help-text">
            Test your connection first to load available PSN accounts.
          </p>
        )}
      </div>

      {/* Save Button */}
      <div className="config-actions">
        <button
          onClick={handleSave}
          className="btn btn-primary"
          disabled={isLoading}
        >
          Save Configuration
        </button>
      </div>

      <style jsx>{`
        .playstation-config {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .config-section {
          margin-bottom: 30px;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 5px;
        }

        .form-control {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-text {
          display: block;
          margin-top: 5px;
          font-size: 12px;
          color: #666;
        }

        .mapping-row {
          display: flex;
          gap: 10px;
          align-items: flex-end;
          margin-bottom: 15px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 4px;
        }

        .mapping-row .form-group {
          flex: 1;
          margin-bottom: 0;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 4px;
          margin-top: 10px;
        }

        .alert-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .alert-danger {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .help-icon {
          display: inline-block;
          margin-left: 5px;
          width: 16px;
          height: 16px;
          background: #007bff;
          color: white;
          border-radius: 50%;
          text-align: center;
          font-size: 12px;
          cursor: help;
        }

        .help-text {
          color: #666;
          font-size: 13px;
        }

        .config-actions {
          margin-top: 20px;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
