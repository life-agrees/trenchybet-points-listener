import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// === CONFIG ===
const ALCHEMY_URL = `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
const CONTRACT_ADDRESS = process.env.PREDICTION_MARKET_ADDRESS;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Viem client
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(ALCHEMY_URL),
});

// === POINTS CALCULATION ===
const POINTS_PER_DOLLAR = 10; // 10 points per $1 USDC
const WIN_MULTIPLIER = 5; // 5x points on wins

// === AWARD POINTS FUNCTION ===
async function awardPoints(wallet, points, source, metadata = {}) {
  try {
    // 1. Insert into ledger
    const { error: ledgerError } = await supabase
      .from('points_ledger')
      .insert({
        wallet_address: wallet.toLowerCase(),
        points_earned: points,
        source: source,
        bet_id: metadata.betId || null,
        market_id: metadata.marketId || null,
        metadata: metadata
      });

    if (ledgerError) throw ledgerError;

    // 2. Update user total
    const { data: user } = await supabase
      .from('users')
      .select('total_points')
      .eq('wallet_address', wallet.toLowerCase())
      .single();

    if (user) {
      // User exists, update
      await supabase
        .from('users')
        .update({ 
          total_points: user.total_points + points,
          last_bet_timestamp: new Date().toISOString()
        })
        .eq('wallet_address', wallet.toLowerCase());
    } else {
      // New user, insert
      await supabase
        .from('users')
        .insert({
          wallet_address: wallet.toLowerCase(),
          total_points: points,
          last_bet_timestamp: new Date().toISOString()
        });
    }

    console.log(`✅ Awarded ${points} points to ${wallet} (${source})`);
  } catch (error) {
    console.error('❌ Error awarding points:', error);
  }
}

// === EVENT HANDLERS ===

// Handler for BetPlaced event
async function handleBetPlaced(log) {
  const { marketId, user, amount } = log.args;
  
  // Calculate base points (10 points per $1 USDC)
  const usdcAmount = Number(formatUnits(amount, 6));
  const basePoints = Math.floor(usdcAmount * POINTS_PER_DOLLAR);
  
  await awardPoints(user, basePoints, 'bet_volume', {
    marketId: Number(marketId),
    betAmount: usdcAmount
  });
}

// Handler for WinningsClaimed event (detects wins)
async function handleWinningsClaimed(log) {
  const { marketId, user, amount: payout } = log.args;
  
  // Get the original bet amount from the market
  // We need to find the bet in points_ledger
  const { data: betRecord } = await supabase
    .from('points_ledger')
    .select('metadata')
    .eq('wallet_address', user.toLowerCase())
    .eq('market_id', Number(marketId))
    .eq('source', 'bet_volume')
    .single();

  if (betRecord && betRecord.metadata.betAmount) {
    const originalBet = betRecord.metadata.betAmount;
    const winBonus = Math.floor(originalBet * POINTS_PER_DOLLAR * WIN_MULTIPLIER);
    
    await awardPoints(user, winBonus, 'win_bonus', {
      marketId: Number(marketId),
      payout: Number(formatUnits(payout, 6))
    });
  }
}

// === MAIN LISTENER ===
async function startListener() {
  console.log('🚀 TrenchyBet Points Listener Starting...');
  console.log(`📍 Watching contract: ${CONTRACT_ADDRESS}`);
  
  // Get the latest block we've processed
  let fromBlock = 'latest';
  
  // Listen for BetPlaced events
  const unwatchBetPlaced = publicClient.watchContractEvent({
    address: CONTRACT_ADDRESS,
    event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
    onLogs: async (logs) => {
      for (const log of logs) {
        await handleBetPlaced(log);
      }
    },
  });

  // Listen for WinningsClaimed events
  const unwatchClaimed = publicClient.watchContractEvent({
    address: CONTRACT_ADDRESS,
    event: parseAbiItem('event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)'),
    onLogs: async (logs) => {
      for (const log of logs) {
        await handleWinningsClaimed(log);
      }
    },
  });

  console.log('✅ Listening for events...');
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping listener...');
    unwatchBetPlaced();
    unwatchClaimed();
    process.exit(0);
  });
}

// Start the listener
startListener().catch(console.error);