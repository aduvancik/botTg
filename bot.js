const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
require('dotenv').config();

// Ініціалізація бота
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Завантаження даних з файлу
let data = {};
if (fs.existsSync('data.json')) {
  data = JSON.parse(fs.readFileSync('data.json'));
} else {
  data = { inventory: {}, balance: { cash: 0, card: 0, oleg: 0 } };
}

// Функція для підрахунку загальної вартості товару на складі
const calculateInventoryValue = (inventory) => {
  let totalValue = 0;

  Object.keys(inventory).forEach((brand) => {
    Object.keys(inventory[brand].flavors).forEach((flavor) => {
      const quantity = inventory[brand].flavors[flavor].quantity;
      const price = inventory[brand].flavors[flavor].price;
      totalValue += quantity * price; // Додаємо вартість для кожного смаку
    });
  });

  return totalValue;
};


// Створення кнопок
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: 'Додати рідину', callback_data: 'add_liquid' }],
      [{ text: 'Переглянути асортимент', callback_data: 'view_inventory' }],
      [{ text: 'Переглянути баланс', callback_data: 'view_balance' }],
      [{ text: 'Продати рідину', callback_data: 'sell_liquid' }],
      [{ text: 'Списання грошей', callback_data: 'deduct_money' }],
      [{ text: 'Списання рідин', callback_data: 'deduct_liquid' }],
      [{ text: 'Списання грошей для Олега', callback_data: 'deduct_oleg' }],
    ]
  }
};

// Обробка старту
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Привіт! Ось основне меню:', mainMenu);
});

// Функція для надсилання основного меню
const sendMainMenu = (chatId) => {
  bot.sendMessage(chatId, 'Ось основне меню:', mainMenu);
};

