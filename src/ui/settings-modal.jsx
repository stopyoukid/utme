var React = require('react');
var bs = require('react-bootstrap');
var Modal = bs.Modal;
var Button = bs.Button;
var TabPane = bs.TabPane;
var TabbedArea = bs.TabbedArea;
var Input = bs.Input;
var modalLauncher = require('./modal-launcher.jsx');
var utme = require('../js/utme');

var CreateModal = React.createClass({
    render: function () {
        return (
            <Modal title="Settings" onRequestHide={this.props.onClose} className="utme-settings">
                <div className="modal-body">
                    <form className="utme-settings-form">
                        <TabbedArea defaultActiveKey={1}>
                            <TabPane eventKey={1} tab="Recording">
                                <strong>Recorded Events</strong>
                                {this.renderSetting("checkbox", "Change", "record-change")}
                                {this.renderSetting("checkbox", "Focus", "record-focus")}
                                {this.renderSetting("checkbox", "Blur", "record-blur")}
                                {this.renderSetting("checkbox", "Click", "record-click")}
                                {this.renderSetting("checkbox", "Double Click", "record-dblclick")}
                                {this.renderSetting("checkbox", "Mouse Down", "record-mousedown")}
                                {this.renderSetting("checkbox", "Mouse Up", "record-mousedown")}
                                {this.renderSetting("checkbox", "Mouse Enter", "record-mouseenter")}
                                {this.renderSetting("checkbox", "Mouse Leave", "record-mouseleave")}
                                {this.renderSetting("checkbox", "Mouse Over", "record-mouseover")}
                                {this.renderSetting("checkbox", "Mouse Out", "record-mouseout")}
                            </TabPane>
                            <TabPane eventKey={2} tab="Running">
                                beep
                            </TabPane>
                            <TabPane eventKey={3} tab="Help">

                            </TabPane>
                        </TabbedArea>
                    </form>
                </div>
                <div className="modal-footer">
                    <Button className="pull-left" ref="resetDefaultsButton" onClick={this.resetDefaults}>Reset Defaults</Button>
                    <Button ref="cancelButton" onClick={this.props.onClose}>Close</Button>
                </div>
            </Modal>
        );
    },

    renderSetting: function (type, label, settingKey) {
        var self = this;
        if (type === 'checkbox' || type === 'radio') {
            return (<Input type={type} label={label} checked={utme.settings.get(settingKey)} onChange={
                function (e) { self.updateSetting(settingKey, e.target.checked); }
            }/>);
        } else {
            return (<Input type={type} label={label} value={utme.settings.get(settingKey)} onChange={
                function (e) { self.updateSetting(settingKey, e.target.value); }
            }/>);
        }
    },

    updateSetting: function (key, value) {
        utme.settings.set(key, value);
        utme.settings.save();
        this.forceUpdate();
    },

    saveSettings: function (e) {
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
              scenarios: setup.split("\n")
          };
        }

        e.stopPropagation();
        //callback(info);
    }
});

module.exports = modalLauncher(CreateModal);
