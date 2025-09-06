const { ethers } = require("hardhat");
async function main() {
  const [sender] = await ethers.getSigners();
  const walletAddr = process.env.WALLET;
  const value = ethers.parseEther(process.env.VALUE || "1");
  const tx = await sender.sendTransaction({ to: walletAddr, value });
  console.log("funded:", (await tx.wait()).hash);
}
main().catch(e=>{ console.error(e); process.exit(1); });
