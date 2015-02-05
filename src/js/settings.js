var _ = require('./utils');
var local_storage_key = 'utme-settings';

function Settings () {
    this.load();
}

Settings.prototype = {
    readSettingsFromLocalStorage: function () {
        var settingsString = localStorage.getItem(local_storage_key);
        var settings = {};
        if (settingsString) {
            settings = JSON.parse(settingsString);
        }
        return settings;
    },

    setDefaults: function (defaultSettings) {
        var localSettings = this.readSettingsFromLocalStorage();
        this.settings = _.extend({}, _.extend(defaultSettings || {}, localSettings));
    },

    set: function (key, value) {
        this.settings[key] = value;
    },

    get: function (key) {
        return this.settings[key];
    },

    save: function () {
        localStorage.setItem(local_storage_key, JSON.stringify(this.settings));
    },

    load: function () {
        this.settings = this.readSettingsFromLocalStorage();
    }
};

module.exports = Settings;