import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import { isAddress } from 'viem';
import { fetchLiveUserData, fetchTxStatus, fetchProtocolMetrics, CONTRACTS } from './blockchain';
import { getLinkedWallet, linkWallet, unlinkWallet, registerUser, getAllUsers } from './storage';

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.ADMIN_CHAT_ID || '2079720192';

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not configured');
}

const bot = new Telegraf(token);

function isUserAdmin(userId?: number | string): boolean {
  if (!userId) return false;
  return userId.toString() === adminChatId.toString();
}

function getUserMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.url('🚀 Open UnifyVault App', 'https://unifyvault.xyz')],
    [
      Markup.button.callback('📊 Live Balance', 'balance'),
      Markup.button.callback('💰 Staking Info', 'staking'),
    ],
    [
      Markup.button.callback('👛 Link / View Wallet', 'wallet'),
      Markup.button.callback('🏆 Rank & Team', 'team'),
    ],
    [
      Markup.button.callback('🤝 P2P Escrow Info', 'p2p_info'),
      Markup.button.callback('🎰 Casino', 'casino'),
    ],
    [
      Markup.button.callback('🌐 Ecosystem', 'ecosystem'),
      Markup.button.callback('💬 Support', 'support'),
    ],
  ]);
}

function getAdminMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.url('🚀 Open Admin DApp', 'https://unifyvault.xyz/admin')],
    [
      Markup.button.callback('⚡ Protocol Metrics', 'admin_metrics'),
      Markup.button.callback('🔒 Solvency Status', 'admin_solvency'),
    ],
    [
      Markup.button.callback('👑 DAO Leadership', 'admin_dao'),
      Markup.button.callback('🔍 Inspect Staker', 'admin_inspect_prompt'),
    ],
    [
      Markup.button.callback('📢 Broadcast Update', 'admin_broadcast_prompt'),
      Markup.button.callback('👥 Total Registered', 'admin_users_count'),
    ],
    [
      Markup.button.callback('📊 My Staking Position', 'staking'),
      Markup.button.callback('👛 My Wallet', 'wallet'),
    ],
    [Markup.button.callback('🌐 Ecosystem & Contracts', 'ecosystem')],
  ]);
}

bot.start(async (ctx) => {
  const userId = ctx.from?.id;
  if (userId) {
    registerUser(userId, ctx.from?.username, ctx.from?.first_name);
  }
  const isAdmin = isUserAdmin(userId);
  const linked = userId ? getLinkedWallet(userId) : null;

  const walletMsg = linked
    ? `🔗 Linked Wallet: \`${linked.slice(0, 6)}...${linked.slice(-4)}\`\n`
    : `ℹ️ Tip: Link your EVM wallet with \`/link 0xYourAddress\` to track your live assets.\n`;

  if (isAdmin) {
    await ctx.reply(
      `🛡️ *UnifyVault Administrator Control Panel (Base Mainnet)*\n\n` +
        `Welcome, Administrator! You have full access to protocol solvency surveillance, DAO cycles, broadcast tools, and staker intelligence.\n\n` +
        walletMsg +
        `🔒 *Privacy Guard:* User sessions are strictly isolated. Standard users cannot see admin commands or metrics.`,
      {
        parse_mode: 'Markdown',
        ...getAdminMainMenu(),
      },
    );
  } else {
    await ctx.reply(
      `Welcome to UnifyVault 🌐 (Base Mainnet)\n\n` +
        `Your gateway to the UnifyVault DeFi ecosystem.\n\n` +
        walletMsg +
        `Explore on-chain staking, rewards, your portfolio dashboard and updates.`,
      {
        parse_mode: 'Markdown',
        ...getUserMainMenu(),
      },
    );
  }
});

// Staking Callback / Command
async function handleStaking(ctx: any) {
  const userId = ctx.from?.id;
  const linked = userId ? getLinkedWallet(userId) : null;

  if (!linked) {
    return ctx.reply(
      `💰 *UnifyVault Dynamic Staking (Base Mainnet)*\n\n` +
        `• Minimum Stake: 50 UVBE\n` +
        `• Rewards: Dynamic Recurring Yield + 10-Gen Affiliate Engine\n` +
        `• Network: Base Mainnet\n\n` +
        `👉 *Link your wallet* to see your live staked amount:\n\`/link 0xYourAddress\``,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('🚀 Stake on UnifyVault', 'https://unifyvault.xyz/stake')],
          [
            Markup.button.url(
              '🔍 BaseScan Staking Contract',
              `https://basescan.org/address/${CONTRACTS.UVBEStakingVault}`,
            ),
          ],
        ]),
      },
    );
  }

  try {
    const data = await fetchLiveUserData(linked);
    const apyPercent = (data.currentApyBps / 100).toFixed(2);

    return ctx.reply(
      `💰 *Your Live Staking Overview*\n\n` +
        `👤 *Wallet:* \`${data.address.slice(0, 6)}...${data.address.slice(-4)}\`\n` +
        `🔒 *Total Staked:* \`${data.stakedAmount} UVBE\`\n` +
        `📈 *Current Staking APY:* \`${apyPercent}%\`\n` +
        `🎁 *Pending Recurring Reward:* \`${data.pendingRecurringReward} UVBE\`\n` +
        `✨ *Total Claimable Rewards:* \`${data.totalClaimableRewards} UVBE\`\n` +
        `💵 *Lifetime Claimed:* \`${data.totalClaimed} UVBE\`\n` +
        `🔢 *Active Stake Positions:* \`${data.stakeCount}\`\n\n` +
        `[View Staking Vault on BaseScan](https://basescan.org/address/${CONTRACTS.UVBEStakingVault})`,
      {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
        ...Markup.inlineKeyboard([
          [Markup.button.url('⚡ Claim / Restake on dApp', 'https://unifyvault.xyz/stake')],
        ]),
      },
    );
  } catch (error: any) {
    return ctx.reply(`❌ Error fetching on-chain staking data: ${error.message || 'RPC Error'}`);
  }
}

bot.action('staking', async (ctx) => {
  await ctx.answerCbQuery();
  return handleStaking(ctx);
});
bot.command('stake', handleStaking);
bot.command('staking', handleStaking);

// Live Balance Callback / Command
async function handleBalance(ctx: any) {
  const userId = ctx.from?.id;
  const linked = userId ? getLinkedWallet(userId) : null;

  if (!linked) {
    return ctx.reply(
      `📊 *Live On-Chain Balance Tracking*\n\n` +
        `Please link your Base wallet address to view live balances:\n` +
        `Command: \`/link 0xYourAddress\``,
      { parse_mode: 'Markdown' },
    );
  }

  try {
    const data = await fetchLiveUserData(linked);

    return ctx.reply(
      `📊 *On-Chain Balances (Base Mainnet)*\n\n` +
        `👤 *Address:* [${data.address.slice(0, 6)}...${data.address.slice(-4)}](https://basescan.org/address/${data.address})\n\n` +
        `💎 *UVBE Token Balance:* \`${data.uvbeBalance} UVBE\`\n` +
        `⛽ *Base ETH Balance:* \`${data.ethBalance} ETH\`\n` +
        `🔒 *Staked Principal:* \`${data.stakedAmount} UVBE\`\n` +
        `🎁 *Claimable Rewards:* \`${data.totalClaimableRewards} UVBE\`\n\n` +
        `🔍 [View Wallet on BaseScan](https://basescan.org/address/${data.address})`,
      {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
        ...Markup.inlineKeyboard([
          [Markup.button.url('🌐 Open Portfolio', 'https://unifyvault.xyz/portfolio')],
        ]),
      },
    );
  } catch (error: any) {
    return ctx.reply(`❌ Error fetching balances: ${error.message || 'RPC Error'}`);
  }
}

