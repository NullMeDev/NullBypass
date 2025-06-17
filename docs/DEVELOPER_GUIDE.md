# Developer Guide: Secure Browser Extension

## Table of Contents
1. [Development Environment](#development-environment)
2. [Project Architecture](#project-architecture)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Testing Strategy](#testing-strategy)
6. [Security Guidelines](#security-guidelines)
7. [Maintenance Procedures](#maintenance-procedures)
8. [Deployment Guide](#deployment-guide)

## Development Environment

### Prerequisites
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Browser**: Chrome 88+ or Firefox 90+ for testing
- **Git**: Latest version for version control

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd projectCO-workspace

# Install dependencies
npm install

# Run initial build
npm run build:dev

# Start development mode with file watching
npm run dev
```

### Development Tools
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **Jest**: Unit testing framework
- **web-ext**: Firefox extension development tool
- **Chrome Extensions API**: Chrome development tools

### IDE Configuration

#### VS Code Extensions (Recommended)
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss"
  ]
}
```

#### Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "javascript.validate.enable": false,
  "typescript.validate.enable": false
}
```

## Project Architecture

### Directory Structure
```
projectCO-workspace/
├── assets/                 # Static assets (icons, images)
│   ├── css/               # Stylesheets
│   └── icons/             # Extension icons
├── functions/             # Core extension scripts
│   ├── background.js      # Service worker (Manifest V3)
│   ├── inject.js          # Content script
│   └── popup.js           # Popup UI logic
├── modules/               # Feature modules
│   └── autohitter/        # Automated interaction features
├── scripts/               # Build and utility scripts
│   ├── build.js          # Extension build script
│   └── zip.js            # Package creation
├── tests/                 # Test files
│   ├── extension.test.js  # Main test suite
│   └── setup.js          # Test configuration
├── docs/                  # Documentation
├── dist/                  # Built extension (generated)
├── manifest.json          # Extension manifest
├── popup.html            # Extension popup UI
├── package.json          # Project dependencies
└── README.md             # Project overview
```

### Component Architecture

#### Background Script (`background-secure.js`)
- **Purpose**: Central service worker handling extension lifecycle
- **Responsibilities**:
  - Security event logging
  - Message routing between components
  - Storage management with user consent
  - Rate limiting and origin validation
- **Key Classes**:
  - `SecurityLogger`: Audit trail management
  - `SecureStorage`: Consent-based data storage
  - `SecureMessageHandler`: Inter-component communication

#### Content Script (`content-secure.js`)
- **Purpose**: Webpage monitoring and security analysis
- **Responsibilities**:
  - DOM security monitoring
  - Form interaction analysis
  - Script injection detection
  - User activity validation
- **Key Classes**:
  - `SecureContentScript`: Main monitoring logic
  - `SecureMessageHandler`: Background communication

#### Popup Interface (`popup-secure.js`)
- **Purpose**: User interface for extension control
- **Responsibilities**:
  - Extension status display
  - User settings management
  - Audit log visualization
  - Security scan initiation
- **Key Classes**:
  - `SecurePopupManager`: UI state management

### Security Architecture

#### Permission Model
- **Minimal Permissions**: Only `activeTab` and `storage`
- **Host Restrictions**: Limited to approved domains
- **Content Security Policy**: Strict CSP for all extension pages
- **Rate Limiting**: Prevents abuse and resource exhaustion

#### Data Flow Security
```
User Action → Content Script → Background Script → Storage
     ↓              ↓              ↓              ↓
   Validation → Logging → Consent Check → Encrypted Storage
```

#### Communication Security
- Origin validation for all messages
- Message type validation
- Rate limiting per tab
- Error handling and logging

## Development Workflow

### Feature Development

#### 1. Planning Phase
- Review security implications of new features
- Document permission requirements
- Plan user consent workflow
- Design transparent logging strategy

#### 2. Implementation Phase
```bash
# Create feature branch
git checkout -b feature/security-enhancement

# Implement changes
# - Add security logging for all new functionality
# - Implement user consent where required
# - Follow coding standards
# - Add comprehensive error handling

# Test implementation
npm run test
npm run lint
npm run build:dev
```

#### 3. Testing Phase
```bash
# Run all tests
npm run test:coverage

# Manual testing in browser
npm run build:dev
# Load extension in Chrome/Firefox

# Security testing
npm run validate
```

#### 4. Review Phase
- Code review focusing on security
- Permission usage validation
- User consent flow verification
- Documentation update

### Build Process

#### Development Build
```bash
npm run build:dev
```
- Fast build for development
- No optimization
- Includes source maps
- Copies all necessary files to `dist/`

#### Production Build
```bash
npm run build:prod
```
- Full optimization
- Linting validation
- Test execution
- Package creation

#### Build Script Details (`scripts/build.js`)
```javascript
// Files copied to dist/
const filesToCopy = [
  'manifest.json',
  'popup.html',
  'functions/',
  'modules/',
  'assets/',
  'rules.json'
];

// Files excluded from build
const excludePatterns = [
  'node_modules',
  '.git',
  'dist',
  'scripts',
  'tests',
  'coverage'
];
```

### Browser Testing

#### Chrome Testing
```bash
# Build extension
npm run build:dev

# Manual loading:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select dist/ folder
```

#### Firefox Testing
```bash
# Using web-ext for automatic testing
npm run start:firefox

# Manual loading:
# 1. Build extension: npm run build:dev
# 2. Create ZIP: npm run zip
# 3. Open about:debugging
# 4. Load temporary extension
```

## Code Standards

### JavaScript Standards

#### ES6+ Features
- Use modern JavaScript (ES2021+)
- Prefer `const` and `let` over `var`
- Use arrow functions for callbacks
- Destructuring assignments where appropriate
- Template literals for string interpolation

#### Security Coding Practices
```javascript
// ✅ Good: Explicit origin validation
if (!this.isOriginAllowed(sender.origin)) {
  securityLogger.log('message_blocked', { 
    origin: sender.origin, 
    reason: 'unauthorized_origin' 
  });
  return;
}

// ✅ Good: User consent before storage
async store(key, value, requiresConsent = true) {
  if (requiresConsent && !await this.getUserConsent(`Store data: ${key}`)) {
    throw new Error('User denied storage consent');
  }
  await chrome.storage.local.set({ [key]: value });
}

// ✅ Good: Comprehensive error handling
try {
  const result = await risky_operation();
  securityLogger.log('operation_success', { operation: 'risky_operation' });
  return result;
} catch (error) {
  securityLogger.log('operation_error', { 
    operation: 'risky_operation', 
    error: error.message 
  });
  throw error;
}
```

#### Documentation Standards
```javascript
/**
 * Secure message handler with comprehensive security validation
 * 
 * @class SecureMessageHandler
 * @description Handles inter-component messages with origin validation,
 *              rate limiting, and comprehensive audit logging
 */
class SecureMessageHandler {
  /**
   * Process incoming message with security checks
   * 
   * @param {Object} message - Message payload
   * @param {Object} sender - Message sender information
   * @param {Function} sendResponse - Response callback
   * @returns {Promise<any>} Processed message response
   * @throws {Error} If message validation fails
   * 
   * @security Validates origin, implements rate limiting
   * @privacy Logs all message interactions
   */
  async handleMessage(message, sender, sendResponse) {
    // Implementation...
  }
}
```

### CSS Standards

#### Secure CSS Practices
```css
/* ✅ Good: Scoped styles for extension UI */
.extension-popup {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 400px;
  padding: 16px;
}

/* ✅ Good: No external resources */
.security-indicator {
  background: linear-gradient(135deg, #28a745, #20c997);
  /* Avoid: background: url('https://external-site.com/image.png'); */
}
```

### HTML Standards

#### Content Security Policy Compliance
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- ✅ Required: Strict CSP -->
    <meta http-equiv="Content-Security-Policy" 
          content="script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline';">
    
    <!-- ✅ Good: Inline styles allowed, external scripts blocked -->
    <style>
        /* Inline styles are permitted */
    </style>
</head>
<body>
    <!-- ✅ Good: Local script reference -->
    <script src="popup-secure.js"></script>
    
    <!-- ❌ Bad: External script would be blocked -->
    <!-- <script src="https://external-cdn.com/script.js"></script> -->
</body>
</html>
```

## Testing Strategy

### Unit Testing with Jest

#### Test Structure
```javascript
// tests/extension.test.js
describe('Chrome Extension Security', () => {
  beforeEach(() => {
    // Setup mock Chrome APIs
    global.chrome = {
      runtime: {
        sendMessage: jest.fn(),
        onMessage: { addListener: jest.fn() }
      },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
  });

  test('should validate message origins', async () => {
    const handler = new SecureMessageHandler();
    const invalidSender = { origin: 'https://malicious-site.com' };
    
    const result = await handler.handleMessage(
      { type: 'TEST' }, 
      invalidSender, 
      jest.fn()
    );
    
    expect(result).toBeUndefined(); // Should be blocked
  });
});
```

#### Security Test Cases
```javascript
describe('Security Validation', () => {
  test('should block messages from unauthorized origins', () => {
    // Test origin validation
  });

  test('should enforce rate limiting', () => {
    // Test rate limiting functionality
  });

  test('should require user consent for storage', () => {
    // Test consent mechanism
  });

  test('should log all security events', () => {
    // Test audit logging
  });
});
```

### Manual Testing

#### Security Testing Checklist
- [ ] Origin validation works correctly
- [ ] Rate limiting prevents abuse
- [ ] User consent required for storage
- [ ] All activities properly logged
- [ ] CSP prevents code injection
- [ ] No data exfiltration possible

#### Browser Testing
```bash
# Test in multiple browsers
npm run build:dev

# Chrome testing
npm run start:chrome

# Firefox testing
npm run start:firefox

# Validate extension structure
npm run validate
```

### Automated Testing

#### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Extension Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run build:prod
      - run: npm run validate
```

## Security Guidelines

### Threat Model

#### Potential Threats
1. **Code Injection**: Malicious scripts injecting into extension context
2. **Data Exfiltration**: Unauthorized access to user data
3. **Privilege Escalation**: Abuse of extension permissions
4. **CSRF Attacks**: Cross-site request forgery
5. **Storage Poisoning**: Malicious data in local storage

#### Mitigation Strategies
1. **Strict CSP**: Prevent code injection
2. **Origin Validation**: Block unauthorized communication
3. **Minimal Permissions**: Reduce attack surface
4. **User Consent**: Explicit permission for data operations
5. **Audit Logging**: Complete activity transparency

### Secure Development Practices

#### Input Validation
```javascript
// ✅ Good: Validate all inputs
function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    throw new Error('Invalid message format');
  }
  
  if (!message.type || typeof message.type !== 'string') {
    throw new Error('Missing or invalid message type');
  }
  
  // Additional validation...
}
```

#### Error Handling
```javascript
// ✅ Good: Secure error handling
try {
  await sensitiveOperation();
} catch (error) {
  // Log error without exposing sensitive details
  securityLogger.log('operation_failed', {
    operation: 'sensitive_operation',
    error: error.message, // Don't log full error object
    timestamp: Date.now()
  });
  
  // Return generic error to user
  return { error: 'Operation failed' };
}
```

#### Data Sanitization
```javascript
// ✅ Good: Sanitize data before storage
function sanitizeUserData(data) {
  return {
    theme: data.theme?.toString().slice(0, 20) || 'light',
    notifications: Boolean(data.notifications),
    // Only store known, validated fields
  };
}
```

### Security Review Process

#### Code Review Checklist
- [ ] No hardcoded credentials or secrets
- [ ] All user inputs validated
- [ ] Error handling doesn't expose sensitive information
- [ ] Origin validation implemented for all communications
- [ ] User consent obtained for all data operations
- [ ] Comprehensive logging implemented
- [ ] No external network requests
- [ ] CSP compliance verified

## Maintenance Procedures

### Regular Maintenance Tasks

#### Weekly Tasks
- Review audit logs for unusual activity
- Check for browser API deprecations
- Update dependencies with security patches
- Run full test suite
- Validate extension functionality

#### Monthly Tasks
- Security audit of all components
- Performance analysis and optimization
- Documentation updates
- User feedback review
- Competitor analysis for security features

#### Quarterly Tasks
- Complete security penetration testing
- Third-party security audit
- User consent flow review
- Permission usage analysis
- Compliance verification

### Monitoring and Alerting

#### Health Monitoring
```javascript
// Background script health check
setInterval(async () => {
  try {
    const health = await performHealthCheck();
    if (!health.healthy) {
      securityLogger.log('health_check_failed', health);
    }
  } catch (error) {
    securityLogger.log('health_check_error', { error: error.message });
  }
}, 300000); // Every 5 minutes
```

#### Error Tracking
```javascript
window.addEventListener('error', (event) => {
  securityLogger.log('javascript_error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});
```

### Update Procedures

#### Security Updates
1. **Immediate Response** for critical security issues
2. **Coordinated Disclosure** for reported vulnerabilities
3. **User Notification** for major security changes
4. **Rollback Plan** for failed updates

#### Feature Updates
1. **Feature Flags** for gradual rollout
2. **User Consent** for new permissions
3. **Backward Compatibility** maintenance
4. **Documentation Updates** with each release

## Deployment Guide

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Version number incremented
- [ ] Change log updated
- [ ] User notification prepared (if needed)

### Browser Store Submission

#### Chrome Web Store
```bash
# Build production version
npm run build:prod

# Validate package
npm run validate

# Create submission package
npm run zip

# Upload to Chrome Web Store Developer Dashboard
# - Update store listing
# - Submit for review
# - Monitor review process
```

#### Firefox Add-ons
```bash
# Build for Firefox
npm run build:dev

# Validate with web-ext
npx web-ext lint --source-dir=dist

# Package for submission
npx web-ext build --source-dir=dist

# Submit to Firefox Add-ons
# - Upload XPI file
# - Complete review questionnaire
# - Monitor review process
```

### Version Management

#### Semantic Versioning
- **Major (X.0.0)**: Breaking changes, new permissions
- **Minor (0.X.0)**: New features, non-breaking changes
- **Patch (0.0.X)**: Bug fixes, security patches

#### Release Process
```bash
# Update version
npm version patch|minor|major

# Build and test
npm run build:prod

# Tag release
git tag v$(npm list --depth=0 | grep secure-extension | cut -d@ -f2)

# Push to repository
git push && git push --tags

# Create GitHub release
gh release create v$(npm list --depth=0 | grep secure-extension | cut -d@ -f2)
```

### Post-deployment Monitoring
- Monitor error rates and user feedback
- Track extension usage and performance
- Watch for security incidents or vulnerabilities
- Prepare hotfix procedures for critical issues

---

## Development Resources

### Useful Links
- [Chrome Extension API Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox Extension API Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Web Extension Polyfill](https://github.com/mozilla/webextension-polyfill)
- [Chrome Extension Security Guide](https://developer.chrome.com/docs/extensions/mv3/security/)

### Tools and Libraries
- [web-ext](https://github.com/mozilla/web-ext): Firefox extension development
- [chrome-extension-tools](https://github.com/chrome-extension-tools): Chrome development utilities
- [jest-chrome](https://github.com/extend-chrome/jest-chrome): Chrome API mocks for testing

### Community Resources
- [Chrome Extensions Google Group](https://groups.google.com/a/chromium.org/g/chromium-extensions)
- [Firefox Add-ons Discourse](https://discourse.mozilla.org/c/add-ons/35)
- [Extension Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)

---

**Last Updated**: January 2024  
**Version**: 2.0.0  
**Maintainer**: Security Development Team

