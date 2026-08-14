// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/aa/UnifyVaultPaymaster.sol';
import '../src/aa/GasTreasury.sol';
import '../src/aa/interfaces/IPaymasterV07.sol';
import '../src/escrow/P2PEscrowV2.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/token/UVBEV2.sol';
import '../src/treasury/CostBasisManagerV2.sol';
import '../src/types/EscrowTypes.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IEntryPointV07Fresh {
  function handleOps(PackedUserOperation[] calldata ops, address payable beneficiary) external;

  function getNonce(address sender, uint192 key) external view returns (uint256 nonce);
  function getUserOpHash(PackedUserOperation calldata userOp) external view returns (bytes32);
}

contract FreshLiveSimpleAccount {
  address public owner;
  address public immutable entryPoint;

  constructor(address _entryPoint, address _owner) {
    entryPoint = _entryPoint;
    owner = _owner;
  }

  modifier onlyEntryPointOrOwner() {
    require(msg.sender == entryPoint || msg.sender == owner, 'account: not owner or entrypoint');
    _;
  }

  function execute(
    address dest,
    uint256 value,
    bytes calldata func
  ) external payable onlyEntryPointOrOwner returns (bytes memory) {
    (bool success, bytes memory result) = dest.call{ value: value }(func);
    require(success, 'account: call failed');
    return result;
  }

  function executeBatch(
    address[] calldata dests,
    uint256[] calldata values,
    bytes[] calldata funcs
  ) external payable onlyEntryPointOrOwner returns (bytes[] memory results) {
    require(
      dests.length == values.length && values.length == funcs.length,
      'account: length mismatch'
    );
    results = new bytes[](dests.length);
    for (uint256 i = 0; i < dests.length; i++) {
      (bool success, bytes memory res) = dests[i].call{ value: values[i] }(funcs[i]);
      require(success, 'account: batch call failed');
      results[i] = res;
    }
  }

  function validateUserOp(
    PackedUserOperation calldata /* userOp */,
    bytes32 /* userOpHash */,
    uint256 missingAccountFunds
  ) external returns (uint256 validationData) {
    require(msg.sender == entryPoint, 'account: not EntryPoint');
    if (missingAccountFunds > 0) {
      (bool success, ) = payable(msg.sender).call{ value: missingAccountFunds }('');
      require(success, 'account: failed to pay missing funds');
    }
    return 0; // Valid
  }

  receive() external payable {}
}

