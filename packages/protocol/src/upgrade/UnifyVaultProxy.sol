// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC1967Proxy} from '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';

/**
 * @title UnifyVaultProxy
 * @notice Stable ERC-1967 proxy for the future UnifyVault production deployment.
 * @dev The proxy contains no application storage. All protocol state lives in the
 *      implementation's ERC-7201 namespaces and therefore survives implementation upgrades.
 */
contract UnifyVaultProxy is ERC1967Proxy {
  constructor(address implementation, bytes memory initializationData)
    ERC1967Proxy(implementation, initializationData)
  {}
}
