/* eslint-disable @typescript-eslint/no-var-requires */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = [
  { width: 320, height: 667, name: '320px' },
  { width: 360, height: 740, name: '360px' },
  { width: 375, height: 812, name: '375px' },
  { width: 390, height: 844, name: '390px' },
  { width: 430, height: 932, name: '430px' },
  { width: 768, height: 1024, name: '768px' },
];

const PAGES = [
  { path: '/', name: 'landing' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/deposit', name: 'deposit' },
  { path: '/redeem', name: 'redeem' },
  { path: '/portfolio', name: 'portfolio' },
  { path: '/governance', name: 'governance' },
  { path: '/health', name: 'health' },
  { path: '/settings', name: 'settings' },
];

const BASE_URL = 'http://localhost:3005';

async function runAudit(outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {
    horizontalScroll: [],
    smallTapTargets: [],
    clippedText: [],
    overlappingButtons: [],
    navDrawer: [],
    walletModal: [],
  };

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Viewport ${vp.name} ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    for (const pg of PAGES) {
      try {
        await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(300);

        // 1. Check Horizontal Scroll
        const hScroll = await page.evaluate((vW) => {
          const maxW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
          const overflows = [];
          if (maxW > vW + 1) {
            const els = Array.from(document.querySelectorAll('*'));
            for (const el of els) {
              const r = el.getBoundingClientRect();
              if (r.right > vW + 1 && r.width > 0 && el.children.length === 0) {
                overflows.push({
                  tag: el.tagName,
                  text: (el.innerText || '').slice(0, 30),
                  class: el.className ? el.className.toString().slice(0, 50) : '',
                  right: Math.round(r.right),
                  width: Math.round(r.width),
                });
              }
            }
          }
          return { hasOverflow: maxW > vW + 1, maxW, vW, overflows: overflows.slice(0, 5) };
        }, vp.width);

        if (hScroll.hasOverflow) {
          report.horizontalScroll.push({ viewport: vp.name, page: pg.name, ...hScroll });
          console.log(
            `[!] H-Scroll on ${pg.name} @ ${vp.name}: maxW ${hScroll.maxW}px > ${vp.width}px`,
          );
        }

        // 2. Small Tap Targets (< 44px)
        const smallTap = await page.evaluate(() => {
          const targets = Array.from(
            document.querySelectorAll(
              'a, button, input:not([type="hidden"]), select, textarea, [role="button"]',
            ),
          );
          const small = [];
          for (const el of targets) {
            const r = el.getBoundingClientRect();
            const s = window.getComputedStyle(el);
            if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue;
            if (r.width === 0 || r.height === 0) continue;
            if (r.height < 44 || r.width < 44) {
              small.push({
                tag: el.tagName,
                text: (
                  el.innerText ||
                  el.getAttribute('aria-label') ||
                  el.name ||
                  el.placeholder ||
                  ''
                )
                  .trim()
                  .slice(0, 30),
                class: el.className ? el.className.toString().slice(0, 50) : '',
                width: Math.round(r.width),
                height: Math.round(r.height),
              });
            }
          }
          return small;
        });

        if (smallTap.length > 0) {
          report.smallTapTargets.push({
            viewport: vp.name,
            page: pg.name,
            count: smallTap.length,
            items: smallTap,
          });
        }

        // 3. Clipped Text
        const clipped = await page.evaluate(() => {
          const nodes = Array.from(
            document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, label, button, a, td, th'),
          );
          const items = [];
          for (const el of nodes) {
            if (el.children.length > 0) continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            const s = window.getComputedStyle(el);
            if (s.display === 'none' || s.visibility === 'hidden') continue;
            if (
              el.scrollWidth > el.clientWidth + 2 &&
              (s.overflow === 'hidden' || s.overflowX === 'hidden') &&
              s.textOverflow !== 'ellipsis'
            ) {
              items.push({
                tag: el.tagName,
                text: (el.innerText || '').slice(0, 30),
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
              });
            }
          }
          return items;
        });

        if (clipped.length > 0) {
          report.clippedText.push({ viewport: vp.name, page: pg.name, items: clipped });
        }

        // Take page screenshot
        await page.screenshot({
          path: path.join(outputDir, `${vp.name}_${pg.name}.png`),
          fullPage: true,
        });
      } catch (err) {
        console.error(`Error on ${pg.name} @ ${vp.name}:`, err.message);
      }
    }

    // Navigation drawer test on mobile
    if (vp.width <= 768) {
      try {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 5000 });
        await page.waitForTimeout(300);
        // Find hamburger menu button
        const menuBtn = await page.$(
          'header button[aria-label*="Navigation Menu"], header button:has(svg)',
        );
        if (menuBtn) {
          await menuBtn.click();
          await page.waitForTimeout(300);
          await page.screenshot({ path: path.join(outputDir, `${vp.name}_nav_drawer_open.png`) });

          // Test closing menu
          const closeBtn = await page.$(
            'header button[aria-label*="Close Navigation Menu"], header button:has(svg)',
          );
          if (closeBtn) {
            await closeBtn.click();
            await page.waitForTimeout(300);
            const isMenuOpen = await page.evaluate(() => {
              const mobileNav = document.querySelector('nav[aria-label="Mobile Navigation"]');
              return mobileNav !== null;
            });
            if (isMenuOpen) {
              report.navDrawer.push({ viewport: vp.name, status: 'failed_to_close' });
            } else {
              await page.screenshot({
                path: path.join(outputDir, `${vp.name}_nav_drawer_closed.png`),
              });
            }
          }
        }
      } catch (e) {
        console.error(`Nav drawer error @ ${vp.name}:`, e.message);
      }
    }

    // Wallet Modal Test
    try {
      await page.goto(`${BASE_URL}/deposit`, { waitUntil: 'domcontentloaded', timeout: 5000 });
      await page.waitForTimeout(300);
      const connectBtn = await page.$('button:has-text("Connect"), header button');
      if (connectBtn) {
        await connectBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(outputDir, `${vp.name}_wallet_modal.png`) });

        const modalInfo = await page.evaluate((vW) => {
          const dialog = document.querySelector(
            '[role="dialog"], div[class*="rk-"], div[class*="modal"]',
          );
          if (!dialog) return { found: false };
          const r = dialog.getBoundingClientRect();
          return {
            found: true,
            width: Math.round(r.width),
            left: Math.round(r.left),
            right: Math.round(r.right),
            overflow: r.right > vW || r.left < 0,
          };
        }, vp.width);

        if (modalInfo && modalInfo.overflow) {
          report.walletModal.push({ viewport: vp.name, details: modalInfo });
        }
      }
    } catch (e) {
      console.error(`Wallet modal error @ ${vp.name}:`, e.message);
    }

    await context.close();
  }

  await browser.close();
  return report;
}

const targetDir =
  process.argv[2] ||
  '/root/.gemini/antigravity-cli/brain/e5eca366-7b7f-498d-995d-69bc4d4233dd/before_qa';
runAudit(targetDir)
  .then((report) => {
    const reportPath = path.join(targetDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nAudit complete! Report saved to ${reportPath}`);
  })
  .catch(console.error);
