use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

mod state;
pub use state::*;

declare_id!("GG4SHU9dJNRGrWfWXmtDtFsX2jpYEhKjHkZBdn5X8fzt");

// Price is provided by the trusted authority (backend) which fetches from Pyth Hermes API
// This simplifies the on-chain logic and avoids Pyth SDK version conflicts

#[program]
pub mod prediction_game {
    use super::*;

    /// Initialize the prediction game configuration
    pub fn initialize_prediction(
        ctx: Context<InitializePrediction>,
        house_fee_bps: u16,
        min_bet_lamports: u64,
        round_duration_seconds: i64,
    ) -> Result<()> {
        require!(house_fee_bps <= 1000, PredictionError::InvalidFee); // Max 10%
        require!(min_bet_lamports >= 1_000_000, PredictionError::InvalidMinBet); // Min 0.001 SOL
        require!(round_duration_seconds >= 60, PredictionError::InvalidDuration); // Min 1 minute

        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.fee_wallet = ctx.accounts.fee_wallet.key();
        config.house_fee_bps = house_fee_bps;
        config.min_bet_lamports = min_bet_lamports;
        config.round_duration_seconds = round_duration_seconds;
        config.current_round_id = 0;
        config.total_rounds_played = 0;
        config.total_fees_collected = 0;
        config.pyth_price_feed = ctx.accounts.pyth_price_feed.key();
        config.bump = ctx.bumps.config;

        msg!("Prediction game initialized");
        Ok(())
    }

    /// Start a new prediction round
    pub fn start_round(ctx: Context<StartRound>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let round = &mut ctx.accounts.round;
        let clock = Clock::get()?;

        // Increment round ID
        config.current_round_id += 1;

        // Initialize round
        round.round_id = config.current_round_id;
        round.start_timestamp = clock.unix_timestamp;
        round.lock_timestamp = clock.unix_timestamp + config.round_duration_seconds;
        round.settle_timestamp = round.lock_timestamp + 10; // 10 seconds after lock to settle
        round.up_pool = 0;
        round.down_pool = 0;
        round.up_count = 0;
        round.down_count = 0;
        round.lock_price = 0;
        round.settle_price = 0;
        round.status = PredictionRoundStatus::Active;
        round.winning_direction = PredictionDirection::Up; // Default, will be set on settle
        round.result_set = false;
        round.total_payouts = 0;
        round.fee_collected = 0;
        round.bump = ctx.bumps.round;

        msg!("Round {} started, locks at {}", round.round_id, round.lock_timestamp);
        Ok(())
    }

    /// Place a prediction bet (UP or DOWN)
    pub fn place_prediction(
        ctx: Context<PlacePrediction>,
        direction: PredictionDirection,
        amount: u64,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let round = &mut ctx.accounts.round;
        let entry = &mut ctx.accounts.entry;
        let clock = Clock::get()?;

        // Validate bet
        require!(amount >= config.min_bet_lamports, PredictionError::BetTooSmall);
        require!(round.status == PredictionRoundStatus::Active, PredictionError::RoundNotActive);
        require!(clock.unix_timestamp < round.lock_timestamp, PredictionError::BettingClosed);

        // Transfer SOL from player to round PDA
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: round.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update round pools
        match direction {
            PredictionDirection::Up => {
                round.up_pool = round.up_pool.checked_add(amount).unwrap();
                round.up_count = round.up_count.checked_add(1).unwrap();
            }
            PredictionDirection::Down => {
                round.down_pool = round.down_pool.checked_add(amount).unwrap();
                round.down_count = round.down_count.checked_add(1).unwrap();
            }
        }

        // Initialize player entry
        entry.round_id = round.round_id;
        entry.player = ctx.accounts.player.key();
        entry.direction = direction;
        entry.bet_amount = amount;
        entry.entry_timestamp = clock.unix_timestamp;
        entry.claimed = false;
        entry.payout_amount = 0;
        entry.bump = ctx.bumps.entry;

        msg!(
            "Player {} bet {} lamports on {:?}",
            entry.player,
            amount,
            direction
        );
        Ok(())
    }

    /// Lock the round with price from authority (fetched from Pyth Hermes API)
    /// Price is passed as i64 (raw price with exponent -8, e.g., 12806000000 = $128.06)
    pub fn lock_round(ctx: Context<LockRound>, price: i64) -> Result<()> {
        let round = &mut ctx.accounts.round;
        let clock = Clock::get()?;

        require!(round.status == PredictionRoundStatus::Active, PredictionError::RoundNotActive);
        require!(clock.unix_timestamp >= round.lock_timestamp, PredictionError::TooEarlyToLock);
        require!(price > 0, PredictionError::InvalidPrice);

        round.lock_price = price;
        round.status = PredictionRoundStatus::Locked;

        msg!("Round {} locked at price {}", round.round_id, price);
        Ok(())
    }