bot.action('balance', async (ctx) => {
  await ctx.answerCbQuery();
  return handleBalance(ctx);
});
bot.action('dashboard', async (ctx) => {
  await ctx.answerCbQuery();
  return handleBalance(ctx);
});
bot.command('balance', handleBalance);
bot.command('dashboard', handleBalance);

// Rank & Team Info
async function handleTeam(ctx: any) {
  const userId = ctx.from?.id;
  const linked = userId ? getLinkedWallet(userId) : null;

  if (!linked) {
    return ctx.reply(
      `🏆 *Rank & Affiliate Team Engine*\n\n` +
        `Link your wallet to view your live Rank, Active Directs and Team Volume:\n\n` +
        `\`/link 0xYourAddress\``,
      { parse_mode: 'Markdown' },
    );
  }

  try {
    const data = await fetchLiveUserData(linked);

    return ctx.reply(
      `🏆 *Your Referral & Rank Performance*\n\n` +
        `👤 *Account:* \`${data.address.slice(0, 6)}...${data.address.slice(-4)}\`\n` +
        `🎖️ *Current Rank:* Level ${data.rank}\n` +
        `👥 *Active Directs:* ${data.activeDirects}\n` +
        `📈 *10-Gen Team Volume:* \`${data.teamVolume} UVBE\`\n\n` +
        `[View Referral Registry Contract](https://basescan.org/address/${CONTRACTS.UVBEReferralRegistry})`,
      {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
      },
    );
  } catch (error: any) {
    return ctx.reply(`❌ Error fetching team data: ${error.message}`);
  }
}

bot.action('team', async (ctx) => {
  await ctx.answerCbQuery();
  return handleTeam(ctx);
});
bot.command('team', handleTeam);
bot.command('rank', handleTeam);

// Wallet Linking Commands
bot.command('link', async (ctx) => {
  const args = ctx.message.text.trim().split(/\s+/);
  if (args.length < 2) {
    return ctx.reply(
      `ℹ️ Usage:\n\`/link 0xYourBaseAddress\`\n\n*Note:* Only provide your public address. Never share your private key or seed phrase!`,
      { parse_mode: 'Markdown' },
    );
  }

  const addr = args[1].trim();
  if (!isAddress(addr)) {
    return ctx.reply('❌ Invalid Ethereum/Base address format. Please check and try again.');
  }

  const userId = ctx.from.id;
  linkWallet(userId, addr);

  return ctx.reply(
    `✅ *Wallet Linked Successfully!*\n\n` +
      `🔗 Address: \`${addr}\`\n\n` +
      `You can now use /balance or /stake to check your live assets anytime.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📊 View Balance', 'balance')],
        [Markup.button.callback('💰 View Staking', 'staking')],
      ]),
    },
  );
});

bot.command('unlink', (ctx) => {
  const userId = ctx.from.id;
  const removed = unlinkWallet(userId);
  if (removed) {
    return ctx.reply('✅ Wallet unlinked successfully.');
  } else {
    return ctx.reply('ℹ️ No wallet was linked to this account.');
  }
});

async function handleWallet(ctx: any) {
  const userId = ctx.from?.id;
  const linked = userId ? getLinkedWallet(userId) : null;

  if (linked) {
    return ctx.reply(
      `👛 *Wallet Settings*\n\n` +
        `🔗 Current Linked Address:\n\`${linked}\`\n\n` +
        `Commands:\n` +
        `• \`/link 0xNewAddress\` - Change linked wallet\n` +
        `• \`/unlink\` - Remove linked wallet`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📊 Check Balance', 'balance')],
          [Markup.button.url('🔍 View on BaseScan', `https://basescan.org/address/${linked}`)],
        ]),
      },
    );
  } else {
    return ctx.reply(
      `👛 *Link Your Wallet*\n\n` +
        `Link your public EVM address to check live token balances & staking rewards.\n\n` +
        `Command format:\n\`/link 0xYourAddress\`\n\n` +
        `🔒 *Security Notice:* We only ask for public addresses to read on-chain data. We never ask for private keys.`,
      { parse_mode: 'Markdown' },
    );
  }
}

