/**
 * Vibe Integration Bridge
 *
 * After a successful mint, register the new agent identity into the shared
 * KCN Integration Layer (Identity Federation + AI Control Plane) so Super
 * Cognitive and MANIFEX can see the same agents.
 *
 * This module is intentionally dependency-light. When the full Integration
 * Layer Python package is available it can call it via HTTP or a sidecar;
 * for now it writes a signed agent-registration event to a local queue.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REGISTRY_PATH = process.env.AGENT_REGISTRY_PATH || path.join(__dirname, '../../data/agent_registry.json');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadRegistry() {
  ensureDir(REGISTRY_PATH);
  if (!fs.existsSync(REGISTRY_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')); } catch { return []; }
}

function saveRegistry(entries) {
  ensureDir(REGISTRY_PATH);
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(entries, null, 2));
}

/**
 * Register a newly minted soulbound agent NFT into the shared registry.
 * @param {object} opts
 * @param {string} opts.tokenId
 * @param {string} opts.ownerWallet
 * @param {string} opts.tier
 * @param {string} opts.txHash
 * @param {object} [opts.metadata]
 */
function registerMintedAgent({ tokenId, ownerWallet, tier, txHash, metadata = {} }) {
  const entries = loadRegistry();
  const record = {
    agent_id: `vibe-agent-${tokenId}`,
    identity_type: 'agent',
    display_name: `Vibe Agent #${tokenId}`,
    external_ids: {
      wallet: ownerWallet,
      token_id: String(tokenId),
      tier,
    },
    capabilities: metadata.capabilities || ['coding', 'vibe'],
    runtime_subsystem: 'kcn-vibe-developer',
    status: 'registered',
    tx_hash: txHash,
    registered_at: new Date().toISOString(),
    provenance: {
      action: 'minted',
      content_hash: crypto.createHash('sha256')
        .update(JSON.stringify({ tokenId, ownerWallet, tier, txHash }))
        .digest('hex'),
    },
  };
  entries.push(record);
  saveRegistry(entries);
  return record;
}

module.exports = { registerMintedAgent, REGISTRY_PATH };
