import { getFullnodeUrl, MgoClient, MgoHTTPTransport } from '@mgonetwork/mango.js/client';
import { DEFAULT_ED25519_DERIVATION_PATH, Ed25519Keypair } from '@mgonetwork/mango.js/keypairs/ed25519';
import { Helper } from '../utils/helper.js';
import { bcs, MIST_PER_MGO, TransactionBlock } from '@mgonetwork/mango.js';
import { API } from './api.js';
import { SIGNPACKAGE } from '../packages/sign-package.js';
import { AMMPACKAGE } from '../packages/amm-package.js';
import { COINS } from '../coin/coins.js';
import { EVMCOIN } from '../coin/evmcoin.js';
import { BEINGDEXPACKAGE } from '../packages/beingdex.js';
import { accountList } from '../../accounts/accounts.js';
import { proxyList } from '../../config/proxy_list.js';
import { MANGOBRIDGEPACKAGE } from '../packages/mangobridge.js';
import { BRIDGE } from '../chain/dest_chain.js';
import { ethers } from 'ethers';
import { ERC1967PROXY } from '../abi/erc1967_proxy.js';
import { Config } from '../../config/config.js';
import logger from '../utils/logger.js';
import { ERC1967BSCPROXY } from '../abi/erc1967_proxy_bsc.js';
import { ETH_MGO_ABI } from "../abi/ethabi.js";

export class CoreService extends API {
  constructor(seedPhrase) {
    const isMnemonic = Helper.determineType(seedPhrase);
    if (!isMnemonic) {
      throw new Error("Sorry, this bot only supports Seed Phrase. Please use a Seed Phrase instead of a Private Key.");
    }
    // if (Config.BRIDGERAWDATA.length === 0) {
    //   throw new Error("Please provide BRIDGERAWDATA in config.js");
    // }
    // if (Config.BRIDGERAWDATA.length !== accountList.length) {
    //   throw new Error(`You have ${accountList.length} accounts,  ${Config.BRIDGERAWDATA.length} BRIDGERAWDATA`);
    // }
    const accountIndex = accountList.indexOf(seedPhrase);
    const proxy = proxyList.length === accountList.length ? proxyList[accountIndex] : undefined;
    super(proxy);
    this.acc = seedPhrase;
    this.client = new MgoClient({
      transport: new MgoHTTPTransport({
        url: getFullnodeUrl("testnet")
      })
    });
    this.ethProvider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com', 11155111);
    this.bscProvider = new ethers.JsonRpcProvider("https://bsc-testnet-rpc.publicnode.com", 97);
  }

  async getAccountInfo() {
    try {
      await Helper.delay(500, this.acc, "Getting Wallet Information...", this);
      this.wallet = Ed25519Keypair.deriveKeypair(this.acc, DEFAULT_ED25519_DERIVATION_PATH);
      this.evmWallet = ethers.Wallet.fromPhrase(this.acc, this.ethProvider);
      this.bscWallet = ethers.Wallet.fromPhrase(this.acc, this.bscProvider);
      this.evmAddress = this.evmWallet.address;
      const accountIndex = accountList.indexOf(this.acc);
      this.address = this.wallet.getPublicKey().toMgoAddress();
      logger.info(`${accountIndex} EVM Address: ${this.evmAddress}, BSC Address: ${this.bscWallet.address}, Mango Address: ${this.address}`);
      await Helper.delay(1000, this.acc, "Successfully got account information", this);
    } catch (error) {
      throw error;
    }
  }

  async connectMango() {
    try {
      await Helper.delay(500, this.acc, "Connecting to Mango DAPPS...", this);
      const signTime = Math.floor(Date.now() / 1000);
      const signData = {
        address: this.address,
        signTime,
        signType: "Login"
      };
      const encodedData = new TextEncoder().encode(JSON.stringify(signData));
      const signature = await this.wallet.signPersonalMessage(encodedData);
      const response = await this.request("https://task-api.testnet.mangonetwork.io/mgoUser/loginMgoUserPublic", "POST", {
        signData: signature.signature,
        address: this.address,
        signTime
      });
      if (response.data.code === 0) {
        this.token = response.data.data.token;
        await Helper.delay(500, this.acc, response.data.msg, this);
      } else {
        throw new Error(response.data.msg);
      }
    } catch (error) {
      throw error;
    }
  }

