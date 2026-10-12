/**
 * Durable claim store – file-backed JSON.
 * Drop-in replacement for the in-memory store.
 * Swap the file path for a Postgres adapter when you scale.
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_PATH = process.env.CLAIMS_STORE_PATH || path.join(__dirname, '../../data/claims.json');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load(filePath = DEFAULT_PATH) {
  ensureDir(filePath);
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function save(data, filePath = DEFAULT_PATH) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

class DurableClaimStore {
  constructor(filePath = DEFAULT_PATH) {
    this.filePath = filePath;
    this._data = load(this.filePath);
  }

  create(claimId, record) {
    this._data[claimId] = { ...record, createdAt: new Date().toISOString() };
    save(this._data, this.filePath);
    return this._data[claimId];
  }

  get(claimId) {
    return this._data[claimId] || null;
  }

  update(claimId, patch) {
    if (!this._data[claimId]) return null;
    this._data[claimId] = { ...this._data[claimId], ...patch, updatedAt: new Date().toISOString() };
    save(this._data, this.filePath);
    return this._data[claimId];
  }

  listPending() {
    return Object.entries(this._data)
      .filter(([, r]) => r.status === 'pending')
      .map(([id, r]) => ({ claimId: id, ...r }));
  }

  markClaimed(claimId, wallet, txHash) {
    return this.update(claimId, { status: 'claimed', wallet, txHash, claimedAt: new Date().toISOString() });
  }
}

module.exports = { DurableClaimStore, DEFAULT_PATH };
