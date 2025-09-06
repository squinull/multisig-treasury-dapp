const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [a,b,c] = await ethers.getSigners();
  const owners = [a.address, b.address, c.address];
  const required = 2;

  const Token = await ethers.getContractFactory("MockERC20");
  const token = await Token.deploy(ethers.parseUnits("1000000", 18));

  const Wallet = await ethers.getContractFactory("MultiSigWallet");
  const wallet = await Wallet.deploy(owners, required);

  const info = { owners, required, token: await token.getAddress(), wallet: await wallet.getAddress() };
  console.log("Wallet:", info.wallet);
  fs.writeFileSync("frontend/deployment.json", JSON.stringify(info, null, 2));
}
main().catch((e)=>{ console.error(e); process.exit(1); });
