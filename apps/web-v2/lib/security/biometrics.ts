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

export interface RegisteredPasskey {
  id: string; // Base64 or string ID
  name: string;
  createdAt: number;
  rawId?: string;
}

export function getSavedPasskeys(): RegisteredPasskey[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('uv_registered_passkeys');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePasskey(passkey: RegisteredPasskey): RegisteredPasskey[] {
  const current = getSavedPasskeys();
  const next = [...current.filter((p) => p.id !== passkey.id), passkey];
  localStorage.setItem('uv_registered_passkeys', JSON.stringify(next));
  return next;
}

export function removePasskey(passkeyId: string): RegisteredPasskey[] {
  const current = getSavedPasskeys();
  const next = current.filter((p) => p.id !== passkeyId);
  localStorage.setItem('uv_registered_passkeys', JSON.stringify(next));
  return next;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Creates and registers a new Passkey credential on this device.
 */
export async function registerPasskey(
  accountAddress: string = '0x0000000000000000000000000000000000000000',
  customName?: string,
): Promise<RegisteredPasskey | null> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    throw new Error('WebAuthn Passkeys are not supported on this browser or platform.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userId = new Uint8Array(16);
  window.crypto.getRandomValues(userId);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'UnifyVault V2 Protocol',
        id: window.location.hostname === 'localhost' ? 'localhost' : undefined,
      },
      user: {
        id: userId,
        name: accountAddress,
        displayName: `UnifyVault (${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)})`,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256 (P-256)
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;

  if (!credential) return null;

  const passkeyId = credential.id || bufferToBase64(credential.rawId);
  const passkeyName =
    customName?.trim() ||
    `Passkey (${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`;

  const newPasskey: RegisteredPasskey = {
    id: passkeyId,
    name: passkeyName,
    createdAt: Date.now(),
    rawId: bufferToBase64(credential.rawId),
  };

  savePasskey(newPasskey);
  return newPasskey;
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

    // 2. Standard WebAuthn User Verification Prompt (Web / Passkey)
    const savedPasskeys = getSavedPasskeys();
    const allowCredentials = savedPasskeys
      .filter((p) => p.rawId || p.id)
      .map((p) => {
        try {
          return {
            id: base64ToBuffer(p.rawId || p.id),
            type: 'public-key' as const,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as PublicKeyCredentialDescriptor[];

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'preferred',
        rpId: window.location.hostname === 'localhost' ? 'localhost' : undefined,
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      },
    });

    return !!credential;
  } catch (e) {
    console.warn('Biometric auth notice:', e);
    return false;
  }
}
