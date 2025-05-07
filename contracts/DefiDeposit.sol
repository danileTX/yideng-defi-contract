// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract DefiDeposit {
    receive() external payable {}
    struct DepositInfo {
        uint256 amount; //存款金额
        uint256 timestamp; //存款时间
        uint256 lastInterestCaculation; // 上次计算利息的时间
    }

    address public owner;

    constructor () {
        owner = msg.sender;
    }
    /*
     * @dev 存储每个地址的存款信息
     */
    mapping(address => DepositInfo) public deposits;

    uint256 public constant ANNUAL_INTEREST_RATE = 500; // 500表示5%年华利率
    uint256 public constant MAX_WITHDRAWAL_RATE = 60; // 60%

    /**
     * @dev 一年的妙数，用于利息计算
     */
    uint256 public constant SECONDS_PER_YEAR = 31536000; //365 days

    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event WithDrawEd(address indexed user, uint256 amount, uint256 interest);
    event InterestCalated(address indexed user, uint256 interest);

    
    fallback() external payable {}

    function deposit() public payable {
        require(msg.value > 0, "deposit amount must be greater than 0");
        DepositInfo storage userDeposit = deposits[msg.sender];

        //  如果用户已经存款，先计算#质押之前的利息。
        if (userDeposit.amount > 0) {
            uint256 interest = calculateInterest(msg.sender);
            userDeposit.amount += interest;
            emit InterestCalated(msg.sender, interest);
        }

        userDeposit.amount += msg.value;
        userDeposit.timestamp = block.timestamp;
        userDeposit.lastInterestCaculation = block.timestamp;

        emit Deposited(msg.sender, msg.value, block.timestamp);
    }

    function calculateInterest(address user) public view returns (uint256) {
        DepositInfo storage userDeposit = deposits[user];
        if (userDeposit.amount == 0) {
            return 0;
        }
        uint256 timeElapsed = block.timestamp -
            userDeposit.lastInterestCaculation;
        //  使用基点计算利息： 本金* 年华利率 * 时间占比。
        uint256 interest = (userDeposit.amount *
            ANNUAL_INTEREST_RATE *
            timeElapsed) / (SECONDS_PER_YEAR * 10000);

        return interest;
    }

    function withDraw(uint256 amount) public {
        DepositInfo storage userDeposit = deposits[msg.sender];

        require(userDeposit.amount >= amount, "Insufficient balance");
        require(amount > 0, "withdraw amount must greater than 0");

        // 计算当前利息
        uint256 interest = calculateInterest(msg.sender);
        uint256 totalBalance = userDeposit.amount + interest;

        // 检查提款限额
        uint256  maxWithdrawal = totalBalance * MAX_WITHDRAWAL_RATE / 100;
        require(amount <= maxWithdrawal, "Exceeds maxium withdrawal limit");

        // 更新存款信息
        userDeposit.amount = totalBalance - amount;
        userDeposit.timestamp = block.timestamp;
        userDeposit.lastInterestCaculation = block.timestamp;

        // 发送ETH
        (bool success,) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit WithDrawEd(msg.sender,amount, interest);
    }

    /**
     * @dev 提取所有的存款和利息
     * @notice 为防止挤兑，该功能已经禁用
     */
    function ownerWithdraw() pure public {
        revert("Function disabled to prevent bank run");
    }
}
