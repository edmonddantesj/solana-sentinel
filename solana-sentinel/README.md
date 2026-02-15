<p align="center">
  <img src="https://img.shields.io/badge/Solana-AI%20Hackathon%202026-14F195?logo=solana&logoColor=white&style=for-the-badge" />
</p>

<h1 align="center">⚡ Solana Sentinel V2.1</h1>
<p align="center">
  <strong>Risk-Adjusted Fee-Sharing Vault for Autonomous AI Trading Agents</strong>
</p>
<p align="center">
  <em>"Where AI agents earn on-chain reputations, not just wallets."</em>
</p>

<p align="center">
  <a href="https://www.anchor-lang.com/"><img alt="Anchor v0.30.1" src="https://img.shields.io/badge/Anchor-v0.30.1-blueviolet?logo=anchor" /></a>
  <a href="https://solana.com/"><img alt="Solana Devnet" src="https://img.shields.io/badge/Solana-Devnet-14F195?logo=solana&logoColor=white" /></a>
  <a href="https://www.rust-lang.org/"><img alt="Rust 2021" src="https://img.shields.io/badge/Rust-2021-orange?logo=rust" /></a>
  <a href="#license"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
  <img alt="Demo 8/8" src="https://img.shields.io/badge/Live%20Demo-8%2F8%20PASS-brightgreen" />
</p>

---

### 🏛️ Judges' Quick Guide: What to Judge Us On

If you only have 60 seconds, focus on these three engineering achievements:
1. **Verifiable Agent Reputation:** Trading performance (Win Rate, Sharpe, PnL) is tracked and "frozen" on-chain via `AgentProfile` PDAs. No self-reporting.
2. **On-Chain Risk-Adjusted Fee Splitting:** A novel reward distribution logic that weighs agent performance against risk, rewarding the most efficient agents proportionally.
3. **Guardian Policy Guardrails:** Real-world security for AI agents including daily withdrawal caps, cooldown periods, and a global **Emergency Stop** circuit breaker.

### ⚡ Why Solana?
- **Speed & Finality:** Critical for the high-frequency trade reporting required by AI agents.
- **PDA Model:** Enables secure, program-owned "vaults" and "profiles" without user private key exposure.
- **Low Fees:** Allows for frequent micro-distributions of profits to multiple agent contributors.

---

## The Problem

AI trading agents are proliferating. They generate alpha, manage risk, and execute autonomously. But **where does their profit go?** How do you:

- Pool capital across multiple AI agents with **different skill levels**?
- Reward the best-performing agents **proportionally** to their contribution?
- Let passive depositors earn yield **without trusting any single agent**?
- Enforce **on-chain risk controls** that no agent can override?

Today's solutions are either multisigs (manual, slow, flat fee splits) or centralized platforms (trust us, bro). Neither works for autonomous agents that trade 24/7.

## The Solution

**Solana Sentinel** is a fully on-chain vault protocol that:

1. **Accepts SOL deposits** and issues proportional virtual shares (ERC-4626 style, no SPL tokens)
2. **Tracks AI agent performance** on-chain — win rate, PnL, Sharpe ratio, all verifiable
3. **Distributes profits with risk-adjusted fees** — agents that perform better earn a larger share
4. **Enforces guardian policies** — daily withdrawal caps, cooldowns, emergency stops
5. **Connects to Alpha Oracle V6** — our Bayesian signal fusion engine that feeds real BTC trade data into the vault

```
┌──────────────────────────────────────────────────────────────────────┐
│                        THE SENTINEL STACK                           │
│                                                                      │
│   ┌─────────────┐    ┌─────────────┐    ┌──────────────────────┐    │
│   │  Depositors  │    │  AI Agents   │    │  Alpha Oracle V6     │    │
│   │  (Passive)   │    │  (Active)    │    │  (Signal Engine)     │    │
│   └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘    │
│          │                   │                       │                │
│          │  deposit SOL      │  trade & earn         │  BTC signals   │
│          │                   │  reputation           │  Bayesian      │
│          ▼                   ▼                       ▼                │
│   ┌──────────────────────────────────────────────────────────┐       │
│   │              SOLANA SENTINEL VAULT (On-Chain)             │       │
│   │                                                           │       │
│   │   • Proportional shares (O(1) — zero iteration)          │       │
│   │   • Agent performance tracking (win rate, Sharpe)         │       │
│   │   • Risk-adjusted profit distribution                     │       │
│   │   • Guardian policy enforcement                           │       │
│   │   • Emergency stop / resume                               │       │
│   └──────────────────────────────────────────────────────────┘       │
│          │                   │                       │                │
│          ▼                   ▼                       ▼                │
│     NAV/share ↑         Agent rewards           Trade records        │
│     (passive yield)     (performance-based)     (on-chain proof)     │
└──────────────────────────────────────────────────────────────────────┘
```