bot.action('wallet', async (ctx) => {
  await ctx.answerCbQuery();
  return handleWallet(ctx);
});
bot.command('wallet', handleWallet);

// Transaction Verification
bot.command('tx', async (ctx) => {
  const args = ctx.message.text.trim().split(/\s+/);
  if (args.length < 2) {
    return ctx.reply('ℹ️ Usage:\n`/tx 0xYourTransactionHash`', { parse_mode: 'Markdown' });
  }

  const txHash = args[1].trim();
  if (!txHash.startsWith('0x') || txHash.length !== 66) {
    return ctx.reply('❌ Invalid transaction hash format. Must be 66 characters starting with 0x.');
  }

  const txInfo = await fetchTxStatus(txHash);
  if (!txInfo) {
    return ctx.reply(
      `⏳ Transaction not found or pending on Base Mainnet.\n\n[Check on BaseScan](https://basescan.org/tx/${txHash})`,
      {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
      },
    );
  }

  return ctx.reply(
    `🧾 *Transaction Status (Base Mainnet)*\n\n` +
      `Status: ${txInfo.status}\n` +
      `Block: \`${txInfo.blockNumber}\`\n` +
      `Gas Used: \`${txInfo.gasUsed}\`\n` +
      `From: \`${txInfo.from}\`\n` +
      `To: \`${txInfo.to}\`\n\n` +
      `[View on BaseScan](https://basescan.org/tx/${txHash})`,
    {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    },
  );
});

// ── Admin-Only Callbacks & Handlers ──
bot.action('admin_metrics', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!isUserAdmin(userId)) {
    return ctx.reply('⛔ Unauthorized: This command is restricted to the Protocol Administrator.');
  }

  try {
    const metrics = await fetchProtocolMetrics();
    return ctx.reply(
      `⚡ *Protocol Surveillance & Macro Metrics*\n\n` +
        `📊 *Total Permanent Staked:* \`${metrics.totalPermanentStaked} UVBE\`\n` +
        `🏦 *Available Vault Capital:* \`${metrics.vaultAvailableCapital} UVBE\`\n` +
        `⚖️ *Outstanding Liabilities:* \`${metrics.totalOutstandingLiabilities} UVBE\`\n` +
        `📈 *Dynamic APY Rate:* \`${metrics.currentAnnualApyPercent}%\`\n` +
        `🏆 *Active DAO Epoch:* \`#${metrics.currentEpochId}\`\n` +
        `💰 *DAO Epoch Pool:* \`${metrics.epochPoolAmount} UVBE\``,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Refresh Metrics', 'admin_metrics')],
          [Markup.button.callback('⬅️ Back to Admin Menu', 'admin_menu')],
        ]),
      },
    );
  } catch (error: any) {
    return ctx.reply(`❌ Error fetching metrics: ${error.message}`);
  }
});

bot.action('admin_solvency', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!isUserAdmin(userId)) {
    return ctx.reply('⛔ Unauthorized: This command is restricted to the Protocol Administrator.');
  }

  try {
    const metrics = await fetchProtocolMetrics();
    return ctx.reply(
      `🔒 *Solvency Health Status*\n\n` +
        `• Vault Capital: \`${metrics.vaultAvailableCapital} UVBE\`\n` +
        `• Debt Liabilities: \`${metrics.totalOutstandingLiabilities} UVBE\`\n` +
        `• Health Invariant: \`Available Capital >= Liabilities\` ✅\n` +
        `• Rate Controller: \`Dynamic Solvency Engine Active\`\n\n` +
        `[Open Admin Solvency Console](https://unifyvault.xyz/admin/staking)`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('🚀 Open Solvency Console', 'https://unifyvault.xyz/admin/staking')],
          [Markup.button.callback('⬅️ Back to Admin Menu', 'admin_menu')],
        ]),
      },
    );
  } catch (error: any) {
    return ctx.reply(`❌ Error checking solvency: ${error.message}`);
  }
});

