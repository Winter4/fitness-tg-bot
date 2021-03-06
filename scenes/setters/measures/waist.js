const { Markup, Scenes } = require('telegraf');

const db = require('../../../database/database');
const User = require('../../../models/user');
const scenes = require("../../scenes");

// ____________________________________________________________

// ATTENTION: if changing this, also change
//            same limits in models/user
// i couldn't make it run importing this const to the models/user
const limits = {
    min: 20,
    max: 200
};
module.exports.limits = limits;

// _________________________________________

const scene = new Scenes.BaseScene(scenes.id.setter.measure.waist);

scene.enter(async ctx => {
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
        
        db.setUserState(ctx.from.id, scenes.id.setter.measure.waist);

        const user = await db.getUserByID(ctx.from.id);

        const photo = user.sex == 'Мужской' ? 'man-measures.jpg' : 'woman-measures.jpg';
        const photoSource = process.env.IMAGES_DIR + photo;

        await ctx.replyWithPhoto({ source: photoSource });

        return ctx.reply(`Введите обхват талии (${limits.min}-${limits.max} см):`, Markup.removeKeyboard());     

    } catch (e) {
        throw new Error(`Error in <enter> middleware of <scenes/setters/measures/waist> file --> ${e.message}`);
    }
});

scene.on('text', async ctx => {
    try {
        let data =  ctx.message.text;
        let length = Number.parseInt(ctx.message.text);

        // data.length > 3
        // if length == 4, then the value == 1000+, but it can't be
        if (Number.isNaN(data) || Number.isNaN(length) || data.length > 3) {
            ctx.reply('Пожалуйста, введите обхват цифрами');
            return;
        }
        else if (length < limits.min || length > limits.max) {
            ctx.reply('Пожалуйста, введите корректный обхват');
            return;
        }

        // saving new data
        let user = await User.findOne({ _id: ctx.from.id });
        user.waistMeasure = length;
        await user.save();

        // choosing new scene to enter
        let sceneID = null;
        if (user.checked.bool == false) sceneID = scenes.id.setter.measure.hip;
        else if (user.registered) sceneID = scenes.id.menu.main;
        else sceneID = scenes.id.setter.measure.hip;

        return ctx.scene.enter(sceneID);
    } catch (e) {
        throw new Error(`Error in <on_text> middleware of <scenes/setters/measures/waist> file --> ${e.message}`);
    }
});

scene.on('message', ctx => ctx.reply('Пожалуйста, введите обхват цифрами в текстовом формате'));

module.exports.scene = scene;