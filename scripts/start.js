import _0x540680 from 'fs';
import _0x1bb255 from 'path';
import { startBot } from '../app/index.js';
async function copyFolder(_0x121c47, _0x1215be) {
  try {
    await _0x540680.promises.mkdir(_0x1215be, {
      'recursive': true
    });
    const _0xabaec5 = await _0x540680.promises.readdir(_0x121c47, {
      'withFileTypes': true
    });
    for (let _0x3739ee of _0xabaec5) {
      const _0x56752c = _0x1bb255.join(_0x121c47, _0x3739ee.name);
      const _0x47927a = _0x1bb255.join(_0x1215be, _0x3739ee.name);
      if (_0x3739ee.isDirectory()) {
        await copyFolder(_0x56752c, _0x47927a);
      } else {
        await _0x540680.promises.copyFile(_0x56752c, _0x47927a);
      }
    }
    console.log("Copied " + _0x121c47 + " to " + _0x1215be);
  } catch (_0x592466) {
    console.error("Error copying folder from " + _0x121c47 + " to " + _0x1215be + ':', _0x592466);
  }
}
const accountsSrc = _0x1bb255.join(process.cwd(), "accounts");
const configSrc = _0x1bb255.join(process.cwd(), 'config');
const accountsDest = _0x1bb255.join(process.cwd(), "app", "accounts");
const configDest = _0x1bb255.join(process.cwd(), "app", "config");
(async () => {
  await copyFolder(accountsSrc, accountsDest);
  await copyFolder(configSrc, configDest);
  console.log("Starting the app...");
  try {
    logger.clear();
    logger.info('');
    logger.info("Application Started");
    console.log();
    console.log("MANGO WALLET AUTO BOT");
    await startBot();
  } catch (error) {
    console.log("Error During executing bot", error);
    await startBot();
  }
  // await import("../app/index.js");
})();