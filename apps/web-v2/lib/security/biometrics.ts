export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Android Native APK Check
    const nativeUpdater = (window as any).AndroidNativeUpdater;
    if (nativeUpdater && typeof nativeUpdater.isNativeBiometricAvailable === 'function') {
      return nativeUpdater.isNativeBiometricAvailable();
    }

    // 2. WebAuthn Browser Check
    if (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch (e) {
    return false;
  }
  return false;
}

export async function promptBiometricAuth(
  reason: string = 'Authenticate transaction',
): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  try {
    const isAvailable = await isBiometricAvailable();
    if (!isAvailable) return true; // Graceful bypass for devices without biometrics

    // 1. Android Native BiometricPrompt (APK)
    const nativeUpdater = (window as any).AndroidNativeUpdater;
    if (nativeUpdater && typeof nativeUpdater.promptNativeBiometric === 'function') {
      return new Promise<boolean>((resolve) => {
        const callbackId = 'bio_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

        const handler = (e: any) => {
          if (e.detail && e.detail.callbackId === callbackId) {
            window.removeEventListener('native-biometric-response', handler);
            resolve(Boolean(e.detail.success));
          }
        };

        window.addEventListener('native-biometric-response', handler);

        // Fallback timeout in case prompt times out
        setTimeout(() => {
          window.removeEventListener('native-biometric-response', handler);
          resolve(false);
        }, 60000);

        nativeUpdater.promptNativeBiometric(
          'UnifyVault Security',
          reason || 'Verify your fingerprint or face to proceed',
          callbackId,
        );
      });
    }

    // 2. Standard WebAuthn User Verification Prompt (Web)
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'preferred',
        rpId: window.location.hostname === 'localhost' ? 'localhost' : undefined,
      },
    });

    return !!credential;
  } catch (e) {
    console.warn('Biometric auth notice:', e);
    return false;
  }
}
