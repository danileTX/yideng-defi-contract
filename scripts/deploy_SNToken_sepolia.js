const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    // 检查账户余额
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // 确保账户有足够的 ETH
    if (balance < ethers.parseEther("0.01")) {
        throw new Error("Insufficient balance for deployment");
    }

    // 部署合约
    console.log("Deploying SNToken contract...");
    const SNToken = await ethers.getContractFactory("SNToken");
    const snToken = await SNToken.deploy();
    
    // 等待部署交易被确认
    await snToken.waitForDeployment();
    
    // 获取合约地址
    const contractAddress = await snToken.getAddress();
    console.log("SNToken deployed to:", contractAddress);

    // 等待区块确认
    const BLOCK_CONFIRMATIONS = 5;
    const deployTx = snToken.deploymentTransaction();
    await deployTx.wait(BLOCK_CONFIRMATIONS);

    // 验证合约（仅在非 localhost 环境下）
    const networkName = hre.network.name;
    if (networkName !== "localhost" && networkName !== "hardhat") {
        console.log("Verifying contract...");
        try {
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: [],
            });
            console.log("Contract verified successfully on Etherscan");
        } catch (error) {
            if (error.message.includes("Already Verified")) {
                console.log("Contract is already verified");
            } else {
                console.error("Error verifying contract:", error);
            }
        }
    } else {
        console.log("Skipping contract verification on local network");
    }

    // 输出部署信息
    console.log("\nDeployment Summary:");
    console.log("-------------------");
    console.log("Network:", networkName);
    console.log("Contract Address:", contractAddress);
    console.log("Deployer Address:", deployer.address);
    console.log("Transaction Hash:", deployTx.hash);

    return snToken;
}

// 执行部署脚本
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    }); 