  async getMangoUser(showMessage = false) {
    try {
      if (showMessage) {
        await Helper.delay(500, this.acc, "Getting User Information...", this);
      }
      const response = await this.request("https://task-api.testnet.mangonetwork.io/mgoUser/getMgoUser", 'GET', undefined, this.token);
      if (response.data.code === 0) {
        this.user = response.data.data;
        if (showMessage) {
          await Helper.delay(500, this.acc, response.data.msg, this);
        }
      } else {
        throw new Error(response.data.msg);
      }
    } catch (error) {
      throw error;
    }
  }

  async getSwapTask() {
    try {
      await Helper.delay(2000, this.acc, "Getting Swap Task Details...", this);
      const response = await this.request('https://task-api.testnet.mangonetwork.io/base/taskDetail', "POST", {
        taskId: 2,
        type: 0
      }, this.token);
      if (response.data.code === 0) {
        this.swapTask = response.data.data;
        await Helper.delay(500, this.acc, response.data.msg, this);
      } else {
        throw new Error(response.data.msg);
      }
    } catch (error) {
      throw error;
    }
  }

  async getExchangeTask() {
    try {
      await Helper.delay(2000, this.acc, "Getting BeingDex Task Details...", this);
      const response = await this.request("https://task-api.testnet.mangonetwork.io/base/taskDetail", "POST", {
        taskId: 5,
        type: 0
      }, this.token);
      if (response.data.code === 0) {
        this.exchangeTask = response.data.data;
        await Helper.delay(500, this.acc, response.data.msg, this);
      } else {
        throw new Error(response.data.msg);
      }
    } catch (error) {
      throw error;
    }
  }

  async getDiscordTask() {
    try {
      await Helper.delay(2000, this.acc, "Getting Discord Task Details...", this);
      const response = await this.request('https://task-api.testnet.mangonetwork.io/base/taskDetail', 'POST', {
        taskId: 3,
        type: 0
      }, this.token);
      if (response.data.code === 0) {
        this.discordTask = response.data.data;
        await Helper.delay(500, this.acc, response.data.msg, this);
      } else {
        throw new Error(response.data.msg);
      }
    } catch (error) {
      throw error;
    }
  }

  async getBeingAppTask() {
    try {
      await Helper.delay(2000, this.acc, "Getting Task Details...", this);
      const response = await this.request('https://task-api.testnet.mangonetwork.io/base/taskDetail', 'POST', {
        taskId: 1,
        type: 0
      }, this.token);

      if (response.data.code === 0) {
        this.beingAppTask = response.data.data;
        await Helper.delay(500, this.acc, response.data.msg, this);
      } else {
        throw new Error(response.data.msg);
      }
    } catch (error) {
      throw error;
    }
  }

  async getBridgeTask() {
    try {
      await Helper.delay(2000, this.acc, "Getting Mango Bridge Task Details...", this);
      const response = await this.request("https://task-api.testnet.mangonetwork.io/base/taskDetail", "POST", {
        taskId: 4,
        type: 0
      }, this.token);
      if (response.data.code === 0) {
        this.bridgeTask = response.data.data;
        await Helper.delay(500, this.acc, response.data.msg, this);
      } else {
        throw new Error(response.data.msg);
      }
    } catch (error) {
      throw error;
    }
  }

  async addStep(taskId, step, showMessage = true) {
    try {
      if (showMessage) {
        await Helper.delay(2000, this.acc, `Try Completing Step ${step.label}...`, this);
      }
      const response = await this.request("https://task-api.testnet.mangonetwork.io/base/addStep", 'POST', {
        taskId,
        stepId: step.sort
      }, this.token);

      if (response.data.code === 0) {
        await Helper.delay(100, this.acc, response.data, this);
      }
    } catch (error) {
      throw error;
    }
  }

