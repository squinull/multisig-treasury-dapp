const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const { ethers } = require('ethers');

const PORT = process.env.PORT || 8788;
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const RELAYER_KEY = process.env.RELAYER_KEY;
if (!RELAYER_KEY) { console.error("RELAYER_KEY missing"); process.exit(1); }

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(RELAYER_KEY, provider);

const ABI = [
  "function confirmBySig(uint256 txId,uint256 deadline,uint8 v,bytes32 r,bytes32 s)",
  "function _txHash(uint256) view returns (bytes32)",
  "function getTransaction(uint256) view returns(address,uint256,bytes,bool,uint256)",
  "function dropId() view returns (uint256)"
];

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", async (req,res)=>{
  const net = await provider.getNetwork();
  res.json({ relayer: wallet.address, chainId: Number(net.chainId) });
});

app.post("/confirm", async (req,res)=>{
  try {
    const { walletAddr, txId, deadline, signature } = req.body || {};
    if (!walletAddr || txId===undefined || !deadline || !signature) return res.status(400).json({ error: "bad payload" });
    const sig = ethers.Signature.from(signature);
    const c = new ethers.Contract(walletAddr, ABI, wallet);
    const r = await c.confirmBySig(txId, deadline, sig.v, sig.r, sig.s);
    res.json({ txHash: r.hash });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message || "error" });
  }
});

app.listen(PORT, ()=> console.log(`relay on :${PORT} as ${wallet.address}`));
