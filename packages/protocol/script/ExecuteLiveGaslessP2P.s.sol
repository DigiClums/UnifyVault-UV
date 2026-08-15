// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/aa/UnifyVaultPaymaster.sol';
import '../src/aa/GasTreasury.sol';
import '../src/aa/interfaces/IPaymasterV07.sol';
import '../src/escrow/P2PEscrowV2.sol';
import '../src/token/UVBEV2.sol';
import '../src/treasury/CostBasisManagerV2.sol';
import '../src/types/EscrowTypes.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IEntryPointV07P2P {
  function handleOps(PackedUserOperation[] calldata ops, address payable beneficiary) external;

  function getNonce(address sender, uint192 key) external view returns (uint256 nonce);
  function getUserOpHash(PackedUserOperation calldata userOp) external view returns (bytes32);
  function balanceOf(address account) external view returns (uint256);
}

interface ISimpleAccountP2P {
  function execute(
    address dest,
    uint256 value,
    bytes calldata func
  ) external payable returns (bytes memory);

  function executeBatch(
    address[] calldata dests,
    uint256[] calldata values,
    bytes[] calldata funcs
  ) external payable returns (bytes[] memory);
}

contract ExecuteLiveGaslessP2P is Script {
  address public constant CANONICAL_ENTRYPOINT_V07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
  address public constant DEPLOYED_TOKEN = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant DEPLOYED_PAYMASTER = 0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6;
  address public constant DEPLOYED_TREASURY = 0xd5f1f9a7790c67776d6542618a2B81E592750e3D;
  address public constant DEPLOYED_ESCROW = 0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb;
  address public constant DEPLOYED_CBM = 0x57869372AFbd7b61752f2f8d3e7F37701e28517B;
  address public constant SENDER_SMART_ACCOUNT = 0x7d7a2FbCc9ee851a58B179E15f55ED83195511C0; // Seller
  address public constant RECIPIENT_SMART_ACCOUNT = 0x63b81Fc51688F89b479f90f08b09510D62cB9B18; // Buyer

  function run() external {
    require(block.chainid == 84532, 'Must run on Base Sepolia (84532)');
    address relayer = msg.sender;
    IEntryPointV07P2P entryPoint = IEntryPointV07P2P(CANONICAL_ENTRYPOINT_V07);
    UVBEV2 uvbe = UVBEV2(DEPLOYED_TOKEN);
    CostBasisManagerV2 cbm = CostBasisManagerV2(DEPLOYED_CBM);
    P2PEscrowV2 escrow = P2PEscrowV2(payable(DEPLOYED_ESCROW));
    UnifyVaultPaymaster paymaster = UnifyVaultPaymaster(payable(DEPLOYED_PAYMASTER));

    console.log('=== PHASE 2B-2 LIVE BASE SEPOLIA GASLESS P2P EXECUTION ===');
    console.log('Chain ID:', block.chainid);
    console.log('Relayer EOA:', relayer);
    console.log('Seller Smart Account:', SENDER_SMART_ACCOUNT);
    console.log('Buyer Smart Account:', RECIPIENT_SMART_ACCOUNT);
    console.log('P2PEscrow Address:', DEPLOYED_ESCROW);

    // Initial Pre-flight checks
    require(SENDER_SMART_ACCOUNT.balance == 0, 'Seller ETH must be strictly 0');
    require(RECIPIENT_SMART_ACCOUNT.balance == 0, 'Buyer ETH must be strictly 0');

    uint256 sellerUVBEBefore = uvbe.balanceOf(SENDER_SMART_ACCOUNT);
    uint256 buyerUVBEBefore = uvbe.balanceOf(RECIPIENT_SMART_ACCOUNT);
    uint256 totalSupplyBefore = uvbe.totalSupply();
    uint256 sellerBasisBefore = cbm.costBasis(SENDER_SMART_ACCOUNT);
    uint256 buyerBasisBefore = cbm.costBasis(RECIPIENT_SMART_ACCOUNT);

    console.log('Seller UVBE Initial:', sellerUVBEBefore);
    console.log('Buyer UVBE Initial:', buyerUVBEBefore);
    console.log('Total Supply Initial:', totalSupplyBefore);
    console.log('Seller Cost Basis Initial:', sellerBasisBefore);
    console.log('Buyer Cost Basis Initial:', buyerBasisBefore);

    vm.startBroadcast();

    // 1. Configure Paymaster Approved Target & Selectors for P2PEscrow if needed
    if (!paymaster.approvedTargets(DEPLOYED_ESCROW)) {
      console.log('Configuring Paymaster whitelisting for P2PEscrow...');
      paymaster.setApprovedTarget(DEPLOYED_ESCROW, true);
    }
    // Selectors
    paymaster.setApprovedSelector(DEPLOYED_ESCROW, escrow.createTrade.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_ESCROW, escrow.fundTrade.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_ESCROW, escrow.submitPayment.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_ESCROW, escrow.confirmAndRelease.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_ESCROW, escrow.refund.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_ESCROW, escrow.cancelUnfundedTrade.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_ESCROW, escrow.raiseDispute.selector, true);

    // Ensure Paymaster has adequate deposit on EntryPoint
    if (paymaster.getDeposit() < 0.01 ether) {
      console.log('Refilling Paymaster deposit from GasTreasury...');
      GasTreasury treasury = GasTreasury(payable(DEPLOYED_TREASURY));
      treasury.refillPaymaster(0.05 ether);
    }

    // ==========================================
    // STEP 1: Gasless createTrade by Seller
    // ==========================================
    console.log('\n--- STEP 1: Gasless createTrade by Seller ---');
    uint256 tradeAmount = 0.01 ether; // 0.01 UVBE
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: RECIPIENT_SMART_ACCOUNT,
      seller: SENDER_SMART_ACCOUNT,
      asset: DEPLOYED_TOKEN,
      amount: tradeAmount,
      fiatAmount: 100 * 1e2, // 100.00 INR
      fiatCurrency: keccak256('INR'),
      paymentWindow: 3600
    });

    bytes memory createTradeFunc = abi.encodeWithSelector(escrow.createTrade.selector, params);
    bytes memory sellerCreateCallData = abi.encodeWithSignature(
      'execute(address,uint256,bytes)',
      DEPLOYED_ESCROW,
      uint256(0),
      createTradeFunc
    );

    PackedUserOperation memory userOp1;
    userOp1.sender = SENDER_SMART_ACCOUNT;
    userOp1.nonce = entryPoint.getNonce(SENDER_SMART_ACCOUNT, 0);
    userOp1.initCode = '';
    userOp1.callData = sellerCreateCallData;
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

    // ==========================================
    // STEP 2: Gasless fundTrade by Seller (Batch Approve + Fund)
    // ==========================================
    console.log('\n--- STEP 2: Gasless fundTrade (Batch Approve + Fund) by Seller ---');
    address[] memory dests = new address[](2);
    uint256[] memory values = new uint256[](2);
    bytes[] memory funcs = new bytes[](2);

    dests[0] = DEPLOYED_TOKEN;
    values[0] = 0;
    funcs[0] = abi.encodeWithSelector(IERC20.approve.selector, DEPLOYED_ESCROW, tradeAmount);

    dests[1] = DEPLOYED_ESCROW;
    values[1] = 0;
    funcs[1] = abi.encodeWithSelector(escrow.fundTrade.selector, tradeId);

    bytes memory sellerFundCallData = abi.encodeWithSignature(
      'executeBatch(address[],uint256[],bytes[])',
      dests,
      values,
      funcs
    );

    PackedUserOperation memory userOp2;
    userOp2.sender = SENDER_SMART_ACCOUNT;
    userOp2.nonce = entryPoint.getNonce(SENDER_SMART_ACCOUNT, 0);
    userOp2.initCode = '';
    userOp2.callData = sellerFundCallData;
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

    // ==========================================
    // STEP 3: Gasless submitPayment by Buyer
    // ==========================================
    console.log('\n--- STEP 3: Gasless submitPayment by Buyer ---');
    bytes32 paymentRef = keccak256('BASE-SEPOLIA-UTR-998877');
    bytes32 evidenceHash = keccak256('IPFS-RECEIPT-PROOF-HASH-1122');

    bytes memory submitPaymentFunc = abi.encodeWithSelector(
      escrow.submitPayment.selector,
      tradeId,
      paymentRef,
      evidenceHash
    );

    bytes memory buyerSubmitCallData = abi.encodeWithSignature(
      'execute(address,uint256,bytes)',
      DEPLOYED_ESCROW,
      uint256(0),
      submitPaymentFunc
    );

    PackedUserOperation memory userOp3;
    userOp3.sender = RECIPIENT_SMART_ACCOUNT;
    userOp3.nonce = entryPoint.getNonce(RECIPIENT_SMART_ACCOUNT, 0);
    userOp3.initCode = '';
    userOp3.callData = buyerSubmitCallData;
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
    console.log('Payment Reference Submitted!');

    // ==========================================
    // STEP 4: Gasless confirmAndRelease by Seller
    // ==========================================
    console.log('\n--- STEP 4: Gasless confirmAndRelease by Seller ---');
    bytes memory releaseFunc = abi.encodeWithSelector(escrow.confirmAndRelease.selector, tradeId);
    bytes memory sellerReleaseCallData = abi.encodeWithSignature(
      'execute(address,uint256,bytes)',
      DEPLOYED_ESCROW,
      uint256(0),
      releaseFunc
    );

    PackedUserOperation memory userOp4;
    userOp4.sender = SENDER_SMART_ACCOUNT;
    userOp4.nonce = entryPoint.getNonce(SENDER_SMART_ACCOUNT, 0);
    userOp4.initCode = '';
    userOp4.callData = sellerReleaseCallData;
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
    console.log('Escrow Released Successfully!');

    vm.stopBroadcast();

    // ==========================================
    // STEP 5: Verify Invariants Post-Execution
    // ==========================================
    console.log('\n=== VERIFYING POST-P2P INVARIANTS ON BASE SEPOLIA ===');
    uint256 sellerUVBEAfter = uvbe.balanceOf(SENDER_SMART_ACCOUNT);
    uint256 buyerUVBEAfter = uvbe.balanceOf(RECIPIENT_SMART_ACCOUNT);
    uint256 totalSupplyAfter = uvbe.totalSupply();
    uint256 sellerBasisAfter = cbm.costBasis(SENDER_SMART_ACCOUNT);
    uint256 buyerBasisAfter = cbm.costBasis(RECIPIENT_SMART_ACCOUNT);

    console.log('Seller UVBE After:', sellerUVBEAfter);
    console.log('Buyer UVBE After:', buyerUVBEAfter);
    console.log('Seller ETH After:', SENDER_SMART_ACCOUNT.balance);
    console.log('Buyer ETH After:', RECIPIENT_SMART_ACCOUNT.balance);
    console.log('Total Supply After:', totalSupplyAfter);
    console.log('Seller Basis After:', sellerBasisAfter);
    console.log('Buyer Basis After:', buyerBasisAfter);

    require(SENDER_SMART_ACCOUNT.balance == 0, 'Seller ETH must remain strictly 0');
    require(RECIPIENT_SMART_ACCOUNT.balance == 0, 'Buyer ETH must remain strictly 0');
    require(totalSupplyAfter == totalSupplyBefore, 'Total supply must remain strictly constant');
    require(
      sellerBasisAfter == sellerBasisBefore,
      'Seller basis must not be mutated by P2P escrow'
    );
    require(buyerBasisAfter == buyerBasisBefore, 'Buyer basis must not be mutated by P2P escrow');
    require(cbm.realizedPnL(SENDER_SMART_ACCOUNT) == 0, 'Zero P&L for seller');
    require(cbm.realizedPnL(RECIPIENT_SMART_ACCOUNT) == 0, 'Zero P&L for buyer');

    console.log('=== ALL BASE SEPOLIA P2P GASLESS INVARIANTS VERIFIED! ===');
  }
}
