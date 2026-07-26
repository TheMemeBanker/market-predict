const { Connection, PublicKey } = require("@solana/web3.js");
const BN = require("bn.js");

const PROGRAM_ID = new PublicKey("GG4SHU9dJNRGrWfWXmtDtFsX2jpYEhKjHkZBdn5X8fzt");

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

async function checkRound() {
  const roundId = 202;
  const roundIdBn = new BN(roundId);

  const [roundPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("prediction-round"), roundIdBn.toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID
  );

  console.log("Round 202 PDA:", roundPda.toBase58());

  const roundAccount = await connection.getAccountInfo(roundPda);
  if (roundAccount) {
    const data = roundAccount.data;
    console.log("Account data length:", data.length);

    // PredictionRound structure:
    // 8 bytes discriminator
    // 8 bytes round_id
    // 8 bytes start_timestamp
    // 8 bytes lock_timestamp
    // 8 bytes settle_timestamp
    // 8 bytes up_pool
    // 8 bytes down_pool
    // 4 bytes up_count
    // 4 bytes down_count
    // 8 bytes lock_price
    // 8 bytes settle_price
    // 1 byte status (offset 84)
    // ...

    for (let i = 80; i < 110; i++) {
      console.log("Byte " + i + ":", data[i]);
    }

    const status = data[84];
    const statusNames = ['Active', 'Locked', 'Settled', 'Cancelled'];
    console.log("Status byte at offset 84:", status, "=", statusNames[status] || "Unknown");
  } else {
    console.log("Round account not found");
  }
}

checkRound().catch(console.error);
