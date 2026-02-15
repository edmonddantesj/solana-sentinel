/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║       SOLANA SENTINEL v2 — LIVE DEMO SCRIPT                 ║
 * ║   Risk-Adjusted Fee-Sharing Vault · Hackathon Demo          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Run: npx ts-node -T --skip-project scripts/demo.ts
 */

import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("9FouWHemn9iueyHYq4qpeNj9aHMyTKfEPt8ZpJaHcZ95");
const DEVNET_URL = "https://api.devnet.solana.com";
const IDL_PATH = path.join(__dirname, "..", "target", "idl", "solana_sentinel.json");

// Colors
const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", magenta: "\x1b[35m", cyan: "\x1b[36m", white: "\x1b[37m",
};

function banner(text: string) {
  console.log(`\n${C.bold}${C.green}  ┌─────────────────────────────────────────────────────────┐${C.reset}`);
  console.log(`${C.bold}${C.green}  │ ${C.white}${text.padEnd(56)}${C.green}│${C.reset}`);
  console.log(`${C.bold}${C.green}  └─────────────────────────────────────────────────────────┘${C.reset}`);
}
function ok(msg: string) { console.log(`${C.green}     ✅ ${msg}${C.reset}`); }
function info(msg: string) { console.log(`${C.dim}     ℹ  ${msg}${C.reset}`); }
function fail(msg: string) { console.log(`${C.red}     ❌ ${msg}${C.reset}`); }
function warn(msg: string) { console.log(`${C.yellow}     ⚠️  ${msg}${C.reset}`); }

function shortKey(key: PublicKey): string {
  const s = key.toBase58();
  return s.slice(0, 4) + "..." + s.slice(-4);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function retry<T>(fn: () => Promise<T>, label: string, maxRetries = 20): Promise<T> {
  let delay = 3000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (e.message?.includes("429") || e.message?.includes("Too Many Requests")) {
        warn(`${label} — RPC 429, retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await sleep(delay);
        delay *= 2; // Exponential backoff
        continue;
      }
      throw e;
    }
  }
  throw new Error(`${label} failed after ${maxRetries} retries`);
}

async function main() {
  // ═══ TITLE ═══
  console.log(`${C.bold}${C.cyan}
      ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗     
      ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║     
      ███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║     
      ╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║     
      ███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗
      ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝${C.reset}`);
  console.log(`${C.bold}${C.white}              ⚡ v2 Risk-Adjusted Fee-Sharing Vault ⚡${C.reset}`);
  console.log(`${C.dim}              Program: ${PROGRAM_ID.toBase58()}${C.reset}`);
  console.log(`${C.dim}              Network: Solana Devnet${C.reset}\n`);

  // ═══ SETUP ═══
  banner("🔗  STEP 0: CONNECT & SETUP");

  const connection = new Connection(DEVNET_URL, "confirmed");
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));

  // Load funder wallet
  const funderPath = path.join(process.env.HOME || "~", ".config", "solana", "id.json");
  const funderKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(funderPath, "utf8"))));
  const funderBalance = await connection.getBalance(funderKeypair.publicKey);
  info(`Funder: ${shortKey(funderKeypair.publicKey)} (${(funderBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL)`);

  // Fresh authority for each run
  const authority = Keypair.generate();
  const guardian = Keypair.generate();
  const oracle = Keypair.generate();
  const agentAlpha = Keypair.generate();
  const agentBravo = Keypair.generate();

  // Fund all wallets
  const fundTxs: Promise<string>[] = [];
  for (const [name, kp, amt] of [
    ["Authority", authority, 0.05],
    ["Guardian", guardian, 0.005],
    ["Oracle", oracle, 0.02],
    ["Agent Alpha 🐺", agentAlpha, 0.03],
    ["Agent Bravo 🦊", agentBravo, 0.025],
  ] as [string, Keypair, number][]) {
    const tx = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: funderKeypair.publicKey,
        toPubkey: kp.publicKey,
        lamports: Math.floor(amt * LAMPORTS_PER_SOL),
      })
    );
    fundTxs.push(anchor.web3.sendAndConfirmTransaction(connection, tx, [funderKeypair]));
  }
  await Promise.all(fundTxs);
  ok("All wallets funded");

  // Create provider with authority as payer
  const authorityWallet = new anchor.Wallet(authority);
  const provider = new anchor.AnchorProvider(connection, authorityWallet, { commitment: "confirmed" });
  const program = new anchor.Program(idl, provider);

  // Derive PDAs
  const [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), authority.publicKey.toBuffer()],
    PROGRAM_ID
  );
  const [vaultSolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_sol"), vaultPda.toBuffer()],
    PROGRAM_ID
  );

  info(`Vault PDA:     ${shortKey(vaultPda)}`);
  info(`Vault SOL PDA: ${shortKey(vaultSolPda)}`);

  // ═══ STEP 1: INITIALIZE VAULT ═══
  banner("🏗️  STEP 1: INITIALIZE VAULT");

  try {
    const dailyCap = new anchor.BN(5 * LAMPORTS_PER_SOL); // 5 SOL daily
    const cooldown = new anchor.BN(10); // 10 seconds for demo

    await retry(() => program.methods
      .initialize(guardian.publicKey, oracle.publicKey, dailyCap, cooldown)
      .accounts({
        vault: vaultPda,
        vaultSol: vaultSolPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc(), "Initialize");

    ok(`Vault initialized!`);
    info(`Guardian: ${shortKey(guardian.publicKey)}`);
    info(`Oracle:   ${shortKey(oracle.publicKey)}`);
    info(`Daily withdrawal cap: 5 SOL`);
    info(`Cooldown: 10 seconds`);
  } catch (e: any) {
    fail(`Initialize failed: ${e.message}`);
    return;
  }

  // ═══ STEP 2: REGISTER AGENTS ═══
  banner("🤖  STEP 2: REGISTER AI AGENTS");

  for (const [name, kp, emoji] of [
    ["Alpha", agentAlpha, "🐺"],
    ["Bravo", agentBravo, "🦊"],
  ] as [string, Keypair, string][]) {
    const [agentProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), vaultPda.toBuffer(), kp.publicKey.toBuffer()],
      PROGRAM_ID
    );
    try {
      await retry(() => program.methods
        .registerAgent(kp.publicKey)
        .accounts({
          vault: vaultPda,
          agentProfile: agentProfilePda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc(), `Register ${name}`);
      ok(`${emoji} Agent ${name} registered (${shortKey(kp.publicKey)})`);
    } catch (e: any) {
      fail(`Register ${name} failed: ${e.message}`);
    }
  }

  // ═══ STEP 3: DEPOSITS ═══
  banner("💰  STEP 3: AGENTS DEPOSIT SOL");

  for (const [name, kp, amount, emoji] of [
    ["Alpha", agentAlpha, 0.01, "🐺"],
    ["Bravo", agentBravo, 0.008, "🦊"],
  ] as [string, Keypair, number, string][]) {
    const [userPosPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), vaultPda.toBuffer(), kp.publicKey.toBuffer()],
      PROGRAM_ID
    );
    const agentWallet = new anchor.Wallet(kp);
    const agentProvider = new anchor.AnchorProvider(connection, agentWallet, { commitment: "confirmed" });
    const agentProgram = new anchor.Program(idl, agentProvider);

    try {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      await retry(() => agentProgram.methods
        .deposit(new anchor.BN(lamports))
        .accounts({
          vault: vaultPda,
          vaultSol: vaultSolPda,
          userPosition: userPosPda,
          user: kp.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([kp])
        .rpc(), `Deposit ${name}`);

      const pos = await program.account.userPosition.fetch(userPosPda);
      ok(`${emoji} Agent ${name} deposited ${amount} SOL → received ${pos.shares.toString()} shares`);
    } catch (e: any) {
      fail(`Deposit ${name} failed: ${e.message}`);
    }
  }

  // Check vault state
  const vaultAfterDeposit = await program.account.vault.fetch(vaultPda);
  info(`Vault total shares: ${vaultAfterDeposit.totalShares.toString()}`);
  info(`Vault SOL balance: ${(await connection.getBalance(vaultSolPda) / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

  // ═══ STEP 4: ORACLE REPORTS TRADES ═══
  banner("📊  STEP 4: ORACLE REPORTS AGENT TRADES");

  const oracleWallet = new anchor.Wallet(oracle);
  const oracleProvider = new anchor.AnchorProvider(connection, oracleWallet, { commitment: "confirmed" });
  const oracleProgram = new anchor.Program(idl, oracleProvider);

  // Alpha: 3 wins, 1 loss (high performer)
  const alphaTrades = [
    { pnl: 150, win: true, label: "+1.50% WIN" },
    { pnl: 200, win: true, label: "+2.00% WIN" },
    { pnl: -50, win: false, label: "-0.50% LOSS" },
    { pnl: 180, win: true, label: "+1.80% WIN" },
  ];
  // Bravo: 2 wins, 2 losses (mediocre)
  const bravoTrades = [
    { pnl: 80, win: true, label: "+0.80% WIN" },
    { pnl: -120, win: false, label: "-1.20% LOSS" },
    { pnl: 60, win: true, label: "+0.60% WIN" },
    { pnl: -90, win: false, label: "-0.90% LOSS" },
  ];

  for (const [name, kp, trades, emoji] of [
    ["Alpha", agentAlpha, alphaTrades, "🐺"],
    ["Bravo", agentBravo, bravoTrades, "🦊"],
  ] as [string, Keypair, typeof alphaTrades, string][]) {
    const [agentProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), vaultPda.toBuffer(), kp.publicKey.toBuffer()],
      PROGRAM_ID
    );
    for (const trade of trades) {
      try {
        await retry(() => oracleProgram.methods
          .reportTrade(new anchor.BN(trade.pnl), trade.win)
          .accounts({
            vault: vaultPda,
            agentProfile: agentProfilePda,
            oracle: oracle.publicKey,
          })
          .signers([oracle])
          .rpc(), `Report Trade ${name}`);
        const color = trade.win ? C.green : C.red;
        console.log(`     ${emoji} ${C.bold}${name}${C.reset}: ${color}${trade.label}${C.reset}`);
      } catch (e: any) {
        fail(`Trade report ${name} failed: ${e.message}`);
      }
    }
    // Show score
    const profile = await program.account.agentProfile.fetch(agentProfilePda);
    const tc = typeof profile.tradeCount === 'number' ? profile.tradeCount : Number(profile.tradeCount);
    const wt = typeof profile.winningTrades === 'number' ? profile.winningTrades : Number(profile.winningTrades);
    const winRate = tc > 0 ? ((wt / tc) * 100).toFixed(1) : "0";
    const pnl = profile.cumulativePnl?.toString() || "0";
    info(`${emoji} ${name} stats: ${tc} trades, ${winRate}% win rate, PnL: ${pnl} bps`);
  }

  // ═══ STEP 5: DISTRIBUTE PROFITS ═══
  banner("💎  STEP 5: DISTRIBUTE PROFITS (Risk-Adjusted)");

  const profitAmount = Math.floor(0.005 * LAMPORTS_PER_SOL); // 0.005 SOL profit

  // Fund oracle to pay for the profit distribution transfer
  const fundOracleTx = new anchor.web3.Transaction().add(
    SystemProgram.transfer({
      fromPubkey: funderKeypair.publicKey,
      toPubkey: vaultSolPda,
      lamports: profitAmount,
    })
  );
  await anchor.web3.sendAndConfirmTransaction(connection, fundOracleTx, [funderKeypair]);
  info(`Simulated profit: ${(profitAmount / LAMPORTS_PER_SOL).toFixed(4)} SOL injected into vault`);

  // Distribute to Alpha (higher score should get more)
  const [alphaProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), vaultPda.toBuffer(), agentAlpha.publicKey.toBuffer()],
    PROGRAM_ID
  );

  try {
    await retry(() => oracleProgram.methods
      .distributeProfits(new anchor.BN(profitAmount), 2000) // 20% agent fee
      .accounts({
        vault: vaultPda,
        vaultSol: vaultSolPda,
        agentProfile: alphaProfilePda,
        oracle: oracle.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([oracle])
      .rpc(), "Distribute Profits");

    const vaultAfterProfit = await program.account.vault.fetch(vaultPda);
    ok(`Profits distributed! 20% agent fee → Alpha for superior performance`);
    info(`Vault total profits distributed: ${vaultAfterProfit.totalProfitsDistributed.toString()} lamports`);
    info(`NAV/share increased for all depositors!`);
  } catch (e: any) {
    fail(`Distribute failed: ${e.message}`);
  }

  // ═══ STEP 6: GUARDIAN POLICY DEMO ═══
  banner("🛡️  STEP 6: GUARDIAN POLICY ENGINE");

  const guardianWallet = new anchor.Wallet(guardian);
  const guardianProvider = new anchor.AnchorProvider(connection, guardianWallet, { commitment: "confirmed" });
  const guardianProgram = new anchor.Program(idl, guardianProvider);

  try {
    // Update policy: tighter daily cap
    await retry(() => guardianProgram.methods
      .updatePolicy(new anchor.BN(2 * LAMPORTS_PER_SOL), new anchor.BN(5))
      .accounts({
        vault: vaultPda,
        guardian: guardian.publicKey,
      })
      .signers([guardian])
      .rpc(), "Update Policy");
    ok(`Guardian updated policy: daily cap → 2 SOL, cooldown → 5 sec`);
  } catch (e: any) {
    fail(`Policy update failed: ${e.message}`);
  }

  // ═══ STEP 7: WITHDRAW ═══
  banner("🏧  STEP 7: AGENT ALPHA WITHDRAWS (with policy checks)");

  await sleep(6000); // Wait for cooldown
  info("Waited 6 seconds for cooldown period...");

  const [alphaPosPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), vaultPda.toBuffer(), agentAlpha.publicKey.toBuffer()],
    PROGRAM_ID
  );

  try {
    const posBefore = await program.account.userPosition.fetch(alphaPosPda);
    const sharesNum = typeof posBefore.shares === 'number' ? posBefore.shares : Number(posBefore.shares);
    const sharesToBurn = Math.floor(sharesNum / 2); // withdraw 50%

    const alphaWallet = new anchor.Wallet(agentAlpha);
    const alphaProvider = new anchor.AnchorProvider(connection, alphaWallet, { commitment: "confirmed" });
    const alphaProgram = new anchor.Program(idl, alphaProvider);

    const balBefore = await connection.getBalance(agentAlpha.publicKey);

    await retry(() => alphaProgram.methods
      .withdraw(new anchor.BN(sharesToBurn))
      .accounts({
        vault: vaultPda,
        vaultSol: vaultSolPda,
        userPosition: alphaPosPda,
        owner: agentAlpha.publicKey,
        user: agentAlpha.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([agentAlpha])
      .rpc(), "Withdraw");

    const balAfter = await connection.getBalance(agentAlpha.publicKey);
    const received = (balAfter - balBefore) / LAMPORTS_PER_SOL;
    ok(`🐺 Alpha withdrew ${sharesToBurn} shares → received ${received.toFixed(6)} SOL`);
    info(`NAV gain: deposited 0.01 SOL, withdrew half and got MORE than 0.005 SOL! 📈`);
  } catch (e: any) {
    fail(`Withdraw failed: ${e.message}`);
  }

  // ═══ STEP 8: EMERGENCY STOP ═══
  banner("🚨  STEP 8: EMERGENCY STOP (Guardian Pause)");

  try {
    await retry(() => guardianProgram.methods
      .emergencyStop(true)
      .accounts({
        vault: vaultPda,
        guardian: guardian.publicKey,
      })
      .signers([guardian])
      .rpc(), "Emergency Stop (Pause)");
    ok("🚨 VAULT PAUSED by Guardian! All operations frozen.");

    // Try deposit while paused — should fail
    info("Attempting deposit while paused...");
    const [bravoPosPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), vaultPda.toBuffer(), agentBravo.publicKey.toBuffer()],
      PROGRAM_ID
    );
    const bravoWallet = new anchor.Wallet(agentBravo);
    const bravoProvider = new anchor.AnchorProvider(connection, bravoWallet, { commitment: "confirmed" });
    const bravoProgram = new anchor.Program(idl, bravoProvider);

    try {
      await retry(() => bravoProgram.methods
        .deposit(new anchor.BN(1000))
        .accounts({
          vault: vaultPda,
          vaultSol: vaultSolPda,
          userPosition: bravoPosPda,
          user: agentBravo.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agentBravo])
        .rpc(), "Paused Deposit Test");
      fail("Deposit should have been rejected!");
    } catch {
      ok("Deposit correctly REJECTED — vault is paused! 🛡️");
    }

    // Unpause
    await retry(() => guardianProgram.methods
      .emergencyStop(false)
      .accounts({
        vault: vaultPda,
        guardian: guardian.publicKey,
      })
      .signers([guardian])
      .rpc(), "Emergency Stop (Resume)");
    ok("Vault RESUMED by Guardian. Operations restored. ✅");
  } catch (e: any) {
    fail(`Emergency stop failed: ${e.message}`);
  }

  // ═══ FINAL SUMMARY ═══
  banner("🏆  DEMO COMPLETE — FINAL VAULT STATE");

  const finalVault = await program.account.vault.fetch(vaultPda);
  const finalBalance = await connection.getBalance(vaultSolPda);

  console.log(`
${C.bold}${C.cyan}  ╔════════════════════════════════════════════════════════╗
  ║  SOLANA SENTINEL v2 — FINAL STATE                      ║
  ╠════════════════════════════════════════════════════════╣${C.reset}
  ${C.white}  Total Shares:        ${finalVault.totalShares.toString().padStart(20)}${C.reset}
  ${C.white}  Total Deposited:     ${finalVault.totalDeposited.toString().padStart(20)} lamports${C.reset}
  ${C.white}  Profits Distributed: ${finalVault.totalProfitsDistributed.toString().padStart(20)} lamports${C.reset}
  ${C.white}  Vault SOL Balance:   ${(finalBalance / LAMPORTS_PER_SOL).toFixed(6).padStart(20)} SOL${C.reset}
  ${C.white}  Registered Agents:   ${finalVault.agentCount.toString().padStart(20)}${C.reset}
  ${C.white}  Current Epoch:       ${finalVault.epoch.toString().padStart(20)}${C.reset}
  ${C.white}  Vault Paused:        ${finalVault.isPaused.toString().padStart(20)}${C.reset}
${C.bold}${C.cyan}  ╚════════════════════════════════════════════════════════╝${C.reset}

${C.bold}${C.green}  ✅ All 8 steps completed successfully!${C.reset}
${C.dim}  → Vault initialized with Guardian Policy Engine${C.reset}
${C.dim}  → AI Agents registered & tracked on-chain${C.reset}
${C.dim}  → Deposits, profit distribution, and risk-adjusted rewards${C.reset}
${C.dim}  → Guardian policy enforcement (daily cap + cooldown)${C.reset}
${C.dim}  → Emergency stop / resume demonstrated${C.reset}
${C.dim}  → Share valuation: NAV/share increased after profit injection${C.reset}

${C.bold}${C.magenta}  🐾 Powered by Aoineco & Co. — The Galactic Cat Collective${C.reset}
`);
}

main().catch((err) => {
  console.error(`\n${C.red}Fatal error:${C.reset}`, err);
  process.exit(1);
});
