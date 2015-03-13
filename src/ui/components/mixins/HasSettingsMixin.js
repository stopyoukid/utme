var React = require('react');
var bs = require('react-bootstrap');
var Input = bs.Input;

module.exports = {

  renderSetting (type, label, relativeSettingskey) {
    var self = this;
    var settingsKey = (this.settingsNS || "base.") + relativeSettingskey;
    if (type === 'checkbox' || type === 'radio') {
      return (<Input type={type} label={label} checked={this.props.settings.get(settingsKey)} onChange={
        function (e) { self.updateSetting(settingsKey, e.target.checked); }
      }/>);
    } else {
      return (<Input type={type} label={label} value={this.props.settings.get(settingsKey)} onChange={
        function (e) { self.updateSetting(settingsKey, e.target.value); }
      }/>);
    }
  },

  updateSetting (key, value) {
    this.props.settings.set(key, value);
    this.forceUpdate();
  },

  saveSettings (e) {
    var scenarioName = this.refs.scenarioName.value;
    var description = this.refs.description.value;
    var setup = this.refs.setupScenarios.value;
    var cleanup = this.refs.cleanupScenarios.value;

    var info = {};
    if (name) {
      info.name = name;
    }

    if (description) {
      info.description = description;
    }

    if (setup) {
      info.setup = {
        scenarios: setup.split(["\n", ","])
      };
    }

    e.stopPropagation();
  }
};
