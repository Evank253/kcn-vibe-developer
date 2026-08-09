#!/usr/bin/env node
// Manual solc compile — used only in this sandbox because
// binaries.soliditylang.org is not on the network allowlist here.
// In your real dev environment `npx hardhat compile` works normally.
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractsDir = path.join(__dirname, '..', 'contracts');
const files = fs.readdirSync(contractsDir).filter((f) => f.endsWith('.sol'));

const sources = {};
for (const file of files) {
  sources[file] = { content: fs.readFileSync(path.join(contractsDir, file), 'utf8') };
}

function findImports(importPath) {
  try {
    const resolved = importPath.startsWith('.')
      ? path.join(contractsDir, importPath)
      : path.join(__dirname, '..', 'node_modules', importPath);
    return { contents: fs.readFileSync(resolved, 'utf8') };
  } catch (e) {
    return { error: 'File not found: ' + importPath };
  }
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'cancun',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

let hasError = false;
if (output.errors) {
  for (const err of output.errors) {
    console.log(err.severity.toUpperCase() + ':', err.formattedMessage);
    if (err.severity === 'error') hasError = true;
  }
}

if (!hasError) {
  console.log('\n✅ Compiled successfully:');
  for (const file of Object.keys(output.contracts || {})) {
    for (const contractName of Object.keys(output.contracts[file])) {
      const bytecodeLen = output.contracts[file][contractName].evm.bytecode.object.length / 2;
      console.log(`  ${file}:${contractName} — bytecode ${bytecodeLen} bytes`);
    }
  }
  process.exit(0);
} else {
  process.exit(1);
}