contract VerifyFreshBuyerP2PAccounting is Script {
  address public constant CANONICAL_ENTRYPOINT_V07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
  address public constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant DEPLOYED_TOKEN = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant DEPLOYED_CONTROLLER = 0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec;
  address public constant DEPLOYED_PAYMASTER = 0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6;
  address public constant DEPLOYED_ESCROW = 0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb;
  address public constant DEPLOYED_CBM = 0x57869372AFbd7b61752f2f8d3e7F37701e28517B;
  address public constant SENDER_SMART_ACCOUNT = 0x7d7a2FbCc9ee851a58B179E15f55ED83195511C0; // Seller

  function run() external {
    require(block.chainid == 84532, 'Must run on Base Sepolia (84532)');
    address relayer = msg.sender;
    IEntryPointV07Fresh entryPoint = IEntryPointV07Fresh(CANONICAL_ENTRYPOINT_V07);
    UVBEV2 uvbe = UVBEV2(DEPLOYED_TOKEN);
    CostBasisManagerV2 cbm = CostBasisManagerV2(DEPLOYED_CBM);
    P2PEscrowV2 escrow = P2PEscrowV2(payable(DEPLOYED_ESCROW));
    UnifyVaultPaymaster paymaster = UnifyVaultPaymaster(payable(DEPLOYED_PAYMASTER));
    IERC20 usdc = IERC20(BASE_SEPOLIA_USDC);

    console.log('=== PHASE 2B-2: DEDICATED FRESH BUYER P2P ACCOUNTING & REDEEM VERIFICATION ===');
    console.log('Chain ID:', block.chainid);
    console.log('Relayer EOA:', relayer);
    console.log('Seller Smart Account:', SENDER_SMART_ACCOUNT);

    vm.startBroadcast();

    // 1. Deploy Fresh Buyer Smart Account with completely clean initial state
    uint256 freshKey = uint256(
      keccak256(abi.encodePacked(block.timestamp, block.prevrandao, 'FRESH_BUYER_P2P'))
    );
    address freshEOA = vm.addr(freshKey);
    FreshLiveSimpleAccount freshBuyer = new FreshLiveSimpleAccount(
      CANONICAL_ENTRYPOINT_V07,
      freshEOA
    );
    address freshBuyerAddr = address(freshBuyer);

    console.log('Fresh Buyer EOA:', freshEOA);
    console.log('Fresh Buyer Smart Account:', freshBuyerAddr);

    // Initial Pre-State Assertions
    console.log('\n--- 2. Initial Pre-State of Fresh Buyer ---');
    uint256 initialBuyerEth = freshBuyerAddr.balance;
    uint256 initialBuyerUVBE = uvbe.balanceOf(freshBuyerAddr);
    uint256 initialBuyerBasis = cbm.costBasis(freshBuyerAddr);
    int256 initialBuyerPnL = cbm.realizedPnL(freshBuyerAddr);
    uint256 totalSupplyBefore = uvbe.totalSupply();
    uint256 sellerBasisBefore = cbm.costBasis(SENDER_SMART_ACCOUNT);

    console.log('Fresh Buyer Initial ETH:', initialBuyerEth);
    console.log('Fresh Buyer Initial UVBE:', initialBuyerUVBE);
    console.log('Fresh Buyer Initial Cost Basis:', initialBuyerBasis);
    console.log('Fresh Buyer Initial Realized P&L:');
    console.logInt(initialBuyerPnL);
    console.log('Total Supply Initial:', totalSupplyBefore);
    console.log('Seller Cost Basis Initial:', sellerBasisBefore);

    require(initialBuyerEth == 0, 'Buyer ETH must be strictly 0');
    require(initialBuyerUVBE == 0, 'Buyer UVBE must be strictly 0');
    require(initialBuyerBasis == 0, 'Buyer Cost Basis must be strictly $0');
    require(initialBuyerPnL == 0, 'Buyer P&L must be strictly $0');

    // Refill Paymaster if needed
    if (paymaster.getDeposit() < 0.005 ether) {
      paymaster.deposit{ value: 0.01 ether }();
    }

    if (!paymaster.approvedTargets(DEPLOYED_CONTROLLER)) {
      paymaster.setApprovedTarget(DEPLOYED_CONTROLLER, true);
    }
    paymaster.setApprovedSelector(DEPLOYED_CONTROLLER, UnifyVaultController.redeem.selector, true);

    // =========================================================================
    // STEP 1: Seller creates trade for Fresh Buyer (0.005 UVBE for 50 INR)
    // =========================================================================
    console.log('\n--- STEP 1: Gasless createTrade for Fresh Buyer ---');
    uint256 tradeAmount = 0.005 ether;
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: freshBuyerAddr,
      seller: SENDER_SMART_ACCOUNT,
      asset: DEPLOYED_TOKEN,
      amount: tradeAmount,
      fiatAmount: 50 * 1e2, // 50.00 INR
      fiatCurrency: keccak256('INR'),
      paymentWindow: 3600
    });

    bytes memory createTradeFunc = abi.encodeWithSelector(escrow.createTrade.selector, params);
    bytes memory sellerCreateCall = abi.encodeWithSignature(
      'execute(address,uint256,bytes)',
      DEPLOYED_ESCROW,
      uint256(0),
      createTradeFunc
    );

    PackedUserOperation memory userOp1;
    userOp1.sender = SENDER_SMART_ACCOUNT;
    userOp1.nonce = entryPoint.getNonce(SENDER_SMART_ACCOUNT, 0);
    userOp1.initCode = '';
    userOp1.callData = sellerCreateCall;
    userOp1.accountGasLimits = bytes32(abi.encodePacked(uint128(300_000), uint128(600_000)));
    userOp1.preVerificationGas = 100_000;
    userOp1.gasFees = bytes32(abi.encodePacked(uint128(1 gwei), uint128(1 gwei)));
    userOp1.paymasterAndData = abi.encodePacked(
      DEPLOYED_PAYMASTER,
      uint128(150_000),
      uint128(150_000)
    );
    userOp1.signature = hex'01';

    bytes32 userOp1Hash = entryPoint.getUserOpHash(userOp1);
    console.log('UserOp 1 Hash (createTrade):');
    console.logBytes32(userOp1Hash);

    PackedUserOperation[] memory ops1 = new PackedUserOperation[](1);
    ops1[0] = userOp1;
    entryPoint.handleOps(ops1, payable(relayer));

    uint256 tradeId = escrow.totalTrades();
    console.log('Trade Created! Trade ID:', tradeId);

    // =========================================================================
    // STEP 2: Seller funds trade (2-call batch: UVBE.approve + P2PEscrow.fundTrade)
    // =========================================================================
    console.log('\n--- STEP 2: Gasless fundTrade by Seller ---');
    address[] memory dests = new address[](2);
    uint256[] memory values = new uint256[](2);
    bytes[] memory funcs = new bytes[](2);

    dests[0] = DEPLOYED_TOKEN;
    values[0] = 0;
    funcs[0] = abi.encodeWithSelector(IERC20.approve.selector, DEPLOYED_ESCROW, tradeAmount);

    dests[1] = DEPLOYED_ESCROW;
    values[1] = 0;
    funcs[1] = abi.encodeWithSelector(escrow.fundTrade.selector, tradeId);

    bytes memory sellerFundCall = abi.encodeWithSignature(
      'executeBatch(address[],uint256[],bytes[])',
      dests,
      values,
      funcs
    );

    PackedUserOperation memory userOp2;
    userOp2.sender = SENDER_SMART_ACCOUNT;
    userOp2.nonce = entryPoint.getNonce(SENDER_SMART_ACCOUNT, 0);
    userOp2.initCode = '';
    userOp2.callData = sellerFundCall;
    userOp2.accountGasLimits = bytes32(abi.encodePacked(uint128(300_000), uint128(600_000)));
    userOp2.preVerificationGas = 100_000;
    userOp2.gasFees = bytes32(abi.encodePacked(uint128(1 gwei), uint128(1 gwei)));
    userOp2.paymasterAndData = abi.encodePacked(
      DEPLOYED_PAYMASTER,
      uint128(150_000),
      uint128(150_000)
    );
    userOp2.signature = hex'01';

    bytes32 userOp2Hash = entryPoint.getUserOpHash(userOp2);
    console.log('UserOp 2 Hash (fundTrade batch):');
    console.logBytes32(userOp2Hash);

    PackedUserOperation[] memory ops2 = new PackedUserOperation[](1);
    ops2[0] = userOp2;
    entryPoint.handleOps(ops2, payable(relayer));
    console.log('Trade Funded!');

    // =========================================================================
    // STEP 3: Fresh Buyer submits payment evidence
    // =========================================================================
    console.log('\n--- STEP 3: Gasless submitPayment by Fresh Buyer ---');
    bytes32 paymentRef = keccak256('FRESH-BUYER-UTR-883311');
    bytes32 evidenceHash = keccak256('FRESH-BUYER-EVIDENCE-PROOF-5566');

    bytes memory submitPaymentFunc = abi.encodeWithSelector(
      escrow.submitPayment.selector,
      tradeId,
      paymentRef,
      evidenceHash
    );

    bytes memory buyerSubmitCall = abi.encodeWithSignature(
      'execute(address,uint256,bytes)',
      DEPLOYED_ESCROW,
      uint256(0),
      submitPaymentFunc
    );

    PackedUserOperation memory userOp3;
    userOp3.sender = freshBuyerAddr;
    userOp3.nonce = entryPoint.getNonce(freshBuyerAddr, 0);
    userOp3.initCode = '';
    userOp3.callData = buyerSubmitCall;
    userOp3.accountGasLimits = bytes32(abi.encodePacked(uint128(300_000), uint128(600_000)));
    userOp3.preVerificationGas = 100_000;
    userOp3.gasFees = bytes32(abi.encodePacked(uint128(1 gwei), uint128(1 gwei)));
    userOp3.paymasterAndData = abi.encodePacked(
      DEPLOYED_PAYMASTER,
      uint128(150_000),
      uint128(150_000)
    );
    userOp3.signature = hex'01';

    bytes32 userOp3Hash = entryPoint.getUserOpHash(userOp3);
    console.log('UserOp 3 Hash (submitPayment):');
    console.logBytes32(userOp3Hash);

    PackedUserOperation[] memory ops3 = new PackedUserOperation[](1);
    ops3[0] = userOp3;
    entryPoint.handleOps(ops3, payable(relayer));
    console.log('Payment Evidence Submitted!');

    // =========================================================================
    // STEP 4: Seller confirms and releases escrow to Fresh Buyer
    // =========================================================================
    console.log('\n--- STEP 4: Gasless confirmAndRelease by Seller ---');
    bytes memory releaseFunc = abi.encodeWithSelector(escrow.confirmAndRelease.selector, tradeId);
    bytes memory sellerReleaseCall = abi.encodeWithSignature(
      'execute(address,uint256,bytes)',
      DEPLOYED_ESCROW,
      uint256(0),
      releaseFunc
    );

    PackedUserOperation memory userOp4;
    userOp4.sender = SENDER_SMART_ACCOUNT;
    userOp4.nonce = entryPoint.getNonce(SENDER_SMART_ACCOUNT, 0);
    userOp4.initCode = '';
    userOp4.callData = sellerReleaseCall;
    userOp4.accountGasLimits = bytes32(abi.encodePacked(uint128(300_000), uint128(600_000)));
    userOp4.preVerificationGas = 100_000;
    userOp4.gasFees = bytes32(abi.encodePacked(uint128(1 gwei), uint128(1 gwei)));
    userOp4.paymasterAndData = abi.encodePacked(
      DEPLOYED_PAYMASTER,
      uint128(150_000),
      uint128(150_000)
    );
    userOp4.signature = hex'01';

    bytes32 userOp4Hash = entryPoint.getUserOpHash(userOp4);
    console.log('UserOp 4 Hash (confirmAndRelease):');
    console.logBytes32(userOp4Hash);

    PackedUserOperation[] memory ops4 = new PackedUserOperation[](1);
    ops4[0] = userOp4;
    entryPoint.handleOps(ops4, payable(relayer));
    console.log('Escrow Released to Fresh Buyer!');

    // =========================================================================
    // STEP 5: Verify Post-P2P Invariants for Fresh Buyer
    // =========================================================================
    console.log('\n--- STEP 5: Verifying Post-P2P Invariants for Fresh Buyer ---');
    uint256 buyerUvbePostP2P = uvbe.balanceOf(freshBuyerAddr);
    uint256 buyerBasisPostP2P = cbm.costBasis(freshBuyerAddr);
    int256 buyerPnLPostP2P = cbm.realizedPnL(freshBuyerAddr);
    uint256 sellerBasisPostP2P = cbm.costBasis(SENDER_SMART_ACCOUNT);
    uint256 totalSupplyPostP2P = uvbe.totalSupply();

    console.log('Fresh Buyer UVBE Balance Post-P2P:', buyerUvbePostP2P);
    console.log('Fresh Buyer Cost Basis Post-P2P:', buyerBasisPostP2P);
    console.log('Fresh Buyer Realized P&L Post-P2P:');
    console.logInt(buyerPnLPostP2P);
    console.log('Seller Cost Basis Post-P2P:', sellerBasisPostP2P);
    console.log('Total Supply Post-P2P:', totalSupplyPostP2P);

    require(buyerUvbePostP2P == 0.00495 ether, 'Fresh Buyer must hold 0.00495 UVBE');
    require(buyerBasisPostP2P == 0, 'Fresh Buyer cost basis must remain strictly $0.00 USD');
    require(buyerPnLPostP2P == 0, 'Fresh Buyer realized P&L must remain strictly $0.00 USD');
    require(sellerBasisPostP2P == sellerBasisBefore, 'Seller basis must not be mutated');
    require(totalSupplyPostP2P == totalSupplyBefore, 'Total supply must not be mutated');

    // =========================================================================
    // STEP 6: Execute Redemption of P2P-Acquired UVBE by Fresh Buyer
    // =========================================================================
    console.log('\n--- STEP 6: Executing Redemption of P2P-Acquired UVBE Shares ---');
    address[] memory redeemDests = new address[](2);
    uint256[] memory redeemValues = new uint256[](2);
    bytes[] memory redeemFuncs = new bytes[](2);

    redeemDests[0] = DEPLOYED_TOKEN;
    redeemValues[0] = 0;
    redeemFuncs[0] = abi.encodeWithSelector(
      IERC20.approve.selector,
      DEPLOYED_CONTROLLER,
      buyerUvbePostP2P
    );

    redeemDests[1] = DEPLOYED_CONTROLLER;
    redeemValues[1] = 0;
    redeemFuncs[1] = abi.encodeWithSelector(
      UnifyVaultController.redeem.selector,
      BASE_SEPOLIA_USDC,
      buyerUvbePostP2P,
      uint256(0),
      freshBuyerAddr,
      block.timestamp + 3600
    );

    bytes memory buyerRedeemCall = abi.encodeWithSignature(
      'executeBatch(address[],uint256[],bytes[])',
      redeemDests,
      redeemValues,
      redeemFuncs
    );

    PackedUserOperation memory userOp5;
    userOp5.sender = freshBuyerAddr;
    userOp5.nonce = entryPoint.getNonce(freshBuyerAddr, 0);
    userOp5.initCode = '';
    userOp5.callData = buyerRedeemCall;
    userOp5.accountGasLimits = bytes32(abi.encodePacked(uint128(300_000), uint128(2_000_000)));
    userOp5.preVerificationGas = 100_000;
    userOp5.gasFees = bytes32(abi.encodePacked(uint128(1 gwei), uint128(1 gwei)));
    userOp5.paymasterAndData = abi.encodePacked(
      DEPLOYED_PAYMASTER,
      uint128(200_000),
      uint128(200_000)
    );
    userOp5.signature = hex'01';

    bytes32 userOp5Hash = entryPoint.getUserOpHash(userOp5);
    console.log('UserOp 5 Hash (Redeem batch):');
    console.logBytes32(userOp5Hash);

    PackedUserOperation[] memory ops5 = new PackedUserOperation[](1);
    ops5[0] = userOp5;
    entryPoint.handleOps(ops5, payable(relayer));
    console.log('Redemption Executed Successfully!');

    vm.stopBroadcast();

    // =========================================================================
    // STEP 7: Verify Post-Redemption Accounting Calculations
    // =========================================================================
    console.log('\n=== VERIFYING POST-REDEMPTION FORMULAS ON BASE SEPOLIA ===');
    uint256 buyerUsdcPostRedeem = usdc.balanceOf(freshBuyerAddr);
    uint256 buyerUvbePostRedeem = uvbe.balanceOf(freshBuyerAddr);
    uint256 buyerBasisPostRedeem = cbm.costBasis(freshBuyerAddr);
    int256 buyerPnLPostRedeem = cbm.realizedPnL(freshBuyerAddr);

    console.log('USDC Received by Fresh Buyer (grossAssetsUSD):', buyerUsdcPostRedeem);
    console.log('Remaining UVBE Shares:', buyerUvbePostRedeem);
    console.log('Fresh Buyer Cost Basis Post-Redeem:', buyerBasisPostRedeem);
    console.log('Fresh Buyer Realized P&L Post-Redeem:');
    console.logInt(buyerPnLPostRedeem);

    require(buyerUsdcPostRedeem > 0, 'Buyer must have received USDC collateral upon redemption');
    require(buyerUvbePostRedeem == 0, 'All P2P shares redeemed');
    require(buyerBasisPostRedeem == 0, 'Cost basis remains 0');
    require(
      buyerPnLPostRedeem == int256(buyerUsdcPostRedeem * 1e12),
      'Realized PnL must exactly equal grossAssetsUSD in 1e18'
    );

    console.log('=== ACCOUNTING EDGE CASE 100% VERIFIED ON BASE SEPOLIA! ===');
  }
}
