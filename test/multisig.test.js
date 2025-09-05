const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSig", function () {
  it("executes after reaching required confirmations", async () => {
    const [o0, o1, o2, recipient] = await ethers.getSigners();
    const MultiSig = await ethers.getContractFactory("MultiSig");
    const ms = await MultiSig.deploy([o0.address, o1.address, o2.address], 2);
    await ms.waitForDeployment();

    await o0.sendTransaction({ to: await ms.getAddress(), value: ethers.parseEther("1") });

    const tx1 = await ms.connect(o0).submitTransaction(recipient.address, ethers.parseEther("0.3"), "0x");
    await tx1.wait();

    await expect(() => ms.connect(o1).confirmTransaction(0))
      .to.changeEtherBalances(
        [recipient, ms],
        [ethers.parseEther("0.3"), ethers.parseEther("-0.3")]
      );

    const t = await ms.transactions(0);
    expect(t.executed).to.equal(true);
  });

  it("reverts for non-owner submit", async () => {
    const [o0, o1, rando] = await ethers.getSigners();
    const MultiSig = await ethers.getContractFactory("MultiSig");
    const ms = await MultiSig.deploy([o0.address, o1.address], 2);
    await ms.waitForDeployment();
    await expect(ms.connect(rando).submitTransaction(rando.address, 0n, "0x"))
      .to.be.revertedWith("not owner");
  });
});