  async getBalance(showMessage = false) {
    try {
      if (showMessage) {
        await Helper.delay(500, this.acc, "Getting Account Balance...", this);
      }
      this.balance = await this.client.getAllBalances({ owner: this.address });
      this.balance = this.balance.map(balance => {
        balance.totalBalance = parseFloat((Number(balance.totalBalance) / Number(MIST_PER_MGO)).toFixed(5));
        return balance;
      });
      const ethBalance = ethers.formatEther(await this.ethProvider.getBalance(this.evmAddress));
      const bscBalance = ethers.formatEther(await this.bscProvider.getBalance(this.evmAddress));
      this.evmBalance = [{ SYMBOL: 'ETH', BALANCE: ethBalance }];
      this.bscBalance = [{ SYMBOL: "BNB", BALANCE: bscBalance }];
      if (showMessage) {
        await Helper.delay(1000, this.acc, "Successfully got account balance", this);
      }
    } catch (error) {
      throw error;
    }
  }

  GetBalance(chain) {
    switch (chain) {
      case 'ETH':
        return this.evmBalance.find(balance => balance.SYMBOL === "ETH").BALANCE;
      case "BSC":
        return this.bscBalance.find(balance => balance.SYMBOL === "BNB").BALANCE;
      case "MGO":
        return this.balance;
      default:
        break;
    }
  }

  GetProvider(chain) {
    switch (chain) {
      case 'ETH':
        return this.ethProvider;
      case "BSC":
        return this.bscProvider;
      default:
        break;
    }
  }

  GetAddress(chain) {
    switch (chain) {
      case 'ETH':
        return this.evmAddress;
      case "BSC":
        return this.evmAddress;
      default:
        return this.address;
    }
  }

  async getFaucet() {
    try {
      await Helper.delay(1000, this.acc, "Requesting MGO Faucet", this);
      const response = await this.request("https://task-api.testnet.mangonetwork.io/base/getFaucet", "POST", {
        chain: '0',
        type: true
      }, this.token);
      if (response.status === 200) {
        await Helper.delay(1000, this.acc, response.data.msg, this);
        await this.getBalance();
      } else {
        throw response;
      }
    } catch (error) {
      if (error.msg) {
        await Helper.delay(3000, this.acc, error.data.msg, this);
      } else {
        await Helper.delay(3000, this.acc, error.data.msg, this);
      }
    }
  }

  async checkIn() {
    try {
      await Helper.delay(1000, this.acc, "Trying to Daily Sign In", this);
      const txBlock = new TransactionBlock();
      txBlock.moveCall({
        target: `${SIGNPACKAGE.ADDRESS}::sign::sign_in`,
        arguments: [txBlock.object(SIGNPACKAGE.MODULE.SIGN.SIGNPOOL), txBlock.object(SIGNPACKAGE.MODULE.SIGN.CLOCK)]
      });
      await this.executeTx(txBlock);
      await Helper.delay(1000, this.acc, "Successfully Daily Sign In", this);
    } catch (error) {
      await Helper.delay(1000, this.acc, "Failed to Daily Sign In, possibly already signed in", this);
    }
  }

