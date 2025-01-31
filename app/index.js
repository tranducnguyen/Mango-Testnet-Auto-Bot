import exp from 'constants';
import { accountList } from './accounts/accounts.js';
import { BRIDGE } from './src/chain/dest_chain.js';
import { COINS } from './src/coin/coins.js';
import { CoreService } from './src/service/core-service.js';
import { Helper } from './src/utils/helper.js';
import logger from './src/utils/logger.js';
import { ethers } from "ethers";

export async function operation(account) {
  const coreService = new CoreService(account);
  try {

    await coreService.getAccountInfo();
    await coreService.getBalance(true);
    await coreService.connectMango();
    await coreService.getMangoUser(true);
    // await Helper.refCheck(coreService.address, coreService.user.Premium);

    await coreService.checkIn();

    await coreService.getBeingAppTask();
    if (coreService.beingAppTask.step.find(step => step.status === '0')) {
      await coreService.addStep(coreService.beingAppTask.detail.ID, coreService.beingAppTask.step[0]);
      await coreService.getFaucet();
    }

    await coreService.getSwapTask();
    if (coreService.swapTask.step.find(step => step.status === '0')) {
      await coreService.swap(COINS.MGO, COINS.USDT);
      await coreService.swap(COINS.USDT, COINS.MAI);
      await coreService.swap(COINS.MAI, COINS.USDT);
      await coreService.swap(COINS.USDT, COINS.MGO);
      for (const step of coreService.swapTask.step) {
        if (step.status === '0') {
          await coreService.addStep(coreService.swapTask.detail.ID, step);
        }
      }
      await Helper.delay(2000, account, `${coreService.swapTask.detail.title} Task is now Synchronizing`, coreService);
      await coreService.getMangoUser(true);
    }

    await coreService.getDiscordTask();
    if (coreService.discordTask.step.find(step => step.status === '0')) {
      await coreService.addStep(coreService.discordTask.detail.ID, coreService.discordTask.step[0]);
    }

    await coreService.getExchangeTask();
    if (coreService.exchangeTask.step.find(step => step.status === '0')) {
      let usdtBalance = coreService.balance.find(balance => balance.coinType.split('::').pop() === 'USDT');
      if (usdtBalance.totalBalance < 0.1) {
        await coreService.swap(COINS.MGO, COINS.USDT);
      }
      if (usdtBalance.totalBalance > 1) {
        await coreService.swap(COINS.USDT, COINS.MGO);
        await coreService.swap(COINS.MGO, COINS.USDT);
      }
      usdtBalance = coreService.balance.find(balance => balance.coinType.split('::').pop() === "USDT");
      await coreService.exchange(COINS.USDT, COINS.AI);
      await coreService.exchange(COINS.AI, COINS.USDT);
      usdtBalance = coreService.balance.find(balance => balance.coinType.split('::').pop() === 'USDT');
      if (usdtBalance.totalBalance > 0.1) {
        await coreService.swap(COINS.USDT, COINS.MGO);
      }
      for (const step of coreService.exchangeTask.step) {
        if (step.status === '0') {
          await coreService.addStep(coreService.exchangeTask.detail.ID, step);
        }
      }
      await Helper.delay(2000, account, `${coreService.exchangeTask.detail.title} Task is now Synchronizing`, coreService);
      await coreService.getMangoUser(true);
    }

    await coreService.getBridgeTask();
    if (coreService.bridgeTask.step.find(step => step.status === '0')) {
      await coreService.swap(COINS.MGO, COINS.USDT);
      await coreService.bridge(BRIDGE.MANGOETH);
      await coreService.bridge(BRIDGE.MANGOBSC);
      await coreService.bridge(BRIDGE.ETHMANGO);
      await coreService.bridge(BRIDGE.BSCMANGO);
      for (const step of coreService.bridgeTask.step) {
        await coreService.addStep(coreService.bridgeTask.detail.ID, step);
      }
      await coreService.swap(COINS.USDT, COINS.MGO);
      await Helper.delay(2000, account, `${coreService.bridgeTask.detail.title} Task is now Synchronizing`, coreService);
      await coreService.getMangoUser(true);
    }

    await coreService.DoClaimCard();

    await Helper.delay(1000, account, `Accounts Processing Complete, Delaying For ${Helper.msToTime(1000)}...`, coreService);


  } catch (error) {
    logger.info(error.message);
    await Helper.delay(5000, account, error.message, coreService);
    // operation(account);
  }
}

