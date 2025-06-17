# API Reference Documentation

## Table of Contents
1. [Chrome Extension APIs](#chrome-extension-apis)
2. [Internal API Interfaces](#internal-api-interfaces)
3. [Message Passing API](#message-passing-api)
4. [Storage API](#storage-api)
5. [Security API](#security-api)
6. [Permission Usage](#permission-usage)

## Chrome Extension APIs

### Overview
This extension uses the Chrome Extension Manifest V3 APIs with minimal required permissions for secure operation.

### Required Permissions

#### `activeTab`
- **Purpose**: Access to the currently active tab for security monitoring
- **Usage**: Read tab information and inject content scripts on user-allowed domains
- **Security**: Only activates when user clicks the extension icon

#### `storage`
- **Purpose**: Store user preferences and audit logs locally
- **Usage**: Persistent storage for security settings and activity logs
- **Security**: All storage operations require user consent

#### Host Permissions: `https://example.com/*`
- **Purpose**: Demonstration domain for secure content script injection
- **Usage**: Content script operates only on explicitly allowed domains
- **Security**: Restricted to specific trusted domains

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://example.com/*"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'"
  }
}
```

## Internal API Interfaces

### SecurityLogger Class

#### Methods

##### `log(action, details = {})`
Records security events with timestamp and contextual information.

**Parameters:**
- `action` (string): Event type identifier
- `details` (object): Additional event context

**Returns:** void

**Example:**
```javascript
securityLogger.log('user_action', {
  type: 'button_click',
  target: 'health_check',
  timestamp: Date.now()
});
```

##### `getAuditLog()`
Retrieves complete audit log history.

**Returns:** Promise<Array<LogEntry>>

**LogEntry Structure:**
```javascript
{
  timestamp: "2024-01-01T12:00:00.000Z",
  action: "user_action",
  details: {
    url: "https://example.com/page",
    userAgent: "Mozilla/5.0..."
  }
}
```

##### `clearLogs()`
Removes all stored audit logs.

**Returns:** Promise<void>

### SecureStorage Class

#### Methods

##### `store(key, value, requiresConsent = true)`
Stores data with optional user consent requirement.

**Parameters:**
- `key` (string): Storage key
- `value` (any): Data to store
- `requiresConsent` (boolean): Whether to require user consent

**Returns:** Promise<void>

**Throws:** Error if user denies consent

**Example:**
```javascript
await secureStorage.store('userSettings', {
  theme: 'dark',
  notifications: true
}, true);
```

##### `retrieve(key)`
Retrieves stored data by key.

**Parameters:**
- `key` (string): Storage key

**Returns:** Promise<any>

**Example:**
```javascript
const settings = await secureStorage.retrieve('userSettings');
```

### SecureMessageHandler Class

#### Methods

##### `handleMessage(message, sender, sendResponse)`
Processes inter-component messages with security validation.

**Parameters:**
- `message` (object): Message payload
- `sender` (object): Message sender information
- `sendResponse` (function): Response callback

**Returns:** Promise<any>

**Security Features:**
- Origin validation
- Rate limiting (60 requests/minute per tab)
- Message type validation
- Error handling and logging

**Supported Message Types:**
- `GET_AUDIT_LOG`: Retrieve audit logs
- `CLEAR_AUDIT_LOG`: Clear all logs
- `HEALTH_CHECK`: System health status

## Message Passing API

### Background Script Messages

#### Health Check
```javascript
chrome.runtime.sendMessage({
  type: 'HEALTH_CHECK'
}).then(response => {
  // response.status === 'healthy'
  // response.timestamp
});
```

#### Get Audit Logs
```javascript
chrome.runtime.sendMessage({
  type: 'GET_AUDIT_LOG'
}).then(response => {
  // response.logs: Array<LogEntry>
});
```

#### Clear Audit Logs
```javascript
chrome.runtime.sendMessage({
  type: 'CLEAR_AUDIT_LOG'
}).then(response => {
  // response.success: boolean
});
```

### Content Script Messages

#### Get Page Information
```javascript
chrome.tabs.sendMessage(tabId, {
  type: 'GET_PAGE_INFO'
}).then(response => {
  if (response.success) {
    // response.data.title
    // response.data.url
    // response.data.domain
    // response.data.elementCount
  }
});
```

#### Security Scan
```javascript
chrome.tabs.sendMessage(tabId, {
  type: 'SECURITY_SCAN'
}).then(response => {
  if (response.success) {
    // response.data.hasUntrustedScripts
    // response.data.hasInsecureForms
    // response.data.hasSensitiveFields
    // response.data.protocolSecure
    // response.data.hasCSP
  }
});
```

#### Health Check
```javascript
chrome.tabs.sendMessage(tabId, {
  type: 'HEALTH_CHECK'
}).then(response => {
  if (response.success) {
    // response.data.initialized
    // response.data.domain
    // response.data.allowed
    // response.data.observersActive
  }
});
```

## Storage API

### Data Schema

#### Security Settings
```javascript
{
  "securitySettings": {
    "auditingEnabled": true,
    "strictMode": true,
    "consentRequired": true
  }
}
```

#### User Preferences
```javascript
{
  "userPreferences": {
    "theme": "light|dark",
    "notifications": true,
    "autoScans": false
  }
}
```

### Storage Operations

#### Save Settings
```javascript
await chrome.storage.local.set({
  'securitySettings': {
    auditingEnabled: true,
    strictMode: true,
    consentRequired: true
  }
});
```

#### Load Settings
```javascript
const result = await chrome.storage.local.get(['securitySettings']);
const settings = result.securitySettings || {};
```

## Security API

### Content Security Policy

The extension enforces strict CSP for all extension pages:

```
script-src 'self'; 
object-src 'self'; 
style-src 'self' 'unsafe-inline'
```

### Security Monitoring

#### Form Interaction Detection
```javascript
// Automatically logged when users interact with sensitive fields
{
  action: "sensitive_field_interaction",
  details: {
    fieldType: "password",
    fieldName: "user_password",
    isUserInitiated: true
  }
}
```

#### Script Injection Detection
```javascript
// Automatically logged when external scripts are detected
{
  action: "suspicious_script_detected",
  details: {
    src: "https://malicious-site.com/script.js",
    content: "eval(atob('...'))"
  }
}
```

### Rate Limiting

All message handlers implement rate limiting:
- **Window**: 60 seconds
- **Max Requests**: 60 per window per tab
- **Behavior**: Requests exceeding limit are blocked and logged

## Permission Usage

### Detailed Permission Justification

#### `activeTab`
- **When Used**: Only when user clicks extension icon or explicitly interacts
- **What's Accessed**: Current tab URL, title, and basic metadata
- **Data Retention**: Logged for audit purposes, not stored permanently
- **User Control**: Can be revoked via browser settings

#### `storage`
- **What's Stored**: User preferences, security settings, audit logs
- **Encryption**: Local browser storage (extension-scoped)
- **Data Retention**: Cleared when extension is removed
- **User Control**: Clear data via extension popup or browser settings

#### Host Permissions
- **Scope**: Limited to `https://example.com/*` for demonstration
- **Purpose**: Enable content script for security monitoring
- **Data Access**: Page structure analysis, no sensitive data extraction
- **User Control**: Can be managed via browser permission settings

### Privacy Guarantees

1. **No Data Exfiltration**: Extension does not send data to external servers
2. **Transparent Logging**: All activities are logged and user-accessible
3. **User Consent**: All storage operations require explicit consent
4. **Minimal Permissions**: Only essential permissions requested
5. **Secure Defaults**: All security features enabled by default

### Compliance

- **GDPR**: User consent required for all data processing
- **Chrome Web Store**: Complies with store policies
- **Privacy**: No tracking, analytics, or user profiling
- **Security**: Regular security audits and transparent operation

## Error Handling

### Standard Error Response Format

```javascript
{
  success: false,
  error: "Error description",
  code: "ERROR_CODE",
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

### Common Error Codes

- `PERMISSION_DENIED`: User denied required permission
- `RATE_LIMIT_EXCEEDED`: Too many requests in time window
- `INVALID_ORIGIN`: Message from unauthorized origin
- `STORAGE_ERROR`: Storage operation failed
- `CONSENT_REQUIRED`: User consent needed for operation

## Development API

### Testing Utilities

```javascript
// Check extension health
const health = await chrome.runtime.sendMessage({
  type: 'HEALTH_CHECK'
});

// Validate permissions
const permissions = await chrome.permissions.getAll();

// Test storage
await chrome.storage.local.set({test: 'value'});
const result = await chrome.storage.local.get(['test']);
```

### Debug Mode

Enable additional logging by setting:

```javascript
localStorage.setItem('extensionDebug', 'true');
```

This provides:
- Detailed console logging
- Performance metrics
- Additional security validation
- Extended audit information

