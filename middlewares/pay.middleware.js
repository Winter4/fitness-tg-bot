const { Composer, Markup } = require("telegraf");

const mainMenu = require("../scenes/menus/main/home.menu.main");
const User = require("../services/user.service");

const middleware = new Composer();

// - - - - - - - - - - - - - - - - - - - - - - - - //

const ACTION = "PAY_ACTION";

const keyboard = Markup.inlineKeyboard([
  Markup.button.callback("Оплатить", ACTION),
]);

// handling pay action
middleware.action(ACTION, async (ctx) => {
  ctx.answerCbQuery();

  await User.set.paid(ctx.chat.id, true);
  return mainMenu.enter(ctx);
});

// checking if the user paid (after register)
middleware.use(async (ctx, next) => {
  if (!ctx.user.paid && ctx.user.registered) {
    return ctx.reply("Для доступа к боту произведите оплату", keyboard);
  }

  return next();
});

// - - - - - - - - - - - - - - - - - - - - - - - - //

module.exports = middleware;
