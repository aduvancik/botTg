<h1 align="center">Telegram Bot для управління балансами та продажем рідин</h1>

<p>Цей проект — бот для Telegram, який дозволяє користувачам здійснювати операції з продажу рідин, а також списувати кошти з балансів готівки та картки. Бот використовує JSON-файл для збереження інформації про інвентар та баланс.</p>

<h2>🚀 Demo</h2>

<p>Це серверний бот, тому демо-версія доступна лише в чаті Telegram після налаштування та запуску бота. </p>

<h2>🧐 Опис проекту</h2>

<p>В цьому проекті ви можете:</p>
<ul>
  <li>Продаж рідини: вибір бренду, смаку та кількості для продажу, а також вибір способу оплати (готівка чи картка).</li>
  <li>Списання коштів: списування коштів з балансу готівки або картки за вказану суму.</li>
  <li>Оновлення інвентарю: якщо рідини недостатньо для продажу, бот не дозволить продовжити операцію.</li>
</ul>

<h2>🛠️ Кроки для встановлення:</h2>

<p>1. Клонуйте репозиторій</p>

<pre>
git clone https://github.com/yourusername/telegram-bot.git
</pre>

<p>2. Перейдіть до директорії проекту</p>

<pre>
cd telegram-bot
</pre>

<p>3. Встановіть залежності</p>

<pre>
npm install
</pre>

<p>4. Додайте свій токен бота Telegram у файл .env:</p>

<pre>
const token = 'YOUR_BOT_TOKEN';
</pre>

<p>6. Для запуску бота виконайте:</p>

<pre>
node bot.js
</pre>

<h2>💻 Використані технології</h2>

<ul>
  <li><a href="https://nodejs.org/en/">Node.js</a> — для роботи з сервером та ботом.</li>
  <li><a href="https://www.npmjs.com/package/telegraf">Telegraf</a> — для створення бота в Telegram.</li>
  <li><a href="https://www.npmjs.com/package/fs">fs</a> — для роботи з файловою системою для збереження даних.</li>
</ul>

<h2>💖 Сподобалась моя робота?</h2>

<p>Не соромтесь ділитися проектом та ставити зірочки!</p>
