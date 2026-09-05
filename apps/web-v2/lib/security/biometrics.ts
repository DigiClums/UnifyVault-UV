export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
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

    // Standard WebAuthn User Verification Prompt
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
    // If user cancelled or skipped, return gracefully
    console.warn('Biometric auth notice:', e);
    return true;
  }
}
