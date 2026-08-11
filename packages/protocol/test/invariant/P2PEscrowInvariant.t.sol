// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../src/escrow/P2PEscrow.sol';
import { Errors as ProtocolErrors } from '../../src/errors/Errors.sol';
import '../../src/events/Events.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/types/EscrowTypes.sol';

contract MockERC20Invariant is ERC20 {
  constructor() ERC20('Mock Token', 'MTK') {
    _mint(msg.sender, 10_000_000 * 1e18);
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract P2PEscrowHandler is Test {
  P2PEscrow public escrow;
  MockERC20Invariant public token;

  address public seller = address(0x111);
  address public buyer = address(0x222);
  address public treasury = address(0x888);
  address public arbitrator = address(0x999);

  uint256 public activeFundedAmount;

  constructor(P2PEscrow _escrow, MockERC20Invariant _token) {
    escrow = _escrow;
    token = _token;

    token.mint(seller, 1_000_000 * 1e18);
    token.mint(buyer, 1_000_000 * 1e18);

    vm.prank(seller);
    token.approve(address(escrow), type(uint256).max);

    vm.prank(buyer);
    token.approve(address(escrow), type(uint256).max);
  }

  function createAndFundTrade(uint256 rawAmount) public {
    uint256 amount = bound(rawAmount, 100 * 1e18, 10_000 * 1e18);

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(token),
      amount: amount,
      fiatAmount: 100,
      fiatCurrency: keccak256('USD'),
      paymentWindow: 15 minutes
    });

    uint256 tradeId = escrow.createTrade(params);

    vm.prank(seller);
    escrow.fundTrade(tradeId);

    activeFundedAmount += amount;
  }
}

contract P2PEscrowInvariantTest is Test {
  P2PEscrow public escrow;
  MockERC20Invariant public token;
  P2PEscrowHandler public handler;

  address public treasury = address(0x888);
  address[] public targetContracts;

  function setUp() public {
    escrow = new P2PEscrow(treasury, 10);
    token = new MockERC20Invariant();
    handler = new P2PEscrowHandler(escrow, token);

    targetContracts.push(address(handler));
  }

  function invariant_SolvencyAndBalanceMatch() public {
    // Contract ERC20 balance must always be >= handler's active funded amount
    assertTrue(token.balanceOf(address(escrow)) >= handler.activeFundedAmount());
  }

  function invariant_FeeBpsWithinBounds() public {
    assertTrue(escrow.feeBps() <= escrow.MAX_FEE_BPS());
  }
}
