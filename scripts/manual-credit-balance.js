// scripts/manual-credit-balance.js
/**
 * 💰 Ручное зачисление баланса (для тестов без вебхуков)
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'voiceflow.db');
const db = new Database(dbPath);

console.log('💰 Ручное зачисление баланса\n');

// Параметры (измените под ваш платёж)
const PAYMENT_ID = '5045959666';  // Payment ID из NowPayments Dashboard
const USER_ID = 1;                 // ID пользователя
const AMOUNT = 20;                 // Сумма в USD

// 1. Находим транзакцию
const transaction = db.prepare('SELECT * FROM transactions WHERE payment_id = ?').get(PAYMENT_ID);

if (!transaction) {
  console.log(`❌ Транзакция не найдена: ${PAYMENT_ID}`);
  db.close();
  process.exit(1);
}

console.log('📊 Найдена транзакция:');
console.log(`   ID: ${transaction.id}`);
console.log(`   User: ${transaction.user_id}`);
console.log(`   Amount: $${transaction.amount}`);
console.log(`   Status: ${transaction.status}`);

// 2. Проверяем, не зачислено ли уже
if (transaction.status === 'completed') {
  console.log('\n⚠️  Транзакция уже завершена!');
  db.close();
  process.exit(0);
}

// 3. Зачисляем баланс
console.log(`\n💰 Зачисляем $${AMOUNT} пользователю #${USER_ID}...`);

db.prepare(`
  UPDATE user_balances 
  SET balance = balance + ?, 
      updated_at = CURRENT_TIMESTAMP 
  WHERE user_id = ?
`).run(AMOUNT, USER_ID);

// 4. Обновляем статус транзакции
db.prepare(`
  UPDATE transactions 
  SET status = 'completed', 
      completed_at = CURRENT_TIMESTAMP 
  WHERE payment_id = ?
`).run(PAYMENT_ID);

console.log('✅ Баланс зачислен!');

// 5. Показываем результат
const balance = db.prepare('SELECT * FROM user_balances WHERE user_id = ?').get(USER_ID);
console.log('\n📊 Новый баланс:');
console.log(`   User ${balance.user_id}: $${balance.balance}`);

const updatedTx = db.prepare('SELECT * FROM transactions WHERE payment_id = ?').get(PAYMENT_ID);
console.log('\n📊 Статус транзакции:');
console.log(`   Status: ${updatedTx.status}`);
console.log(`   Completed: ${updatedTx.completed_at}`);

db.close();
console.log('\n✅ Готово!\n');