export async function startBot() {
  try {
    logger.info("BOT STARTED");
    if (accountList.length === 0) {
      throw new Error("Please input your account first in accounts.js file");
    }
    for (let i = 0; i < accountList.length; i++) {
      logger.info(`BOT ${i + 1} STARTED`);
      await operation(accountList[i]);
    }
    // const operations = accountList.map(account => operation(account));
    // await Promise.all(operations);
  } catch (error) {
    logger.info("BOT STOPPED");
    logger.error(JSON.stringify(error));
    throw error;
  }
}

export async function SendGas() {

  try {
    logger.info("BOT STARTED");
    const chain = 'BSC';
    if (accountList.length === 0) {
      throw new Error("Please input your account first in accounts.js file");
    }

    await checkAndRefillWallets(accountList, chain);
  } catch (error) {
    logger.info("BOT STOPPED");
    logger.error(JSON.stringify(error));
    throw error;
  }
}


// Helper function to fetch wallet balances
async function getWalletService(accounts) {
  return await Promise.all(
    accounts.map(async (account) => {
      const coreService = new CoreService(account);
      await coreService.getAccountInfo();
      await coreService.getBalance(true);
      return coreService;
    })
  );
}

async function checkAndRefillWallets(accounts, chain) {
  try {
    const refillThreshold = chain === 'ETH' ? 0.01 : 0.5;
    const donorThreshold = chain === 'ETH' ? 0.02 : 1;
    // Fetch all wallet balances in parallel
    const wallets = await getWalletService(accounts);

    // Separate donor and needy wallets
    const needyWallets = [];
    const donorWallets = [];

    wallets.forEach((wallet) => {
      const balance = wallet.GetBalance(chain);
      if (parseFloat(balance) <= refillThreshold) {
        needyWallets.push({ wallet, balance: parseFloat(balance) });
      } else if (parseFloat(balance) > donorThreshold) {
        donorWallets.push({ wallet, balance: parseFloat(balance) });
      }
      console.log(`Wallet ${wallet.address} has balance ${balance}`);
    });

    if (needyWallets.length === 0) {
      console.log("No wallets need refilling.");
      return;
    }

    if (donorWallets.length === 0) {
      console.log("No donor wallets with sufficient balance.");
      return;
    }

    // Refill needy wallets
    for (const needy of needyWallets) {
      const donor = donorWallets.find((d) => d.balance > donorThreshold);

      if (!donor) {
        console.log(`No suitable donor found for wallet: ${needy.wallet.GetAddress(chain)}`);
        continue;
      }
      const provider = needy.wallet.GetProvider(chain);
      const feeData = await provider.getFeeData();
      const gasPrice = ethers.toBigInt(feeData.gasPrice);
      const gasLimit = BigInt(21000);
      const gasCost = ethers.formatEther(gasPrice * gasLimit);

      // Amount to send is 0.01 ETH, or less if donor can't cover it
      const sendAmount = Math.min(refillThreshold, donor.balance - parseFloat(gasCost));

      if (sendAmount <= 0) {
        console.log(`Donor ${donor.wallet.GetAddress(chain)} can't cover transfer + gas.`);
        continue;
      }

      try {
        console.log(`Sending ${sendAmount} ${chain} from ${donor.wallet.GetAddress(chain)} to ${needy.wallet.GetAddress(chain)}`);

        const tx = {
          to: needy.wallet.GetAddress(chain),
          value: ethers.parseEther(sendAmount.toString()),
          gasLimit
        };

        const txResponse = await donor.wallet.sendTransaction(chain, tx);
        console.log(`Transaction Hash: ${txResponse.hash}`);

        // Wait for confirmation
        await txResponse.wait();

        // Update donor balance
        donor.balance -= sendAmount + parseFloat(gasCost);
        console.log(`Refilled wallet ${needy.wallet.GetAddress(chain)} successfully.`);
      } catch (error) {
        console.error(`Failed to refill wallet ${needy.wallet.GetAddress(chain)}:`, error);
      }
    }
  } catch (error) {
    console.error("Error during wallet refill process:", error);
  }
}




// (async () => {
//   try {
//     logger.clear();
//     logger.info('');
//     logger.info("Application Started");
//     console.log();
//     console.log("MANGO WALLET AUTO BOT");
//     await startBot();
//   } catch (error) {
//     console.log("Error During executing bot", error);
//     await startBot();
//   }
// })();