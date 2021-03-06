const { Scenes, Markup, session } = require("telegraf");
const path = require('path');

const scenes = require('../../scenes');
const db = require('../../../database/database');

const User = require('../../../models/user');
const Meal = require('../../../models/meal');

// ______________________________________________

// Markup keyboard keys text
const keys = {
    makeReport: '📅 Сделать отчёт',
    mealPlan: '🥑 План питания',
    info: '❔ Справка',
    meals: '✏️ Изменить режим питания',
    data: '📃 Изменить данные',
};

// Markup keyboard keys iselves
const keyboard = Markup.keyboard(
    [
        [ keys.makeReport ],
        [ keys.mealPlan, keys.info ],
        [ keys.meals, keys.data ],
    ]
).resize();

const infoKeyboard = require('./info').inlineKeyboard;

// ____________________________________________________________

const scene = new Scenes.BaseScene(scenes.id.menu.main);

scene.hears(keys.meals, ctx => {
    return ctx.scene.enter(scenes.id.setter.meals);
})

scene.hears(keys.data, ctx => {
    return ctx.scene.enter(scenes.id.menu.changeData.home);
});

// - - - - - - - - - - - - - - - - - - - - -

// sending checkIn request if it's time
scene.on('message', async (ctx, next) => {

    const user = await User.findById(ctx.from.id);

    const markup = Markup.inlineKeyboard(
        [
            Markup.button.callback('Обновить данные', `CHECK_IN_ACTION`),
        ],
    );

    if (!user) return next();
    if (!(user.checked.bool)) {
        setTimeout(() => ctx.reply('Мы хотим проверить Ваши результаты за неделю. Укажите свой текущий вес и замеры',
            markup), 800);
    }

    return next();
});

// - - - - - - - - - - - - - - - - - - - - -

scene.enter(async ctx => {
    try {
        // if the bot was rebooted and the session is now empty
        if (ctx.session.recoveryMode == true) {
            try {
                // handles the update according to scene mdlwres
                ctx.session.recoveryMode = false;
                return ctx.handleRecovery(scene, ctx);
            } catch (e) {
                throw new Error(`Error on handling recovery: ${e.message} \n`);
            }
        }
        const userID = ctx.from.id;
        db.setUserState(userID, scenes.id.menu.main);
        
        const user = await db.getUserByID(userID);
        
        let text = `Приветствую, ${user.name}!`;
        let today = new Date();
        let days = [
            'воскресенье',
            'понедельник',
            'вторник',
            'среда',
            'четверг',
            'пятница',
            'суббота',
        ]
        text += `\nСегодня ${days[today.getDay()]}`;

        text += `\nВаш пол: ${user.sex.toLowerCase()}`;
        text += `\nВаш возраст: ${user.age}`; 
        text += `\nВаш рост: ${user.height}`;

        text += '\n\nМы верим, что у Вас всё получится! \nВсё в Ваших руках, не сдавайтесь!\n';

        text += `\nНачальный вес: ${user.startWeight} кг`;
        text += `\nТекущий вес: ${user.currentWeight} кг`;
        text += `\nЖелаемый вес: ${user.targetWeight} кг`;

        text += `\nЗамеры (Г/Т/Б): ${user.chestMeasure}/${user.waistMeasure}/${user.hipMeasure} см`;
        text += `\nРежим питания: ${user.mealsPerDay} р/день`;

        const photoSource = path.join(process.env.IMAGES_DIR, 'main-menu.jpg'); 

        return ctx.replyWithPhoto(
            { source: photoSource },
            {
                caption: text,
                ...keyboard,
            },
        );
    } catch (e) {
        throw new Error(`Error in <enter> middleware of <scenes/menu/main/home> file --> ${e.message}`);
    }
});

// ______________________________________________________________

scene.hears(keys.makeReport, ctx => {

    const reportKeybord = Markup.inlineKeyboard([
        [
            Markup.button.url('Отчёт по питанию', `${process.env.WEB_APP_URL}?user=${ctx.from.id}`),
        ],
        [
            Markup.button.callback('Отчёт по количеству шагов', 'STEPS_ACTION'),
        ]
    ]);
    
    try {
        return ctx.reply('Ежедневный контроль Вашего питания и физический активности неминуемо приведёт к достижению поставленных целей!', 
        reportKeybord);
    } catch (e) {
        throw new Error(`Error in <hears_makeReport> middleware of <scenes/menu/main/home> file --> ${e.message}`);
    }
});

scene.action('STEPS_ACTION', ctx => {
    ctx.answerCbQuery();
    return ctx.scene.enter(scenes.id.setter.steps);
});