  async swap(fromCoin, toCoin) {
    try {
      const txBlock = new TransactionBlock();
      let coins = await this.client.getCoins({ owner: this.address, coinType: fromCoin.TYPE });
      if (coins.data.length === 0) {
        while (coins.data.length === 0) {
          coins = await this.client.getCoins({ owner: this.address, coinType: fromCoin.TYPE });
          await this.getBalance();
          await Helper.delay(10000, this.acc, `Delaying for ${Helper.msToTime(10000)} until swap balance update`, this);
        }
      }
      if (coins.data.length > 1) {
        await this.mergeCoin(fromCoin);
        coins = await this.client.getCoins({ owner: this.address, coinType: fromCoin.TYPE });
      }
      let amount = Number(0.1) * Number(MIST_PER_MGO);
      let splitCoin;
      if (fromCoin === COINS.MGO) {
        splitCoin = txBlock.splitCoins(txBlock.gas, [txBlock.pure(amount)]);
      } else {
        amount = Number(coins.data[0].balance);
        splitCoin = txBlock.splitCoins(txBlock.object(coins.data[0].coinObjectId), [txBlock.pure(amount)]);
      }
      await Helper.delay(1000, this.acc, `Trying to swap ${fromCoin === COINS.MGO ? parseFloat((Number(amount) / Number(MIST_PER_MGO)).toString()).toFixed(2) : parseFloat((Number(coins.data[0].balance) / Number(MIST_PER_MGO)).toString()).toFixed(5)} ${fromCoin.SYMBOL} to ? ${toCoin.SYMBOL}`, this);
      const poolCoins = [fromCoin, toCoin].find(coin => coin === COINS.MGO);
      const coinTypes = fromCoin === COINS.MGO || (!poolCoins && fromCoin === COINS.USDT) ? [fromCoin.TYPE, toCoin.TYPE] : [fromCoin.TYPE, toCoin.TYPE].reverse();
      const poolId = await this.getPool(coinTypes);
      let swapAmount = await this.swapCalculate(coinTypes, poolId, !!(fromCoin === COINS.MGO || (!poolCoins && fromCoin === COINS.USDT)), amount);
      swapAmount = Math.floor(swapAmount - swapAmount * 10 / 100);
      await Helper.delay(1000, this.acc, `Trying to swap ${parseFloat((Number(amount) / Number(MIST_PER_MGO)).toString()).toFixed(2)} ${fromCoin.SYMBOL} to ${parseFloat((Number(swapAmount) / Number(MIST_PER_MGO)).toString()).toFixed(2)} ${toCoin.SYMBOL}`, this);
      txBlock.moveCall({
        target: `${AMMPACKAGE.ADDRESS}::amm_script::${fromCoin === COINS.MGO || (!poolCoins && fromCoin === COINS.USDT) ? "swap_exact_coinA_for_coinB" : "swap_exact_coinB_for_coinA"}`,
        typeArguments: coinTypes,
        arguments: [txBlock.object(poolId), txBlock.object(AMMPACKAGE.MODULE.AMMCONFIG.GLOBALPAUSESTATUSID), splitCoin, txBlock.pure(amount), txBlock.pure(swapAmount)]
      });
      await this.executeTx(txBlock);
      await Helper.delay(1000, this.acc, `Successfully swapped ${parseFloat((Number(amount) / Number(MIST_PER_MGO)).toString()).toFixed(2)} ${fromCoin.SYMBOL} to ${parseFloat((Number(swapAmount) / Number(MIST_PER_MGO)).toString()).toFixed(2)} ${toCoin.SYMBOL}`, this);
    } catch (error) {
      throw error;
    }
  }

