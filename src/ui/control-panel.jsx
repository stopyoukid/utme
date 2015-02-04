var React = require('react');
var bs = require('react-bootstrap');
var ButtonGroup = bs.ButtonGroup;
var Button = bs.Button;

var CreateDialog = require('./create-dialog.jsx');
var utme = require('../js/utme');
var ControlPanel = React.createClass({

    componentDidMount: function () {
        var self = this;
        utme.registerListener(function(eventName) {
            self.forceUpdate();
        });
    },

    componentWillUnmount: function () {
        // Should unregister event.
    },

    render: function () {
        return (
            <div class="utme-ui utme-bar" data-ignore="true">
                <ButtonGroup data-ignore="true">
                    <Button ref="recordButton" onClick={this.recordScenario} data-ignore="true">
                        { utme.isRecording() || utme.isValidating() ? 'Stop Recording' : 'Record Scenario' }
                    </Button>
                    <Button ref="timeoutButton" onClick={this.addTimeout} data-ignore="true">
                        Add Timeout
                    </Button>
                    <Button ref="validateButton" onClick={this.validate} data-ignore="true">
                        { utme.isValidating() ? 'Done Validating' : 'Validate' }
                    </Button>
                    <Button ref="runButton" onClick={this.runScenario} data-ignore="true">
                        { utme.isPlaying() ? 'Stop Running' : 'Run Scenario' }
                    </Button>
                    <Button ref="pauseButton" onClick={this.pauseScenario} data-ignore="true">
                        { utme.state.autoRun ? 'Pause' : "Resume" }
                    </Button>
                    <Button ref="validateButton" onClick={this.step} data-ignore="true">
                        Step
                    </Button>
                </ButtonGroup>
            </div>
        );
    },

    recordScenario: function () {
        if (utme.isRecording() || utme.isValidating()) {
            if (utme.isValidating()) {
                utme.isValidating(false);
            }
            //showScenarioForm(function(info, form) {
            //    destroyScenarioForm();
                utme.stopRecording(false);
            //});
        } else {
            utme.startRecording();
        }
    },

    addTimeout: function () {
        var oldStatus = utme.isRecording();
        if (oldStatus) {
            utme.registerEvent('timeout', {
                amount: parseInt(prompt("How long in ms?"), 10)
            });
        }
    },

    validate: function () {
        var isValidating = utme.isValidating();
        if (utme.isRecording() || isValidating) {
            if (isValidating) {
                toggleHighlight($('.utme-verify'), false);
            }
            utme.isValidating(!isValidating);
        }

        updateButtonStates();
    },

    runScenario: function () {
        if (!(utme.isRecording() || utme.isPlaying() || utme.isValidating())) {
            utme.runScenario();
        } else {
            utme.stopScenario(false);
        }
    },

    pauseScenario: function (e) {
        utme.state.autoRun = !utme.state.autoRun;
    },

    step: function (e) {
        utme.runNextStep(utme.state.runningScenario, utme.state.runningStep);
        return false;
    }

});

module.exports = {
    add: function (node) {
        var container =  document.createElement('div');
        container.className = 'utme-ui utme-bar';
        node.appendChild(container);
        React.render(React.createElement(ControlPanel), container);
    }
}