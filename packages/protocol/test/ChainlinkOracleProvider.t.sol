// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import 'forge-std/Test.sol';
import '../src/oracle/ChainlinkOracleProvider.sol';
import '../src/interfaces/AggregatorV3Interface.sol';
import '../src/errors/Errors.sol';
import '../src/libraries/AccessRoles.sol';

/**
 * @title MockChainlinkAggregator
 * @notice Mock Chainlink aggregator to control price output and updates
 */
contract MockChainlinkAggregator is AggregatorV3Interface {
  uint8 private _decimals;
  string private _description;
  uint256 private _version;

  uint80 private _roundId;
  int256 private _answer;
  uint256 private _startedAt;
  uint256 private _updatedAt;
  uint80 private _answeredInRound;
  bool private _shouldRevert;

  constructor(uint8 decimals_, int256 price_, uint256 updatedAt_, uint80 roundId_) {
    _decimals = decimals_;
    _answer = price_;
    _updatedAt = updatedAt_;
    _roundId = roundId_;
    _answeredInRound = roundId_;
    _shouldRevert = false;
  }

  function setLatestRoundData(
    uint80 roundId,
    int256 answer,
    uint256 updatedAt,
    uint80 answeredInRound
  ) external {
    _roundId = roundId;
    _answer = answer;
    _updatedAt = updatedAt;
    _answeredInRound = answeredInRound;
  }

  function setDecimals(uint8 decimals_) external {
    _decimals = decimals_;
  }

  function setShouldRevert(bool shouldRevert_) external {
    _shouldRevert = shouldRevert_;
  }

  function decimals() external view override returns (uint8) {
    return _decimals;
  }

  function description() external view override returns (string memory) {
    return _description;
  }

  function version() external view override returns (uint256) {
    return _version;
  }

  function getRoundData(
    uint80 _round
  )
    external
    view
    override
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    )
  {
    return (_round, _answer, _startedAt, _updatedAt, _answeredInRound);
  }

  function latestRoundData()
    external
    view
    override
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    )
  {
    if (_shouldRevert) {
      revert('Mock aggregator failed');
    }
    return (_roundId, _answer, _startedAt, _updatedAt, _answeredInRound);
  }
}

/**
 * @title ChainlinkOracleProviderTest
 * @notice Test suite for validating the Chainlink Aggregator adapter
 */