    /// Settle the round with price from authority (fetched from Pyth Hermes API)
    /// Price is passed as i64 (raw price with exponent -8, e.g., 12806000000 = $128.06)
    pub fn settle_round(ctx: Context<SettleRound>, price: i64) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let round = &mut ctx.accounts.round;
        let clock = Clock::get()?;

        require!(round.status == PredictionRoundStatus::Locked, PredictionError::RoundNotLocked);
        require!(clock.unix_timestamp >= round.settle_timestamp, PredictionError::TooEarlyToSettle);
        require!(price > 0, PredictionError::InvalidPrice);

        round.settle_price = price;

        // Determine winner
        if round.settle_price > round.lock_price {
            round.winning_direction = PredictionDirection::Up;
        } else if round.settle_price < round.lock_price {
            round.winning_direction = PredictionDirection::Down;
        } else {
            // Price unchanged - refund everyone (cancel round)
            round.status = PredictionRoundStatus::Cancelled;
            msg!("Round {} cancelled - price unchanged", round.round_id);
            return Ok(());
        }

        // Check if there are bets on both sides
        let (winning_pool, losing_pool) = match round.winning_direction {
            PredictionDirection::Up => (round.up_pool, round.down_pool),
            PredictionDirection::Down => (round.down_pool, round.up_pool),
        };

        if winning_pool == 0 || losing_pool == 0 {
            // No bets on one side - refund everyone
            round.status = PredictionRoundStatus::Cancelled;
            msg!("Round {} cancelled - no bets on one side", round.round_id);
            return Ok(());
        }

        // Calculate house fee from losing pool
        let fee = losing_pool
            .checked_mul(config.house_fee_bps as u64)
            .unwrap()
            .checked_div(10000)
            .unwrap();

        round.fee_collected = fee;
        round.total_payouts = winning_pool + losing_pool - fee;
        round.result_set = true;
        round.status = PredictionRoundStatus::Settled;

        // Update config stats
        config.total_rounds_played += 1;
        config.total_fees_collected += fee;

        // Transfer fee to fee wallet
        **round.to_account_info().try_borrow_mut_lamports()? -= fee;
        **ctx.accounts.fee_wallet.try_borrow_mut_lamports()? += fee;

        msg!(
            "Round {} settled. Lock: {}, Settle: {}, Winner: {:?}, Payouts: {}",
            round.round_id,
            round.lock_price,
            round.settle_price,
            round.winning_direction,
            round.total_payouts
        );
        Ok(())
    }

    /// Claim payout for a winning prediction
    pub fn claim_payout(ctx: Context<ClaimPayout>) -> Result<()> {
        let round = &ctx.accounts.round;
        let entry = &mut ctx.accounts.entry;

        require!(round.status == PredictionRoundStatus::Settled, PredictionError::RoundNotSettled);
        require!(!entry.claimed, PredictionError::AlreadyClaimed);
        require!(entry.direction == round.winning_direction, PredictionError::NotAWinner);

        // Calculate payout
        let (winning_pool, losing_pool) = match round.winning_direction {
            PredictionDirection::Up => (round.up_pool, round.down_pool),
            PredictionDirection::Down => (round.down_pool, round.up_pool),
        };

        // Payout = original bet + (bet / winning_pool) * (losing_pool - fee)
        let share_of_winnings = (entry.bet_amount as u128)
            .checked_mul((losing_pool - round.fee_collected) as u128)
            .unwrap()
            .checked_div(winning_pool as u128)
            .unwrap() as u64;

        let total_payout = entry.bet_amount + share_of_winnings;
        entry.payout_amount = total_payout;
        entry.claimed = true;

        // Transfer payout from round PDA to player
        **ctx.accounts.round.to_account_info().try_borrow_mut_lamports()? -= total_payout;
        **ctx.accounts.player.try_borrow_mut_lamports()? += total_payout;

        msg!(
            "Player {} claimed {} lamports (bet: {}, winnings: {})",
            entry.player,
            total_payout,
            entry.bet_amount,
            share_of_winnings
        );
        Ok(())
    }

    /// Claim refund for a cancelled round
    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let round = &ctx.accounts.round;
        let entry = &mut ctx.accounts.entry;

        require!(round.status == PredictionRoundStatus::Cancelled, PredictionError::RoundNotCancelled);
        require!(!entry.claimed, PredictionError::AlreadyClaimed);

        let refund = entry.bet_amount;
        entry.payout_amount = refund;
        entry.claimed = true;

        // Transfer refund from round PDA to player
        **ctx.accounts.round.to_account_info().try_borrow_mut_lamports()? -= refund;
        **ctx.accounts.player.try_borrow_mut_lamports()? += refund;

        msg!("Player {} refunded {} lamports", entry.player, refund);
        Ok(())
    }

    /// Admin force cancel - emergency function to cancel stuck rounds
    /// This bypasses price feed checks and can cancel rounds in any state
    /// Only the config authority can call this
    pub fn admin_force_cancel(ctx: Context<AdminForceCancel>) -> Result<()> {
        let round = &mut ctx.accounts.round;
        let clock = Clock::get()?;

        // Must be past the lock timestamp (round period has ended)
        require!(
            clock.unix_timestamp >= round.lock_timestamp,
            PredictionError::TooEarlyToLock
        );

        // Can only force cancel if not already settled or cancelled
        require!(
            round.status == PredictionRoundStatus::Active ||
            round.status == PredictionRoundStatus::Locked,
            PredictionError::RoundAlreadyFinalized
        );

        // Mark as cancelled - players can now claim refunds
        round.status = PredictionRoundStatus::Cancelled;
        round.result_set = false;

        msg!(
            "Round {} force cancelled by admin. Players can now claim refunds.",
            round.round_id
        );
        Ok(())
    }
}

