var React = require('react');
var bs = require('react-bootstrap');
var Modal = bs.Modal;
var Button = bs.Button;
var TabPane = bs.TabPane;
var TabbedArea = bs.TabbedArea;
var Input = bs.Input;
var Grid = bs.Grid;
var Col = bs.Col;
var Row = bs.Row;
var modalLauncher = require('../modals/modal-launcher.jsx');
var UtmeMixin = require('../mixins/UtmeMixin');

var settingsNS = "recorder.events.";

var CreateModal = React.createClass({
    mixins: [UtmeMixin],

    propTypes: {
        settings: React.PropTypes.object.isRequired
    },

    render () {
        return (
            <Modal title="Settings" onRequestHide={this.props.onClose} className="utme-settings">
                <div className="modal-body">
                    <form className="utme-settings-form">
                        <TabbedArea defaultActiveKey={1}>
                            <TabPane eventKey={1} tab="Recording">
                                <strong>Recorded Events</strong>
                                <Grid fluid>
                                    <Row>
                                        <Col xs={6}>
                                            {this.renderSetting("checkbox", "Change", "change")}
                                            {this.renderSetting("checkbox", "Focus", "focus")}
                                            {this.renderSetting("checkbox", "Blur", "blur")}
                                            {this.renderSetting("checkbox", "Click", "click")}
                                            {this.renderSetting("checkbox", "Double Click", "dblclick")}
                                        </Col>
                                        <Col xs={6}>
                                            {this.renderSetting("checkbox", "Mouse Down", "mousedown")}
                                            {this.renderSetting("checkbox", "Mouse Up", "mouseup")} 
                                            {this.renderSetting("checkbox", "Mouse Enter", "mouseenter")}
                                            {this.renderSetting("checkbox", "Mouse Leave", "mouseleave")}
                                            {this.renderSetting("checkbox", "Mouse Over", "mouseover")}
                                            {this.renderSetting("checkbox", "Mouse Out", "mouseout")}
                                        </Col>
                                    </Row>
                                </Grid>
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

    renderSetting (type, label, relativeSettingskey) {
        var self = this;
        var settingsKey = settingsNS + relativeSettingskey;
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
              scenarios: setup.split("\n")
          };
        }

        e.stopPropagation();
    }
});

module.exports = modalLauncher(CreateModal);
