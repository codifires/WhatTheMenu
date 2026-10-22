const mongoose = require('mongoose');

let isReplicaSet = null;

/**
 * Checks if the connected MongoDB instance/cluster supports transactions (Replica Set).
 */
const supportsTransactions = async () => {
  if (isReplicaSet !== null) return isReplicaSet;
  try {
    const adminDb = mongoose.connection.db.admin();
    const serverStatus = await adminDb.command({ serverStatus: 1 });
    isReplicaSet = !!serverStatus.repl;
  } catch (err) {
    // Fallback: check connection options or assume replica set if on Atlas (mongodb+srv)
    const uri = mongoose.connection._connectionString || '';
    isReplicaSet = uri.includes('mongodb+srv') || uri.includes('replicaSet');
  }
  return isReplicaSet;
};

/**
 * Executes a callback within a MongoDB session/transaction if supported,
 * or runs directly if on standalone MongoDB.
 *
 * @param {Function} callback - async (session) => { ... }
 * @returns {Promise<any>}
 */
const withTransaction = async (callback) => {
  const canUseTxn = await supportsTransactions();

  if (!canUseTxn) {
    // Standalone MongoDB without replica set
    return await callback(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await callback(session);
    }, {
      readPreference: 'primary',
      readConcern: { level: 'local' },
      writeConcern: { w: 'majority' },
      maxCommitTimeMS: 10000
    });
    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  supportsTransactions,
  withTransaction
};
