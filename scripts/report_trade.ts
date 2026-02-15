import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaSentinel } from "../target/types/solana_sentinel";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as fs from "fs";

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Usage: ts-node report_trade.ts <pnl_bps> <is_win>");
        process.exit(1);
    }

    const pnlBps = parseInt(args[0]);
    const isWin = args[1] === "true";

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const idl = JSON.parse(fs.readFileSync("./target/idl/solana_sentinel.json", "utf8"));
    const program = new anchor.Program(idl, provider) as Program<SolanaSentinel>;

    // Load Oracle keypair (assumed to be the provider wallet for now)
    const oracle = provider.wallet;

    // Derive Vault PDA
    const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), oracle.publicKey.toBuffer()],
        program.programId
    );

    // Derive Agent Profile PDA (Using Alpha as default for demo)
    // In production, this would be the specific agent's key
    const agentKey = new PublicKey("2aYG9oX89E19B2L1tP9v7B6v9R8A8e8w9v7B6v9R8A8e"); // Dummy or real from env
    const [agentProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent_profile"), vaultPda.toBuffer(), agentKey.toBuffer()],
        program.programId
    );

    console.log(`Reporting to Vault: ${vaultPda.toBase58()}`);
    console.log(`PnL: ${pnlBps} bps, Win: ${isWin}`);

    try {
        const tx = await program.methods
            .reportTrade(new anchor.BN(pnlBps), isWin)
            .accounts({
                vault: vaultPda,
                agentProfile: agentProfilePda,
                oracle: oracle.publicKey,
            })
            .rpc();
        console.log(`✅ Trade reported on-chain! TX: ${tx}`);
    } catch (e) {
        console.error("❌ Failed to report trade:", e);
    }
}

main();