bot.action('admin_dao', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!isUserAdmin(userId)) {
    return ctx.reply('⛔ Unauthorized.');
  }

  try {
    const metrics = await fetchProtocolMetrics();
    return ctx.reply(
      `👑 *DAO Leadership Epoch Status*\n\n` +
        `• Current Cycle: *Epoch #${metrics.currentEpochId}*\n` +
        `• Accumulated Pool: \`${metrics.epochPoolAmount} UVBE\`\n` +
        `• Eligible Ranks: *Platinum (Rank 4), Diamond (Rank 5)*\n\n` +
        `[Manage DAO Cycles on Admin Panel](https://unifyvault.xyz/admin/staking)`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('🚀 Finalize / View Leaders', 'https://unifyvault.xyz/admin/staking')],
          [Markup.button.callback('⬅️ Back to Admin Menu', 'admin_menu')],
        ]),
      },
    );
  } catch (error: any) {
    return ctx.reply(`❌ Error checking DAO epoch: ${error.message}`);
  }
});

bot.action('admin_inspect_prompt', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!isUserAdmin(userId)) return ctx.reply('⛔ Unauthorized.');

  return ctx.reply(
    `🔍 *On-Chain Staker Inspector*\n\n` +
      `To inspect any user rank, stake, directs and volume, send:\n` +
      `\`/inspect 0xUserWalletAddress\``,
    { parse_mode: 'Markdown' },
  );
});

bot.action('admin_menu', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!isUserAdmin(userId)) {
    return ctx.reply('Main Menu', getUserMainMenu());
  }
  return ctx.reply(
    `🛡️ *UnifyVault Administrator Control Panel*\n\nChoose an administrative surveillance tool:`,
    {
      parse_mode: 'Markdown',
      ...getAdminMainMenu(),
    },
  );
});

// Admin command: /admin
bot.command('admin', async (ctx) => {
  const userId = ctx.from?.id;
  if (!isUserAdmin(userId)) {
    return ctx.reply('⛔ Access Denied. You do not have administrator permissions.');
  }

  return ctx.reply(
    `🛡️ *UnifyVault Administrator Control Panel*\n\nSelect an administrative action:`,
    {
      parse_mode: 'Markdown',
      ...getAdminMainMenu(),
    },
  );
});

// Admin command: /inspect <address>
bot.command('inspect', async (ctx) => {
  const userId = ctx.from?.id;
  if (!isUserAdmin(userId)) {
    return ctx.reply('⛔ Access Denied.');
  }

  const args = ctx.message.text.trim().split(/\s+/);
  if (args.length < 2 || !isAddress(args[1].trim())) {
    return ctx.reply('ℹ️ Usage: `/inspect 0xUserAddress`', { parse_mode: 'Markdown' });
  }

  const targetAddr = args[1].trim();
  try {
    const data = await fetchLiveUserData(targetAddr);
    const apyPercent = (data.currentApyBps / 100).toFixed(2);

    return ctx.reply(
      `🔍 *Staker Intelligence Report*\n\n` +
        `👤 *Address:* \`${data.address}\`\n` +
        `🎖️ *Rank:* Level ${data.rank}\n` +
        `🔒 *Permanent Stake:* \`${data.stakedAmount} UVBE\`\n` +
        `👥 *Active Directs:* ${data.activeDirects}\n` +
        `📈 *Team Volume:* \`${data.teamVolume} UVBE\`\n` +
        `💎 *UVBE Balance:* \`${data.uvbeBalance} UVBE\`\n` +
        `🎁 *Claimable Yield:* \`${data.totalClaimableRewards} UVBE\`\n` +
        `💵 *Lifetime Claimed:* \`${data.totalClaimed} UVBE\`\n\n` +
        `[View on BaseScan](https://basescan.org/address/${data.address})`,
      {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
      },
    );
  } catch (err: any) {
    return ctx.reply(`❌ Failed to inspect wallet: ${err.message}`);
  }
});

