/**
 * Secure Content Script
 * 
 * This content script implements security-first principles:
 * - No automated form filling or submission
 * - No data exfiltration
 * - Transparent operation with user consent
 * - Comprehensive audit logging
 */

class SecureContentScript {
  constructor() {
    this.isInitialized = false;
    this.allowedDomains = ['example.com'];
    this.observers = [];
    
    this.init();
  }

  async init() {
    // Verify we're on an allowed domain
    if (!this.isAllowedDomain(window.location.hostname)) {
      console.warn('[SECURE EXTENSION] Not running on allowed domain:', window.location.hostname);
      return;
    }

    // Log our presence for transparency
    this.logActivity('content_script_initialized', {
      url: window.location.href,
      domain: window.location.hostname,
      userAgent: navigator.userAgent.substring(0, 100) // Truncated for privacy
    });

    this.isInitialized = true;
    this.setupEventListeners();
    this.setupSecurityMonitoring();
  }

  isAllowedDomain(hostname) {
    return this.allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  }

  setupEventListeners() {
    // Only listen for user-initiated events
    document.addEventListener('click', this.handleUserClick.bind(this), true);
    
    // Monitor for potential security threats
    this.setupSecurityEventListeners();
  }

  setupSecurityEventListeners() {
    // Monitor for suspicious script injection attempts
    const scriptObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'SCRIPT' && !node.src.startsWith(window.location.origin)) {
              this.logActivity('suspicious_script_detected', {
                src: node.src,
                content: node.textContent?.substring(0, 100)
              });
            }
          }
        });
      });
    });

    scriptObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    this.observers.push(scriptObserver);
  }

  setupSecurityMonitoring() {
    // Monitor for form submissions to detect potential automated attacks
    document.addEventListener('submit', (event) => {
      const form = event.target;
      this.logActivity('form_submission_detected', {
        action: form.action,
        method: form.method,
        fieldCount: form.elements.length,
        isUserInitiated: event.isTrusted
      });
    });

    // Monitor for sensitive data in forms
    document.addEventListener('input', (event) => {
      if (this.isSensitiveField(event.target)) {
        this.logActivity('sensitive_field_interaction', {
          fieldType: event.target.type,
          fieldName: event.target.name,
          isUserInitiated: event.isTrusted
        });
      }
    });
  }

  isSensitiveField(element) {
    if (!element || !element.type) return false;
    
    const sensitiveTypes = ['password', 'email', 'tel', 'number'];
    const sensitiveNames = ['credit', 'card', 'cvv', 'ssn', 'social'];
    
    return sensitiveTypes.includes(element.type.toLowerCase()) ||
           sensitiveNames.some(name => 
             element.name?.toLowerCase().includes(name) ||
             element.id?.toLowerCase().includes(name) ||
             element.className?.toLowerCase().includes(name)
           );
  }

  handleUserClick(event) {
    // Only process trusted user events
    if (!event.isTrusted) {
      this.logActivity('untrusted_click_detected', {
        target: event.target.tagName,
        coordinates: { x: event.clientX, y: event.clientY }
      });
      return;
    }

    const target = event.target;
    
    // Log interaction with specific elements for transparency
    if (target.tagName === 'BUTTON' || target.type === 'submit') {
      this.logActivity('user_button_click', {
        buttonText: target.textContent?.trim().substring(0, 50),
        buttonType: target.type,
        formAction: target.form?.action
      });
    }
  }

  async logActivity(action, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      details: {
        ...details,
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 100)
      }
    };

    console.log('[SECURE EXTENSION]', logEntry);

    // Send to background script for centralized logging
    try {
      await chrome.runtime.sendMessage({
        type: 'LOG_ACTIVITY',
        data: logEntry
      });
    } catch (error) {
      console.error('[SECURE EXTENSION] Failed to send log to background:', error);
    }
  }

  // Public API for legitimate extension functionality
  async getPageInfo() {
    const info = {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname,
      lastModified: document.lastModified,
      readyState: document.readyState,
      elementCount: document.querySelectorAll('*').length
    };

    this.logActivity('page_info_requested', { requestedFields: Object.keys(info) });
    return info;
  }

  async performHealthCheck() {
    const healthStatus = {
      initialized: this.isInitialized,
      domain: window.location.hostname,
      allowed: this.isAllowedDomain(window.location.hostname),
      observersActive: this.observers.length,
      timestamp: Date.now()
    };

    this.logActivity('health_check_performed', healthStatus);
    return healthStatus;
  }

  // Cleanup method
  destroy() {
    this.logActivity('content_script_destroying');
    
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isInitialized = false;
  }
}

// Message handler for background script communication
class SecureMessageHandler {
  constructor(contentScript) {
    this.contentScript = contentScript;
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Verify message is from our extension
      if (sender.id !== chrome.runtime.id) {
        console.warn('[SECURE EXTENSION] Message from unknown sender:', sender);
        return false;
      }

      this.handleMessage(message, sendResponse);
      return true; // Keep channel open for async response
    });
  }

  async handleMessage(message, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_PAGE_INFO':
          const pageInfo = await this.contentScript.getPageInfo();
          sendResponse({ success: true, data: pageInfo });
          break;

        case 'HEALTH_CHECK':
          const healthStatus = await this.contentScript.performHealthCheck();
          sendResponse({ success: true, data: healthStatus });
          break;

        case 'SECURITY_SCAN':
          const scanResults = await this.performSecurityScan();
          sendResponse({ success: true, data: scanResults });
          break;

        default:
          this.contentScript.logActivity('unknown_message_type', { type: message.type });
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      this.contentScript.logActivity('message_handler_error', { 
        type: message.type, 
        error: error.message 
      });
      sendResponse({ success: false, error: 'Internal error' });
    }
  }

  async performSecurityScan() {
    const securityInfo = {
      hasUntrustedScripts: this.checkForUntrustedScripts(),
      hasInsecureForms: this.checkForInsecureForms(),
      hasSensitiveFields: this.checkForSensitiveFields(),
      protocolSecure: window.location.protocol === 'https:',
      hasCSP: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
      timestamp: Date.now()
    };

    this.contentScript.logActivity('security_scan_performed', securityInfo);
    return securityInfo;
  }

  checkForUntrustedScripts() {
    const scripts = document.querySelectorAll('script[src]');
    return Array.from(scripts).some(script => 
      !script.src.startsWith(window.location.origin) && 
      !script.src.startsWith('https://cdn.') // Allow common CDNs
    );
  }

  checkForInsecureForms() {
    const forms = document.querySelectorAll('form');
    return Array.from(forms).some(form => 
      form.action && !form.action.startsWith('https://')
    );
  }

  checkForSensitiveFields() {
    const sensitiveSelectors = [
      'input[type="password"]',
      'input[type="email"]',
      'input[name*="credit"]',
      'input[name*="card"]',
      'input[name*="ssn"]'
    ];

    return sensitiveSelectors.some(selector => 
      document.querySelector(selector) !== null
    );
  }
}

// Initialize the secure content script
const secureContentScript = new SecureContentScript();
const messageHandler = new SecureMessageHandler(secureContentScript);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  secureContentScript.destroy();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SecureContentScript,
    SecureMessageHandler
  };
}

