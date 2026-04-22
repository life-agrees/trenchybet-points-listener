// =====================================================
// TRENCHYBET POINTS - EVENT LISTENER (Flexible RPC)
// =====================================================
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';
import { PREDICTION_MARKET_PROXY_ABI } from './proxyAbi.js';
import 'dotenv/config';

// === CONFIG ===
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Prefer Alchemy if API key is set, otherwise fall back to Base Sepolia RPC
const RPC_URL = ALCHEMY_API_KEY
  ? `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  : BASE_SEPOLIA_RPC_URL;

console.log(`🔌 Using RPC provider: ${RPC_URL.includes('alchemy') ? 'Alchemy' : 'Base Sepolia RPC'}`);

// Proxy contract (all events emitted here)
const PROXY_CONTRACT_ADDRESS = process.env.PROXY_ADDRESS || "0x2d1d11Fb8A0C899c681C2D66b555eF37650fdFC8";

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Viem client
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// === POINTS CALCULATION ===
const POINTS_PER_DOLLAR = 10; // 10 points per $1 USDC
const WIN_MULTIPLIER = 2;     // 2x points on wins (3:1 winner:loser ratio)

// === ENSURE USER EXISTS ===
async function ensureUserExists(wallet) {
  const address = wallet.toLowerCase();
  const { error } = await supabase
    .from('users')
    .upsert({
      wallet_address: address,
      total_points: 0,
      last_bet_timestamp: new Date().toISOString()
    }, { onConflict: 'wallet_address' });

  if (error) throw error;
  console.log(`✅ User ensured: ${address.slice(0, 6)}...${address.slice(-4)}`);
}

// === AWARD POINTS FUNCTION ===
async function awardPoints(wallet, points, source, metadata = {}) {
  try {
    const address = wallet.toLowerCase();
    await ensureUserExists(address);

    const { error: ledgerError } = await supabase
      .from('points_ledger')
      .insert({
        wallet_address: address,
        points_earned: points,
        source,
        bet_id: metadata.betId || null,
        market_id: metadata.marketId || null,
        metadata
      });

    if (ledgerError) {
      console.error('Ledger error:', ledgerError);
      return;
    }

    const { data: user } = await supabase
      .from('users')
      .select('total_points')
      .eq('wallet_address', address)
      .single();

    if (user) {
      await supabase
        .from('users')
        .update({
          total_points: user.total_points + points,
          last_bet_timestamp: new Date().toISOString()
        })
        .eq('wallet_address', address);
    }

    console.log(`💰 Awarded ${points} points to ${address.slice(0, 6)}...${address.slice(-4)} (${source})`);
  } catch (error) {
    console.error('❌ Error awarding points:', error.message);
  }
}

// === EVENT HANDLERS ===
async function handleBetPlaced(log) {
  try {
    if (!log.args?.user || !log.args?.amount) return;
    const { marketId, user, amount } = log.args;
    const usdcAmount = Number(formatUnits(amount, 6));
    const basePoints = Math.floor(usdcAmount * POINTS_PER_DOLLAR);

    console.log(`📊 Bet detected: Market ${marketId}, ${usdcAmount} USDC → ${basePoints} points`);
    await awardPoints(user, basePoints, 'bet_volume', {
      marketId: Number(marketId),
      betAmount: usdcAmount,
      txHash: log.transactionHash
    });
    
    const betPayload = {
      market_id: Number(marketId),
      wallet_address: user.toLowerCase(),
      choice: Number(log.args.choice),
      amount: usdcAmount,
      multiplier: Number(log.args.effectiveMultiplier || 0),
      tx_hash: log.transactionHash,
      block_number: Number(log.blockNumber)
    };

    let { error: upsertErr } = await supabase.from('user_bets').upsert(betPayload, { onConflict: 'tx_hash' });
    
    if (upsertErr) {
      // Postgres Error 23503 is 'foreign_key_violation'
      const isFkError = upsertErr.code === '23503' || String(upsertErr.message).toLowerCase().includes('foreign key constraint');
      
      if (isFkError) {
        console.log(`⚠️ Market ${marketId} missing from database. Self-healing...`);
        // Manually trigger market fetch & insert
        await handleMarketCreated({ args: { marketId } });
        
        // Retry bet insertion
        const retry = await supabase.from('user_bets').upsert(betPayload, { onConflict: 'tx_hash' });
        if (retry.error) console.error(`❌ Failed to retry bet index for market ${marketId}:`, retry.error.message);
        else console.log(`✅ Successfully recovered and indexed bet for market ${marketId}`);
      } else {
        console.error(`❌ Failed to index bet for market ${marketId}:`, upsertErr.message, upsertErr.code);
      }
    }

  } catch (error) {
    console.error('❌ Error in handleBetPlaced:', error.message);
  }
}

async function handleWinningsClaimed(log) {
  try {
    if (!log.args?.user || !log.args?.amount) return;
    const { marketId, user, amount: payout } = log.args;
    if (payout === 0n) return;

    const { data: betRecord } = await supabase
      .from('points_ledger')
      .select('metadata')
      .eq('wallet_address', user.toLowerCase())
      .eq('market_id', Number(marketId))
      .eq('source', 'bet_volume')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (betRecord?.metadata?.betAmount) {
      const originalBet = betRecord.metadata.betAmount;
      const winBonus = Math.floor(originalBet * POINTS_PER_DOLLAR * WIN_MULTIPLIER);

      console.log(`🏆 Win detected: Market ${marketId}, ${Number(formatUnits(payout, 6))} USDC → ${winBonus} bonus points`);
      await awardPoints(user, winBonus, 'win_bonus', {
        marketId: Number(marketId),
        payout: Number(formatUnits(payout, 6)),
        txHash: log.transactionHash
      });
    }

    // [INDEXER] Update bet as claimed
    await supabase.from('user_bets').update({ claimed: true })
      .eq('market_id', Number(marketId))
      .eq('wallet_address', user.toLowerCase());
      
  } catch (error) {
    console.error('❌ Error in handleWinningsClaimed:', error.message);
  }
}

async function handleMarketCreated(log) {
  try {
    const marketId = Number(log.args.marketId);
    
    // Read full market data using correct ABI
    const raw = await publicClient.readContract({
      address: PROXY_CONTRACT_ADDRESS,
      abi: PREDICTION_MARKET_PROXY_ABI,
      functionName: 'markets',
      args: [BigInt(marketId)]
    });

    // Extract correct indices based on contract return tuple:
    // 0: id, 1: marketType, 2: asset, 3: startTime, 4: endTime
    const startTime = Number(raw[3]);
    const endTime = Number(raw[4]);

    await supabase.from('markets').upsert({
      id: marketId,
      market_type: Number(raw[1]),
      asset: String(raw[2]),
      start_time: startTime > 0 ? new Date(startTime * 1000).toISOString() : new Date().toISOString(),
      end_time: endTime > 0 ? new Date(endTime * 1000).toISOString() : new Date(Date.now() + 86400000).toISOString(),
      resolved: false
    });
    console.log(`✅ Indexed MarketCreated: ${marketId}`);
  } catch (err) {
    // Only log if not a 'not found' error (it might be a deleted/legacy market)
    console.error(`❌ Error indexing MarketCreated ${log.args.marketId}:`, err.message);
  }
}

async function handleMarketResolved(log) {
  try {
    const marketId = Number(log.args.marketId);
    
    // Read full market data using correct ABI
    const raw = await publicClient.readContract({
      address: PROXY_CONTRACT_ADDRESS,
      abi: PREDICTION_MARKET_PROXY_ABI,
      functionName: 'markets',
      args: [BigInt(marketId)]
    });

    // Extract correct indices from full tuple:
    // 9: resolved, 10: priceWentUp
    const isResolved = Boolean(raw[9]);
    const priceWentUp = Boolean(raw[10]);

    await supabase.from('markets').update({
      resolved: true,
      winning_choice: log.args.winningChoice !== undefined ? Number(log.args.winningChoice) : null,
      price_went_up: priceWentUp
    }).eq('id', marketId);
    console.log(`✅ Indexed MarketResolved: ${marketId}`);
  } catch (err) {
    console.error(`❌ Error indexing MarketResolved ${log.args.marketId}:`, err.message);
  }
}

// === POLLING LISTENER ===
async function startListener() {
  console.log('🚀 TrenchyBet Points Listener Starting...');
  console.log(`📍 Watching Proxy: ${PROXY_CONTRACT_ADDRESS}`);
  const currentBlock = await publicClient.getBlockNumber();
  const LOOK_BACK = 3000000n; // ~17 days Base Sepolia, aligned with useUserBets.js
  let lastProcessedBlock = currentBlock > LOOK_BACK ? currentBlock - LOOK_BACK : 0n;
  console.log(`📦 Starting from block: ${lastProcessedBlock} (scanning back 3M blocks ~17 days)`);
  console.log('✅ Listening for events...\n');

  let isProcessing = false;

  setInterval(async () => {
    if (isProcessing) return;
    
    try {
      isProcessing = true;
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock <= lastProcessedBlock) {
        isProcessing = false;
        return;
      }

      const CHUNK_SIZE = 9999n;
      let from = lastProcessedBlock + 1n;

      while (from <= currentBlock) {
        const to = from + CHUNK_SIZE > currentBlock ? currentBlock : from + CHUNK_SIZE;
        console.log(`🔍 Scanning blocks ${from} to ${to}...`);

        const [betLogs, winLogs, marketLogs, resolvedLogs] = await Promise.all([
          publicClient.getLogs({
            address: PROXY_CONTRACT_ADDRESS,
            event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier)'),
            fromBlock: from, toBlock: to,
          }),
          publicClient.getLogs({
            address: PROXY_CONTRACT_ADDRESS,
            event: parseAbiItem('event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)'),
            fromBlock: from, toBlock: to,
          }),
          publicClient.getLogs({
            address: PROXY_CONTRACT_ADDRESS,
            event: parseAbiItem('event MarketCreated(uint256 indexed marketId, uint8 marketType, string asset, bool useFixedOdds, bool useTimeDecay)'),
            fromBlock: from, toBlock: to,
          }),
          publicClient.getLogs({
            address: PROXY_CONTRACT_ADDRESS,
            event: parseAbiItem('event MarketResolved(uint256 indexed marketId, uint8 winningChoice, uint256 protocolFee)'),
            fromBlock: from, toBlock: to,
          })
        ]);

        for (const log of marketLogs) await handleMarketCreated(log);
        for (const log of betLogs) await handleBetPlaced(log);
        for (const log of resolvedLogs) await handleMarketResolved(log);
        for (const log of winLogs) await handleWinningsClaimed(log);

        if (betLogs.length || winLogs.length || marketLogs.length || resolvedLogs.length) {
          console.log(`✅ Processed ${marketLogs.length} markets, ${betLogs.length} bets, ${resolvedLogs.length} resolved, ${winLogs.length} wins`);
        }

        from = to + 1n;
        lastProcessedBlock = to;
        
        // Wait 300ms between chunks to prevent RPC rate-limits (HTTP 429)
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error('❌ Error in polling loop:', error.message);
    } finally {
      isProcessing = false;
    }
  }, 5000);
}

// === STARTUP ===
async function main() {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error) throw new Error('Supabase connection failed: ' + error.message);

    console.log('✅ Connected to Supabase');
    await startListener();
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

main();