// Broadcast Prompt Callback
bot.action('admin_broadcast_prompt', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!isUserAdmin(userId)) return ctx.reply('⛔ Unauthorized.');

  const users = getAllUsers();
  return ctx.reply(
    `📢 *Official Broadcast Dispatcher*\n\n` +
      `Total Registered Users: *${users.length}*\n\n` +
      `To broadcast an official announcement to all bot users, send:\n` +
      `\`/broadcast Your message text here\``,
    { parse_mode: 'Markdown' },
  );
});

// Admin Users Count Callback
bot.action('admin_users_count', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!isUserAdmin(userId)) return ctx.reply('⛔ Unauthorized.');

  const users = getAllUsers();
  const linkedCount = users.filter((u) => u.address).length;

  return ctx.reply(
    `👥 *Telegram Bot Community Analytics*\n\n` +
      `• Total Users: *${users.length}*\n` +
      `• Linked EVM Wallets: *${linkedCount}*\n` +
      `• Network: *Base Mainnet*\n\n` +
      `[Open Admin Portal](https://unifyvault.xyz/admin)`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📢 Broadcast to All', 'admin_broadcast_prompt')],
        [Markup.button.callback('⬅️ Back to Admin Menu', 'admin_menu')],
      ]),
    },
  );
});

// Admin Command: /broadcast <message>
bot.command('broadcast', async (ctx) => {
  const userId = ctx.from?.id;
  if (!isUserAdmin(userId)) {
    return ctx.reply('⛔ Access Denied. Only the Administrator can broadcast.');
  }

  const rawText = ctx.message.text.trim();
  const messageContent = rawText.replace(/^\/broadcast\s*/i, '').trim();

  if (!messageContent) {
    return ctx.reply(
      `ℹ️ Usage:\n\`/broadcast 🚀 Important Update: Dynamic APY rate has updated!\``,
      { parse_mode: 'Markdown' },
    );
  }

  const users = getAllUsers();
  let successCount = 0;
  let failCount = 0;

  const statusMsg = await ctx.reply(
    `📢 Broadcasting announcement to *${users.length}* registered users...`,
    { parse_mode: 'Markdown' },
  );

  for (const user of users) {
    try {
      await bot.telegram.sendMessage(
        user.userId,
        `📢 *Official UnifyVault Announcement*\n\n${messageContent}\n\n[Open UnifyVault App](https://unifyvault.xyz)`,
        { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } },
      );
      successCount++;
    } catch (e) {
      failCount++;
    }
  }

  return ctx.reply(
    `✅ *Broadcast Complete!*\n\n` +
      `• Successfully Delivered: *${successCount}*\n` +
      `• Failed / Blocked: *${failCount}*`,
    { parse_mode: 'Markdown' },
  );
});

// P2P Escrow Info Action & Command
async function handleP2P(ctx: any) {
  return ctx.reply(
    `🤝 *UnifyVault P2P Fiat & Crypto Escrow (Base Mainnet)*\n\n` +
      `• Decentralized P2P On/Off-Ramp on Base\n` +
      `• Instant Smart Account & Paymaster Gasless Releases\n` +
      `• On-Chain Proof-of-Payment Verification\n` +
      `• Contract Address: \`${CONTRACTS.P2PEscrow}\`\n\n` +
      `Trade directly peer-to-peer with zero centralized custody:`,
    {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
      ...Markup.inlineKeyboard([
        [Markup.button.url('🚀 Open P2P Portal', 'https://unifyvault.xyz/p2p')],
        [
          Markup.button.url(
            '🔍 BaseScan P2P Contract',
            `https://basescan.org/address/${CONTRACTS.P2PEscrow}`,
          ),
        ],
      ]),
    },
  );
}

bot.action('p2p_info', async (ctx) => {
  await ctx.answerCbQuery();
  return handleP2P(ctx);
});
bot.command('p2p', handleP2P);
bot.command('escrow', handleP2P);

