# Base Sepolia Transaction Log

## Status: FAILED / UNSTARTED

Live deployment to Base Sepolia was aborted due to missing environment configuration:

- **Missing RPC Endpoint:** Base Sepolia RPC URL (e.g., `RPC_URL_BASE_SEPOLIA`) is not configured.
- **Missing Credentials:** A funded private key (e.g., `PRIVATE_KEY`) holding Base Sepolia ETH is not available in the workspace environment.

As per strict release guidelines, no transaction hashes or block numbers have been fabricated.

---

## Intended Deployment Execution Plan

Once credentials and RPC configurations are supplied, run the following command to deploy and verify the contracts:

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  --tc DeployScript
```
