import { Address } from 'viem';

/**
 * AppRegistry Interface (Future On-Chain Version & Security Registry)
 * Ready for reading directly from Base smart contracts when deployed.
 */
export interface AppReleaseMetadata {
  latestVersion: string;
  minimumVersion: string;
  releaseHash: `0x${string}`;
  releaseCID: string;
  mandatoryUpdate: boolean;
  releaseTimestamp: number;
  changelogUrl?: string;
}

export const APP_REGISTRY_ABI = [
  {
    inputs: [],
    name: 'getLatestRelease',
    outputs: [
      {
        components: [
          { name: 'latestVersion', type: 'string' },
          { name: 'minimumVersion', type: 'string' },
          { name: 'releaseHash', type: 'bytes32' },
          { name: 'releaseCID', type: 'string' },
          { name: 'mandatoryUpdate', type: 'bool' },
          { name: 'releaseTimestamp', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function parseSemver(version: string): [number, number, number] {
  const clean = version.replace(/^v/, '').split('-');
  const parts = clean[0].split('.').map((p) => parseInt(p, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

export function isUpdateRequired(currentVersion: string, minimumVersion: string): boolean {
  const current = parseSemver(currentVersion);
  const min = parseSemver(minimumVersion);

  if (current[0] < min[0]) return true;
  if (current[0] === min[0] && current[1] < min[1]) return true;
  if (current[0] === min[0] && current[1] === min[1] && current[2] < min[2]) return true;
  return false;
}
