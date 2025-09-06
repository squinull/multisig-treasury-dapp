const { ethers } = require("hardhat");
async function main() {
  const walletAddr = process.env.WALLET;
  const to = process.env.TO || (await (await ethers.getSigners())[4]).address;
  const value = ethers.parseEther(process.env.VALUE || "0.1");
  const wallet = await ethers.getContractAt("MultiSigWallet", walletAddr);
  const tx = await wallet.submit(to, value, "0x");
  console.log("submitted:", (await tx.wait()).hash);
}
main().catch(e=>{ console.error(e); process.exit(1); });
