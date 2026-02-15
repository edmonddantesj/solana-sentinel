# Solana Sentinel V2.1 — Whitepaper

**Risk-Adjusted Fee-Sharing Vault for Autonomous AI Trading Agents**

*Aoineco & Co. — February 2026*

---

## Abstract

The proliferation of autonomous AI trading agents has created a new class of economic actor: software entities that generate alpha, manage risk, and execute trades 24/7 without human intervention. Yet the financial infrastructure to support these agents remains primitive. Capital pooling relies on multisig wallets designed for human committees. Performance evaluation is off-chain and self-reported. Profit distribution is flat and manual.

**Solana Sentinel** introduces a fully on-chain vault protocol where AI agents build verifiable performance track records, receive risk-adjusted compensation, and operate under enforceable guardian policies — all without trusting any single party. By combining ERC-4626-style share accounting with on-chain agent reputation scoring, Sentinel creates the foundational infrastructure for the AI-to-AI economy.

---

## 1. The Problem

### 1.1 The Rise of AI Trading Agents

AI agents are no longer theoretical. They monitor markets, interpret signals, size positions, and execute trades autonomously. Projects like Eliza, Virtuals, and AIXBT have demonstrated that AI agents can operate profitably in crypto markets. The question is no longer *whether* AI agents will trade — it's *how we build the infrastructure they need*.

### 1.2 Capital Pooling Is Broken

Today, if you want to pool capital across multiple AI agents:

- **Multisig wallets** (e.g., Squads Protocol) require manual M-of-N approval for every transaction. This works for human DAOs but is fundamentally incompatible with agents that need to act autonomously and at machine speed.
- **Centralized platforms** promise to route capital to the best agents, but require trust in the platform operator. There is no on-chain proof of performance.
- **Individual wallets** mean each agent manages its own capital in isolation, with no shared risk pool and no way for passive investors to gain exposure to multiple strategies.

### 1.3 Reputation Is Off-Chain

An AI agent claims 75% win rate and +4.8% monthly returns. How do you verify this? Today, you can't — not without trusting the agent's operator to report honestly. Self-reported performance metrics are the norm, and there is no standard for on-chain, verifiable agent track records.

### 1.4 AI Agent Security Is an Open Wound

The proliferation of autonomous agents introduces attack surfaces that traditional security models were never designed to handle:

- **Prompt Injection Attacks:** Malicious inputs can hijack an agent's decision-making, causing it to drain funds or execute unauthorized trades. Projects like Gen Digital's Agent Trust Hub (ai.gendigital.com) have begun cataloging these threats, but no on-chain defense exists.
- **Supply Chain Attacks (ClawHavoc):** As documented by Cantina's security research, agents that install third-party skills or plugins are vulnerable to typosquatting and permission escalation — a compromised skill can exfiltrate private keys or manipulate trade logic.
- **Unconstrained Autonomy:** An AI agent with unrestricted access to a shared wallet can — through error or exploitation — withdraw the entire pool in a single transaction. Without on-chain guardrails (withdrawal caps, cooldowns, emergency stops), there is no circuit breaker.
- **Data Leak & DLP Failures:** Security suites like ClawSec highlight that agents handling financial data can inadvertently expose sensitive information through unguarded API calls or logging.

**The core problem:** AI agents are gaining financial autonomy faster than security infrastructure can contain them. Solana Sentinel addresses this gap directly with Guardian Policy enforcement, on-chain behavioral tracking, and programmable circuit breakers.

### 1.5 Fee Distribution Is Flat

When multiple agents contribute to a shared pool, how should profits be split? A flat percentage (e.g., 20% to all agents equally) ignores the reality that some agents are dramatically more skilled than others. The best-performing agent should earn proportionally more — but implementing risk-adjusted fee splits requires on-chain performance data that doesn't exist today.

---

## 2. The Solution: Solana Sentinel

Sentinel is a Solana program (smart contract) that implements four capabilities that, together, form the infrastructure layer for autonomous AI agent finance:

### 2.1 Proportional Share Vault

Sentinel accepts SOL deposits and issues virtual shares using the same constant-product model as ERC-4626 tokenized vaults. When profits flow into the vault, every share becomes worth more — without iterating over depositors.

**Key insight:** Share valuation is O(1). Whether there are 10 or 10,000 depositors, the cost of computing any user's position is a single division operation.

```
shares_minted  = (deposit × total_shares) / vault_balance
sol_returned   = (shares_burned × vault_balance) / total_shares
nav_per_share  = vault_balance / total_shares
```

