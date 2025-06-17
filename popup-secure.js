/**
 * Secure Popup Script
 * 
 * This popup script implements security-first principles:
 * - User transparency and control
 * - Comprehensive audit logging
 * - Privacy-focused functionality
 * - No data exfiltration
 */

class SecurePopupManager {
  constructor() {
    this.currentTab = null;
    this.extensionStatus = {
      healthy: false,
      domain: null,
      allowed: false,
      lastActivity: null
    };
    
    this.init();
  }

  async init() {
    try {
      // Get current tab information
      await this.getCurrentTab();
      
      // Load extension status
      await this.loadExtensionStatus();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load audit logs
      await this.loadAuditLogs();
      
      // Hide loading and show content
      this.hideLoading();
      
    } catch (error) {
      this.showError('Failed to initialize popup: ' + error.message);
    }
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      
      if (tab && tab.url) {
        const url = new URL(tab.url);
        document.getElementById('current-domain').textContent = url.hostname;
      }
    } catch (error) {
      console.error('Failed to get current tab:', error);
      document.getElementById('current-domain').textContent = 'Unknown';
    }
  }

  async loadExtensionStatus() {
    try {
      // Check background script health
      const healthResponse = await chrome.runtime.sendMessage({
        type: 'HEALTH_CHECK'
      });

      if (healthResponse && healthResponse.status === 'healthy') {
        this.extensionStatus.healthy = true;
        document.getElementById('extension-status').textContent = 'Active';
        
        // Update last activity
        if (healthResponse.timestamp) {
          const lastActivity = new Date(healthResponse.timestamp).toLocaleTimeString();
          document.getElementById('last-activity').textContent = lastActivity;
        }
      } else {
        throw new Error('Background script not responding');
      }

      // Check if current domain is allowed
      if (this.currentTab && this.currentTab.url) {
        const url = new URL(this.currentTab.url);
        const isAllowed = await this.checkDomainAllowed(url.hostname);
        document.getElementById('domain-allowed').textContent = isAllowed ? 'Yes' : 'No';
        this.extensionStatus.allowed = isAllowed;
      }

      // Load privacy settings
      await this.loadPrivacySettings();

    } catch (error) {
      console.error('Failed to load extension status:', error);
      document.getElementById('extension-status').textContent = 'Error';
      this.showError('Extension communication error: ' + error.message);
    }
  }

  async checkDomainAllowed(hostname) {
    // Check against allowed domains (should match content script configuration)
    const allowedDomains = ['example.com'];
    return allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  }

  async loadPrivacySettings() {
    try {
      // In a real implementation, these would be loaded from storage
      // For now, we'll use default secure settings
      const settings = {
        auditingEnabled: true,
        strictMode: true,
        consentRequired: true
      };

      document.getElementById('audit-toggle').checked = settings.auditingEnabled;
      document.getElementById('strict-toggle').checked = settings.strictMode;
      document.getElementById('consent-toggle').checked = settings.consentRequired;

    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  }

  setupEventListeners() {
    // Health check button
    document.getElementById('health-check-btn').addEventListener('click', 
      this.performHealthCheck.bind(this));

    // Security scan button
    document.getElementById('security-scan-btn').addEventListener('click', 
      this.performSecurityScan.bind(this));

    // Export logs button
    document.getElementById('export-logs-btn').addEventListener('click', 
      this.exportAuditLogs.bind(this));

    // Clear logs button
    document.getElementById('clear-logs-btn').addEventListener('click', 
      this.clearAuditLogs.bind(this));

    // Privacy toggles
    document.getElementById('audit-toggle').addEventListener('change', 
      this.updatePrivacySetting.bind(this, 'auditingEnabled'));
    
    document.getElementById('strict-toggle').addEventListener('change', 
      this.updatePrivacySetting.bind(this, 'strictMode'));
    
    document.getElementById('consent-toggle').addEventListener('change', 
      this.updatePrivacySetting.bind(this, 'consentRequired'));
  }

  async performHealthCheck() {
    const button = document.getElementById('health-check-btn');
    const originalText = button.textContent;
    
    try {
      button.disabled = true;
      button.textContent = 'Running...';

      // Check background script
      const backgroundHealth = await chrome.runtime.sendMessage({
        type: 'HEALTH_CHECK'
      });

      // Check content script (if on allowed domain)
      let contentScriptHealth = null;
      if (this.currentTab && this.extensionStatus.allowed) {
        try {
          contentScriptHealth = await chrome.tabs.sendMessage(this.currentTab.id, {
            type: 'HEALTH_CHECK'
          });
        } catch (error) {
          console.log('Content script not available on this page');
        }
      }

      // Show results
      const results = {
        backgroundScript: backgroundHealth?.status === 'healthy',
        contentScript: contentScriptHealth?.success || false,
        permissions: await this.checkPermissions(),
        timestamp: new Date().toISOString()
      };

      this.showHealthCheckResults(results);
      await this.loadAuditLogs(); // Refresh logs

    } catch (error) {
      this.showError('Health check failed: ' + error.message);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async performSecurityScan() {
    const button = document.getElementById('security-scan-btn');
    const originalText = button.textContent;
    
    try {
      button.disabled = true;
      button.textContent = 'Scanning...';

      if (!this.currentTab || !this.extensionStatus.allowed) {
        throw new Error('Security scan only available on allowed domains');
      }

      const scanResults = await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'SECURITY_SCAN'
      });

      if (scanResults.success) {
        this.showSecurityScanResults(scanResults.data);
      } else {
        throw new Error(scanResults.error || 'Security scan failed');
      }

    } catch (error) {
      this.showError('Security scan failed: ' + error.message);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async exportAuditLogs() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_AUDIT_LOG'
      });

      if (response && response.logs) {
        const logData = JSON.stringify(response.logs, null, 2);
        const blob = new Blob([logData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `extension-audit-log-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showSuccess('Audit logs exported successfully');
      } else {
        throw new Error('No audit logs available');
      }
    } catch (error) {
      this.showError('Failed to export logs: ' + error.message);
    }
  }

  async clearAuditLogs() {
    if (!confirm('Are you sure you want to clear all audit logs? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CLEAR_AUDIT_LOG'
      });

      if (response && response.success) {
        await this.loadAuditLogs(); // Refresh the display
        this.showSuccess('Audit logs cleared successfully');
      } else {
        throw new Error('Failed to clear audit logs');
      }
    } catch (error) {
      this.showError('Failed to clear logs: ' + error.message);
    }
  }

  async updatePrivacySetting(setting, event) {
    try {
      const enabled = event.target.checked;
      
      // In a real implementation, this would save to chrome.storage
      console.log(`Privacy setting ${setting} updated:`, enabled);
      
      // Show confirmation
      this.showSuccess(`${setting} ${enabled ? 'enabled' : 'disabled'}`);
      
    } catch (error) {
      this.showError('Failed to update privacy setting: ' + error.message);
      // Revert the toggle
      event.target.checked = !event.target.checked;
    }
  }

  async loadAuditLogs() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_AUDIT_LOG'
      });

      const logContainer = document.getElementById('audit-log');
      
      if (response && response.logs && response.logs.length > 0) {
        // Show recent logs (last 20)
        const recentLogs = response.logs.slice(-20).reverse();
        
        logContainer.innerHTML = recentLogs.map(log => 
          this.formatLogEntry(log)
        ).join('');
      } else {
        logContainer.innerHTML = '<div class="loading">No audit logs available</div>';
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      document.getElementById('audit-log').innerHTML = 
        '<div class="loading">Failed to load audit logs</div>';
    }
  }

  formatLogEntry(log) {
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    const action = log.action || 'unknown';
    const url = log.details?.url ? new URL(log.details.url).hostname : 'unknown';
    
    return `
      <div class="log-entry">
        <span class="log-timestamp">[${timestamp}]</span>
        <span class="log-action">${action}</span>
        <span class="log-url">@ ${url}</span>
      </div>
    `;
  }

  async checkPermissions() {
    try {
      // Check if we have the expected permissions
      const hasStorage = await chrome.permissions.contains({
        permissions: ['storage']
      });
      
      const hasActiveTab = await chrome.permissions.contains({
        permissions: ['activeTab']
      });

      return {
        storage: hasStorage,
        activeTab: hasActiveTab
      };
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return { error: error.message };
    }
  }

  showHealthCheckResults(results) {
    const message = `
      Health Check Results:
      - Background Script: ${results.backgroundScript ? '✓' : '✗'}
      - Content Script: ${results.contentScript ? '✓' : '✗'}
      - Storage Permission: ${results.permissions.storage ? '✓' : '✗'}
      - ActiveTab Permission: ${results.permissions.activeTab ? '✓' : '✗'}
    `;
    
    alert(message);
  }

  showSecurityScanResults(results) {
    const message = `
      Security Scan Results:
      - Protocol Secure: ${results.protocolSecure ? '✓' : '✗'}
      - Has CSP: ${results.hasCSP ? '✓' : '✗'}
      - Untrusted Scripts: ${results.hasUntrustedScripts ? '⚠️' : '✓'}
      - Insecure Forms: ${results.hasInsecureForms ? '⚠️' : '✓'}
      - Sensitive Fields: ${results.hasSensitiveFields ? '⚠️' : '✓'}
    `;
    
    alert(message);
  }

  showError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `<div class="error">${message}</div>`;
    setTimeout(() => {
      errorContainer.innerHTML = '';
    }, 5000);
  }

  showSuccess(message) {
    // Simple success feedback - in a real implementation, this might be a toast
    console.log('Success:', message);
  }

  hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
  }
}

// Initialize the popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SecurePopupManager();
});

