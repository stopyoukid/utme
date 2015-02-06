var _ = require('./utils');
var local_storage_key = 'utme-settings';

function Settings (defaultSettings) {
    this.setDefaults(defaultSettings || {});
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
        var defaultsCopy = _.extend({}, defaultSettings || {});
        this.settings = _.extend({}, _.extend(defaultsCopy, localSettings));
        this.defaultSettings = defaultSettings;
    },

    set: function (key, value) {
        this.settings[key] = value;
        this.save();
    },

    get: function (key) {
        return this.settings[key];
    },

    save: function () {
        localStorage.setItem(local_storage_key, JSON.stringify(this.settings));
    },

    resetDefaults: function () {
        var defaults = this.defaultSettings;
        if (defaults) {
            this.settings = _.extend({}, defaults);
            this.save();
        }
    }
};

module.exports = Settings;