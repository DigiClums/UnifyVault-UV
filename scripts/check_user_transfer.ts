import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const TOKEN = '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as Address;
const USER_EOA = '0xd905920c91853039060246ed5724aa72b91a96da' as Address;
const USER_SMART_ACCOUNT = '0xbC4fddb68d9bcb8F85e7Dc6fAA68de744653C739' as Address;

const ERC20_ABI = parseAbi(['function balanceOf(address account) external view returns (uint256)']);

async function main() {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const [eoaBal, saBal] = await Promise.all([
    client.readContract({
      address: TOKEN,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [USER_EOA],
    }),
    client.readContract({
      address: TOKEN,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [USER_SMART_ACCOUNT],
    }),
  ]);

  console.log('User EOA:', USER_EOA);
  console.log('User EOA UVBE Balance:', eoaBal.toString(), `(${Number(eoaBal) / 1e18} UVBE)`);
  console.log('User Smart Account:', USER_SMART_ACCOUNT);
  console.log(
    'User Smart Account UVBE Balance:',
    saBal.toString(),
    `(${Number(saBal) / 1e18} UVBE)`,
  );
}

main().catch(console.error);
