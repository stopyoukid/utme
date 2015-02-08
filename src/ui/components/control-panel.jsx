var React = require('react');
var bs = require('react-bootstrap');
var ButtonGroup = bs.ButtonGroup;
var Button = bs.Button;
var Glyphicon = bs.Glyphicon;

var createModal = require('./modals/create-modal.jsx');
var settingsModal = require('./modals/settings-modal.jsx');

module.exports = React.createClass({

    propTypes: {
        utme: React.PropTypes.object.isRequired
    },

    componentDidMount: function () {
        var self = this;
        this.props.utme.registerListener(function(eventName) {
            self.forceUpdate();
        });
    },

    componentWillUnmount: function () {
        // Should unregister event.
    },

    render: function () {
        return (
            <div data-ignore="true">
                { this.renderButtons() }
            </div>
        );
    },

    renderButtons: function () {
        var utme = this.props.utme;
        if (utme.isRecording()) {
            return this.renderRecorder();
        } else if (utme.isPlaying()) {
            return this.renderPlayer();
        }
        return this.renderDefault();
    },

    renderDefault: function () {
        return (
            <ButtonGroup data-ignore="true" bsSize="small">
                <Button ref="settingsButton" onClick={this.showSettings} data-ignore="true">
                    <Glyphicon glyph="cog"/>
                </Button>
                <Button ref="recordButton" onClick={this.recordScenario} data-ignore="true">
                    <span>{ '\u2B24' }</span>
                </Button>
                <Button ref="runButton" onClick={this.runScenario} data-ignore="true">
                    <Glyphicon glyph="play"/>
                </Button>
            </ButtonGroup>
        );
    },

    renderRecorder: function () {
        return (
            <ButtonGroup data-ignore="true" bsSize="small">
                <Button ref="timeoutButton" onClick={this.addTimeout} data-ignore="true">
                    <Glyphicon glyph="time"/>
                </Button>
                <Button ref="stopButton" onClick={this.recordScenario} data-ignore="true">
                    <Glyphicon style={ {color: 'red'} } glyph="stop"/>
                </Button>
                <Button ref="validateButton" onClick={this.validate} data-ignore="true">
                    <Glyphicon glyph='ok-sign' style={this.props.utme.isValidating() ? { color: 'green' } : {} }/>
                </Button>
            </ButtonGroup>
        );
    },

    renderPlayer: function () {
        return (
            <ButtonGroup data-ignore="true" bsSize="small">
                <Button ref="stopButton" onClick={this.stopScenario} data-ignore="true">
                    <Glyphicon glyph="stop"/>
                </Button>
                <Button ref="pauseButton" onClick={this.pauseScenario} data-ignore="true">
                    <Glyphicon glyph={this.props.utme.state.autoRun ? 'pause' : 'play'}/>
                </Button>
                <Button ref="stepButton" onClick={this.step} data-ignore="true" disabled={this.props.utme.isPlaying()}>
                    <Glyphicon glyph="step-forward"/>
                </Button>
            </ButtonGroup>
        );
    },

    showSettings: function () {
        settingsModal.open({ settings: this.props.utme.settings });
    },

    recordScenario: function () {
        var utme = this.props.utme;
        if (utme.isRecording() || utme.isValidating()) {
            if (utme.isValidating()) {
                utme.isValidating(false);
            }
            createModal.open().then(function(results) {
                if (!results) {
                    utme.stopRecording(false);
                } else if (results.action === 'save') {
                    utme.stopRecording(results.scenario);
                }
            });
        } else {
            utme.startRecording();
        }
    },

    addTimeout: function () {
        var utme = this.props.utme;
        if (utme.isRecording()) {
            utme.registerEvent('timeout', {
                amount: parseInt(prompt("How long in ms?"), 10)
            });
        }
    },

    validate: function () {
        var utme = this.props.utme;
        var isValidating = utme.isValidating();
        if (utme.isRecording() || isValidating) {
            if (isValidating) {
                toggleHighlight($('.utme-verify'), false);
            }
            utme.isValidating(!isValidating);
        }
    },

    runScenario: function () {
        var utme = this.props.utme;
        if (!(utme.isRecording() || utme.isPlaying() || utme.isValidating())) {
            utme.runScenario();
        } else {
            utme.stopScenario(false);
        }
    },

    pauseScenario: function (e) {
        var utme = this.props.utme;
        utme.state.autoRun = !utme.state.autoRun;
    },

    step: function (e) {
        var utme = this.props.utme;
        utme.runNextStep(utme.state.runningScenario, utme.state.runningStep);
    }

});