module.exports.id = {
    setter: {
        name: "SET_NAME_SCENE",
        sex: "SET_SEX_SCENE",
        weight: 'SET_WEIGHT_SCENE',
        height: 'SET_HEIGHT_SCENE',
        age: "SET_AGE_SCENE",
        activity: 'SET_ACTIVITY_SCENE',
    },

    menu: {
        main: 'MAIN_MENU_SCENE',
        changeData: 'CHANGE_DATA_SCENE',
    },
};

// ______________________________________________

module.exports.object = {
    setter: {
        name: require('./setters/name'),
        sex: require('./setters/sex'),
        weight: require('./setters/weight').scene,
        height: require('./setters/height').scene,
        age: require('./setters/age').scene,
        activity: require('./setters/activity'),
    },

    menu: {
        main: require('./menu/main'),
        changeData: require('./menu/changeData'),
    },
};