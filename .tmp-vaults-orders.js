const fs = require('fs');
const mongoose = require('mongoose');

function loadUri() {
  const text = fs.readFileSync('.env', 'utf8');
  const line = text.split(/\r?\n/).find((row) => row.startsWith('MONGODB_URI='));
  let value = line.slice('MONGODB_URI='.length).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value;
}

async function main() {
  await mongoose.connect(loadUri());
  const orders = mongoose.connection.db.collection('orders');
  const rows = await orders.find({
    paymentMethod: 'VAULTSPAY',
    createdAt: { $gte: new Date('2026-10-05T20:00:00.000Z') },
  }, {
    projection: {
      shortOrderNumber: 1,
      status: 1,
      paymentStatus: 1,
      isPaid: 1,
      total: 1,
      cancelReason: 1,
      vaultsPayPaymentStatus: 1,
      vaultsPayTransactionId: 1,
      createdAt: 1,
    },
  }).sort({ createdAt: -1 }).limit(15).toArray();

  console.log(JSON.stringify(rows.map((row) => ({
    order: row.shortOrderNumber,
    status: row.status,
    paymentStatus: row.paymentStatus,
    isPaid: row.isPaid,
    total: row.total,
    vaults: row.vaultsPayPaymentStatus || '',
    hasTxn: Boolean(row.vaultsPayTransactionId),
    reason: row.cancelReason || '',
    createdAt: row.createdAt,
  })), null, 2));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
