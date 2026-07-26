use anchor_lang::prelude::*;

/// Prediction game configuration - singleton account
#[account]
pub struct PredictionConfig {
    /// Admin authority who can update config
    pub authority: Pubkey,
    /// Wallet where house fees are sent
    pub fee_wallet: Pubkey,
    /// House fee in basis points (500 = 5%)
    pub house_fee_bps: u16,
    /// Minimum bet in lamports (10_000_000 = 0.01 SOL)
    pub min_bet_lamports: u64,
    /// Round duration in seconds (120 = 2 minutes)
    pub round_duration_seconds: i64,
    /// Current round ID (auto-incrementing)
    pub current_round_id: u64,
    /// Total rounds played (stats)
    pub total_rounds_played: u64,
    /// Total fees collected in lamports (stats)
    pub total_fees_collected: u64,
    /// Pyth SOL/USD price feed address
    pub pyth_price_feed: Pubkey,
    /// PDA bump
    pub bump: u8,
}

impl PredictionConfig {
    pub const LEN: usize = 8 + // discriminator
        32 +    // authority
        32 +    // fee_wallet
        2 +     // house_fee_bps
        8 +     // min_bet_lamports
        8 +     // round_duration_seconds
        8 +     // current_round_id
        8 +     // total_rounds_played
        8 +     // total_fees_collected
        32 +    // pyth_price_feed
        1;      // bump
}

/// Prediction direction
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum PredictionDirection {
    Up,
    Down,
}

/// Round status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PredictionRoundStatus {
    /// Accepting bets
    Active,
    /// Betting locked, waiting for price settlement
    Locked,
    /// Price settled, payouts distributed
    Settled,
    /// Cancelled/refunded (e.g., no bets on one side)
    Cancelled,
}

/// Individual prediction round
#[account]
pub struct PredictionRound {
    /// Unique round identifier
    pub round_id: u64,
    /// Unix timestamp when round started
    pub start_timestamp: i64,
    /// Unix timestamp when betting ends and price locks
    pub lock_timestamp: i64,
    /// Unix timestamp when round settles
    pub settle_timestamp: i64,
    /// Total lamports in UP pool
    pub up_pool: u64,
    /// Total lamports in DOWN pool
    pub down_pool: u64,
    /// Number of UP bettors
    pub up_count: u32,
    /// Number of DOWN bettors
    pub down_count: u32,
    /// SOL/USD price at lock time (scaled by 10^8)
    pub lock_price: i64,
    /// SOL/USD price at settle time (scaled by 10^8)
    pub settle_price: i64,
    /// Current status
    pub status: PredictionRoundStatus,
    /// Winning direction (set after settlement)
    pub winning_direction: PredictionDirection,
    /// Whether result is set
    pub result_set: bool,
    /// Total payouts distributed
    pub total_payouts: u64,
    /// House fee collected this round
    pub fee_collected: u64,
    /// PDA bump
    pub bump: u8,
}

impl PredictionRound {
    pub const LEN: usize = 8 + // discriminator
        8 +     // round_id
        8 +     // start_timestamp
        8 +     // lock_timestamp
        8 +     // settle_timestamp
        8 +     // up_pool
        8 +     // down_pool
        4 +     // up_count
        4 +     // down_count
        8 +     // lock_price
        8 +     // settle_price
        1 +     // status (enum)
        1 +     // winning_direction (enum)
        1 +     // result_set
        8 +     // total_payouts
        8 +     // fee_collected
        1;      // bump
}

/// Player's prediction entry for a round
#[account]
pub struct PredictionEntry {
    /// Round this entry belongs to
    pub round_id: u64,
    /// Player's wallet
    pub player: Pubkey,
    /// Prediction direction (Up or Down)
    pub direction: PredictionDirection,
    /// Amount bet in lamports
    pub bet_amount: u64,
    /// Entry timestamp
    pub entry_timestamp: i64,
    /// Whether payout has been claimed
    pub claimed: bool,
    /// Payout amount (set after settlement)
    pub payout_amount: u64,
    /// PDA bump
    pub bump: u8,
}

impl PredictionEntry {
    pub const LEN: usize = 8 + // discriminator
        8 +     // round_id
        32 +    // player
        1 +     // direction (enum)
        8 +     // bet_amount
        8 +     // entry_timestamp
        1 +     // claimed
        8 +     // payout_amount
        1;      // bump
}
