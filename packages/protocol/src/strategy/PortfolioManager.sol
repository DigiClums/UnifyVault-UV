// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../interfaces/IPortfolioManager.sol';
import '../interfaces/IStrategyManager.sol';
import '../interfaces/IOracle.sol';
import '../interfaces/IProtocolDirectory.sol';
import '../libraries/AccessRoles.sol';
import '../constants/ModuleIds.sol';

interface ICustodyVaultTotalAssets {
  function totalAssets(address asset) external view returns (uint256);
}

/**
 * @title PortfolioManager
 * @notice Dedicated portfolio accounting, allocation calculation, and NAV Engine for UnifyVault V2
 * @dev Read-only calculation and coordination module. Does NOT hold token custody, execute swaps, or transfer funds.
 */
contract PortfolioManager is AccessControl, IPortfolioManager {
  uint256 public constant BPS_DENOMINATOR = 10000;
  uint256 public constant INITIAL_NAV_PER_SHARE = 1e18; // $1.00 USD initial share price

  address public immutable directory;

  address public strategyManager;
  address public oracleManager;
  address public custodyVault;
  address public indexToken;

  /**
   * @notice PortfolioManager constructor initializing directory and module addresses
   * @param admin Address granted DEFAULT_ADMIN_ROLE and GOVERNANCE_ROLE
   * @param directoryAddress Address of ProtocolDirectory
   * @param strategyManagerAddress Address of StrategyManager
   * @param oracleManagerAddress Address of OracleManager
   * @param custodyVaultAddress Address of CustodyVault
   * @param indexTokenAddress Address of IndexToken (UVBTCETH)
   */
  constructor(
    address admin,
    address directoryAddress,
    address strategyManagerAddress,
    address oracleManagerAddress,
    address custodyVaultAddress,
    address indexTokenAddress
  ) {
    if (admin == address(0)) revert ZeroAddressDetected();
    if (directoryAddress == address(0)) revert ZeroAddressDetected();
    if (strategyManagerAddress == address(0)) revert InvalidStrategyManager();
    if (oracleManagerAddress == address(0)) revert InvalidOracle();
    if (custodyVaultAddress == address(0)) revert InvalidVault();
    if (indexTokenAddress == address(0)) revert InvalidToken();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, admin);

    directory = directoryAddress;
    strategyManager = strategyManagerAddress;
    oracleManager = oracleManagerAddress;
    custodyVault = custodyVaultAddress;
    indexToken = indexTokenAddress;
  }

  // --- External Governance Functions ---

  /**
   * @notice Updates module reference addresses from ProtocolDirectory or explicit inputs
   */
  function syncModules() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    address newStrategy = IProtocolDirectory(directory).getAddress(ModuleIds.STRATEGY_MANAGER);
    address newOracle = IProtocolDirectory(directory).getAddress(ModuleIds.ORACLE);
    address newVault = IProtocolDirectory(directory).getAddress(ModuleIds.VAULT);
    address newToken = IProtocolDirectory(directory).getAddress(ModuleIds.TOKEN);

    if (newStrategy != address(0)) strategyManager = newStrategy;
    if (newOracle != address(0)) oracleManager = newOracle;
    if (newVault != address(0)) custodyVault = newVault;
    if (newToken != address(0)) indexToken = newToken;

    emit StrategySynchronized(strategyManager);
  }

  /**
   * @notice Explicitly sets the StrategyManager module address
   */
  function setStrategyManager(
    address newStrategyManager
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (newStrategyManager == address(0)) revert InvalidStrategyManager();
    strategyManager = newStrategyManager;
    emit StrategySynchronized(newStrategyManager);
  }

  // --- Calculation & Preview Functions ---

  /**
   * @notice Calculates allocation breakdown for a given deposit amount based on StrategyManager target weights
   * @param depositAsset Address of the deposited collateral token
   * @param depositAmount Amount of deposit token to allocate
   * @return targetAssets Array of target strategy token addresses
   * @return allocationAmounts Array of corresponding allocated amounts in depositAsset units
   */
  function calculateAllocation(
    address depositAsset,
    uint256 depositAmount
  )
    external
    view
    override
    returns (address[] memory targetAssets, uint256[] memory allocationAmounts)
  {
    if (depositAsset == address(0)) revert ZeroAddressDetected();
    if (depositAmount == 0) revert ZeroAmountDetected();

    address sm = strategyManager;
    uint256[] memory weightsBps;
    (targetAssets, weightsBps) = IStrategyManager(sm).getTargetWeights();

    uint256 len = targetAssets.length;
    allocationAmounts = new uint256[](len);

    for (uint256 i = 0; i < len; i++) {
      allocationAmounts[i] = (depositAmount * weightsBps[i]) / BPS_DENOMINATOR;
    }

    return (targetAssets, allocationAmounts);
  }

  /**
   * @notice Calculates aggregate USD value of all assets held across strategy in CustodyVault (18 decimals)
   * @return totalPortfolioValueUSD Aggregate USD valuation of vault assets
   */
  function calculatePortfolioValue() public view override returns (uint256 totalPortfolioValueUSD) {
    address sm = strategyManager;
    address cv = custodyVault;
    address om = oracleManager;

    address[] memory assets = IStrategyManager(sm).getSupportedAssets();
    uint256 len = assets.length;

    for (uint256 i = 0; i < len; i++) {
      address asset = assets[i];
      uint256 balance = ICustodyVaultTotalAssets(cv).totalAssets(asset);

      if (balance > 0) {
        uint256 price = IOracle(om).getAssetPrice(asset);
        if (price == 0) revert AssetNotSupportedByOracle(asset);

        uint8 decimals = IERC20Metadata(asset).decimals();
        uint256 assetValueUSD = (balance * price) / (10 ** decimals);
        totalPortfolioValueUSD += assetValueUSD;
      }
    }
  }

  /**
   * @notice Calculates current Net Asset Value (NAV) per index share (18 decimals)
   * @return totalPortfolioValueUSD Aggregate USD value of all vault assets
   * @return navPerShare Net Asset Value per share in USD (18 decimals)
   */
  function calculateNAV()
    public
    view
    override
    returns (uint256 totalPortfolioValueUSD, uint256 navPerShare)
  {
    totalPortfolioValueUSD = calculatePortfolioValue();
    uint256 totalShares = IERC20(indexToken).totalSupply();

    if (totalShares == 0) {
      // Genesis case: $1.00 USD per initial share
      navPerShare = INITIAL_NAV_PER_SHARE;
    } else {
      navPerShare = (totalPortfolioValueUSD * 1e18) / totalShares;
    }
  }

  /**
   * @notice Simulates deposit execution, calculating share mint amount and strategy asset allocation breakdown
   * @param depositAsset Address of collateral token to deposit
   * @param depositAmount Amount of collateral token to deposit
   * @return preview DepositPreview struct containing sharesToMint, depositValueUSD, targetAssets, and allocationAmounts
   */
  function previewDeposit(
    address depositAsset,
    uint256 depositAmount
  ) external view override returns (DepositPreview memory preview) {
    if (depositAsset == address(0)) revert ZeroAddressDetected();
    if (depositAmount == 0) revert ZeroAmountDetected();

    uint256 depositPrice = IOracle(oracleManager).getAssetPrice(depositAsset);
    if (depositPrice == 0) revert AssetNotSupportedByOracle(depositAsset);

    uint8 depositDecimals = IERC20Metadata(depositAsset).decimals();
    uint256 depositValueUSD = (depositAmount * depositPrice) / (10 ** depositDecimals);

    (uint256 totalPortfolioValueUSD, ) = calculateNAV();
    uint256 totalShares = IERC20(indexToken).totalSupply();

    uint256 sharesToMint;
    if (totalShares == 0 || totalPortfolioValueUSD == 0) {
      // Initial mint: 1 Share per 1.00 USD value
      sharesToMint = depositValueUSD;
    } else {
      sharesToMint = (depositValueUSD * totalShares) / totalPortfolioValueUSD;
    }

    (address[] memory targetAssets, uint256[] memory allocationAmounts) = this.calculateAllocation(
      depositAsset,
      depositAmount
    );

    return
      DepositPreview({
        sharesToMint: sharesToMint,
        depositValueUSD: depositValueUSD,
        targetAssets: targetAssets,
        allocationAmounts: allocationAmounts
      });
  }

  /**
   * @notice Simulates redemption execution, calculating payout asset amount for a given number of shares
   * @param sharesToBurn Amount of index shares to redeem
   * @param payoutAsset Address of collateral token requested as payout
   * @return preview RedeemPreview struct containing payoutAmount and userShareUSDValue
   */
  function previewRedeem(
    uint256 sharesToBurn,
    address payoutAsset
  ) external view override returns (RedeemPreview memory preview) {
    if (payoutAsset == address(0)) revert ZeroAddressDetected();
    if (sharesToBurn == 0) return RedeemPreview(0, 0);

    uint256 totalShares = IERC20(indexToken).totalSupply();
    if (totalShares == 0) return RedeemPreview(0, 0);

    (uint256 totalPortfolioValueUSD, ) = calculateNAV();
    uint256 userShareUSDValue = (sharesToBurn * totalPortfolioValueUSD) / totalShares;

    uint256 payoutPrice = IOracle(oracleManager).getAssetPrice(payoutAsset);
    if (payoutPrice == 0) revert AssetNotSupportedByOracle(payoutAsset);

    uint8 payoutDecimals = IERC20Metadata(payoutAsset).decimals();
    uint256 payoutAmount = (userShareUSDValue * (10 ** payoutDecimals)) / payoutPrice;

    return RedeemPreview({ payoutAmount: payoutAmount, userShareUSDValue: userShareUSDValue });
  }
}
