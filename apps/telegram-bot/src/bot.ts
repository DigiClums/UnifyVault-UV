import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import { isAddress } from 'viem';
import { fetchLiveUserData, fetchTxStatus, CONTRACTS } from './blockchain';
import { getLinkedWallet, linkWallet, unlinkWallet } from './storage';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not configured');
}

const bot = new Telegraf(token);

function getMainMenu() {
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
      Markup.button.callback('🎰 Casino', 'casino'),
      Markup.button.callback('🌐 Ecosystem', 'ecosystem'),
    ],
    [Markup.button.callback('💬 Support', 'support')],
  ]);
}

bot.start(async (ctx) => {
  const userId = ctx.from?.id;
  const linked = userId ? getLinkedWallet(userId) : null;

  const walletMsg = linked
    ? `🔗 Linked Wallet: \`${linked.slice(0, 6)}...${linked.slice(-4)}\`\n`
    : `ℹ️ Tip: Link your EVM wallet with \`/link 0xYourAddress\` to track your live assets.\n`;

  await ctx.reply(
    `Welcome to UnifyVault 🌐 (Base Mainnet)\n\n` +
      `Your gateway to the UnifyVault DeFi ecosystem.\n\n` +
      walletMsg +
      `Explore on-chain staking, rewards, your portfolio dashboard and updates.`,
    {
      parse_mode: 'Markdown',
      ...getMainMenu(),
    },
  );
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
      `• Protocol Directory: \`0xe74b400f4aea3a0b593be5acbc54f56631c0d60e\`\n` +
      `• Staking Vault: \`0x5cd09aad54f8699e52cb69d0d62f1fb461caa3e1\`\n` +
      `• UVBE Token: \`0xd2715141a0f5998b707baa963990bfc2e94cf145\`\n\n` +
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
  return ctx.reply(
    `📖 *UnifyVault Bot Commands*\n\n` +
      `/start - Open Main Menu\n` +
      `/link <address> - Link your Base wallet for live tracking\n` +
      `/unlink - Unlink current wallet\n` +
      `/balance - View live ETH, UVBE & staked balances\n` +
      `/stake - View live staking status & APY\n` +
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
