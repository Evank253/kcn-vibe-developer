#!/usr/bin/env node
// Generates Hardhat-format artifacts/ directly from solc, so `hardhat test
// --no-compile` can run without needing binaries.soliditylang.org (blocked
// in this sandbox's network allowlist). In a normal dev environment, just
// use `npx hardhat compile` — this script only exists for this sandbox.
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const ROOT = path.join(__dirname, '..');
const contractsDir = path.join(ROOT, 'contracts');
const artifactsDir = path.join(ROOT, 'artifacts', 'contracts');

const files = fs.readdirSync(contractsDir).filter((f) => f.endsWith('.sol'));
const sources = {};
for (const file of files) {
  sources[file] = { content: fs.readFileSync(path.join(contractsDir, file), 'utf8') };
}

function findImports(importPath) {
  try {
    const resolved = importPath.startsWith('.')
      ? path.join(contractsDir, importPath)
      : path.join(ROOT, 'node_modules', importPath);
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
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object', 'evm.bytecode.linkReferences', 'evm.deployedBytecode.object', 'evm.deployedBytecode.linkReferences'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

let hasError = false;
for (const err of output.errors || []) {
  console.log(err.severity.toUpperCase() + ':', err.formattedMessage);
  if (err.severity === 'error') hasError = true;
}
if (hasError) process.exit(1);

// Only write artifacts for our own two contracts (files array), not the
// full OpenZeppelin dependency tree — that's all Hardhat/ethers need to
// deploy and interact with KCNToken / KCNAgentNFT in tests.
for (const file of files) {
  const contractsInFile = output.contracts[file];
  for (const contractName of Object.keys(contractsInFile)) {
    const c = contractsInFile[contractName];
    const outDir = path.join(artifactsDir, file);
    fs.mkdirSync(outDir, { recursive: true });
    const artifact = {
      _format: 'hh-sol-artifact-1',
      contractName,
      sourceName: `contracts/${file}`,
      abi: c.abi,
      bytecode: '0x' + c.evm.bytecode.object,
      deployedBytecode: '0x' + c.evm.deployedBytecode.object,
      linkReferences: c.evm.bytecode.linkReferences || {},
      deployedLinkReferences: c.evm.deployedBytecode.linkReferences || {},
    };
    fs.writeFileSync(path.join(outDir, `${contractName}.json`), JSON.stringify(artifact, null, 2));
    console.log(`wrote ${outDir}/${contractName}.json (${artifact.bytecode.length / 2 - 1} bytes)`);
  }
}
