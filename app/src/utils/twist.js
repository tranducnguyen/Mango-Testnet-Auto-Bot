import '../service/core-service.js';
import { Twisters } from 'twisters';
import logger from './logger.js';
import { accountList } from '../../accounts/accounts.js';

class Twist {
  constructor() {
    this.twisters = new Twisters();
  }

  formatBalance(balance) {
    return balance.toFixed(5);
  }

  log(message = '', account = '', accountData, delay) {
    const accountIndex = accountList.indexOf(account);
    if (delay === undefined) {
      logger.info(`Account ${accountIndex + 1} - ${message}`);
      delay = '-';
    }
    const address = accountData.address ?? '-';
    const balances = accountData.balance ?? [];
    const evmBalances = accountData.evmBalance ?? [];
    const bscBalances = accountData.bscBalance ?? [];
    const user = accountData.user ?? {};
    const mgoUser = user.MgoUser ?? {};
    const score = mgoUser.integral ?? '-';
    const evmWallet = accountData.evmWallet ?? undefined;

    console.log(`
================== Account ${accountIndex + 1} =================
Address      : - ${address} (MANGO) ${evmWallet ? `- ${accountData.evmAddress} (EVM)` : ''}  | Score : ${score}
MANGO NETWORK : ${balances.map(balance => `| ${this.formatBalance(balance.totalBalance)} ${balance.coinType.split('::').pop()}`).join('')}
ETH SEPOLIA NETWORK : ${evmBalances.map(balance => ` ${balance.BALANCE} ${balance.SYMBOL}`).join('')} TBNB NETWORK : ${bscBalances.map(balance => ` ${balance.BALANCE} ${balance.SYMBOL}`).join('')}
Status       : ${message} | Delay : ${delay}
==============================================
`);
  }

  info(message = '') {
    this.twisters.put('2', {
      text: `
==============================================
Info : ${message}
==============================================
`
    });
  }

  clearInfo() {
    this.twisters.remove('2');
  }

  clear(account) {
    this.twisters.remove(account);
  }
}

export default new Twist();