const axios = require('axios').default;
const groupAtoi = {
    'proteins': 0,
    'fats': 1,
    'carbons': 2
};
scene.hears(keys.mealPlan, async ctx => {
    try {

        // get the report object from web-app
        const response = await axios.get(`http://${process.env.WEB_APP_URL}?user=${ctx.from.id}&bot=1`);
        if (response.status !== 200) throw new Error(`Error on fetching report from web-app: ${response.statusText}`);
        const report = response.data;

        // get all the meals from DB
        const mealsData = await Meal.find({ $or: [ { group: 'proteins' }, { group: 'fats' }, { group: 'carbons' } ] });

        // generate text
        let text = `Ваша калорийность на этой неделе составляет <b>${report.calories.target} кал</b> \n\n`;
        text += 'Примерный план питания показывает определённый набор продуктов, в которых содержится сбалансированное количество нутриентов (БЖУ). '
            + 'При подборе рациона используйте данный перечень как образец; в каждом из продуктов указана порция в граммах, рассчитанная на основании Ваших показателей. \n\n';

        
        // push tabs to array    
        // we always have breakfadt
        let tabs = [report.tabs[0]];

        // if mealsPerDay == 4, we have to add lunch 1 to plan
        if (report.mealsPerDay > 3) tabs.push(report.tabs[1]);
        else tabs.push(null);

        // we always have dinner
        tabs.push(report.tabs[2]);

        // if mealsPerDay == 5, we have to add lunch 2 to plan
        if (report.mealsPerDay == 5) tabs.push(report.tabs[3]);
        else tabs.push(null);

        // we always have supper
        tabs.push(report.tabs[4]);

        // generating tabs text
        const tabNames = ['Завтрак', 'Перекус 1', 'Обед', 'Перекус 2', 'Ужин'];
        for (let i in tabs) {
            // skip the empty tab
            if (!(tabs[i])) continue;

            // header
            text += `\n<b><u>${tabNames[i]}</u></b>` + '\n';

            // these arrays will be later added to tab text
            const groupsText = {
                proteins: [],
                fats: [],
                carbons: [],
            };

            // for all the meals
            for (let food of mealsData) {
                // if this food included to tab, calc and add
                if (food.plan[i]) {
                    // this food's nutrient object
                    const nutrient = tabs[i].nutrients[ groupAtoi[food.group] ];
                    // weight to be eaten
                    const weight = nutrient.calories.target / food.calories;

                    let tmpText = `• <i>${food.name}</i> — `;

                    // EGGS EGGS: if this food is egg, should be added count but not weight
                    // count 1 egg equal 100g
                    if (`${food._id.toString()}` == '62698bacaec76b49a8b91712') {
                        tmpText += `${(weight / 100).toFixed()} шт | ${(food.calories * 100).toFixed()} кал на 1 шт`;
                    }
                    else {
                        tmpText += `${(weight).toFixed()}г | ${(food.calories * 100).toFixed()} кал на 100г`;
                    }

                    tmpText += '\n';

                    // pushing new group string to its group array
                    groupsText[food.group].push(tmpText);
                }
            }

            text += '   <b>Белки:</b> \n';
            text += groupsText.proteins.join('');

            text += '\n   <b>Жиры:</b> \n';
            text += groupsText.fats.join('');

            text += '\n   <b>Углеводы:</b> \n';
            text += groupsText.carbons.join('');

            text += '\n';
        }

        return ctx.replyWithHTML(text);
    } catch (e) {
        throw new Error(`Error in <hears_mealPlan> middleware of <scenes/menu/main/home> file --> ${e.message}`);
    }
});

scene.use(require('./info').composer);
scene.hears(keys.info, ctx => {

    try {
        let text = '';
        text += '1️⃣ Как работать с приложением? \n\n';
        text += '2️⃣ Как составить завтрак? \n\n';
        text += '3️⃣ Как составить обед? \n\n';
        text += '4️⃣ Как составить ужин? \n\n';
        text += '5️⃣ Как составить перекус? \n\n';
        text += '6️⃣ Когда есть и как готовить? \n\n';
        text += '7️⃣ Как пить и что с овощами? \n\n';

        return ctx.reply(text, infoKeyboard);
    } catch (e) {
        throw new Error(`Error in <hears_info> middleware of <scenes/menu/main/home> file --> ${e.message}`);
    }
});

scene.on('message', (ctx, next) => {
    // if it's a command
    if (ctx.message.text[0] == '/') return next(); 
    else return ctx.reply('Используйте клавиаутуру меню');
});

// __________________________________________________

module.exports = scene;
