const {Telegraf, Scenes, Stage, Markup, session} = require('telegraf');
const db = require('./database/database');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('./models/user');

const bot = new Telegraf(process.env.BOT_TOKEN);
module.exports.bot = bot;

const { log } = require('./logger');

// ______________________________________

// if u want to add a parameter and create a scene for its setting,
// u should update these:
/**
 * 1. scenes/scenes.js > id & object
 * 2. complete necessary new_scene.js file (don't forget to handle recovery mode)
 * 3. index.js > stage
 * 4. ..menu/changeData > add necessary buttons & its middleware
 * 
 * in some time, this sttructure may turn out to be bad & unproffesional,
 * but in the moment I'm writing it - this is the best of my skills :)
 */

// _______________________________________________________________________

// bot context extend for logging
bot.context.log = msg => {
    log.info(msg);
};

// bot context extend for logging objects
bot.context.logObject = object => {
    log.info(object);
}

// default update logger
bot.context.logUpdate = (upd) => {
    log.info('New Upd', { update: upd });
};

// default error logger
bot.context.logError = (ctx, err) => {
    log.error(err.message, { updType: ctx.updateType, updID: ctx.update.update_id, chatID: ctx.chat.id, username: ctx.chat.username});
};

// according to local-sessions, which die on bot restart,
// this func takes persistant-sessions role and handles
// updates without session after bot restart
bot.context.handleRecovery = async (scene, ctx) => {
    try {
        const handler = await scene.middleware();
        return await handler(ctx, Promise.resolve());
    } catch (e) {
        throw new Error(`Error in <bot.context.handleRecovery> of <index> file --> ${e.message}`);
    }
};

bot.telegram.setMyCommands([
    { command: '/home', description: 'takes you to the main menu'},
]);

// _________________________________________________

// logging every new update
bot.use((ctx, next) => {
    ctx.logUpdate(ctx.update);
    return next();
});

bot.action('PAY_ACTION', async (ctx) => {
    ctx.answerCbQuery();
    await db.setUserPaid(ctx.from.id, true);
    return ctx.reply('?????????????? ????????????????!');
});

// checking if the user payed
bot.use(async (ctx, next) => {
    if (!(await db.userPaid(ctx.from.id))) {
        const keyboard = Markup.inlineKeyboard([ Markup.button.callback('????????????????', 'PAY_ACTION') ]);
        return ctx.reply('?????? ?????????????? ?? ???????? ?????????????????????? ????????????', keyboard);
    }
    else {
        return next();
    }
});

// checking if the user should update his data
bot.use(async (ctx, next) => {
    await db.userCheckedIn(ctx.from.id);
    return next();
});

// _____________________________________

bot.use(session());

const scenes = require('./scenes/scenes');
const stage = new Scenes.Stage([

    scenes.object.setter.name,
    scenes.object.setter.sex,
    scenes.object.setter.height,
    scenes.object.setter.age,
    scenes.object.setter.activity,
    scenes.object.setter.weight.current,
    scenes.object.setter.weight.target,

    scenes.object.setter.measure.chest,
    scenes.object.setter.measure.waist,
    scenes.object.setter.measure.hip,

    scenes.object.setter.meals,
    scenes.object.setter.steps,

    scenes.object.menu.main,
    scenes.object.menu.changeData.home,
]);

// command takes the user to main menu
stage.command('home', async ctx => {
    try {
        if (await db.userRegisteredByID(ctx.from.id))
            return ctx.scene.enter(scenes.id.menu.main);
        else
            return ctx.reply('???? ???? ?????????????????? ??????????????????????');
    } catch (e) {
        throw new Error(`Error in <stage.command_home> of <index> file --> ${e.message}`);
    }
});

bot.use(stage.middleware());

bot.action('CHECK_IN_ACTION', async ctx => {
    ctx.answerCbQuery();

    // increment number of decreasings
    await db.incrementWeeksCount(ctx.from.id);

    return ctx.scene.enter(scenes.id.setter.weight.current);
});

// _______________________________________


