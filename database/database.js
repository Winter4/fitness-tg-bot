const mongoose = require('mongoose');
const User = require('../models/user');

const scenes = require('../scenes/scenes');

// ____________________________________________________________________________________

module.exports.connect = async () => {
    await mongoose.connect(process.env.MONGO_URL, () => console.log('Connected to DB'));
}

// saves new/updates existing user
module.exports.saveUserFromContext = async ctx => {
    try {
        const userID = ctx.from.id;
        let user = {};

        if (ctx.session.setConfig) {
            user = new User({
                _id: userID,
                name: ctx.session.user.name,
                sex: ctx.session.user.sex,
                startWeight: ctx.session.user.currentWeight,
                currentWeight: ctx.session.user.currentWeight,
                targetWeight: ctx.session.user.targetWeight,
                height: ctx.session.user.height,
                age: ctx.session.user.age,
                activity: ctx.session.user.activity,

                measures: {
                    chest: ctx.session.user.measures.chest,
                    waist: ctx.session.user.measures.waist,
                    hip: ctx.session.user.measures.hip,
                }
            });
        }
        else {
            user = await this.getUserByID(userID);

            if (ctx.session.user.name) {    
                user.name = ctx.session.user.name;
            }
            if (ctx.session.user.sex) {
                user.sex = ctx.session.user.sex;
            }
            if (ctx.session.user.startWeight) {
                user.startWeight = ctx.session.user.currentWeight;
            }
            if (ctx.session.user.currentWeight) {
                user.currentWeight = ctx.session.user.currentWeight;
            }
            if (ctx.session.user.targetWeight) {
                user.targetWeight = ctx.session.user.targetWeight;
            }
            if (ctx.session.user.height) {
                user.height = ctx.session.user.height;
            }
            if (ctx.session.user.age) {
                user.age = ctx.session.user.age;
            }
            if (ctx.session.user.activity) {
                user.activity = ctx.session.user.activity;
            }

            if (ctx.session.user.measures) {
                if (ctx.session.user.measures.chest) {
                    user.measures.chest = ctx.session.user.measures.chest;
                }
                if (ctx.session.user.measures.waist) {
                    user.measures.waist = ctx.session.user.measures.waist;
                }
                if (ctx.session.user.measures.hip) {
                    user.measures.hip = ctx.session.user.measures.hip;
                }
            }
        }

        await user.save();
        ctx.log(`User ${ctx.from.id} saved from context`);
        ctx.scene.enter(scenes.id.menu.main);

    } catch (e) {
        let newErr = new Error(`Error in saveUserFromContext: ${e.message}`);
        ctx.logError(ctx, newErr, __dirname);
        throw newErr;
    }
};

module.exports.setUserState = async (id, state) => {
    try {
        await User.updateOne({ _id: id}, { state: state });
    } catch (e) {
        let newErr = new Error(`Error in setUserState: ${e.message}`);
        ctx.logError(ctx, newErr, __dirname);
        throw newErr;
    }
};

module.exports.getUserByID = async id => {
    try {
        return await User.findById(id);
    } catch (e) {
        let newErr = new Error(`Error in getUserByID: ${e.message}`);
        ctx.logError(ctx, newErr, __dirname);
        throw newErr;
    }
};

module.exports.userExists = async id => {
    try {
        return Boolean(await User.exists({_id: id}));
    } catch (e) {
        let newErr = new Error(`Error in userExists: ${e.message}`);
        ctx.logError(ctx, newErr, __dirname);
        throw newErr;
    }
}