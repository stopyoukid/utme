var React = require('react');
var bs = require('react-bootstrap');
var Modal = bs.Modal;
var Button = bs.Button;
var TabPane = bs.TabPane;
var TabbedArea = bs.TabbedArea;
var Input = bs.Input;
var modalLauncher = require('./modal-launcher.jsx');
var utme = require('../../../js/utme');

var SettingsModal = React.createClass({

    propTypes: {
        settings: React.PropTypes.object.isRequired
    },

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
                    <Button className="pull-left" onClick={this.resetDefaults}>Reset Defaults</Button>
                    <Button onClick={this.props.onClose}>Close</Button>
                </div>
            </Modal>
        );
    },

    renderSetting: function (type, label, settingKey) {
        var self = this;
        if (type === 'checkbox' || type === 'radio') {
            return (<Input type={type} label={label} checked={this.props.settings.get(settingKey)} onChange={
                function (e) { self.updateSetting(settingKey, e.target.checked); }
            }/>);
        } else {
            return (<Input type={type} label={label} value={this.props.settings.get(settingKey)} onChange={
                function (e) { self.updateSetting(settingKey, e.target.value); }
            }/>);
        }
    },

    updateSetting: function (key, value) {
        this.props.settings.set(key, value);
        this.forceUpdate();
    },

    resetDefaults: function () {
        this.props.settings.resetDefaults();
        this.forceUpdate();
    }

});

module.exports = modalLauncher(SettingsModal);
