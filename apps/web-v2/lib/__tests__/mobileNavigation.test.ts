import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Mobile UI Navigation & /transfer Visibility Suite', () => {
  const mobileNavPath = path.resolve(__dirname, '../../components/common/MobileBottomNav.tsx');
  const desktopNavPath = path.resolve(__dirname, '../../components/common/Navbar.tsx');
  const transferPagePath = path.resolve(__dirname, '../../app/transfer/page.tsx');
  const transferFormPath = path.resolve(__dirname, '../../components/transfer/TransferForm.tsx');

  it('1. MobileBottomNav component must exist and include essential core routes', () => {
    expect(fs.existsSync(mobileNavPath)).toBe(true);
    const content = fs.readFileSync(mobileNavPath, 'utf8');

    // Must include core tabs
    expect(content).toContain("href: '/'");
    expect(content).toContain("href: '/p2p'");
    expect(content).toContain("href: '/staking'");
  });

  it('2. Desktop Navbar must include /transfer', () => {
    expect(fs.existsSync(desktopNavPath)).toBe(true);
    const content = fs.readFileSync(desktopNavPath, 'utf8');

    expect(content).toContain("href: '/transfer'");
    expect(content).toContain("label: 'Transfer'");
  });

  it('3. /transfer page and TransferForm component must exist and be defined', () => {
    expect(fs.existsSync(transferPagePath)).toBe(true);
    expect(fs.existsSync(transferFormPath)).toBe(true);

    const pageContent = fs.readFileSync(transferPagePath, 'utf8');
    const formContent = fs.readFileSync(transferFormPath, 'utf8');

    expect(pageContent).toContain('TransferForm');
    expect(formContent).toContain('export function TransferForm');
    expect(formContent).toContain('Transfer UVBE');
  });

  it('4. Mobile bottom navigation should render primary navigation tabs', () => {
    const content = fs.readFileSync(mobileNavPath, 'utf8');

    // Check default web navigation tabs
    const defaultNavMatch = content.match(/const defaultNavTabs: NavItem\[\] = \[([\s\S]*?)\];/);
    expect(defaultNavMatch).not.toBeNull();

    if (defaultNavMatch) {
      const itemsBlock = defaultNavMatch[1];
      expect(itemsBlock).toContain("'/p2p'");
      expect(itemsBlock).toContain("'/staking'");
      expect(itemsBlock).toContain("'/portfolio'");
      expect(itemsBlock).toContain("'/transfer'");
    }

    // Check native APK navigation tabs
    expect(content).toContain("href: '/settings'");
    expect(content).toContain("label: 'Settings'");
  });

  it('5. P2P navigation item must be labeled "P2P" in both Navbar and MobileBottomNav', () => {
    const desktopContent = fs.readFileSync(desktopNavPath, 'utf8');
    const mobileContent = fs.readFileSync(mobileNavPath, 'utf8');

    expect(desktopContent).toContain("{ href: '/p2p', label: 'P2P'");
    expect(mobileContent).toContain("{ href: '/p2p', label: 'P2P'");
  });
});