  async exchange(fromCoin, toCoin) {
    try {
      await Helper.delay(1000, this.acc, `Exchanging ${fromCoin.SYMBOL} to ${toCoin.SYMBOL}`, this);
      const coinTypes = fromCoin === COINS.USDT ? [fromCoin.TYPE, toCoin.TYPE].reverse() : [fromCoin.TYPE, toCoin.TYPE];
      const txBlock = new TransactionBlock();
      let coins = await this.client.getCoins({ owner: this.address, coinType: fromCoin.TYPE });
      if (coins.data.length === 0) {
        while (coins.data.length === 0) {
          coins = await this.client.getCoins({ owner: this.address, coinType: fromCoin.TYPE });
          console.log(coins.data.length);
          await this.claimDealPool(BEINGDEXPACKAGE.MODULE.CLOB.AIUSDTPOOL, coinTypes);
          await this.getBalance();
          await Helper.delay(5000, this.acc, `Delaying for ${Helper.msToTime(5000)} until exchange balance update`, this);
        }
      }
      if (coins.data.length > 1) {
        await this.mergeCoin(fromCoin);
        coins = await this.client.getCoins({ owner: this.address, coinType: fromCoin.TYPE });
      }
      const amount = Number(coins.data[0].balance);
      txBlock.moveCall({
        target: `${BEINGDEXPACKAGE.ADDRESS}::clob::${fromCoin === COINS.USDT ? 'buy' : "sell"}`,
        typeArguments: coinTypes,
        arguments: fromCoin === COINS.USDT ? [txBlock.object(BEINGDEXPACKAGE.MODULE.CLOB.AIUSDTPOOL), txBlock.pure("9223372036854775808"), txBlock.pure(amount), txBlock.pure(true), txBlock.object(coins.data[0].coinObjectId)] : [txBlock.object(BEINGDEXPACKAGE.MODULE.CLOB.AIUSDTPOOL), txBlock.pure("9223372036854775808"), txBlock.pure(amount), txBlock.pure(false), txBlock.object(coins.data[0].coinObjectId)]
      });
      await this.executeTx(txBlock);
      await Helper.delay(1000, this.acc, `Successfully exchanged ${parseFloat((Number(amount) / Number(MIST_PER_MGO)).toString()).toFixed(2)} ${fromCoin.SYMBOL} to ${toCoin.SYMBOL}`, this);
    } catch (error) {
      throw error;
    }
  }

  async mergeCoin(coin) {
    try {
      const coins = await this.client.getCoins({ owner: this.address, coinType: coin.TYPE });
      if (coin === COINS.MGO && coins.data.length < 3) {
        return;
      }
      if (coins.data.length < 2) {
        return;
      }
      const txBlock = new TransactionBlock();
      let primaryCoin;
      let secondaryCoins;
      if (coin === COINS.MGO) {
        primaryCoin = coins.data[1].coinObjectId;
        secondaryCoins = coins.data.slice(2).map(coin => coin.coinObjectId);
      } else {
        primaryCoin = coins.data[0].coinObjectId;
        secondaryCoins = coins.data.slice(1).map(coin => coin.coinObjectId);
      }
      await Helper.delay(1000, this.acc, `Merging ${coin.SYMBOL}`, this);
      await txBlock.mergeCoins(txBlock.object(primaryCoin), secondaryCoins.map(coinId => txBlock.object(coinId)));
      await this.executeTx(txBlock);
      await this.getBalance();
    } catch (error) {
      throw error;
    }
  }