bot.start(async ctx => {
    try {
        let user = await User.findOne({ _id: ctx.from.id });

        if (user !== null) {
            // if user hadn't registered before stopping the bot
            if (user.registered) 
                return ctx.scene.enter(scenes.id.menu.main);
            else 
                return ctx.scene.enter(user.state);
        }
        else {
            user = new User({ 
                _id: ctx.from.id, 
                tgUsername: ctx.from.username, 
                checked: { date: Date.now(), bool: true, }, 
                weeksCount: 0,
            });
            await user.save();
            
            ctx.log(`New ${ctx.chat.id} user`);
            await ctx.reply(
                '????????????c????????! ?????? ?????? ???????????? ?????? ?? ???????????????????????? ???????? ??????????. ' +
                '?????????????? ???????????????? ???????????? ???????????????????? ???????? ???????????? ?????? ?????????? ?? ?????????????? ??????, ' + 
                '?????????? ???????????? ???????????????????? ?????????????? ????????????????????!'
            );
    
            return ctx.scene.enter(scenes.id.setter.name);
        }
    } catch (e) {
        throw new Error(`Error in <bot.start> of <index.js> file --> ${e.message}`);
    }
});

bot.on('text', async (ctx, next) => {

    try {
        const user = await db.getUserByID(ctx.from.id);

        if (user !== null) {
            ctx.session.recoveryMode = true;
            return ctx.scene.enter(user.state);
        }
        return next();
    } catch (e) {
        throw new Error(`Error in <bot.on_text> of <index> file --> ${e.message}`);
    }
});

bot.on('callback_query', async (ctx, next) => {

    try {
        const user = await db.getUserByID(ctx.from.id);

        if (user !== null) {
            ctx.session.recoveryMode = true;
            return ctx.scene.enter(user.state);
        }
        return next();
    } catch (e) {
        throw new Error(`Error in <bot.on_callback_query> of <index> file --> ${e.message}`);
    }
});

bot.on('my_chat_member', ctx => {
    try {
        return;
    } catch (e) {
        throw new Error(`Error in <bot.on_my_chat_member> of <index> file --> ${e.message}`);
    }
});

bot.on('message', async ctx => {
    try {
        await ctx.telegram.sendMessage(process.env.ADMIN_CHAT_ID, `Corruptive message by ${ctx.chat.id} user (upd_id:#${ctx.update.update_id})`);        
        return ctx.reply('????????????????????, ?????????????????????? ?????????????????? ??????????????. ?? ???????????? ?????????????????? ???????????? ???? ???????????? ?????????????????????????? ???????? /start');
    } catch (e) {
        throw new Error(`Error in <bot.on_message> of <index> file --> ${e.message}`);
    }
});

bot.use(ctx => {
    try {
        ctx.log(`Junkyard triggered by ${ctx.chat.id} user with update #${ctx.update.update_id}`);
        return ctx.telegram.sendMessage(process.env.ADMIN_CHAT_ID, 
            `Junkyard triggered by ${ctx.chat.id} user with update #${ctx.update.update_id}`);
    } catch (e) {
        throw new Error(`Error in <bot.use> of <index> file --> ${e.message}`);
    }
});

// _________________________________________________________

bot.catch((err, ctx) => {
    
    ctx.logError(ctx, err);
    return ctx.telegram.sendMessage(process.env.ADMIN_CHAT_ID,
        `???????????? 
        Update type: ${ctx.updateType} 
        Update ID: ${ctx.update.update_id}
        Chat ID: ${ctx.chat.id}
        Username: ${ctx.chat.username}
        Message: ${err.message} 
        ??????????: ${Date()}`
    );
});  

const notifyer = require('./cron');
bot.launch().then(async () => {
    try {
        log.info('Bot started');
        console.log('Bot started');
        
        console.log('Logging...');
        log.info('Logging...');

        await db.connect();

        console.log('Setting up cron..')
        log.info('Setting up cron..');
        notifyer.start();
        console.log('Cron is set up');
        log.info('Cron is set up');

        console.log('Cron status:', notifyer.running);
        log.info('Cron status: ' + notifyer.running);

    } catch (e) {
        ctx.log('Error in bot.launch' + e.message);
    }
});