contract ChainlinkOracleProviderTest is Test {
  ChainlinkOracleProvider public provider;
  MockChainlinkAggregator public btcAggregator;
  MockChainlinkAggregator public ethAggregator;

  address public gov = address(0xABC);
  address public rando = address(0xDEF);

  bytes32 public constant TEST_BTC = keccak256('BTC');
  bytes32 public constant TEST_ETH = keccak256('ETH');
  bytes32 public constant UNSUPPORTED = keccak256('UNSUPPORTED');

  event FeedRegistered(
    bytes32 indexed assetId,
    address indexed feedAddress,
    uint32 heartbeat,
    address indexed caller
  );
  event FeedUpdated(
    bytes32 indexed assetId,
    address oldFeedAddress,
    address newFeedAddress,
    uint32 oldHeartbeat,
    uint32 newHeartbeat,
    address indexed caller
  );
  event FeedRemoved(
    bytes32 indexed assetId,
    address indexed oldFeedAddress,
    address indexed caller
  );
  event HeartbeatUpdated(
    bytes32 indexed assetId,
    uint32 oldHeartbeat,
    uint32 newHeartbeat,
    address indexed caller
  );

  function setUp() public {
    provider = new ChainlinkOracleProvider();
    provider.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);

    vm.warp(100000);

    btcAggregator = new MockChainlinkAggregator(8, 60000 * 10 ** 8, block.timestamp, 1);
    ethAggregator = new MockChainlinkAggregator(18, 3000 * 10 ** 18, block.timestamp, 1);

    vm.startPrank(gov);
    provider.registerFeed(TEST_BTC, address(btcAggregator), 3600);
    provider.registerFeed(TEST_ETH, address(ethAggregator), 3600);
    vm.stopPrank();
  }

  // --- Unit Tests ---

  function testSuccessfulPriceReads() public {
    // Raw values check (no 18 decimal normalization)
    uint256 btcPrice = provider.getLatestPrice(TEST_BTC);
    assertEq(btcPrice, 60000 * 10 ** 8);

    uint256 ethPrice = provider.getLatestPrice(TEST_ETH);
    assertEq(ethPrice, 3000 * 10 ** 18);
  }

  function testGetLatestRoundStruct() public {
    ProviderPrice memory round = provider.getLatestRound(TEST_BTC);
    assertEq(round.price, 60000 * 10 ** 8);
    assertEq(round.decimals, 8);
    assertEq(round.updatedAt, block.timestamp);
    assertEq(round.roundId, 1);
    assertEq(round.providerId, provider.PROVIDER_ID());
  }

  function testUnsupportedAssetRevert() public {
    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, UNSUPPORTED));
    provider.getLatestPrice(UNSUPPORTED);

    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, UNSUPPORTED));
    provider.getLatestRound(UNSUPPORTED);
  }

  function testStaleFeedRevert() public {
    // Warp block time past heartbeat limit (3600 seconds)
    vm.warp(block.timestamp + 3601);

    vm.expectRevert(
      abi.encodeWithSelector(
        Errors.OracleProviderPriceStale.selector,
        TEST_BTC,
        uint256(3601),
        uint256(3600)
      )
    );
    provider.getLatestPrice(TEST_BTC);
  }

  function testNegativePriceRevert() public {
    btcAggregator.setLatestRoundData(1, -100, block.timestamp, 1);

    vm.expectRevert(
      abi.encodeWithSelector(Errors.OracleProviderPriceNegative.selector, TEST_BTC, int256(-100))
    );
    provider.getLatestPrice(TEST_BTC);
  }

  function testZeroPriceRevert() public {
    btcAggregator.setLatestRoundData(1, 0, block.timestamp, 1);

    vm.expectRevert(
      abi.encodeWithSelector(Errors.OracleProviderPriceNegative.selector, TEST_BTC, int256(0))
    );
    provider.getLatestPrice(TEST_BTC);
  }

  function testIncompleteRoundRevert() public {
    // answeredInRound (0) < roundId (2)
    btcAggregator.setLatestRoundData(2, 60000 * 10 ** 8, block.timestamp, 0);

    vm.expectRevert(abi.encodeWithSignature('IncompleteRound(bytes32)', TEST_BTC));
    provider.getLatestPrice(TEST_BTC);
  }

  function testFeedReplacementAndGovernance() public {
    MockChainlinkAggregator newBtcAggregator = new MockChainlinkAggregator(
      8,
      62000 * 10 ** 8,
      block.timestamp,
      1
    );

    // Rando should fail to update
    vm.prank(rando);
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        rando,
        AccessRoles.GOVERNANCE_ROLE
      )
    );
    provider.updateFeed(TEST_BTC, address(newBtcAggregator), 1800);

    // Gov updates successfully
    vm.startPrank(gov);
    vm.expectEmit(true, false, false, true);
    emit FeedUpdated(TEST_BTC, address(btcAggregator), address(newBtcAggregator), 3600, 1800, gov);
    provider.updateFeed(TEST_BTC, address(newBtcAggregator), 1800);
    vm.stopPrank();

    assertEq(provider.getLatestPrice(TEST_BTC), 62000 * 10 ** 8);
    assertEq(provider.getFeedConfig(TEST_BTC).heartbeat, 1800);
  }

  function testRemoveFeed() public {
    vm.startPrank(gov);
    vm.expectEmit(true, false, false, true);
    emit FeedRemoved(TEST_BTC, address(btcAggregator), gov);
    provider.removeFeed(TEST_BTC);
    vm.stopPrank();

    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, TEST_BTC));
    provider.getLatestPrice(TEST_BTC);
  }

  function testSetEnabledBehavior() public {
    vm.startPrank(gov);
    provider.setFeedEnabled(TEST_BTC, false);
    vm.stopPrank();

    vm.expectRevert(abi.encodeWithSelector(Errors.AssetNotSupported.selector, TEST_BTC));
    provider.getLatestPrice(TEST_BTC);
  }

  function testIsHealthyChecks() public {
    assertTrue(provider.isHealthy(TEST_BTC));

    // Negative price makes it unhealthy
    btcAggregator.setLatestRoundData(1, -500, block.timestamp, 1);
    assertFalse(provider.isHealthy(TEST_BTC));

    // Restore price, but warp to stale
    btcAggregator.setLatestRoundData(1, 60000 * 10 ** 8, block.timestamp, 1);
    vm.warp(block.timestamp + 3601);
    assertFalse(provider.isHealthy(TEST_BTC));

    // Revert behavior in tries
    btcAggregator.setShouldRevert(true);
    assertFalse(provider.isHealthy(TEST_BTC));
  }

  // --- Fuzz Tests ---

  function testFuzzPriceReading(int256 fuzzedPrice, uint8 fuzzedDecimals) public {
    int256 rawPrice = int256(uint256(fuzzedPrice) % 10 ** 20) + 1; // bound price to avoid large sizes
    uint8 decimals = uint8((fuzzedDecimals % 24) + 1); // bound decimals to 1..24

    btcAggregator.setDecimals(decimals);
    btcAggregator.setLatestRoundData(1, rawPrice, block.timestamp, 1);

    uint256 latestPrice = provider.getLatestPrice(TEST_BTC);
    assertEq(latestPrice, uint256(rawPrice));
    assertEq(provider.getDecimals(TEST_BTC), decimals);
  }

  function testFuzzHeartbeatExpiration(uint32 heartbeat, uint256 elapsed) public {
    vm.assume(heartbeat > 0 && heartbeat < 1_000_000_000);
    vm.assume(elapsed > heartbeat && elapsed < type(uint256).max - block.timestamp);

    vm.startPrank(gov);
    provider.updateHeartbeat(TEST_BTC, heartbeat);
    vm.stopPrank();

    vm.warp(block.timestamp + elapsed);

    vm.expectRevert(
      abi.encodeWithSelector(
        Errors.OracleProviderPriceStale.selector,
        TEST_BTC,
        elapsed,
        uint256(heartbeat)
      )
    );
    provider.getLatestPrice(TEST_BTC);
  }
}
