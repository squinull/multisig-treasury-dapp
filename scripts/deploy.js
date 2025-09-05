const { ethers } = require("hardhat");

async function main() {
  const [a0, a1, a2] = await ethers.getSigners();
  const owners = [a0.address, a1.address, a2.address];
  const required = 2;

  const MultiSig = await ethers.getContractFactory("MultiSig");
  const ms = await MultiSig.deploy(owners, required);
  await ms.waitForDeployment();

  console.log("MultiSig deployed at:", await ms.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