## What's New in V2.1

| Feature | V1 | V2.1 |
|---|---|---|
| Deposit & Withdraw | ✅ | ✅ with CPI signer seeds |
| Profit Distribution | Flat split | **Risk-adjusted** (Sharpe-weighted fees) |
| Agent Tracking | ❌ | ✅ On-chain AgentProfile (PnL, win rate, Sharpe) |
| Guardian Policy | ❌ | ✅ Daily cap + cooldown + emergency stop |
| Epoch System | ❌ | ✅ Performance epochs with reset |
| Whitelist | ❌ | ✅ Depositor whitelist control |
| Oracle Integration | Basic | **Alpha Oracle V6** (Bayesian + Kelly) |
| Agent Rewards | ❌ | ✅ Claimable on-chain rewards |

## Live Demo (8/8 Steps — All Passing ✅)

Our end-to-end demo runs all 8 steps on **Solana Devnet**:

```
  Step 0: Connect & Setup          ✅  Wallets funded, PDAs derived
  Step 1: Initialize Vault         ✅  Guardian + Oracle + Policy set
  Step 2: Register AI Agents       ✅  🐺 Alpha + 🦊 Bravo on-chain
  Step 3: Agents Deposit SOL       ✅  Shares minted proportionally
  Step 4: Oracle Reports Trades    ✅  8 trades recorded (win/loss/PnL)
  Step 5: Distribute Profits       ✅  Risk-adjusted 20% agent fee
  Step 6: Guardian Policy Engine   ✅  Daily cap → 2 SOL, cooldown → 5s
  Step 7: Agent Alpha Withdraws    ✅  PDA signer seeds CPI transfer
  Step 8: Emergency Stop           ✅  Pause → reject → resume
```

**🎬 Watch the cinematic demo:** [`assets/solana_sentinel_demo.mp4`](./assets/solana_sentinel_demo.mp4)

Run it yourself:
```bash
npx ts-node -T --skip-project scripts/demo.ts
```

## Architecture

### On-Chain Accounts (3 PDA Types)

```
authority_pubkey ──► PDA: ["vault", authority]
                          │
                          ├── Vault Account (131+ bytes)
                          │   authority, guardian, oracle, total_shares,
                          │   daily_withdraw_cap, cooldown_seconds,
                          │   epoch, epoch_profit, agent_count, is_paused
                          │
                          ├──► PDA: ["vault_sol", vault]
                          │    SOL Reserve (SystemAccount — holds all funds)
                          │
                          ├──► PDA: ["position", vault, user]
                          │    UserPosition (shares, deposits, withdrawals,
                          │    daily_withdrawn, last_withdraw_day, is_whitelisted)
                          │
                          └──► PDA: ["agent_profile", vault, agent]
                               AgentProfile (trade_count, winning_trades,
                               cumulative_pnl, sum_returns, sum_sq_returns,
                               total_rewards_earned, is_active)
```

### Role Separation

```
┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│    AUTHORITY     │   │     GUARDIAN      │   │      ORACLE      │
│    (Admin)       │   │    (Risk Mgmt)    │   │   (AI Engine)    │
│                  │   │                   │   │                  │
│ • init vault     │   │ • emergency_stop  │   │ • report_trade   │
│ • register agent │   │ • update_policy   │   │ • distribute_    │
│ • update roles   │   │   (cap/cooldown)  │   │   profits        │
│ • advance epoch  │   │                   │   │                  │
│ • set whitelist  │   │ Cannot withdraw   │   │ Cannot withdraw  │
│                  │   │ Cannot distribute │   │ Cannot pause     │
└─────────────────┘   └──────────────────┘   └──────────────────┘
```

### Agent Performance Scoring (On-Chain)

Every `report_trade` call updates the agent's on-chain statistics:

```rust
AgentProfile {
    trade_count:      u32,    // Total trades
    winning_trades:   u32,    // Wins (for win rate)
    cumulative_pnl:   i64,    // Net PnL in basis points
    sum_returns:      i128,   // Σ(return_i) — for mean
    sum_sq_returns:   u128,   // Σ(return_i²) — for variance
}
```

**Sharpe Ratio** is computed on-chain via `query_agent_score`:
```
μ = sum_returns / trade_count
σ² = sum_sq_returns / trade_count - μ²
sharpe = μ / σ  (annualized)
```

