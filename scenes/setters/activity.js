const {Scenes, Markup} = require('telegraf');

const db = require('../../database/database');
const User = require('../../models/user');
const scenes = require('../scenes')

// _________________________________

const Activity = {
    zero: '1. Почти нет',
    low: '2. Небольшая',
    middle: '3. Умеренная',
    high: '4. Высокая'
};

// __________________________________

const activityKeyboard = Markup.keyboard(
    [
        [Activity.zero, Activity.low],
        [Activity.middle, Activity.high]
    ]
).resize();

// __________________________________

const scene = new Scenes.BaseScene(scenes.id.setter.activity);

scene.enter(ctx => {
    try {
        // if the bot was rebooted and the session is now empty
        if (ctx.session.recoveryMode) {
            try {
                ctx.session.recoveryMode = false;
                // handles the update according to scene mdlwres
                return ctx.handleRecovery(scene, ctx);
            } catch (e) {
                throw new Error(`Error on handling recovery: ${e.message} \n`);
            }
        }
        
        db.setUserState(ctx.from.id, scenes.id.setter.activity);
        return ctx.reply(
            'Выберите Вашу активность: \n\n' +
            '1 - Почти нет активности - сидячий образ жизни, отсутствие тренировок \n' +
            '2 - Небольшая активность - малая физ. нагрузка, тренировки 1-3 раза/нед \n' +
            '3 - Умеренная активность - большая физ. нагрузка, тренировки  3-4 раза/нед \n' +
            '4 - Высокая активность - большая физ. нагрузка, тренировки 5-6 раз/нед', 
            activityKeyboard);
        
    } catch (e) {
        throw new Error(`Error in <enter> middleware of <scenes/setters/activity> file --> ${e.message}`);
    }
});

// sets new user rate & recalcs caloriesToLoose
const setRate = async (id, rate) => {
    try {
        let user = await User.findOne({ _id: id });
        user.activity = rate;

        if (user.registered) user.calcCalories();
        await user.save();

        return user;
    } catch (e) {
        throw new Error(`Error in <setRate> func of <scenes/setters/activity> file --> ${e.message}`);
    }
}

// gets the next scene to enter
const getNextScene = async user => {
    try {
        let sceneID = null;
        if (user.registered) sceneID = scenes.id.menu.main;
        else sceneID = scenes.id.setter.weight.current;

        return sceneID;

    } catch (e) {
        throw new Error(`Error in <getNextScene> func of <scenes/setters/activity> file --> ${e.message}`);
    }
};

scene.hears(Activity.zero, async ctx => {
    try {
        const user = await setRate(ctx.from.id, 1.2);
        return ctx.scene.enter(await getNextScene(user));
    } catch (e) {
        throw new Error(`Error in <hears_zero> middleware of <scenes/setters/activity> file --> ${e.message}`);
    }
    
});

scene.hears(Activity.low, async ctx => {
    try {
        const user = await setRate(ctx.from.id, 1.375);
        return ctx.scene.enter(await getNextScene(user));
    } catch (e) {
        throw new Error(`Error in <hears_low> middleware of <scenes/setters/activity> file --> ${e.message}`);
    }
});

scene.hears(Activity.middle, async ctx => {
    try {
        const user = await setRate(ctx.from.id, 1.55);
        return ctx.scene.enter(await getNextScene(user));
    } catch (e) {
        throw new Error(`Error in <hears_middle> middleware of <scenes/setters/activity> file --> ${e.message}`);
    }
});

scene.hears(Activity.high, async ctx => {
    try {
        const user = await setRate(ctx.from.id, 1.95);
        return ctx.scene.enter(await getNextScene(user));
    } catch (e) {
        throw new Error(`Error in <hears_high> middleware of <scenes/setters/activity> file --> ${e.message}`);
    }
});

scene.on('message', ctx => ctx.reply('Пожалуйста, выберите свою активность'));

module.exports = scene;