  async bridge(destination) {
    try {
      if (destination === BRIDGE.MANGOBSC || destination === BRIDGE.MANGOETH) {
        const txBlock = new TransactionBlock();
        let coins = await this.client.getCoins({ owner: this.address, coinType: COINS.USDT.TYPE });
        if (coins.data.length === 0) {
          while (coins.data.length === 0) {
            coins = await this.client.getCoins({ owner: this.address, coinType: COINS.USDT.TYPE });
            await this.getBalance();
            await Helper.delay(10000, this.acc, `Delaying for ${Helper.msToTime(10000)} until swap balance update`, this);
          }
        }
        if (coins.data.length > 1) {
          await this.mergeCoin(COINS.USDT);
          coins = await this.client.getCoins({ owner: this.address, coinType: COINS.USDT.TYPE });
        }
        let amount = Number(0.001) * Number(MIST_PER_MGO);
        const splitCoin = txBlock.splitCoins(txBlock.object(coins.data[0].coinObjectId), [txBlock.pure(amount)]);
        await Helper.delay(1000, this.acc, `Trying to Bridge ${parseFloat((Number(amount) / Number(MIST_PER_MGO)).toString()).toFixed(5)} ${COINS.USDT.SYMBOL} to ${destination}`, this);
        txBlock.moveCall({
          target: `${MANGOBRIDGEPACKAGE.ADDRESS}::bridge::bridge_token`,
          typeArguments: [COINS.USDT.TYPE],
          arguments: [txBlock.object(MANGOBRIDGEPACKAGE.MODULE.BRIDGE.BRIDGEXECUTOR), splitCoin, txBlock.pure(this.evmAddress), txBlock.pure(destination), txBlock.object(MANGOBRIDGEPACKAGE.MODULE.BRIDGE.CLOCK)]
        });
        await this.executeTx(txBlock);
        await Helper.delay(1000, this.acc, `Successfully Bridge USDT Token From Mango Network to ${destination}`, this);
      } else {
        await Helper.delay(1000, this.acc, `Trying to Bridge Token From ${destination === BRIDGE.ETHMANGO ? "ETH Sepolia" : "BNB Testnet"} to Mango Network`, this);
        if (destination === BRIDGE.ETHMANGO) {
          const ethBalance = this.evmBalance.find(balance => balance.SYMBOL === "ETH");
          if (ethBalance === 0) {
            await Helper.delay(3000, this.acc, "Not Enough ETH Sepolia Balance, Skipping", this);
            return;
          }
        } else {
          const bnbBalance = this.evmBalance.find(balance => balance.SYMBOL === "BNB");
          if (bnbBalance === 0) {
            await Helper.delay(3000, this.acc, "Not Enough BNB Testnet Balance, Skipping", this);
            return;
          }
        }
        // const accountIndex = accountList.indexOf(this.acc);
        // const rawData = Config.BRIDGERAWDATA[accountIndex];
        const tokenString = destination === BRIDGE.ETHMANGO ? EVMCOIN.ETH : EVMCOIN.BNB;
        const rawData = this.createRawData(this.address, tokenString);
        const txData = {
          to: destination === BRIDGE.ETHMANGO ? ERC1967PROXY.CA : ERC1967BSCPROXY.CA,
          from: this.evmAddress,
          data: rawData,
          value: ethers.parseEther("0.00001")
        };
        await this.executeEvmTx(txData, destination);
        await Helper.delay(1000, this.acc, `Successfully Bridge Token From ${destination === BRIDGE.ETHMANGO ? "ETH Sepolia" : "BNB Testnet"} to Mango Network`, this);
      }
    } catch (error) {
      throw error;
    }
  }

  createRawData(address, tokenString) {
    const bridgeMessage = {
      fromToken: "0x0000000000000000000000000000000000000000", // Replace with the actual token address
      amountIn: ethers.parseEther("0.00001"), // Replace with amount (1 token with 18 decimals)
      toToken: tokenString, // Replace with target token symbol
      destination: address // Replace with destination
    };
    const contractInterface = new ethers.Interface(ETH_MGO_ABI.ABI);
    const data = contractInterface.encodeFunctionData("bridgeToken", [bridgeMessage]);
    return data;
  }

  async swapCalculate(coinTypes, poolId, isCoinA, amount) {
    const txBlock = new TransactionBlock();
    txBlock.moveCall({
      target: `${AMMPACKAGE.ADDRESS}::amm_router::compute_out`,
      typeArguments: coinTypes,
      arguments: [txBlock.object(poolId), txBlock.pure(amount), txBlock.pure(isCoinA)]
    });
    const result = await this.readTx(txBlock);
    return bcs.de(result.results[0].returnValues[0][1], Uint8Array.from(result.results[0].returnValues[0][0]));
  }

  async getAndClaimDealPool(poolId, coinTypes) {
    const txBlock = new TransactionBlock();
    txBlock.moveCall({
      target: `${BEINGDEXPACKAGE.ADDRESS}::clob::check_deal_pool_balance`,
      typeArguments: coinTypes,
      arguments: [txBlock.object(poolId), txBlock.pure(this.address)]
    });
    const result = await this.readTx(txBlock);
    const poolBalance = result.events[0].parsedJson;
    if (poolBalance.token0_balance !== 0) {
      await this.claimDealPool(poolId, coinTypes);
    }
  }

