#!/usr/bin/env node

const targetArg = process.argv.find(arg => arg.startsWith('--platform='));
const targetPlatform = targetArg
  ? targetArg.slice('--platform='.length)
  : process.platform === 'win32'
    ? 'win'
    : process.platform === 'darwin'
      ? 'mac'
      : 'linux';

const env = process.env;
const isRequired = env.ELECTRON_SIGN_REQUIRED === 'true';
const isSkipped =
  env.ELECTRON_SKIP_SIGNING === 'true' ||
  env.CSC_IDENTITY_AUTO_DISCOVERY === 'false';

const hasPair = (linkName, passwordName) =>
  Boolean(env[linkName] && env[passwordName]);

const signingState = (() => {
  if (isSkipped) {
    return {
      configured: false,
      message:
        'Signing is disabled by ELECTRON_SKIP_SIGNING or CSC_IDENTITY_AUTO_DISCOVERY=false.',
    };
  }

  if (targetPlatform === 'win') {
    if (
      hasPair('WIN_CSC_LINK', 'WIN_CSC_KEY_PASSWORD') ||
      hasPair('CSC_LINK', 'CSC_KEY_PASSWORD')
    ) {
      return {
        configured: true,
        message:
          'Windows signing certificate variables are present. electron-builder will sign during packaging.',
      };
    }

    return {
      configured: false,
      message:
        'Windows signing variables not found. Set WIN_CSC_LINK/WIN_CSC_KEY_PASSWORD or CSC_LINK/CSC_KEY_PASSWORD to sign.',
    };
  }

  if (targetPlatform === 'mac') {
    if (hasPair('CSC_LINK', 'CSC_KEY_PASSWORD') || env.CSC_NAME) {
      return {
        configured: true,
        message:
          'macOS signing identity is configured. electron-builder will sign during packaging.',
      };
    }

    return {
      configured: false,
      message:
        'macOS signing identity not found. Set CSC_LINK/CSC_KEY_PASSWORD or CSC_NAME to sign.',
    };
  }

  return {
    configured: false,
    message:
      'Linux targets do not use electron-builder code signing. Package integrity should be handled by the distribution channel.',
  };
})();

console.log(`[signing] Target platform: ${targetPlatform}`);
console.log(`[signing] ${signingState.message}`);

if (isRequired && !signingState.configured) {
  console.error(
    '[signing] ELECTRON_SIGN_REQUIRED=true, but signing is not configured.'
  );
  process.exit(1);
}
