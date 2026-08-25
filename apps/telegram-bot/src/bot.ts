import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not configured');
}

const bot = new Telegraf(token);

bot.start(async (ctx) => {
  await ctx.reply(
    `Welcome to UnifyVault 🌐\n\n` +
    `Your gateway to the UnifyVault ecosystem.\n\n` +
    `Explore staking, rewards, your dashboard, ecosystem updates and more.`,
    Markup.inlineKeyboard([
      [Markup.button.url('🚀 Open UnifyVault', 'https://unifyvault.xyz')],
      [
        Markup.button.callback('💰 Staking', 'staking'),
        Markup.button.callback('📊 Dashboard', 'dashboard'),
      ],
      [
        Markup.button.callback('🎰 Casino', 'casino'),
        Markup.button.callback('🌐 Ecosystem', 'ecosystem'),
      ],
      [Markup.button.callback('💬 Support', 'support')],
    ])
  );
});

bot.action('staking', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('💰 Staking\n\nOpen UnifyVault to access staking.');
});

bot.action('dashboard', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('📊 Dashboard\n\nYour UnifyVault dashboard will be available here.');
});

bot.action('casino', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('🎰 Casino\n\nUnifyVault Casino is coming soon.');
});

bot.action('ecosystem', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('🌐 UnifyVault Ecosystem\n\nStaking • Rewards • UVBE • Casino');
});

bot.action('support', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('💬 Support\n\nUnifyVault support will be connected here.');
});

bot.help((ctx) => {
  return ctx.reply(
    'UnifyVault Help\n\n' +
    '/start - Open UnifyVault\n' +
    '/stake - Staking\n' +
    '/balance - Check balance\n' +
    '/wallet - Wallet information\n' +
    '/ecosystem - Ecosystem\n' +
    '/support - Support'
  );
});

bot.command('stake', (ctx) => {
  return ctx.reply('💰 Staking\n\nOpen UnifyVault to access staking.');
});

bot.command('balance', (ctx) => {
  return ctx.reply('📊 Balance\n\nWallet connection will be integrated next.');
});

bot.command('wallet', (ctx) => {
  return ctx.reply('👛 Wallet\n\nWallet integration will be connected next.');
});

bot.command('ecosystem', (ctx) => {
  return ctx.reply('🌐 UnifyVault Ecosystem\n\nStaking • Rewards • UVBE • Casino');
});

bot.command('support', (ctx) => {
  return ctx.reply('💬 Support\n\nUnifyVault support will be connected here.');
});

bot.catch((err) => {
  console.error('Telegram bot error:', err);
});

bot.launch();

console.log('UnifyVault Telegram bot is running');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
