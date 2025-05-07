// scripts/deploy.js
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    // 在 ethers v6 中使用 provider 获取余额
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", balance.toString());

    // 部署合约
    const DefiDeposit = await ethers.getContractFactory("DefiDeposit");
    const defiDeposit = await DefiDeposit.deploy();
    
    // 在 ethers v6 中不再需要 .deployed()
    // 等待部署交易被确认
    await defiDeposit.waitForDeployment();
    
    // 合约地址现在是 .target 而非 .address
    const contractAddress = await defiDeposit.getAddress();
    console.log("DefiDeposit deployed to:", contractAddress);
    console.log("Owner address:", await defiDeposit.owner());

    // 等待几个区块确认
    const BLOCK_CONFIRMATIONS = 5;
    // deployTransaction 在 v6 中已更改
    const deployTx = defiDeposit.deploymentTransaction();
    await deployTx.wait(BLOCK_CONFIRMATIONS);

    // 验证合约参数
    console.log("Verifying contract...");
    console.log("Annual Interest Rate:", 
        (await defiDeposit.ANNUAL_INTEREST_RATE()).toString());
    console.log("Max Withdrawal Rate:", 
        (await defiDeposit.MAX_WITHDRAWAL_RATE()).toString());

    // 如果不是在本地网络，进行合约验证
    const networkName = hre.network.name;
    if (networkName !== "hardhat" && networkName !== "localhost") {
        try {
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: [],
            });
            console.log("Contract verified on Etherscan");
        } catch (error) {
            console.error("Error verifying contract:", error);
        }
    }

    return defiDeposit;
}

// 执行部署脚本
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });