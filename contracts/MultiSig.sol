// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract MultiSig {
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required;

    struct Transaction {
        address destination;
        uint256 value;
        bool executed;
        bytes data;
    }

    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;

    event Submit(uint indexed txId, address indexed owner);
    event Confirm(uint indexed txId, address indexed owner, uint confirmationsCount);
    event Execute(uint indexed txId, address indexed to, uint value);

    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "owners empty");
        require(_required > 0 && _required <= _owners.length, "bad required");
        for (uint i = 0; i < _owners.length; i++) {
            address o = _owners[i];
            require(o != address(0), "zero owner");
            require(!isOwner[o], "dup owner");
            isOwner[o] = true;
            owners.push(o);
        }
        required = _required;
    }

    function ownersCount() external view returns (uint) {
        return owners.length;
    }

    function transactionCount() external view returns (uint256) {
        return transactions.length;
    }

    function addTransaction(address _destination, uint256 _value, bytes memory _data) internal returns (uint256) {
        transactions.push(Transaction({ destination: _destination, value: _value, executed: false, data: _data }));
        return transactions.length - 1;
    }

    function submitTransaction(address _destination, uint256 _value, bytes memory _data) external returns (uint256) {
        require(isOwner[msg.sender], "not owner");
        uint256 txId = addTransaction(_destination, _value, _data);
        emit Submit(txId, msg.sender);
        confirmTransaction(txId);
        return txId;
    }

    function getConfirmationsCount(uint256 txId) public view returns (uint256) {
        uint256 count;
        for (uint i = 0; i < owners.length; i++) if (confirmations[txId][owners[i]]) count++;
        return count;
    }

    function isConfirmed(uint256 txId) public view returns (bool) {
        return getConfirmationsCount(txId) >= required;
    }

    function confirmTransaction(uint256 txId) public {
        require(isOwner[msg.sender], "not owner");
        require(txId < transactions.length, "bad id");
        require(!transactions[txId].executed, "executed");
        require(!confirmations[txId][msg.sender], "confirmed");
        confirmations[txId][msg.sender] = true;
        emit Confirm(txId, msg.sender, getConfirmationsCount(txId));
        if (isConfirmed(txId)) executeTransaction(txId);
    }

    function executeTransaction(uint256 txId) public {
        require(txId < transactions.length, "bad id");
        Transaction storage t = transactions[txId];
        require(!t.executed, "executed");
        require(isConfirmed(txId), "not confirmed");
        t.executed = true;
        (bool ok, ) = t.destination.call{value: t.value}(t.data);
        require(ok, "call failed");
        emit Execute(txId, t.destination, t.value);
    }

    receive() external payable {}
}
