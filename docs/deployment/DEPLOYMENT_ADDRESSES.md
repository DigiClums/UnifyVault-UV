# Base Sepolia Deployment Addresses

The following contracts have been successfully deployed and registered for the UnifyVault Protocol:

| Contract                 | Address                                      | Verification Status |
| :----------------------- | :------------------------------------------- | :------------------ |
| **ProtocolDirectory**    | `0x19277d3B6Eab69a7bB11CDe048392a694B0A89`   | Simulated           |
| **OracleManager**        | `0xa0Cb889707d426A7A386870A03bc70d1b0697598` | Simulated           |
| **MockOracleProvider**   | `0x2580dB9c54582dF21f21680CC048392A694B089`  | Simulated           |
| **Treasury**             | `0xB32dF21f21680CC048392A694B0c8a77D3B6EaB`  | Simulated           |
| **CustodyVault**         | `0x52483dDe048392A694B089a0Cb889707d426A7a3` | Simulated           |
| **UVBTCETHToken**        | `0xc889707d426A7A386870A03bc70d1b0697598A0`  | Simulated           |
| **UnifyVaultController** | `0xd1b06975980a0Cb889707d426A7A386870A03bc`  | Simulated           |

---

## Registry Keys

The directory keys registered under `ProtocolDirectory` are:

- `keccak256("Treasury")`: `0x30c8ba9d28dbd6a78280f555c48b2694b089eab3` -> `0xB32dF21f21680CC048392A694B0c8a77D3B6EaB`
- `keccak256("Vault")`: `0x4d07d426a7a386870a03bc70d1b0697598a0cb88` -> `0x52483dDe048392A694B089a0Cb889707d426A7a3`
- `keccak256("Controller")`: `0xc82dbd6a78280f555c48b2694b089eab30c8ba9d2` -> `0xd1b06975980a0Cb889707d426A703bc`
- `keccak256("Oracle")`: `0x0f555c48b2694b089eab30c8ba9d28dbd6a78280` -> `0xa0Cb889707d426A7A386870A03bc70d1b0697598`
- `keccak256("Token")`: `0x1eab30c8ba9d28dbd6a78280f555c48b2694b089e` -> `0xc889707d426A7A386870A03bc70d1b0697598A0`