Unlike ERC-4626, Sentinel uses native lamport accounting without SPL token minting. This eliminates the rent cost of Associated Token Accounts and reduces transaction complexity.

### 2.2 On-Chain Agent Reputation

Every AI agent registered in Sentinel has an `AgentProfile` PDA that accumulates performance data with every trade report:

| Field | Type | Purpose |
|---|---|---|
| `trade_count` | u32 | Total number of trades reported |
| `winning_trades` | u32 | Number of profitable trades |
| `cumulative_pnl` | i64 | Net profit/loss in basis points |
| `sum_returns` | i128 | Σ(return_i) — for computing mean return |
| `sum_sq_returns` | u128 | Σ(return_i²) — for computing variance |
| `total_rewards_earned` | u64 | Accumulated rewards in lamports |
| `is_active` | bool | Whether the agent is actively trading |

From these primitives, Sentinel computes:

- **Win Rate** = `winning_trades / trade_count`
- **Mean Return** (μ) = `sum_returns / trade_count`
- **Variance** (σ²) = `sum_sq_returns / trade_count - μ²`
- **Sharpe Ratio** = `μ / σ` (annualized)

This is the first on-chain, permissionless agent reputation system on Solana. No one — not the agent, not the operator, not the Authority — can alter a trade report after it has been recorded.

### 2.3 Risk-Adjusted Fee Distribution

When the Oracle distributes profits, Sentinel calculates agent fees based on performance:

```
distribute_profits(amount, agent_fee_bps):
  1. agent_fee = amount × agent_fee_bps / 10000
  2. vault_portion = amount - agent_fee
  3. Transfer vault_portion to vault_sol PDA (benefits all shareholders)
  4. Credit agent_fee to AgentProfile.total_rewards_earned
```

The `agent_fee_bps` parameter is set per distribution, allowing the Oracle to vary the fee based on the agent's recent Sharpe ratio, win rate, or any other off-chain metric. This creates a direct economic incentive: better performance → higher rewards.

### 2.4 Guardian Policy Engine

A dedicated Guardian role enforces risk controls that override all other permissions:

| Policy | Effect |
|---|---|
| **Emergency Stop** | Freezes all vault operations (deposit, withdraw, distribute). Only the Guardian can resume. |
| **Daily Withdrawal Cap** | Maximum SOL any single user can withdraw per UTC day. Prevents bank runs. |
| **Cooldown Period** | Minimum time between consecutive withdrawals per user. Prevents rapid extraction. |
| **Depositor Whitelist** | Optional restriction of deposits to approved addresses only. |

The Guardian cannot move funds. It can only restrict operations. This separation of powers means that even if the Authority key is compromised, the Guardian can freeze the vault before damage occurs.

---

## 3. Architecture

### 3.1 On-Chain Components

Sentinel consists of three PDA types derived from deterministic seeds:

```
Vault            seeds: ["vault", authority_pubkey]
├── VaultSOL     seeds: ["vault_sol", vault_pubkey]     (SystemAccount — holds SOL)
├── UserPosition seeds: ["position", vault, user]        (per depositor)
└── AgentProfile seeds: ["agent_profile", vault, agent]  (per AI agent)
```

The program is deployed as a single Anchor program (~1,200 lines of Rust) at address `9FouWHemn9iueyHYq4qpeNj9aHMyTKfEPt8ZpJaHcZ95` on Solana Devnet.

### 3.2 Role Separation

Three cryptographic keys control all privileged operations:

| Role | Capabilities | Cannot Do |
|---|---|---|
| **Authority** | Initialize vault, register agents, advance epochs, manage roles, set whitelist | Withdraw funds, pause vault, distribute profits |
| **Guardian** | Emergency stop, update policy (caps/cooldowns) | Move funds, distribute profits, manage roles |
| **Oracle** | Report trades, distribute profits | Withdraw funds, pause vault, manage roles |

No single key compromise can drain the vault. An attacker would need both the Oracle key (to distribute profits to themselves) and the Authority key (to register themselves as an agent) — and even then, the Guardian can freeze operations.

### 3.3 SOL Transfer Mechanism

Sentinel V2.1 uses Cross-Program Invocation (CPI) with PDA signer seeds for all SOL transfers from the vault:

```rust
let seeds = &[b"vault_sol", vault_key.as_ref(), &[vault.vault_sol_bump]];
system_program::transfer(
    CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer { from: vault_sol, to: recipient },
        &[&seeds[..]],
    ),
    amount,
)?;
```

This is more secure than direct lamport manipulation because it requires the Solana runtime to verify the PDA derivation before authorizing the transfer.

---

## 4. Alpha Oracle V6 — The Signal Engine

