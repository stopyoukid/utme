var React = require('react');
var bs = require('react-bootstrap');
var Modal = bs.Modal;
var Input = bs.Input;
var Button = bs.Button;
var modalLauncher = require('./modal-launcher.jsx');

var CreateModal = React.createClass({
    render: function () {
        return (
            <Modal title="Save Scenario Recording" onRequestHide={function () {}} className="utme-create-modal" data-ignore="true">
                <div className="modal-body" data-ignore="true">
                    <form data-ignore="true" ref="form">
                        <Input type="text" label="Scenario Name" ref="scenarioName" data-ignore="true"/>
                        <Input type="text" label="Description (Optional):" ref="description" data-ignore="true"/>
                        <Input type="text" label="Setup Scenarios (Optional, Newline separated):" ref="setupScenarios" data-ignore="true"/>
                        <Input type="text" label="Cleanup Scenarios (Optional, Newline separated):" ref="cleanupScenarios" data-ignore="true"/>
                    </form>
                </div>
                <div className="modal-footer" data-ignore="true">
                    <Button className="pull-left" ref="resetDefaultsButton" onClick={this.cancel} data-ignore="true">Cancel</Button>
                    <Button ref="continueButton" onClick={this.continueScenario} data-ignore="true">Continue</Button>
                    <Button bsStyle="primary" ref="saveButton" onClick={this.saveScenario} data-ignore="true">Save</Button>
                </div>
            </Modal>
        );
    },

    cancel: function () {
        this.props.onClose();
    },

    saveScenario: function (e) {
        var form = this.refs.form;
        var setup = this.refs.setupScenarios.getValue();
        var cleanup = this.refs.cleanupScenarios.getValue();

        var info = {
            name: this.refs.scenarioName.getValue(),
            description: this.refs.description.getValue()
        };

        if (setup) {
            info.setup = {
                scenarios: setup.split("\n")
            };
        }

        e.stopPropagation();
        this.props.onClose({
            action: 'save',
            scenario: info
        });
    },

    continueScenario: function () {
        this.props.onClose({ action: 'continue'});
    }
});

module.exports = modalLauncher(CreateModal);