// ============================================================================
// CONTEXTS
// ============================================================================

#[derive(Accounts)]
pub struct InitializePrediction<'info> {
    #[account(
        init,
        payer = authority,
        space = PredictionConfig::LEN,
        seeds = [b"prediction-config"],
        bump
    )]
    pub config: Account<'info, PredictionConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Fee wallet just receives SOL
    pub fee_wallet: AccountInfo<'info>,

    /// CHECK: Pyth price feed account
    pub pyth_price_feed: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartRound<'info> {
    #[account(
        mut,
        seeds = [b"prediction-config"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, PredictionConfig>,

    #[account(
        init,
        payer = authority,
        space = PredictionRound::LEN,
        seeds = [b"prediction-round", (config.current_round_id + 1).to_le_bytes().as_ref()],
        bump
    )]
    pub round: Account<'info, PredictionRound>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlacePrediction<'info> {
    #[account(
        seeds = [b"prediction-config"],
        bump = config.bump
    )]
    pub config: Account<'info, PredictionConfig>,

    #[account(
        mut,
        seeds = [b"prediction-round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, PredictionRound>,

    #[account(
        init,
        payer = player,
        space = PredictionEntry::LEN,
        seeds = [b"prediction-entry", round.round_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump
    )]
    pub entry: Account<'info, PredictionEntry>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LockRound<'info> {
    #[account(
        seeds = [b"prediction-config"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, PredictionConfig>,

    #[account(
        mut,
        seeds = [b"prediction-round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, PredictionRound>,

    /// Authority provides the price (fetched from Pyth Hermes API off-chain)
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SettleRound<'info> {
    #[account(
        mut,
        seeds = [b"prediction-config"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, PredictionConfig>,

    #[account(
        mut,
        seeds = [b"prediction-round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, PredictionRound>,

    /// CHECK: Fee wallet receives SOL
    #[account(mut)]
    pub fee_wallet: AccountInfo<'info>,

    /// Authority provides the price (fetched from Pyth Hermes API off-chain)
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimPayout<'info> {
    #[account(
        mut,
        seeds = [b"prediction-round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, PredictionRound>,

    #[account(
        mut,
        seeds = [b"prediction-entry", entry.round_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = entry.bump,
        has_one = player
    )]
    pub entry: Account<'info, PredictionEntry>,

    #[account(mut)]
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(
        mut,
        seeds = [b"prediction-round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, PredictionRound>,

    #[account(
        mut,
        seeds = [b"prediction-entry", entry.round_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = entry.bump,
        has_one = player
    )]
    pub entry: Account<'info, PredictionEntry>,

    #[account(mut)]
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct AdminForceCancel<'info> {
    #[account(
        seeds = [b"prediction-config"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, PredictionConfig>,

    #[account(
        mut,
        seeds = [b"prediction-round", round.round_id.to_le_bytes().as_ref()],
        bump = round.bump
    )]
    pub round: Account<'info, PredictionRound>,

    pub authority: Signer<'info>,
}

// ============================================================================
// ERRORS
// ============================================================================

#[error_code]
pub enum PredictionError {
    #[msg("Invalid fee: must be <= 1000 basis points (10%)")]
    InvalidFee,
    #[msg("Invalid minimum bet: must be >= 0.001 SOL")]
    InvalidMinBet,
    #[msg("Invalid duration: must be >= 60 seconds")]
    InvalidDuration,
    #[msg("Bet amount too small")]
    BetTooSmall,
    #[msg("Round is not active")]
    RoundNotActive,
    #[msg("Betting is closed")]
    BettingClosed,
    #[msg("Too early to lock round")]
    TooEarlyToLock,
    #[msg("Round is not locked")]
    RoundNotLocked,
    #[msg("Too early to settle round")]
    TooEarlyToSettle,
    #[msg("Round is not settled")]
    RoundNotSettled,
    #[msg("Round is not cancelled")]
    RoundNotCancelled,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Not a winner")]
    NotAWinner,
    #[msg("Invalid Pyth price feed account")]
    InvalidPriceFeed,
    #[msg("Price feed is too stale")]
    StalePriceFeed,
    #[msg("Round is already settled or cancelled")]
    RoundAlreadyFinalized,
    #[msg("Invalid price: must be positive")]
    InvalidPrice,
}