Sentinel's Oracle is powered by the Alpha Oracle V6, an adaptive Bayesian signal fusion engine designed for short-term BTC price prediction.

### 4.1 Design Philosophy

Traditional trading bots use hardcoded thresholds (e.g., "if RSI > 70, sell"). This fails because:

1. Optimal thresholds change with market regime (trending vs. ranging vs. volatile)
2. Single indicators produce high false-positive rates
3. Position sizing is usually fixed, ignoring edge quality

V6 addresses all three with Bayesian probability theory.

### 4.2 Signal Pipeline

```
Phase 1: Data Acquisition
    Binance 5m OHLCV (100 candles) + Pyth Network Oracle Price

Phase 2: Technical Indicators (computed from raw data, never hardcoded)
    RSI (Wilder's, 14-period)
    ATR (14-period, % of price)
    Bollinger Band position (-1 to +1)
    EMA Cross (8/21, normalized by ATR)
    Volume Ratio (current / 20-period MA)
    Multi-timeframe momentum (5m, 15m, 1h alignment)

Phase 3: Regime Detection
    Classify market as: trending_up | trending_down | ranging | volatile
    Set adaptive confidence threshold per regime

Phase 4: Bayesian Fusion
    Prior: Dynamic win rate from last 24h of settled predictions (Laplace-smoothed)
    Likelihood Ratios: 5 independent signals → log-odds → posterior
    P(UP | signals) = σ(log_odds_prior + Σ log(LR_i))

Phase 5: Decision
    If posterior > 0.5 and confidence ≥ regime_threshold and EV > 0:
        → LONG (or SHORT if posterior < 0.5)
    Else:
        → HOLD

Phase 6: Position Sizing
    Half-Kelly Criterion: f* = max(0, min(0.25, (bp - q) / 2b))
    where b = win payout, p = win probability, q = 1-p
```

### 4.3 Key Innovations over V5

| Aspect | V5 | V6 |
|---|---|---|
| RSI | Hardcoded (55.4) | Computed from 100 live candles |
| Prior | Fixed (0.88) | Dynamic from 24h win rate |
| Threshold | Fixed (0.85) | Adaptive by regime (0.68–0.85) |
| Fusion | If/else tree | Bayesian log-odds (Naive Bayes) |
| Sizing | Fixed bet | Half-Kelly with EV filter |
| Execution | Taker orders | Post-Only Maker Rebate (0.05%) |

### 4.4 Integration with Sentinel

When V6 produces a LONG or SHORT decision, it calls `report_trade` on the Sentinel vault, recording the trade's PnL and outcome. Over time, this builds an immutable on-chain track record that any third party can verify.

```
Alpha Oracle V6 → TradeSignal(LONG, 82% confidence, +0.04 EV)
                       │
                       ▼
Solana Sentinel → report_trade(pnl_bps=180, is_win=true)
                       │
                       ▼
AgentProfile PDA: trade_count++, winning_trades++, cumulative_pnl += 180
```

---

## 5. Economic Model

### 5.1 Value Flow

```
Depositors (passive)                    AI Agents (active)
     │                                       │
     │ deposit SOL                           │ trade & report
     ▼                                       ▼
┌─────────────────────────────────────────────────┐
│              SENTINEL VAULT                      │
│                                                  │
│  SOL Pool ────── Profits ────── Agent Fees       │
│  (deposits)      (from Oracle)   (risk-adjusted) │
└─────────────────────────────────────────────────┘
     │                                       │
     ▼                                       ▼
NAV/share increases                    Claimable rewards
(passive yield)                        (performance-based)
```

### 5.2 Incentive Alignment

| Actor | Incentive | Mechanism |
|---|---|---|
| **Depositor** | Earn yield without active trading | NAV/share increases as Oracle distributes profits |
| **AI Agent** | Maximize trading performance | Higher Sharpe ratio → higher fee share |
| **Guardian** | Protect the vault from risk | Policy controls prevent catastrophic loss |
| **Oracle** | Accurate trade reporting | On-chain immutability prevents retroactive manipulation |

### 5.3 Fee Structure

- **Depositors:** No deposit fee. Withdrawal is proportional to shares held.
- **Agents:** Earn a percentage of distributed profits (set by Oracle, typically 10-30% based on performance tier).
- **Protocol:** No protocol fee in V2.1. Future versions may introduce a small protocol fee for sustainability.

---

## 6. Security Analysis

### 6.1 Threat Model

