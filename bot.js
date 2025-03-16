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
      [{ text: 'Додати рідину)', callback_data: 'add_liquid' }],
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

    case 'add_liquid':
      bot.sendMessage(chatId, 'Введіть бренд рідини');
      bot.once('message', (brandMsg) => {
        const brand = brandMsg.text;
        if (!data.inventory[brand]) {
          data.inventory[brand] = { price: 0, olegPrice: 0, flavors: {} };
        }

        bot.sendMessage(chatId, `Введіть ціну за 1 шт для рідини бренду ${brand}`);
        bot.once('message', (priceMsg) => {
          const price = parseFloat(priceMsg.text);
          data.inventory[brand].price = price;

          bot.sendMessage(chatId, `Тепер введіть суму, яку отримає Олег за кожну рідину бренду ${brand}`);
          bot.once('message', (olegPriceMsg) => {
            const olegPrice = parseFloat(olegPriceMsg.text);
            data.inventory[brand].olegPrice = olegPrice;

            bot.sendMessage(chatId, `Ціна для бренду ${brand} встановлена на ${price} грн за 1 шт. Олег отримає ${olegPrice} грн за кожну рідину.`);

            bot.sendMessage(chatId, 'Тепер введіть смак рідини');

            // Функція для додавання смаку
            const addFlavor = () => {
              bot.once('message', (flavorMsg) => {
                const flavor = flavorMsg.text;

                if (flavor.toLowerCase() === '/done') {
                  bot.sendMessage(chatId, 'Додавання рідин завершено.');
                  sendMainMenu(chatId); // Відправляємо меню
                  return;
                }

                if (!data.inventory[brand].flavors[flavor]) {
                  bot.sendMessage(chatId, `Введіть кількість для смаку ${flavor}`);
                  bot.once('message', (quantityMsg) => {
                    let quantity = parseInt(quantityMsg.text);

                    // Перевірка, чи введено число
                    while (isNaN(quantity) || quantity <= 0) {
                      bot.sendMessage(chatId, 'Будь ласка, введіть дійсну кількість для смаку. (Тільки числа більше нуля)');
                      bot.once('message', (retryMsg) => {
                        quantity = parseInt(retryMsg.text);
                      });
                    }

                    data.inventory[brand].flavors[flavor] = { quantity };

                    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));

                    bot.sendMessage(chatId, `Рідину ${flavor} бренду ${brand} додано! Кількість: ${quantity}, Ціна: ${price}`);

                    bot.sendMessage(chatId, 'Введіть наступний смак рідини або напишіть /done, щоб завершити');
                    bot.once('message', (nextMsg) => {
                      if (nextMsg.text.toLowerCase() === '/done') {
                        bot.sendMessage(chatId, 'Додавання рідини завершено.');
                        sendMainMenu(chatId);
                      } else {
                        bot.sendMessage(chatId, 'Введіть наступний смак рідини');
                        addFlavor();
                      }
                    });
                  });
                } else {
                  bot.sendMessage(chatId, `Смак ${flavor} вже існує для цього бренду.`);
                  bot.sendMessage(chatId, 'Введіть наступний смак рідини або напишіть /done, щоб завершити');
                }
              });
            };

            addFlavor(); // Запускаємо функцію для першого смаку
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
                return sendMainMenu(chatId);
              }
      
              const currentQuantity = data.inventory[brand].flavors[flavor].quantity;
              if (quantity > currentQuantity) {
                bot.sendMessage(chatId, 'Недостатньо товару для продажу.');
                return sendMainMenu(chatId);
              }
      
              // Запитуємо спосіб оплати (готівка або картка)
              bot.sendMessage(chatId, 'Виберіть спосіб оплати:', {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Готівка', callback_data: 'cash_payment' }],
                    [{ text: 'Картка', callback_data: 'card_payment' }],
                  ]
                }
              });
      
              // Обробка вибору способу оплати
              bot.once('callback_query', (paymentQuery) => {
                const paymentType = paymentQuery.data;
      
                // Оновлюємо кількість товару на складі
                data.inventory[brand].flavors[flavor].quantity -= quantity;
      
                // Якщо кількість рідини для цього смаку 0 або менше, видаляємо смак
                if (data.inventory[brand].flavors[flavor].quantity <= 0) {
                  delete data.inventory[brand].flavors[flavor];
      
                  // Якщо в бренду більше немає смаків, видаляємо бренд
                  if (Object.keys(data.inventory[brand].flavors).length === 0) {
                    delete data.inventory[brand];
                  }
                }
      
                // Додаємо суму до відповідного балансу
                if (paymentType === 'cash_payment') {
                  data.balance.cash += quantity * data.inventory[brand].price;
                } else if (paymentType === 'card_payment') {
                  data.balance.card += quantity * data.inventory[brand].price;
                }
      
                // Оновлюємо баланс Олега
                data.balance.oleg += quantity * data.inventory[brand].olegPrice;
      
                // Зберігаємо дані в файл
                fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
      
                // Відправляємо повідомлення з результатами
                const currentDate = new Date().toLocaleDateString();
                bot.sendMessage(chatId, `Продаж рідини: \n${currentDate} - ${brand} ${flavor} ${quantity} шт за ${(quantity * data.inventory[brand].price)} грн (${paymentType === 'cash_payment' ? 'готівка' : 'картка'})`);
      
                sendMainMenu(chatId); // Повертаємось до головного меню після продажу
              });
            });
          });
        });
        break;
      

    case 'view_inventory':
      let inventoryMessage = 'Асортимент рідин:\n';
      for (const brand in data.inventory) {
        for (const flavor in data.inventory[brand].flavors) {
          const quantity = data.inventory[brand].flavors[flavor].quantity;
          const price = data.inventory[brand].price;
          const olegPrice = data.inventory[brand].olegPrice;

          inventoryMessage += `🔹 Бренд: ${brand}\n`;
          inventoryMessage += `🥰 Смак: ${flavor}, 🔹 Кількість: ${quantity}, 🔹 Ціна за одиницю: ${price} грн, 🔹 Сума для Олега за 1 шт: ${olegPrice} грн\n\n`;
        }
      }

      if (inventoryMessage === 'Асортимент рідин:\n') {
        inventoryMessage = 'Асортимент рідин порожній.';
      }

      bot.sendMessage(chatId, inventoryMessage);
      break;

    case 'view_balance':
      // Розрахунок загальної вартості товару
      let totalStockValue = 0;
      for (const brand in data.inventory) {
        for (const flavor in data.inventory[brand].flavors) {
          const quantity = data.inventory[brand].flavors[flavor].quantity;
          const price = data.inventory[brand].price;
          totalStockValue += quantity * price;
        }
      }

      // Розрахунок загального балансу
      const totalBalance = data.balance.cash + data.balance.card - data.balance.oleg;

      // Відправка повідомлення
      bot.sendMessage(chatId,
        `💰 *Баланс:*\n` +
        `Готівка: ${data.balance.cash} грн\n` +
        `Картка: ${data.balance.card} грн\n` +
        `Олег: ${data.balance.oleg} грн\n\n` +
        `📊 *Загальний баланс:* ${totalBalance} грн\n` +
        `📦 *Загальна сума товару на складі:* ${totalStockValue} грн`,
        { parse_mode: 'Markdown' }
      );
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