  async claimDealPool(poolId, coinTypes) {
    await Helper.delay(1000, this.acc, "Check and Claiming Being Dex Pool Balance ...", this);
    const txBlock = new TransactionBlock();
    txBlock.moveCall({
      target: `${BEINGDEXPACKAGE.ADDRESS}::clob::claim_deal_pool_balance`,
      typeArguments: coinTypes,
      arguments: [txBlock.object(poolId)]
    });
    await this.executeTx(txBlock);
    await Helper.delay(1000, this.acc, "Being Dex Pool Balance Extracted Tx ...", this);
  }

  async getPool(coinTypes) {
    const txBlock = new TransactionBlock();
    txBlock.moveCall({
      target: `${AMMPACKAGE.ADDRESS}::amm_swap::get_pool_id`,
      typeArguments: coinTypes,
      arguments: [txBlock.object(AMMPACKAGE.MODULE.AMMSWAP.AMMFACTORY)]
    });
    const result = await this.readTx(txBlock);
    return bcs.de(result.results[0].returnValues[0][1], Uint8Array.from(result.results[0].returnValues[0][0]));
  }

  async executeTx(txBlock) {
    try {
      await Helper.delay(1000, this.acc, "Executing Tx ...", this);
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.wallet,
        transactionBlock: txBlock
      });
      await Helper.delay(3000, this.acc, `Tx Executed : https://mgoscan.com/txblock/${result.digest}`, this);
      await this.getBalance();
      return result;
    } catch (error) {
      throw error;
    }
  }

  async readTx(txBlock) {
    try {
      const result = await this.client.devInspectTransactionBlock({
        sender: this.address,
        transactionBlock: txBlock
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  async executeEvmTx(txData, destination) {
    try {
      logger.info(`TX DATA ${JSON.stringify(Helper.serializeBigInt(txData))}`);
      await Helper.delay(500, this.acc, "Executing TX...", this);
      const txResponse = destination === BRIDGE.ETHMANGO ? await this.evmWallet.sendTransaction(txData) : await this.bscWallet.sendTransaction(txData);
      await Helper.delay(500, this.acc, "Tx Executed Waiting For Block Confirmation...", this);
      const txReceipt = await txResponse.wait();
      logger.info(`Tx Confirmed and Finalizing: ${JSON.stringify(txReceipt)}`);
      await Helper.delay(5000, this.acc, `Tx Executed and Confirmed \n${destination === BRIDGE.ETHMANGO ? 'https://sepolia.etherscan.io' : "https://testnet.bscscan.com"}/tx/${txReceipt.hash}`, this);
      await this.getBalance();
    } catch (error) {
      if (error.message.includes("504")) {
        await Helper.delay(5000, this.acc, error.message, this);
      } else {
        throw error;
      }
    }
  }

  async sendTransaction(destChain, txData) {
    return destChain === 'ETH' ? await this.evmWallet.sendTransaction(txData) : await this.bscWallet.sendTransaction(txData);
  }

  async sendGasTestnet(amount, destination, destChain) {

    const gasPriceWei = destChain === 'ETH' ? await this.ethProvider.getGasPrice() : await this.bscProvider.getGasPrice();

    const txData = {
      to: destination,
      value: ethers.parseEther(amount), // Amount in ETH to send
      gasLimit: 21000, // Standard gas limit for simple ETH transfer
      gasPrice: gasPriceWei
    };

    try {
      logger.info(`TX DATA ${JSON.stringify(Helper.serializeBigInt(txData))}`);
      const txResponse = destChain === 'ETH' ? await this.evmWallet.sendTransaction(txData) : await this.bscWallet.sendTransaction(txData);
      const receipt = await txResponse.wait();
      logger.info(`Tx Confirmed and Finalizing: ${JSON.stringify(receipt)}`);
    } catch (error) {
      logger.error("Error sending", error);
    }
  }

}