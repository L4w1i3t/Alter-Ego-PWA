# Developer Tools Protection

This document describes the developer tools protection system implemented in the ALTEREGO PWA application.

## Overview

The developer tools protection system blocks access to browser developer tools in production mode to protect the application from inspection and potential security vulnerabilities. The system includes multiple layers of protection:

1. **Keyboard Shortcut Blocking** - Prevents F12, Ctrl+Shift+I, Ctrl+Shift+J, etc.
2. **Context Menu Blocking** - Disables right-click context menu
3. **Developer Tools Detection** - Detects when dev tools are opened and responds accordingly
4. **Advanced Security Features** - Additional protection against code injection and debugging

## Features

### Basic Protection
- **F12 Key Blocking**: Prevents opening developer tools with F12
- **Keyboard Shortcuts**: Blocks Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
- **Right-Click Menu**: Disables context menu to prevent "Inspect Element"
- **Text Selection**: Optionally prevents text selection (configurable)

### Advanced Protection
- **Dev Tools Detection**: Monitors window size changes to detect dev tools opening
- **Console Disabling**: Removes console functionality in production
- **Source View Protection**: Prevents viewing page source and saving
- **Anti-Debugging**: Uses debugger statements to detect debugging attempts
- **Injection Protection**: Blocks eval() and Function constructor
- **Error Obfuscation**: Hides error details in production

## Configuration

The security system is highly configurable through `src/utils/securityConfig.ts`. You can customize behavior for different environments:

### Environment-Based Configuration

- **Development**: All security features disabled for development convenience
- **Testing/Staging**: Moderate security with some features enabled for testing
- **Production**: Full security enabled with all protection features

### Custom Configuration

You can set a custom configuration using the `REACT_APP_SECURITY_CONFIG` environment variable:

```bash
REACT_APP_SECURITY_CONFIG='{"blockDevTools":true,"showWarnings":false}'
```

### Configuration Options

```typescript
interface SecurityConfig {
  // Basic blocking
  blockDevTools: boolean;           // Master switch for dev tools blocking
  blockKeyboardShortcuts: boolean;  // Block F12, Ctrl+Shift+I, etc.
  blockContextMenu: boolean;        // Block right-click menu
  blockTextSelection: boolean;      // Prevent text selection
  detectDevToolsOpening: boolean;   // Monitor for dev tools opening
  
  // Advanced security
  disableConsole: boolean;          // Remove console functionality
  preventSourceViewing: boolean;    // Block view source, save page
  enableAntiDebugging: boolean;     // Use debugger statements
  protectAgainstInjection: boolean; // Block eval, Function constructor
  obfuscateErrors: boolean;         // Hide error details
  
  // Detection settings
  devToolsDetectionThreshold: number; // Size threshold (default: 160px)
  debuggerCheckInterval: number;      // Check interval (default: 500ms)
  
  // User experience
  showWarnings: boolean;            // Show warning notifications
  warningDuration: number;          // Warning display duration (ms)
  customWarningMessage?: string;    // Custom warning text
  
  // Response actions
  clearDataOnBreach: boolean;       // Clear storage on detection
  reloadOnDetection: boolean;       // Reload page on detection
  redirectUrl?: string;             // Redirect URL on detection
}
```

## Usage

The security system is automatically initialized based on the environment:

```typescript
// In src/index.tsx
if (isProduction) {
  // Block developer tools access
  devToolsBlocker.initializeBlocking();
  
  // Enable advanced security features
  advancedSecurity.initialize();
}
```

## Manual Control

You can manually control the security features:

```typescript
import { devToolsBlocker } from './utils/devToolsBlocker';
import { advancedSecurity } from './utils/advancedSecurity';

// Enable/disable blocking
devToolsBlocker.initializeBlocking();
devToolsBlocker.disableBlocking();

// Check status
if (devToolsBlocker.isBlockingActive()) {
  console.log('Developer tools blocking is active');
}

// Advanced security
advancedSecurity.initialize();
advancedSecurity.disable();
```

## Testing

### Development Mode
In development mode, all security features are disabled by default to allow debugging and development work.

### Testing Mode
In testing/staging environments, you can enable moderate security to test the functionality without interfering with legitimate testing activities.

### Production Mode
Full security is enabled automatically in production builds.

## Security Response Actions

When developer tools are detected, the system can:

1. **Show Warning**: Display a warning message to the user
2. **Clear Data**: Remove sensitive data from localStorage/sessionStorage
3. **Reload Page**: Automatically reload the application
4. **Redirect**: Navigate to a specific URL
5. **Block Access**: Replace page content with access denied message

## Best Practices

### For Development
- Keep security disabled in development mode
- Test security features in a staging environment
- Use browser developer tools freely during development

### For Production
- Enable full security configuration
- Monitor for security breach attempts
- Regularly update security measures
- Consider user experience when configuring responses

### For Testing
- Use moderate security settings in staging
- Test all security features before production deployment
- Verify that legitimate users aren't affected

## Limitations

### Technical Limitations
- Cannot prevent all forms of code inspection
- Advanced users may still find ways to bypass protection
- Some protection methods may impact performance
- Browser extensions might interfere with detection

### User Experience Considerations
- May interfere with accessibility tools
- Can prevent legitimate debugging by power users
- Warning messages might confuse regular users
- Text selection blocking affects user experience

## Troubleshooting

### Common Issues

1. **Security not working in development**
   - Check that NODE_ENV is set to 'production'
   - Verify configuration settings

2. **False positives in detection**
   - Adjust devToolsDetectionThreshold
   - Modify debuggerCheckInterval

3. **User experience issues**
   - Disable blockTextSelection
   - Reduce warning frequency
   - Customize warning messages

### Debugging

To debug security issues in development:

```typescript
// Temporarily enable security in development
import { devToolsBlocker } from './utils/devToolsBlocker';
devToolsBlocker.initializeBlocking();

// Check configuration
import { currentSecurityConfig } from './utils/securityConfig';
console.log('Current config:', currentSecurityConfig);
```

## Security Considerations

This protection system provides defense against casual inspection and automated tools, but determined attackers may still find ways to bypass these measures. Use this as one layer of a comprehensive security strategy that includes:

- Server-side validation
- API security
- Proper authentication and authorization
- Code obfuscation/minification
- Content Security Policy (CSP)
- Regular security audits

## Updates and Maintenance

- Regularly update detection methods
- Monitor for new bypass techniques
- Update configuration based on user feedback
- Test compatibility with new browser versions
- Review security logs and metrics
