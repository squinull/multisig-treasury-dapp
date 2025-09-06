const { ethers } = require("hardhat");
async function main() {
  const walletAddr = process.env.WALLET;
  const token = process.env.TOKEN;
  const to = process.env.TO || (await (await ethers.getSigners())[4]).address;
  const amount = ethers.parseUnits(process.env.AMOUNT || "100", 18);
  const iface = new ethers.Interface(["function transfer(address,uint256)"]);
  const data = iface.encodeFunctionData("transfer", [to, amount]);
  const wallet = await ethers.getContractAt("MultiSigWallet", walletAddr);
  const tx = await wallet.submit(token, 0n, data);
  console.log("submitted:", (await tx.wait()).hash);
}
main().catch(e=>{ console.error(e); process.exit(1); });
