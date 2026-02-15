import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaSentinel } from "../target/types/solana_sentinel";
import { expect } from "chai";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

describe("solana-sentinel", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaSentinel as Program<SolanaSentinel>;

  // Roles
  const authority = provider.wallet.payer;
  const guardian = Keypair.generate();
  const oracle = Keypair.generate();
  const userA = Keypair.generate();
  const userB = Keypair.generate();

  // PDAs
  let vaultPda: PublicKey;
  let vaultSolPda: PublicKey;

  before(async () => {
    // Derive PDAs
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), authority.publicKey.toBuffer()],
      program.programId
    );
    [vaultSolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_sol"), vaultPda.toBuffer()],
      program.programId
    );

    // Fund test accounts
    for (const kp of [guardian, oracle, userA, userB]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }
  });

  // ────────────────────────────────────────────────────────────
  // TEST SCENARIO 1: Full Deposit → Profit → Withdraw Lifecycle
  // ────────────────────────────────────────────────────────────
  describe("Scenario 1: Complete lifecycle", () => {
    it("initializes the vault", async () => {
      await program.methods
        .initialize(guardian.publicKey, oracle.publicKey)
        .accounts({
          vault: vaultPda,
          vaultSol: vaultSolPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const vault = await program.account.vault.fetch(vaultPda);
      expect(vault.authority.toString()).to.equal(
        authority.publicKey.toString()
      );
      expect(vault.guardian.toString()).to.equal(guardian.publicKey.toString());
      expect(vault.oracle.toString()).to.equal(oracle.publicKey.toString());
      expect(vault.totalShares.toNumber()).to.equal(0);
      expect(vault.isPaused).to.equal(false);
    });

    it("userA deposits 2 SOL", async () => {
      const [positionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position"),
          vaultPda.toBuffer(),
          userA.publicKey.toBuffer(),
        ],
        program.programId
      );

      const depositAmount = 2 * LAMPORTS_PER_SOL;

      await program.methods
        .deposit(new anchor.BN(depositAmount))
        .accounts({
          vault: vaultPda,
          vaultSol: vaultSolPda,
          userPosition: positionPda,
          user: userA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([userA])
        .rpc();

      const vault = await program.account.vault.fetch(vaultPda);
      expect(vault.totalShares.toNumber()).to.equal(depositAmount);

      const position = await program.account.userPosition.fetch(positionPda);
      expect(position.shares.toNumber()).to.equal(depositAmount);
    });

    it("userB deposits 3 SOL", async () => {
      const [positionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position"),
          vaultPda.toBuffer(),
          userB.publicKey.toBuffer(),
        ],
        program.programId
      );

      const depositAmount = 3 * LAMPORTS_PER_SOL;

      await program.methods
        .deposit(new anchor.BN(depositAmount))
        .accounts({
          vault: vaultPda,
          vaultSol: vaultSolPda,
          userPosition: positionPda,
          user: userB.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([userB])
        .rpc();

      const vault = await program.account.vault.fetch(vaultPda);
      // Total: 2 + 3 = 5 SOL worth of shares
      expect(vault.totalShares.toNumber()).to.equal(5 * LAMPORTS_PER_SOL);
    });

    it("oracle distributes 1 SOL profit", async () => {
      const profitAmount = 1 * LAMPORTS_PER_SOL;

      await program.methods
        .distributeProfits(new anchor.BN(profitAmount))
        .accounts({
          vault: vaultPda,
          vaultSol: vaultSolPda,
          oracle: oracle.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([oracle])
        .rpc();

      const vault = await program.account.vault.fetch(vaultPda);
      expect(vault.totalProfitsDistributed.toNumber()).to.equal(profitAmount);

      // Vault should now hold 6 SOL (5 deposited + 1 profit)
      const vaultBalance = await provider.connection.getBalance(vaultSolPda);
      expect(vaultBalance).to.equal(6 * LAMPORTS_PER_SOL);
    });

    it("userA withdraws all shares and receives proportional profit", async () => {
      const [positionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position"),
          vaultPda.toBuffer(),
          userA.publicKey.toBuffer(),
        ],
        program.programId
      );

      const position = await program.account.userPosition.fetch(positionPda);
      const sharesToBurn = position.shares;

      const balanceBefore = await provider.connection.getBalance(
        userA.publicKey
      );

      await program.methods
        .withdraw(sharesToBurn)
        .accounts({
          vault: vaultPda,
          vaultSol: vaultSolPda,
          userPosition: positionPda,
          owner: userA.publicKey,
          user: userA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([userA])
        .rpc();

      const balanceAfter = await provider.connection.getBalance(
        userA.publicKey
      );
      // userA had 2/5 of shares → should get 2/5 of 6 SOL = 2.4 SOL
      const received = balanceAfter - balanceBefore;
      // Account for tx fees, should be close to 2.4 SOL
      expect(received).to.be.greaterThan(2.3 * LAMPORTS_PER_SOL);
      expect(received).to.be.lessThan(2.5 * LAMPORTS_PER_SOL);

      const positionAfter = await program.account.userPosition.fetch(
        positionPda
      );
      expect(positionAfter.shares.toNumber()).to.equal(0);
    });
  });

  // ────────────────────────────────────────────────────────────
  // TEST SCENARIO 2: Emergency Stop — Guardian Controls
  // ────────────────────────────────────────────────────────────
  describe("Scenario 2: Emergency stop", () => {
    it("guardian pauses the vault", async () => {
      await program.methods
        .emergencyStop(true)
        .accounts({
          vault: vaultPda,
          guardian: guardian.publicKey,
        })
        .signers([guardian])
        .rpc();

      const vault = await program.account.vault.fetch(vaultPda);
      expect(vault.isPaused).to.equal(true);
    });

    it("deposit fails when vault is paused", async () => {
      const [positionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position"),
          vaultPda.toBuffer(),
          userA.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .deposit(new anchor.BN(LAMPORTS_PER_SOL))
          .accounts({
            vault: vaultPda,
            vaultSol: vaultSolPda,
            userPosition: positionPda,
            user: userA.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([userA])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("VaultPaused");
      }
    });

    it("profit distribution fails when paused", async () => {
      try {
        await program.methods
          .distributeProfits(new anchor.BN(LAMPORTS_PER_SOL))
          .accounts({
            vault: vaultPda,
            vaultSol: vaultSolPda,
            oracle: oracle.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([oracle])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("VaultPaused");
      }
    });

    it("guardian unpauses the vault", async () => {
      await program.methods
        .emergencyStop(false)
        .accounts({
          vault: vaultPda,
          guardian: guardian.publicKey,
        })
        .signers([guardian])
        .rpc();

      const vault = await program.account.vault.fetch(vaultPda);
      expect(vault.isPaused).to.equal(false);
    });
  });

  // ────────────────────────────────────────────────────────────
  // TEST SCENARIO 3: Access Control — Unauthorized Actions
  // ────────────────────────────────────────────────────────────
  describe("Scenario 3: Access control", () => {
    it("non-guardian cannot trigger emergency stop", async () => {
      try {
        await program.methods
          .emergencyStop(true)
          .accounts({
            vault: vaultPda,
            guardian: userA.publicKey, // not the guardian!
          })
          .signers([userA])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        // Constraint violation
        expect(err).to.exist;
      }
    });

    it("non-oracle cannot distribute profits", async () => {
      try {
        await program.methods
          .distributeProfits(new anchor.BN(LAMPORTS_PER_SOL))
          .accounts({
            vault: vaultPda,
            vaultSol: vaultSolPda,
            oracle: userA.publicKey, // not the oracle!
            systemProgram: SystemProgram.programId,
          })
          .signers([userA])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err).to.exist;
      }
    });

    it("non-authority cannot update roles", async () => {
      try {
        await program.methods
          .updateRoles(null, null)
          .accounts({
            vault: vaultPda,
            authority: userA.publicKey, // not the authority!
          })
          .signers([userA])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err).to.exist;
      }
    });

    it("authority can update roles", async () => {
      const newGuardian = Keypair.generate();

      await program.methods
        .updateRoles(newGuardian.publicKey, null)
        .accounts({
          vault: vaultPda,
          authority: authority.publicKey,
        })
        .rpc();

      const vault = await program.account.vault.fetch(vaultPda);
      expect(vault.guardian.toString()).to.equal(
        newGuardian.publicKey.toString()
      );
      // oracle unchanged
      expect(vault.oracle.toString()).to.equal(oracle.publicKey.toString());

      // Revert for other tests
      await program.methods
        .updateRoles(guardian.publicKey, null)
        .accounts({
          vault: vaultPda,
          authority: authority.publicKey,
        })
        .rpc();
    });
  });
});
