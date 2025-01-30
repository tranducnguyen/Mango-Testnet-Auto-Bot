import logger from './twist.js';
import bip39 from 'bip39';

export class Helper {
  static delay(ms, logLevel, logMessage, logData) {
    return new Promise(async (resolve) => {
      let remainingTime = ms;
      if (logLevel !== undefined) {
        await logger.log(logMessage, logLevel, logData, `Delaying for ${this.msToTime(ms)}`);
      } else {
        logger.info(`Delaying for ${this.msToTime(ms)}`);
      }
      const interval = setInterval(async () => {
        remainingTime -= 1000;
        if (logLevel !== undefined) {
          await logger.log(logMessage, logLevel, logData, `Delaying for ${this.msToTime(remainingTime)}`);
        } else {
          logger.info(`Delaying for ${this.msToTime(remainingTime)}`);
        }
        if (remainingTime <= 0) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
      setTimeout(async () => {
        clearInterval(interval);
        await logger.clearInfo();
        if (logLevel) {
          await logger.log(logMessage, logLevel, logData);
        }
        resolve();
      }, ms);
    });
  }

  static msToTime(duration) {
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.round((duration % 60000) / 1000);
    return `${hours} Hours ${minutes} Minutes ${seconds} Seconds`;
  }

  static refCheck(ref, value) {
    // Implementation needed
  }

  static randomUserAgent() {
    const userAgents = [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/125.2535.60 Mobile/15E148 Safari/605.1.15",
      "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.113 Mobile Safari/537.36 EdgA/124.0.2478.104",
      "Mozilla/5.0 (Linux; Android 10; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.113 Mobile Safari/537.36 EdgA/124.0.2478.104",
      "Mozilla/5.0 (Linux; Android 10; VOG-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.113 Mobile Safari/537.36 OPR/76.2.4027.73374",
      "Mozilla/5.0 (Linux; Android 10; SM-N975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.113 Mobile Safari/537.36 OPR/76.2.4027.73374"
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  static determineType(input) {
    return this.isMnemonic(input);
  }

  static isMnemonic(mnemonic) {
    return bip39.validateMnemonic(mnemonic);
  }

  static serializeBigInt(obj) {
    return JSON.parse(JSON.stringify(obj, (key, value) => (typeof value === "bigint" ? value.toString() : value)));
  }
}