This means agent reputation is **verifiable, immutable, and permissionless**. No one can fake a track record.

## Share Valuation Math

Identical to ERC-4626 tokenized vaults, but with native lamports:

```
Deposit:    shares_minted  = (amount × total_shares) / vault_balance
Withdraw:   sol_returned   = (shares_burned × vault_balance) / total_shares
NAV/share:  price          = vault_balance / total_shares
```

When the Oracle distributes profits, `vault_balance` grows while `total_shares` stays constant → every share becomes worth more. **Zero iteration over depositors.**

## Alpha Oracle V6 — The Brain

Sentinel's Oracle is powered by **Alpha Oracle V6**, a Bayesian signal fusion engine for BTC price prediction:

| Component | Function |
|---|---|
| **Data Layer** | Real-time Binance 5m candles + Pyth Network oracle price |
| **Indicators** | RSI, ATR, Bollinger Bands, EMA Cross, Volume Ratio |
| **Regime Detection** | Classifies market as trending/ranging/volatile with adaptive thresholds |
| **Bayesian Fusion** | Log-odds aggregation of 5 independent signal likelihoods |
| **Kelly Criterion** | Half-Kelly position sizing with EV > 0 gate |
| **Output** | LONG / SHORT / HOLD with confidence, Kelly fraction, expected value |

```
Alpha Oracle V6 Pipeline:
  Binance API ──► Technical Indicators ──► Regime Detection
       │                   │                      │
       ▼                   ▼                      ▼
  Pyth Oracle ──► Bayesian Log-Odds Fusion ──► Kelly Sizing
                           │
                           ▼
                  TradeSignal { decision, confidence, EV }
                           │
                           ▼
              Solana Sentinel: report_trade(pnl, is_win)
```

## Guardian Policy Engine

The Guardian role enforces risk controls that **no agent or authority can bypass**:

| Policy | Description | Default |
|---|---|---|
| `daily_withdraw_cap` | Max lamports withdrawable per UTC day per user | 5 SOL |
| `cooldown_seconds` | Min seconds between withdrawals per user | 10s |
| `emergency_stop` | Freeze all vault operations instantly | false |
| `whitelist_enabled` | Restrict deposits to approved addresses | false |

When the Guardian calls `emergency_stop(true)`, **all deposits, withdrawals, and profit distributions are frozen**. Only the Guardian can resume operations.

## Instructions Reference

| Instruction | Signer | Description |
|---|---|---|
| `initialize` | Authority | Create vault, set guardian/oracle/policy |
| `deposit` | User | Deposit SOL → receive proportional shares |
| `withdraw` | User | Burn shares → receive SOL (policy-checked) |
| `register_agent` | Authority | Add AI agent to the vault |
| `deactivate_agent` | Authority | Disable an agent from receiving reports |
| `report_trade` | Oracle | Record agent's trade result (PnL + win/loss) |
| `distribute_profits` | Oracle | Inject profits, auto-calculate agent fee |
| `claim_agent_reward` | Agent | Agent claims accumulated rewards |
| `query_agent_score` | Any | Compute & emit agent's Sharpe ratio |
| `advance_epoch` | Authority | Reset epoch counters, start new period |
| `emergency_stop` | Guardian | Pause/unpause all vault operations |
| `update_policy` | Guardian | Modify daily cap and cooldown |
| `update_roles` | Authority | Reassign guardian/oracle keys |
| `set_whitelist` | Authority | Enable/disable depositor whitelist |

## Deployed on Devnet

| Item | Address |
|---|---|
| **Program ID** | [`9FouWHemn9iueyHYq4qpeNj9aHMyTKfEPt8ZpJaHcZ95`](https://explorer.solana.com/address/9FouWHemn9iueyHYq4qpeNj9aHMyTKfEPt8ZpJaHcZ95?cluster=devnet) |
| **IDL Account** | `E8J6CCcWiDxj1gKFs1bXagxMxnpM77Q5JGg7Fvq7LA5n` |

```bash
solana program show 9FouWHemn9iueyHYq4qpeNj9aHMyTKfEPt8ZpJaHcZ95 --url devnet
```

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) 1.75+
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) 1.18+
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) 0.30.1+
- Node.js 18+

### Build & Deploy

```bash
git clone https://github.com/edmonddantesj/solana-sentinel.git
cd solana-sentinel

# Build
anchor build

# Deploy to devnet
solana config set --url devnet
solana airdrop 2
anchor deploy --provider.cluster devnet

# Run the full 8-step demo
npx ts-node -T --skip-project scripts/demo.ts
```

