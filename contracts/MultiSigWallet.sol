// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract MultiSigWallet is EIP712 {
    event Deposit(address indexed sender, uint value);
    event Submit(uint indexed txId, address indexed to, uint256 value, bytes data);
    event Confirm(address indexed owner, uint indexed txId);
    event Revoke(address indexed owner, uint indexed txId);
    event Execute(uint indexed txId, bool success);

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required;

    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;

    bytes32 public constant CONFIRM_TYPEHASH = keccak256("Confirm(uint256 txId,address wallet,bytes32 txHash,uint256 deadline)");
    constructor(address[] memory _owners, uint256 _required) EIP712("MultiSigWallet","1") {
        require(_owners.length > 0, "owners required");
        require(_required > 0 && _required <= _owners.length, "invalid required");
        for (uint i; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "zero owner");
            require(!isOwner[owner], "owner not unique");
            isOwner[owner] = true;
            owners.push(owner);
        }
        required = _required;
    }

    receive() external payable { emit Deposit(msg.sender, msg.value); }

    modifier onlyOwner() { require(isOwner[msg.sender], "not owner"); _; }
    modifier txExists(uint256 txId) { require(txId < transactions.length, "tx !exists"); _; }
    modifier notExecuted(uint256 txId) { require(!transactions[txId].executed, "executed"); _; }
    modifier notConfirmed(uint256 txId) { require(!confirmations[txId][msg.sender], "confirmed"); _; }

    function getOwners() external view returns(address[] memory) { return owners; }
    function transactionCount() external view returns(uint256) { return transactions.length; }
    function getTransaction(uint256 txId) external view returns (address to, uint256 value, bytes memory data, bool executed, uint256 numConf) {
        Transaction storage t = transactions[txId];
        return (t.to, t.value, t.data, t.executed, t.numConfirmations);
    }

    function _txHash(uint256 txId) internal view returns (bytes32) {
        Transaction storage t = transactions[txId];
        return keccak256(abi.encode(t.to, t.value, keccak256(t.data)));
    }

    function submit(address to, uint256 value, bytes calldata data) external onlyOwner returns (uint256 txId) {
        txId = transactions.length;
        transactions.push(Transaction({
            to: to,
            value: value,
            data: data,
            executed: false,
            numConfirmations: 0
        }));
        emit Submit(txId, to, value, data);
    }

    function confirm(uint256 txId) external onlyOwner txExists(txId) notExecuted(txId) notConfirmed(txId) {
        confirmations[txId][msg.sender] = true;
        transactions[txId].numConfirmations += 1;
        emit Confirm(msg.sender, txId);
        if (transactions[txId].numConfirmations >= required) {
            _execute(txId);
        }
    }

    function revoke(uint256 txId) external onlyOwner txExists(txId) notExecuted(txId) {
        require(confirmations[txId][msg.sender], "not confirmed");
        confirmations[txId][msg.sender] = false;
        transactions[txId].numConfirmations -= 1;
        emit Revoke(msg.sender, txId);
    }

    function execute(uint256 txId) external onlyOwner txExists(txId) notExecuted(txId) {
        require(transactions[txId].numConfirmations >= required, "insufficient confirmations");
        _execute(txId);
    }

    function _execute(uint256 txId) internal {
        Transaction storage t = transactions[txId];
        t.executed = true;
        (bool ok, ) = t.to.call{value: t.value}(t.data);
        emit Execute(txId, ok);
        require(ok, "tx failed");
    }

    function confirmBySig(uint256 txId, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        external txExists(txId) notExecuted(txId)
    {
        require(block.timestamp <= deadline, "expired");
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(CONFIRM_TYPEHASH, txId, address(this), _txHash(txId), deadline)));
        address signer = ECDSA.recover(digest, v, r, s);
        require(isOwner[signer], "bad signer");
        require(!confirmations[txId][signer], "already");
        confirmations[txId][signer] = true;
        transactions[txId].numConfirmations += 1;
        emit Confirm(signer, txId);
        if (transactions[txId].numConfirmations >= required) {
            _execute(txId);
        }
    }
}
