const { Connection, PublicKey } = require("@solana/web3.js");
const BN = require("bn.js");

const PROGRAM_ID = new PublicKey("GG4SHU9dJNRGrWfWXmtDtFsX2jpYEhKjHkZBdn5X8fzt");
const WALLET = new PublicKey("8QoAyce4BKZUyM3DwvhyKBpBxrQTwrdwFRbCW6TMpuH4");

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

// Check specific rounds that were likely cancelled (214-228)
async function checkRounds() {
  console.log("Checking entries for wallet: " + WALLET.toBase58());

  for (let roundId = 200; roundId <= 235; roundId++) {
    const roundIdBn = new BN(roundId);

    // Get entry PDA for this wallet and round
    const [entryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("prediction-entry"), roundIdBn.toArrayLike(Buffer, 'le', 8), WALLET.toBuffer()],
      PROGRAM_ID
    );

    try {
      const entryAccount = await connection.getAccountInfo(entryPda);
      if (entryAccount) {
        const data = entryAccount.data;
        const betAmount = new BN(data.slice(49, 57), 'le').toString();
        const claimed = data[65] === 1;

        // Get round status
        const [roundPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("prediction-round"), roundIdBn.toArrayLike(Buffer, 'le', 8)],
          PROGRAM_ID
        );

        const roundAccount = await connection.getAccountInfo(roundPda);
        let status = "Unknown";
        if (roundAccount) {
          const statusByte = roundAccount.data[104];
          const statusNames = ['Active', 'Locked', 'Settled', 'Cancelled'];
          status = statusNames[statusByte] || statusByte;
        }

        console.log("Round " + roundId + ": " + (betAmount / 1e9).toFixed(3) + " SOL, claimed: " + claimed + ", status: " + status);

        if (status === 'Cancelled' && !claimed) {
          console.log("  >>> REFUND AVAILABLE!");
        }
      }
    } catch (e) {
      // No entry for this round - skip
    }
  }
}

checkRounds().catch(console.error);