### Integrate Alpha Oracle V6

```bash
# From the alpha-oracle directory
python3 engine/sim_engine_v6.py

# Output: LONG/SHORT/HOLD with confidence + Kelly sizing
# When decision != HOLD, automatically reports to Sentinel vault on-chain
```

## Security Model

| Threat | Mitigation |
|---|---|
| Oracle drains vault | Oracle can only **add** SOL and report trades. Cannot withdraw. |
| Guardian steals funds | Guardian can only toggle pause and update policy. Cannot move lamports. |
| Authority rug-pull | Authority cannot withdraw any funds. Can only manage roles and agents. |
| Agent fakes track record | All trades reported on-chain with PDA constraints. Immutable history. |
| Inflation attack | First deposit is 1:1. Minimum deposit = 10,000 lamports prevents dust seeding. |
| Overflow | All math uses `u128` intermediates with `checked_*` operations. |

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 6000 | `VaultPaused` | Vault is frozen by Guardian |
| 6001 | `ZeroAmount` | Amount must be > 0 |
| 6002 | `BelowMinDeposit` | Below 10,000 lamport minimum |
| 6003 | `ZeroShares` | Calculated shares would round to 0 |
| 6004 | `InsufficientShares` | Not enough shares to burn |
| 6005 | `NoShareholders` | Cannot distribute with 0 shares |
| 6006 | `MathOverflow` | Arithmetic overflow detected |
| 6007 | `Unauthorized` | Signer doesn't match required role |
| 6008 | `InsufficientFunds` | Vault SOL balance too low |
| 6009 | `DailyCapExceeded` | Withdrawal exceeds daily policy cap |
| 6010 | `CooldownActive` | Too soon since last withdrawal |
| 6011 | `NotWhitelisted` | Depositor not on whitelist |
| 6012 | `AgentInactive` | Agent has been deactivated |

## Events

All state changes emit Anchor events for off-chain indexing:

| Event | Fields |
|---|---|
| `VaultInitialized` | authority, guardian, oracle, daily_cap, cooldown |
| `Deposited` | user, amount, shares_minted, total_shares |
| `Withdrawn` | user, shares_burned, amount_returned, total_shares |
| `ProfitsDistributed` | oracle, amount, agent_fee, agent, vault_balance |
| `AgentRegistered` | agent, vault |
| `AgentDeactivated` | agent, vault |
| `TradeReported` | agent, pnl_bps, is_win, trade_count, win_rate |
| `AgentScoreComputed` | agent, sharpe_ratio, win_rate, avg_return, volatility |
| `AgentRewardClaimed` | agent, reward_amount |
| `EpochAdvanced` | new_epoch, previous_profit |
| `PolicyUpdated` | daily_cap, cooldown |
| `EmergencyAction` | guardian, paused, timestamp |

## Project Structure

```
solana-sentinel/
├── Anchor.toml
├── README.md
├── programs/
│   └── solana_sentinel/
│       └── src/lib.rs              # Full program (~1200 lines)
├── scripts/
│   ├── demo.ts                     # 8-step end-to-end demo
│   └── report_trade.ts             # CLI for Alpha Oracle integration
├── target/
│   ├── deploy/
│   ├── idl/solana_sentinel.json
│   └── types/solana_sentinel.ts
└── tests/
```

## Why Not a Multisig?

| | Multisig (Squads) | Sentinel |
|---|---|---|
| **Question answered** | "Do enough people agree?" | "What is each agent worth?" |
| **Profit sharing** | Manual proposals | Automatic, proportional, O(1) |
| **Agent reputation** | Off-chain, trust-based | On-chain, verifiable, immutable |
| **Risk control** | Requires quorum | Single Guardian, instant pause |
| **Scalability** | Fixed signer set | Unlimited agents & depositors |

## The Vision: Tokenized Soul Economy

Solana Sentinel is the first building block of the **AI-to-AI economy** where:

- AI agents have **verifiable on-chain reputations** (not just wallet balances)
- Capital flows to the **highest-performing agents** automatically
- Risk is managed by **specialized guardian agents**, not committees
- Every trade, every profit, every score is **permanent and auditable**

The era of "trust me, I'm profitable" is over. Prove it on-chain, or go home.

---

<p align="center">
  <strong>Built by <a href="https://github.com/aoineco">Aoineco & Co.</a></strong><br/>
  <sub>🐾 The Galactic Cat Collective — Solana AI Hackathon 2026</sub>
</p>

# Update: Wed Feb 11 10:43:20 KST 2026
