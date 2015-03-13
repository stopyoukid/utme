var React = require('react');
var bs = require('react-bootstrap');
var Modal = bs.Modal;
var Input = bs.Input;
var Button = bs.Button;
var modalLauncher = require('./modal-launcher.jsx');
var UtmeMixin = require('../mixins/UtmeMixin');

var CreateModal = React.createClass({
    mixins: [UtmeMixin],

    render () {
        return (
            <Modal title="Save Scenario Recording" onRequestHide={() => {}} className="utme-create-modal">
                <div className="modal-body">
                    <form data-ignore="true" ref="form">
                        <Input type="text" label="Scenario Name" ref="scenarioName"/>
                        <Input type="text" label="Description (Optional):" ref="description"/>
                        <Input type="text" label="Setup Scenarios (Optional, Newline separated):" ref="setupScenarios"/>
                        <Input type="text" label="Cleanup Scenarios (Optional, Newline separated):" ref="cleanupScenarios"/>
                    </form>
                </div>
                <div className="modal-footer" data-ignore="true">
                    <Button className="pull-left" ref="resetDefaultsButton" onClick={this.cancel}>Cancel</Button>
                    <Button ref="continueButton" onClick={this.continueScenario}>Continue</Button>
                    <Button bsStyle="primary" ref="saveButton" onClick={this.saveScenario}>Save</Button>
                </div>
            </Modal>
        );
    },

    cancel () {
        this.props.onClose();
    },

    saveScenario (e) {
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

    continueScenario () {
        this.props.onClose({ action: 'continue'});
    }
});

module.exports = modalLauncher(CreateModal);
