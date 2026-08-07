// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/ProtocolDirectory.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface VmExt {
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
  function envOr(
    string calldata key,
    string calldata defaultValue
  ) external returns (string memory);
  function rpcUrl(string calldata rpcOrAlias) external returns (string memory);
  function skip(bool skip) external;
}

contract LiveSimTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  address public constant PROTOCOL_DIRECTORY = 0xDd29e54f91b86f3e4609AA2e279e04E98dcAb722;
  address public constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

  function _shouldSkip() internal returns (bool, string memory) {
    string memory rpcUrl;
    try vmExt.envOr('BASE_SEPOLIA_RPC_URL', '') returns (string memory res) {
      rpcUrl = res;
    } catch {}
    if (
      bytes(rpcUrl).length == 0 ||
      keccak256(bytes(rpcUrl)) == keccak256(bytes('${BASE_SEPOLIA_RPC_URL}'))
    ) {
      return (true, '');
    }
    return (false, rpcUrl);
  }

  function setUp() public {
    (bool skipTest, string memory rpcUrl) = _shouldSkip();
    if (skipTest) {
      vmExt.skip(true);
      return;
    }
    try vmExt.createSelectFork(rpcUrl) {} catch {
      vmExt.skip(true);
      return;
    }
  }

  function testLiveDepositAndRedeemOnFork() public {
    (bool skipTest, ) = _shouldSkip();
    if (skipTest) {
      vmExt.skip(true);
      return;
    }

    address user = address(0x1234567890123456789012345678901234567890);
    uint256 depositAmount = 10_000_000;
    deal(BASE_SEPOLIA_USDC, user, depositAmount);

    _executeLiveSim(user, depositAmount);
  }

  function _executeLiveSim(address user, uint256 depositAmount) internal {
    ProtocolDirectory directory = ProtocolDirectory(PROTOCOL_DIRECTORY);
    UnifyVaultController controller = UnifyVaultController(
      directory.getAddress(ModuleIds.DEPOSIT_MANAGER)
    );
    UVBTCETHToken token = UVBTCETHToken(directory.getAddress(ModuleIds.TOKEN));
    IERC20 usdc = IERC20(BASE_SEPOLIA_USDC);

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(BASE_SEPOLIA_USDC, depositAmount, 0, user);

    uint256 shares = token.balanceOf(user);
    assertGt(shares, 0, 'Shares should be minted');

    uint256 netAssetsOut = controller.redeem(
      BASE_SEPOLIA_USDC,
      shares,
      0,
      user,
      block.timestamp + 300
    );
    assertGt(netAssetsOut, 0, 'Net assets out should be > 0');
    assertEq(token.balanceOf(user), 0, 'Shares should be burned');
    vm.stopPrank();
  }
}
