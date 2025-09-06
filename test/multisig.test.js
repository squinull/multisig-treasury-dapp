const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet", function () {
  async function deployAll() {
    const [a,b,c, user] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy(ethers.parseUnits("1000000",18));
    const Wallet = await ethers.getContractFactory("MultiSigWallet");
    const wallet = await Wallet.deploy([a.address,b.address,c.address], 2);
    return { a,b,c,user, token, wallet };
  }

  it("submits, confirms and executes ETH transfer", async () => {
    const { a,b,user, wallet } = await deployAll();
    // fund wallet
    await a.sendTransaction({ to: await wallet.getAddress(), value: ethers.parseEther("1") });

    // submit
    const to = user.address;
    const value = ethers.parseEther("0.3");
    const tx = await wallet.connect(a).submit(to, value, "0x");
    await tx.wait();
    // confirm by two owners triggers auto-exec
    await wallet.connect(a).confirm(0);
    await expect(wallet.connect(b).confirm(0)).to.emit(wallet, "Execute");
    expect(await ethers.provider.getBalance(to)).to.be.gt(0n);
  });

  it("executes ERC20 transfer via data", async () => {
    const { a,b,user, token, wallet } = await deployAll();
    // move tokens to wallet
    await token.transfer(await wallet.getAddress(), ethers.parseUnits("1000",18));

    const iface = new ethers.Interface(["function transfer(address,uint256)"]);
    const data = iface.encodeFunctionData("transfer",[user.address, ethers.parseUnits("123",18)]);
    await wallet.connect(a).submit(await token.getAddress(), 0n, data);
    await wallet.connect(a).confirm(0);
    await wallet.connect(b).confirm(0);

    expect(await token.balanceOf(user.address)).to.equal(ethers.parseUnits("123",18));
  });

  it("prevents double confirm and double execute", async () => {
    const { a,b, wallet } = await deployAll();
    await wallet.connect(a).submit(a.address, 0n, "0x");
    await wallet.connect(a).confirm(0);
    await expect(wallet.connect(a).confirm(0)).to.be.revertedWith("confirmed");
    await wallet.connect(b).confirm(0);
    await expect(wallet.connect(b).execute(0)).to.be.revertedWith("executed");
  });

  it("confirmBySig works", async () => {
    const { a,b,user, wallet } = await deployAll();
    await a.sendTransaction({ to: await wallet.getAddress(), value: ethers.parseEther("1") });
    await wallet.connect(a).submit(user.address, ethers.parseEther("0.2"), "0x");
    // owner b signs EIP-712
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const domain = { name: "MultiSigWallet", version: "1", chainId, verifyingContract: await wallet.getAddress() };
    const [to, value, data] = [user.address, ethers.parseEther("0.2"), "0x"];
    const txHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["address","uint256","bytes32"], [to, value, ethers.keccak256(data)]));
    const types = { Confirm: [
      { name:"txId", type:"uint256" },
      { name:"wallet", type:"address" },
      { name:"txHash", type:"bytes32" },
      { name:"deadline", type:"uint256" }
    ]};
    const deadline = BigInt((await ethers.provider.getBlock("latest")).timestamp + 600);
    const valueToSign = { txId: 0, wallet: await wallet.getAddress(), txHash, deadline };
    const sig = await b.signTypedData(domain, types, valueToSign);
    const r = await wallet.confirm(0); await r.wait(); // first confirm by a
    const { v, r:rr, s } = ethers.Signature.from(sig);
    await expect(wallet.confirmBySig(0, deadline, v, rr, s)).to.emit(wallet, "Execute");
  });
});