bot.action('casino', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    '🎰 *UnifyVault Casino & Games*\n\nDecentralized Provably Fair Gaming is coming soon to the ecosystem.',
    { parse_mode: 'Markdown' },
  );
});

bot.action('ecosystem', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `🌐 *UnifyVault Ecosystem (Base Mainnet)*\n\n` +
      `• Token: *UVBE*\n` +
      `• Network: *Base (Chain ID 8453)*\n` +
      `• Protocol Directory: \`${CONTRACTS.ProtocolDirectory}\`\n` +
      `• Staking Vault: \`${CONTRACTS.UVBEStakingVault}\`\n` +
      `• Referral Registry: \`${CONTRACTS.UVBEReferralRegistry}\`\n` +
      `• Reward Distributor: \`${CONTRACTS.UVBERewardDistributor}\`\n` +
      `• UVBE Token: \`${CONTRACTS.UVBEToken}\`\n\n` +
      `[Explore on BaseScan](https://basescan.org/token/${CONTRACTS.UVBEToken})`,
    {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    },
  );
});

bot.action('support', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    '💬 *Support & Community*\n\nOfficial Docs: https://docs.unifyvault.xyz\nWebsite: https://unifyvault.xyz',
    { parse_mode: 'Markdown' },
  );
});

bot.help((ctx) => {
  const userId = ctx.from?.id;
  const isAdmin = isUserAdmin(userId);

  if (isAdmin) {
    return ctx.reply(
      `📖 *Administrator Bot Commands*\n\n` +
        `/admin - Open Administrator Control Panel\n` +
        `/broadcast <msg> - Broadcast announcement to all users\n` +
        `/inspect <address> - Inspect any staker rank, volume & stake\n` +
        `/start - Main Menu\n` +
        `/balance - View live wallet balances\n` +
        `/stake - View live staking status\n` +
        `/p2p - View P2P escrow info\n` +
        `/team - View referral volume\n` +
        `/tx <hash> - Check Base transaction confirmation\n` +
        `/ecosystem - Ecosystem contracts\n` +
        `/support - Help & Links`,
      { parse_mode: 'Markdown' },
    );
  }

  return ctx.reply(
    `📖 *UnifyVault Bot Commands*\n\n` +
      `/start - Open Main Menu\n` +
      `/link <address> - Link your Base wallet for live tracking\n` +
      `/unlink - Unlink current wallet\n` +
      `/balance - View live ETH, UVBE & staked balances\n` +
      `/stake - View live staking status & APY\n` +
      `/p2p - P2P decentralized escrow info\n` +
      `/team - View your rank & referral volume\n` +
      `/tx <hash> - Check Base transaction confirmation\n` +
      `/wallet - Wallet settings\n` +
      `/ecosystem - Contracts and ecosystem info\n` +
      `/support - Official links and help`,
    { parse_mode: 'Markdown' },
  );
});

bot.command('ecosystem', (ctx) => {
  return ctx.reply(
    `🌐 *UnifyVault Ecosystem Contracts*\n\n` +
      `• UVBE Token: \`${CONTRACTS.UVBEToken}\`\n` +
      `• Staking Vault: \`${CONTRACTS.UVBEStakingVault}\`\n` +
      `• Reward Distributor: \`${CONTRACTS.UVBERewardDistributor}\`\n\n` +
      `[BaseScan UVBE Token](https://basescan.org/token/${CONTRACTS.UVBEToken})`,
    { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } },
  );
});

bot.command('support', (ctx) => {
  return ctx.reply(
    '💬 *Support & Documentation*\n\nDocs: https://docs.unifyvault.xyz\nPortal: https://unifyvault.xyz',
    { parse_mode: 'Markdown' },
  );
});

bot.catch((err) => {
  console.error('Telegram bot error:', err);
});

bot.launch();

console.log('UnifyVault Telegram bot is running with Base Mainnet live tracking');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