// Обробка натискання кнопок
bot.on('callback_query', (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const action = callbackQuery.data;

  switch (action) {
    case 'deduct_oleg':
      bot.sendMessage(chatId, 'Введіть суму для списання з балансу Олега');
      bot.once('message', (deductMsg) => {
        const deductAmount = parseFloat(deductMsg.text);
        if (isNaN(deductAmount) || deductAmount <= 0) {
          bot.sendMessage(chatId, 'Будь ласка, введіть дійсну суму для списання.');
          return sendMainMenu(chatId);
        }

        if (data.balance.oleg >= deductAmount) {
          data.balance.oleg -= deductAmount;
          fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
          bot.sendMessage(chatId, `Сума ${deductAmount} грн успішно списана з балансу Олега.`);
        } else {
          bot.sendMessage(chatId, 'Недостатньо коштів на балансі Олега.');
        }

        sendMainMenu(chatId); // Після списання повертаємось до головного меню
      });
      break;

    // Example for handling invalid input in the 'add_liquid' case
    case 'add_liquid':
      bot.sendMessage(chatId, 'Введіть бренд рідини');
      bot.once('message', (brandMsg) => {
        const brand = brandMsg.text.trim();

        if (!brand) {
          bot.sendMessage(chatId, 'Будь ласка, введіть бренд рідини.');
          return sendMainMenu(chatId);
        }

        bot.sendMessage(chatId, `Введіть ціну за 1 шт для рідини бренду ${brand}`);
        bot.once('message', (priceMsg) => {
          const salePrice = parseFloat(priceMsg.text);

          if (isNaN(salePrice) || salePrice <= 0) {
            bot.sendMessage(chatId, 'Будь ласка, введіть дійсну кількість для ціни.');
            return sendMainMenu(chatId);
          }

          bot.sendMessage(chatId, `Тепер введіть суму, яку отримає Олег за кожну рідину бренду ${brand}`);
          bot.once('message', (olegEarningsMsg) => {
            const olegEarnings = parseFloat(olegEarningsMsg.text);

            if (isNaN(olegEarnings) || olegEarnings <= 0) {
              bot.sendMessage(chatId, 'Будь ласка, введіть дійсну суму для Олега.');
              return sendMainMenu(chatId);
            }

            bot.sendMessage(chatId, `Тепер введіть смак рідини для бренду ${brand}`);
            bot.once('message', (flavorMsg) => {
              const flavor = flavorMsg.text.trim();

              if (!flavor) {
                bot.sendMessage(chatId, 'Будь ласка, введіть смак рідини.');
                return sendMainMenu(chatId);
              }

              // Збереження отриманих даних (brand, salePrice, olegEarnings, flavor)
              bot.sendMessage(chatId, `Ціна для бренду ${brand} встановлена на ${salePrice} грн за 1 шт. Олег отримає ${olegEarnings} грн за кожну рідину.`);
              sendMainMenu(chatId);
            });
          });
        });
      });
      break;

    case 'sell_liquid':
      bot.sendMessage(chatId, 'Виберіть бренд рідини для продажу');
      bot.once('message', (brandMsg) => {
        const brand = brandMsg.text;
        if (!data.inventory[brand]) {
          bot.sendMessage(chatId, 'Цей бренд не знайдений.');
          return sendMainMenu(chatId);
        }

        bot.sendMessage(chatId, `Виберіть смак рідини для бренду ${brand}`);
        bot.once('message', (flavorMsg) => {
          const flavor = flavorMsg.text;
          if (!data.inventory[brand].flavors[flavor]) {
            bot.sendMessage(chatId, 'Цей смак не знайдений для цього бренду.');
            return sendMainMenu(chatId);
          }

          bot.sendMessage(chatId, `Введіть кількість для продажу смаку ${flavor} бренду ${brand}`);
          bot.once('message', (quantityMsg) => {
            const quantity = parseInt(quantityMsg.text);

            if (isNaN(quantity) || quantity <= 0) {
              bot.sendMessage(chatId, 'Будь ласка, введіть дійсну кількість.');
              return;
            }

            const currentQuantity = data.inventory[brand].flavors[flavor].quantity;

            if (quantity > currentQuantity) {
              bot.sendMessage(chatId, 'Недостатньо кількості на складі.');
              return;
            }

            // Оновлюємо кількість рідини в асортименті
            data.inventory[brand].flavors[flavor].quantity -= quantity;

            // Якщо кількість рідини стала 0, видаляємо її з асортименту
            if (data.inventory[brand].flavors[flavor].quantity === 0) {
              delete data.inventory[brand].flavors[flavor];
              bot.sendMessage(chatId, `Смак ${flavor} для бренду ${brand} більше не доступний через відсутність на складі.`);
            }

            // Оновлення балансу
            const salePrice = data.inventory[brand].price * quantity;
            const olegEarnings = data.inventory[brand].olegPrice * quantity;

            // Оновлення балансу в залежності від способу оплати
            bot.sendMessage(chatId, 'Виберіть спосіб оплати (готівка або картка)', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Готівка', callback_data: `cash_${salePrice}_${olegEarnings}` }],
                  [{ text: 'Картка', callback_data: `card_${salePrice}_${olegEarnings}` }]
                ]
              }
            });
          });
        });
      });
      break;

    case 'view_inventory':
      let inventoryMessage = 'Асортимент рідин:\n';

      // Ітеруємо через кожен бренд та смак
      Object.keys(data.inventory).forEach((brand) => {
        Object.keys(data.inventory[brand].flavors).forEach((flavor) => {
          const quantity = data.inventory[brand].flavors[flavor].quantity;
          const price = data.inventory[brand].flavors[flavor].price;
          const olegEarnings = data.inventory[brand].flavors[flavor].olegPrice;

          inventoryMessage += `🔹 Бренд: ${brand}
      🥰 Смак: ${flavor}, 🔹 Кількість: ${quantity}, 🔹 Ціна за одиницю: ${price} грн, 🔹 Сума для Олега за 1 шт: ${olegEarnings} грн\n`;
        });
      });

      bot.sendMessage(chatId, inventoryMessage);
      sendMainMenu(chatId);
      break;

    case 'view_balance':
      // Формуємо повідомлення для виводу балансу
      const balanceMessage = `💰 Баланс:
        Готівка: ${data.balance.cash} грн
        Картка: ${data.balance.card} грн
        Олег: ${data.balance.oleg} грн
      
        📊 Загальний баланс: ${data.balance.cash + data.balance.card - data.balance.oleg} грн
        📦 Загальна сума товару на складі: ${calculateInventoryValue(data.inventory)} грн`;

      bot.sendMessage(chatId, balanceMessage);
      sendMainMenu(chatId);
      break;

    case 'deduct_money':
      bot.sendMessage(chatId, 'Введіть суму для списання');
      bot.once('message', (msg) => {
        const amount = parseFloat(msg.text);
        if (isNaN(amount) || amount <= 0) {
          bot.sendMessage(chatId, 'Будь ласка, введіть дійсну суму для списання.');
          return sendMainMenu(chatId);
        }
        if (data.balance.cash >= amount) {
          data.balance.cash -= amount;
          fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
          bot.sendMessage(chatId, `Сума ${amount} грн успішно списана з готівкового балансу.`);
        } else {
          bot.sendMessage(chatId, 'Недостатньо коштів на готівковому балансі.');
        }
        sendMainMenu(chatId);
      });
      break;

    case 'deduct_liquid':
      bot.sendMessage(chatId, 'Виберіть бренд рідини для списання');
      bot.once('message', (brandMsg) => {
        const brand = brandMsg.text;
        if (!data.inventory[brand]) {
          bot.sendMessage(chatId, 'Цей бренд не знайдений.');
          return sendMainMenu(chatId);
        }

        bot.sendMessage(chatId, `Виберіть смак рідини для бренду ${brand}`);
        bot.once('message', (flavorMsg) => {
          const flavor = flavorMsg.text;
          if (!data.inventory[brand].flavors[flavor]) {
            bot.sendMessage(chatId, 'Цей смак не знайдений для цього бренду.');
            return sendMainMenu(chatId);
          }

          bot.sendMessage(chatId, `Введіть кількість рідини для списання зі складу`);
          bot.once('message', (quantityMsg) => {
            const quantity = parseInt(quantityMsg.text);

            if (isNaN(quantity) || quantity <= 0) {
              bot.sendMessage(chatId, 'Будь ласка, введіть дійсну кількість.');
              return;
            }

            const currentQuantity = data.inventory[brand].flavors[flavor].quantity;

            if (quantity > currentQuantity) {
              bot.sendMessage(chatId, 'Недостатньо кількості на складі.');
              return;
            }

            // Оновлення кількості рідини в асортименті
            data.inventory[brand].flavors[flavor].quantity -= quantity;

            // Якщо кількість рідини стала 0, видаляємо її з асортименту
            if (data.inventory[brand].flavors[flavor].quantity === 0) {
              delete data.inventory[brand].flavors[flavor];
              bot.sendMessage(chatId, `Смак ${flavor} для бренду ${brand} більше не доступний через відсутність на складі.`);
            }

            fs.writeFileSync('data.json', JSON.stringify(data, null, 2));

            bot.sendMessage(chatId, `Рідина ${flavor} бренду ${brand} списана зі складу.`);
            sendMainMenu(chatId);
          });
        });
      });
      break;

    default:
      sendMainMenu(chatId);
  }
});
