import _0x2cc15f from 'fs';
import _0x1e298b from 'path';
async function fileExists(_0x58871d) {
  try {
    await _0x2cc15f.promises.access(_0x58871d);
    return true;
  } catch {
    return false;
  }
}
async function copyFile(_0x36d70f, _0x2d3bc9) {
  try {
    if (await fileExists(_0x2d3bc9)) {
      console.log("File already exists at " + _0x2d3bc9 + ", skipping copy.");
    } else {
      await _0x2cc15f.promises.copyFile(_0x36d70f, _0x2d3bc9);
      console.log("Copied " + _0x36d70f + " to " + _0x2d3bc9);
    }
  } catch (_0xe5b807) {
    console.error("Error copying file from " + _0x36d70f + " to " + _0x2d3bc9 + ':', _0xe5b807);
  }
}
async function createFolder(_0x4938ef) {
  try {
    const _0x5f3672 = await _0x2cc15f.promises.access(_0x4938ef).then(() => true)['catch'](() => false);
    if (!_0x5f3672) {
      await _0x2cc15f.promises.mkdir(_0x4938ef, {
        'recursive': true
      });
      console.log("Created folder: " + _0x4938ef);
    }
  } catch (_0xfc9ad1) {
    console.error("Error creating folder " + _0x4938ef + ':', _0xfc9ad1);
  }
}
async function fixMgoImports(_0x4f0087) {
  try {
    const _0x79800a = await _0x2cc15f.promises.readdir(_0x4f0087, {
      'withFileTypes': true
    });
    for (const _0x525fb1 of _0x79800a) {
      const _0x59e31f = _0x1e298b.join(_0x4f0087, _0x525fb1.name);
      if (_0x525fb1.isDirectory()) {
        await fixMgoImports(_0x59e31f);
      } else {
        if (_0x525fb1.isFile() && _0x525fb1.name.endsWith(".js")) {
          const _0x12c032 = await _0x2cc15f.promises.readFile(_0x59e31f, "utf-8");
          if (_0x12c032.includes("from \"../utils/mgo-types\"")) {
            const _0x1b0984 = _0x12c032.replace(/from "\.\.\/utils\/mgo-types"/g, "from \"../utils/mgo-types.js\"");
            await _0x2cc15f.promises.writeFile(_0x59e31f, _0x1b0984, "utf-8");
            console.log("Fixed imports in: " + _0x59e31f);
          }
          if (_0x12c032.includes("from \"./mgo-system-state\"")) {
            const _0x37494b = _0x12c032.replace(/from "\.\/mgo-system-state"/g, "from \"./mgo-system-state.js\"");
            await _0x2cc15f.promises.writeFile(_0x59e31f, _0x37494b, "utf-8");
            console.log("Fixed imports in: " + _0x59e31f);
          }
        }
      }
    }
  } catch (_0x526f48) {
    console.error("Error fixing imports in directory " + _0x4f0087 + ':', _0x526f48);
  }
}
const copyOperations = [{
  'src': _0x1e298b.join("config", "proxy_list_tmp.js"),
  'dest': _0x1e298b.join('config', "proxy_list.js")
}, {
  'src': _0x1e298b.join("accounts", "accounts_tmp.js"),
  'dest': _0x1e298b.join("accounts", "accounts.js")
}];
(async () => {
  console.log("Copying Template File");
  await createFolder("accounts");
  for (let {
    src: _0x3f2623,
    dest: _0x5e2e2c
  } of copyOperations) {
    await copyFile(_0x3f2623, _0x5e2e2c);
  }
  console.log("\nFixing @mgonetwork/mango.js imports...");
  const _0x29d90b = _0x1e298b.join("node_modules", "@mgonetwork", "mango.js");
  if (await fileExists(_0x29d90b)) {
    await fixMgoImports(_0x29d90b);
  } else {
    console.error("Directory " + _0x29d90b + " not found. Skipping import fixes.");
  }
  console.log("\nSetup Complete");
  console.log("Open and Configure\n- accounts/accounts.js\n- config/config.js\n ");
})();