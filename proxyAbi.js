// UNIFIED PROXY ABI - Combines Core + Types functions for proxy pattern
// All functions are called through the proxy contract
// Proxy uses delegatecall to execute logic in implementations while keeping storage in proxy

export const PREDICTION_MARKET_PROXY_ABI = [
  // ==================== VIEW FUNCTIONS (Both Core & Types) ====================
  
  // marketCounter - shared across all market types
  {
    "inputs": [],
    "name": "marketCounter",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // vouchersContract - getter for the BetVouchers contract address
  {
    "inputs": [],
    "name": "vouchersContract",
    "outputs": [{"internalType": "address","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // markets mapping - public getter for Market struct
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "markets",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256","name": "id","type": "uint256"},
          {"internalType": "enum PredictionMarketBase.MarketType","name": "marketType","type": "uint8"},
          {"internalType": "string","name": "asset","type": "string"},
          {"internalType": "uint256","name": "startTime","type": "uint256"},
          {"internalType": "uint256","name": "endTime","type": "uint256"},
          {"internalType": "int256","name": "startPrice","type": "int256"},
          {"internalType": "int256","name": "endPrice","type": "int256"},
          {"internalType": "uint256","name": "yesPool","type": "uint256"},
          {"internalType": "uint256","name": "noPool","type": "uint256"},
          {"internalType": "bool","name": "resolved","type": "bool"},
          {"internalType": "bool","name": "priceWentUp","type": "bool"},
          {"internalType": "uint256","name": "totalBets","type": "uint256"},
          {"internalType": "bool","name": "useFixedOdds","type": "bool"},
          {"internalType": "uint256","name": "yesMultiplier","type": "uint256"},
          {"internalType": "uint256","name": "noMultiplier","type": "uint256"},
          {"internalType": "uint256","name": "protocolFee","type": "uint256"},
          {"internalType": "bool","name": "useTimeDecay","type": "bool"},
          {"internalType": "uint256","name": "decayStartTime","type": "uint256"},
          {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
        ],
        "internalType": "struct PredictionMarketBase.Market",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // User positions
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "address","name": "user","type": "address"}
    ],
    "name": "getUserPositionsInMarket",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256","name": "marketId","type": "uint256"},
          {"internalType": "address","name": "user","type": "address"},
          {"internalType": "bool","name": "predictedUp","type": "bool"},
          {"internalType": "uint8","name": "choice","type": "uint8"},
          {"internalType": "uint256","name": "amount","type": "uint256"},
          {"internalType": "bool","name": "claimed","type": "bool"},
          {"internalType": "uint256","name": "effectiveMultiplier","type": "uint256"}
        ],
        "internalType": "struct PredictionMarketBase.Position[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // Odds and multipliers
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getCurrentOdds",
    "outputs": [{"internalType": "uint256[]","name": "multipliers","type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "name": "getCurrentOddsAdvanced",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "marketId", "type": "uint256"}],
    "outputs": [{"name": "multipliers", "type": "uint256[]"}]
  },
  
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8","name": "choice","type": "uint8"}
    ],
    "name": "getEffectiveMultiplier",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },

  // Time decay
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getDecayStatus",
    "outputs": [
      {"internalType": "bool","name": "isDecaying","type": "bool"},
      {"internalType": "uint256","name": "decayProgress","type": "uint256"},
      {"internalType": "uint256","name": "currentMultiplier","type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // Payout calculation
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8","name": "choice","type": "uint8"},
      {"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "calculatePotentialPayout",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },

  // Advanced market data (Types contract functions)
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getMultiChoiceOptions",
    "outputs": [{"internalType": "string[]","name": "","type": "string[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getRangeMarketData",
    "outputs": [
      {"internalType": "uint256[]","name": "mins","type": "uint256[]"},
      {"internalType": "uint256[]","name": "maxs","type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getTimeMarketData",
    "outputs": [
      {"internalType": "uint256","name": "targetPrice","type": "uint256"},
      {"internalType": "uint256[]","name": "timeframes","type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "name": "getTotalPool",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "marketId", "type": "uint256"}],
    "outputs": [{"name": "", "type": "uint256"}]
  },



  // ==================== WRITE FUNCTIONS - BINARY MARKETS (Core) ====================
  
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "uint256","name": "duration","type": "uint256"},
      {"internalType": "uint256","name": "yesMultiplier","type": "uint256"},
      {"internalType": "uint256","name": "noMultiplier","type": "uint256"},
      {"internalType": "bool","name": "useTimeDecay","type": "bool"},
      {"internalType": "uint256","name": "decayStartPercent","type": "uint256"},
      {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
    ],
    "name": "createMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8","name": "choice","type": "uint8"},
      {"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "placeBet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "resolveMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "claimWinnings",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ==================== WRITE FUNCTIONS - ADVANCED MARKETS (Types) ====================
  
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "string[]","name": "options","type": "string[]"},
      {"internalType": "string","name": "question","type": "string"},
      {"internalType": "uint256","name": "duration","type": "uint256"},
      {"internalType": "uint256[]","name": "multipliers","type": "uint256[]"},
      {"internalType": "bool","name": "useTimeDecay","type": "bool"},
      {"internalType": "uint256","name": "decayStartPercent","type": "uint256"},
      {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
    ],
    "name": "createMultiChoiceMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "uint256[]","name": "rangeMins","type": "uint256[]"},
      {"internalType": "uint256[]","name": "rangeMaxs","type": "uint256[]"},
      {"internalType": "uint256","name": "duration","type": "uint256"},
      {"internalType": "uint256[]","name": "multipliers","type": "uint256[]"},
      {"internalType": "bool","name": "useTimeDecay","type": "bool"},
      {"internalType": "uint256","name": "decayStartPercent","type": "uint256"},
      {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
    ],
    "name": "createRangeMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "uint256","name": "targetPrice","type": "uint256"},
      {"internalType": "uint256[]","name": "timeframes","type": "uint256[]"},
      {"internalType": "uint256[]","name": "multipliers","type": "uint256[]"},
      {"internalType": "bool","name": "useTimeDecay","type": "bool"},
      {"internalType": "uint256","name": "decayStartPercent","type": "uint256"},
      {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
    ],
    "name": "createTimeMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Advanced betting
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8", "name": "choice", "type": "uint8"},
      {"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "placeBetAdvanced",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Advanced resolution
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8","name": "winningOption","type": "uint8"}
    ],
    "name": "resolveMultiChoiceMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "resolveRangeMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "resolveTimeMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Advanced claim
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "claimWinningsAdvanced",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ==================== ADMIN FUNCTIONS ====================
  
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "address","name": "feedAddress","type": "address"}
    ],
    "name": "setPriceFeed",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [],
    "name": "withdrawFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [{"internalType": "address","name": "_vouchersContract","type": "address"}],
    "name": "setVouchersContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ==================== PROXY-SPECIFIC FUNCTIONS ====================
  
  {
    "inputs": [{"internalType": "bytes4","name": "selector","type": "bytes4"}],
    "name": "implementations",
    "outputs": [{"internalType": "address","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [],
    "name": "defaultImplementation",
    "outputs": [{"internalType": "address","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [
      {"internalType": "bytes4","name": "selector","type": "bytes4"},
      {"internalType": "address","name": "implementation","type": "address"}
    ],
    "name": "setImplementation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [{"internalType": "address","name": "implementation","type": "address"}],
    "name": "setDefaultImplementation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [{"internalType": "address","name": "newImplementation","type": "address"}],
    "name": "upgradeTo",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ==================== EVENTS ====================
  
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "uint256","name": "marketId","type": "uint256"},
      {"indexed": false,"internalType": "enum PredictionMarketBase.MarketType","name": "marketType","type": "uint8"},
      {"indexed": false,"internalType": "string","name": "asset","type": "string"},
      {"indexed": false,"internalType": "bool","name": "useFixedOdds","type": "bool"},
      {"indexed": false,"internalType": "bool","name": "useTimeDecay","type": "bool"}
    ],
    "name": "MarketCreated",
    "type": "event"
  },
  
{
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint8", "name": "choice", "type": "uint8" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "effectiveMultiplier", "type": "uint256" }
    ],
    "name": "BetPlaced",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "uint256","name": "marketId","type": "uint256"},
      {"indexed": false,"internalType": "uint8","name": "winningChoice","type": "uint8"},
      {"indexed": false,"internalType": "uint256","name": "protocolFee","type": "uint256"}
    ],
    "name": "MarketResolved",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "uint256","name": "marketId","type": "uint256"},
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "WinningsClaimed",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "bytes4","name": "selector","type": "bytes4"},
      {"indexed": true,"internalType": "address","name": "implementation","type": "address"}
    ],
    "name": "ImplementationSet",
    "type": "event"
  },
  
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "implementation","type": "address"}
    ],
    "name": "DefaultImplementationSet",
    "type": "event"
  }
];
