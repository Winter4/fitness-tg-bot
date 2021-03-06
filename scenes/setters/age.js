const { Scenes, Markup } = require("telegraf");

const db = require('../../database/database');
const User = require('../../models/user');
const scenes = require('../scenes')

// ____________________________________________________________

// ATTENTION: if changing this, also change
//            same limits in models/user
// i couldn't make it run importing this const to the models/user
const limits = {
    min: 13,
    max: 80
};
module.exports.limits = limits;

// _______________________________________

const scene = new Scenes.BaseScene(scenes.id.setter.age);

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
        
        db.setUserState(ctx.from.id, scenes.id.setter.age);
        return ctx.reply(`Введите свой возраст числом (${limits.min}-${limits.max} лет):`, Markup.removeKeyboard());
        
    } catch (e) {
        throw new Error(`Error in <enter> middleware of <scenes/setters/age> file --> ${e.message}`);
    }
});

scene.on('text', async ctx => {

    try {
        let data =  ctx.message.text;
        let age = Number.parseInt(ctx.message.text);

        // data.length > 3
        // if length == 4, then the value == 1000+, but it can't be
        if (Number.isNaN(data) || Number.isNaN(age) || data.length > 3) 
            return ctx.reply('Пожалуйста, введите возраст цифрами');
        else if (age < limits.min || age > limits.max) 
            return ctx.reply('Пожалуйста, введите корректный возраст');
        
        let user = await User.findOne({ _id: ctx.from.id });
        user.age = age;

        // saving new data
        if (user.registered) user.calcCalories();
        await user.save();

        // choosing new scene to enter
        let sceneID = null;
        if (user.registered) sceneID = scenes.id.menu.main;
        else sceneID = scenes.id.setter.activity;

        return ctx.scene.enter(sceneID);
    } catch (e) {
        throw new Error(`Error in <on_text> middleware of <scenes/setters/age> file --> ${e.message}`);
    }
});

scene.on('message', ctx => ctx.reply('Пожалуйста, введите возраст цифрами в текстовом формате'));

module.exports.scene = scene;