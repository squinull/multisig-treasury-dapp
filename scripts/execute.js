const { ethers } = require("hardhat");
async function main() {
  const walletAddr = process.env.WALLET;
  const id = parseInt(process.env.TXID || "0", 10);
  const wallet = await ethers.getContractAt("MultiSigWallet", walletAddr);
  const tx = await wallet.execute(id);
  console.log("execute:", (await tx.wait()).hash);
}
main().catch(e=>{ console.error(e); process.exit(1); });