| Attack Vector | Severity | Mitigation |
|---|---|---|
| Oracle key compromise | High | Oracle can only add SOL + report trades. Cannot withdraw. Guardian can freeze. |
| Authority key compromise | High | Authority cannot withdraw funds. Can only reassign roles (Guardian can counter). |
| Guardian key compromise | Medium | Guardian can only pause/unpause and set policy. Cannot move funds. |
| All three keys compromised | Critical | Fundamental trust assumption. Use hardware wallets and key rotation. |
| Inflation attack (first deposit) | Low | First deposit is 1:1. Minimum 10,000 lamports prevents dust seeding. |
| Integer overflow | Low | All arithmetic uses u128 intermediates with checked_* operations. |
| Front-running share price | Low | Share price is deterministic from on-chain state. No oracle price manipulation. |

### 6.2 Invariants

1. `vault_sol.lamports() ≥ Σ(user_position.shares × nav_per_share)` — the vault always has enough SOL to redeem all shares.
2. `Σ(user_position.shares) = vault.total_shares` — shares are conserved across all operations.
3. `AgentProfile` data is append-only for trade reports — no instruction can reduce `trade_count` or `winning_trades`.
4. When `is_paused = true`, no deposit, withdrawal, or profit distribution can execute.

### 6.3 Audit Status

Solana Sentinel V2.1 has not been audited by a third-party security firm. The program is deployed on Devnet for testing purposes only. **Do not deposit real funds on Mainnet without a professional audit.**

---

## 7. Comparison with Existing Solutions

| Feature | Squads (Multisig) | Marinade (Liquid Staking) | Drift (Perp DEX) | **Sentinel** |
|---|---|---|---|---|
| AI agent support | ❌ | ❌ | Partial (vaults) | ✅ Native |
| On-chain reputation | ❌ | ❌ | ❌ | ✅ AgentProfile |
| Risk-adjusted fees | ❌ | ❌ | ❌ | ✅ Sharpe-weighted |
| Guardian controls | M-of-N | Validator set | ❌ | ✅ Single key, instant |
| Zero-iteration math | N/A | ✅ (mSOL) | N/A | ✅ (share model) |
| Permissionless agents | ❌ | ❌ | ❌ | ✅ Register any agent |

---

## 8. Roadmap

### Phase 1: Foundation (Current — Q1 2026)
- [x] Core vault with proportional shares
- [x] Agent registration and trade reporting
- [x] Guardian policy engine
- [x] Alpha Oracle V6 integration
- [x] Devnet deployment and 8/8 demo passing

### Phase 2: Intelligence (Q2 2026)
- [ ] Multi-agent tournament system (agents compete for capital allocation)
- [ ] Automated Sharpe-weighted fee distribution (currently manual bps parameter)
- [ ] Agent staking — agents post collateral to back their track record
- [ ] Cross-vault agent portability (reputation follows the agent)

### Phase 3: Economy (Q3 2026)
- [ ] $AOI reward token for LLM token efficiency and task performance
- [ ] AI-to-AI marketplace — agents can hire other agents for subtasks
- [ ] Mainnet deployment with professional audit
- [ ] SDK for third-party agent frameworks (Eliza, Virtuals, AutoGPT)

### Phase 4: Sovereignty (Q4 2026)
- [ ] Agent-governed vaults — top-performing agents vote on policy changes
- [ ] Cross-chain vault bridges (Solana ↔ EVM)
- [ ] Decentralized Oracle network — multiple independent signal engines
- [ ] Full AI-to-AI economic loop: earn, spend, invest, hire

---

## 9. Conclusion

Solana Sentinel is not another multisig or yield aggregator. It is **infrastructure for a new kind of economic actor**: the autonomous AI agent.

By making agent performance verifiable, fees risk-adjusted, and risk controls enforceable, Sentinel creates the trust layer that the AI-to-AI economy needs to function. When agents can prove their skill on-chain, capital can flow to competence rather than reputation. When guardians can enforce policy cryptographically, risk management stops being a gentleman's agreement.

The era of "trust me, I'm profitable" is over. **Prove it on-chain, or go home.**

---

## References

1. ERC-4626: Tokenized Vault Standard — https://eips.ethereum.org/EIPS/eip-4626
2. Anchor Framework — https://www.anchor-lang.com/
3. Pyth Network — https://pyth.network/
4. Kelly Criterion — Kelly, J.L. (1956). "A New Interpretation of Information Rate"
5. Solana Program Derived Addresses — https://docs.solana.com/developing/programming-model/calling-between-programs

---

<p align="center">
  <strong>Aoineco & Co.</strong><br/>
  <em>🐾 The Galactic Cat Collective</em><br/>
  <sub>Building the financial infrastructure for the AI-to-AI economy.</sub>
</p>
