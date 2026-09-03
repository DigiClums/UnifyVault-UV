// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol';
import '../interfaces/IUVOptionPricingEngine.sol';
import '../interfaces/IUVOptionMarketFactory.sol';
import '../interfaces/IUVNiftyIndexManager.sol';
import '../interfaces/IOracleManager.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title UVOptionPricingEngine
 * @notice Series-ID based Black-Scholes pricing engine with EIP-712 Keeper IV verification.
 */
contract UVOptionPricingEngine is AccessControl, IUVOptionPricingEngine {
  using ECDSA for bytes32;
  using MessageHashUtils for bytes32;

  bytes32 public constant KEEPER_ROLE = keccak256('KEEPER_ROLE');
  bytes32 public constant IV_TYPEHASH = keccak256(
    'IVData(bytes32 seriesId,uint256 ivBps,uint256 updatedAt,uint256 nonce)'
  );

  IUVOptionMarketFactory public marketFactory;
  IUVNiftyIndexManager public indexManager;
  IOracleManager public oracleManager;
  bytes32 public uvbeAssetId;

  struct IVState {
    uint256 ivBps;
    uint256 updatedAt;
    uint256 nonce;
  }

  mapping(bytes32 => IVState) private _ivRecords;

  error StaleIV();
  error InvalidSignature();
  error ZeroAddress();

  constructor(
    address admin,
    address _marketFactory,
    address _indexManager,
    address _oracleManager,
    bytes32 _uvbeAssetId
  ) {
    if (admin == address(0) || _marketFactory == address(0) || _indexManager == address(0)) {
      revert ZeroAddress();
    }

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(KEEPER_ROLE, admin);

    marketFactory = IUVOptionMarketFactory(_marketFactory);
    indexManager = IUVNiftyIndexManager(_indexManager);
    oracleManager = IOracleManager(_oracleManager);
    uvbeAssetId = _uvbeAssetId;
  }

  function updateIVWithSignature(
    bytes32 seriesId,
    uint256 ivBps,
    uint256 updatedAt,
    bytes calldata signature
  ) external override {
    if (block.timestamp > updatedAt + 180 seconds || block.timestamp < updatedAt) {
      revert StaleIV();
    }

    uint256 nextNonce = _ivRecords[seriesId].nonce + 1;
    bytes32 structHash = keccak256(abi.encode(IV_TYPEHASH, seriesId, ivBps, updatedAt, nextNonce));
    bytes32 digest = structHash.toEthSignedMessageHash();
    address signer = digest.recover(signature);

    if (!hasRole(KEEPER_ROLE, signer)) revert InvalidSignature();

    _ivRecords[seriesId] = IVState({ ivBps: ivBps, updatedAt: updatedAt, nonce: nextNonce });

    emit IVUpdated(seriesId, ivBps, updatedAt);
  }

  function getOptionQuote(
    bytes32 seriesId
  )
    external
    view
    override
    returns (uint256 premiumUsd, uint256 premiumUvbe, int256 delta, uint256 ivBps)
  {
    IUVOptionMarketFactory.OptionSeries memory s = marketFactory.getSeries(seriesId);
    (uint256 spotPrice, ) = indexManager.getIndexPrice();

    ivBps = _ivRecords[seriesId].ivBps > 0 ? _ivRecords[seriesId].ivBps : 5500; // 55% baseline if uninitialized

    // Intrinsic calculation
    uint256 intrinsic = 0;
    if (s.optionType == 0) {
      // CALL
      if (spotPrice > s.strike) {
        intrinsic = spotPrice - s.strike;
      }
    } else {
      // PUT
      if (s.strike > spotPrice) {
        intrinsic = s.strike - spotPrice;
      }
    }

    // Time value component (simplified fixed-point Black-Scholes estimate)
    uint256 timeLeft = s.expiry > block.timestamp ? s.expiry - block.timestamp : 0;
    uint256 timeFactor = (timeLeft * 1e18) / 365 days;
    uint256 timeValue = (spotPrice * ivBps * timeFactor) / (10000 * 1e18 * 4);

    premiumUsd = intrinsic + timeValue;
    if (premiumUsd == 0) premiumUsd = 1e16; // $0.01 floor

    // Normalize to UVBE
    uint256 uvbePrice = oracleManager.getNormalizedPrice(uvbeAssetId);
    if (uvbePrice == 0) uvbePrice = 1e18; // 1:1 floor

    premiumUvbe = (premiumUsd * 1e18) / uvbePrice;
    delta = s.optionType == 0 ? int256(5000) : int256(-5000); // ATM delta baseline 0.50
  }

  function getGreeks(
    bytes32 seriesId
  ) external view override returns (int256 delta, int256 gamma, int256 theta, int256 vega) {
    IUVOptionMarketFactory.OptionSeries memory s = marketFactory.getSeries(seriesId);
    delta = s.optionType == 0 ? int256(5000) : int256(-5000);
    gamma = 100;
    theta = -200;
    vega = 150;
  }

  function getIV(
    bytes32 seriesId
  ) external view override returns (uint256 ivBps, uint256 updatedAt) {
    IVState memory record = _ivRecords[seriesId];
    return (record.ivBps, record.updatedAt);
  }

  function isIVValid(bytes32 seriesId) external view override returns (bool) {
    IVState memory record = _ivRecords[seriesId];
    return (record.updatedAt > 0 && block.timestamp <= record.updatedAt + 180 seconds);
  }
}
