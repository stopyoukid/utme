var React = require('react');
var bs = require('react-bootstrap');
var ButtonGroup = bs.ButtonGroup;
var Button = bs.Button;
var Glyphicon = bs.Glyphicon;

var createScenarioModal = require('./modals/create-scenario-modal.jsx');
var settingsModal = require('./settings/settings-modal.jsx');
var UtmeMixin = require('./mixins/UtmeMixin');

var ControlPanel = React.createClass({

    mixins: [UtmeMixin],

    propTypes: {
        utme: React.PropTypes.object.isRequired
    },

    getInitialState () {
        return {
            disablePanel: false
        };
    },

    componentDidMount () {
        var self = this;
        this.props.utme.registerListener(function(eventName) {
            self.forceUpdate();
        });
    },

    componentWillUnmount () {
        // Should unregister event.
    },

    render () {
        return (
            <div>
                { this.renderButtons() }
            </div>
        );
    },

    renderButtons () {
        var utme = this.props.utme;
        if (utme.isRecording() || utme.isValidating()) {
            return this.renderRecorder();
        } else if (utme.isPlaying()) {
            return this.renderPlayer();
        }
        return this.renderDefault();
    },

    renderDefault () {
        return (
            <ButtonGroup bsSize="small">
                <Button ref="settingsButton" onClick={this.showSettings} disabled={ this.state.disablePanel }>
                    <Glyphicon glyph="cog"/>
                </Button>
                <Button ref="recordButton" onClick={this.recordScenario} disabled={ this.state.disablePanel }>
                    <span>{ '\u2B24' }</span>
                </Button>
                <Button ref="runButton" onClick={this.runScenario} disabled={ this.state.disablePanel }>
                    <Glyphicon glyph="play"/>
                </Button>
            </ButtonGroup>
        );
    },

    renderRecorder () {
        return (
            <ButtonGroup bsSize="small">
                <Button ref="timeoutButton" onClick={this.addTimeout} disabled={ this.state.disablePanel }>
                    <Glyphicon glyph="time"/>
                </Button>
                <Button ref="stopButton" onClick={this.recordScenario} disabled={ this.state.disablePanel }>
                    <Glyphicon style={ {color: 'red'} } glyph="stop"/>
                </Button>
                <Button ref="validateButton" onClick={this.validate} disabled={ this.state.disablePanel }>
                    <Glyphicon glyph='ok-sign' style={this.props.utme.isValidating() ? { color: 'green' } : {} } />
                </Button>
            </ButtonGroup>
        );
    },

    renderPlayer () {
        return (
            <ButtonGroup bsSize="small">
                <Button ref="stopButton" onClick={this.runScenario} disabled={ this.state.disablePanel }>
                    <Glyphicon glyph="stop"/>
                </Button>
                <Button ref="pauseButton" onClick={this.pauseScenario} disabled={ this.state.disablePanel }>
                    <Glyphicon glyph={this.props.utme.state.autoRun ? 'pause' : 'play'}/>
                </Button>
                <Button ref="stepButton" onClick={this.step} disabled={ this.props.utme.isPlaying() || this.state.disablePanel }>
                    <Glyphicon glyph="step-forward"/>
                </Button>
            </ButtonGroup>
        );
    },

    showSettings (e) {
        this.setState({ disablePanel: true });
        settingsModal.open({ settings: this.props.utme.settings }).then(() => {
            this.setState({ disablePanel: false });
        });
    },

    recordScenario () {
        var utme = this.props.utme;
        if (utme.isRecording() || utme.isValidating()) {
            if (utme.isValidating()) {
                utme.isValidating(false);
            }
            createScenarioModal.open().then(function(results) {
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

    addTimeout () {
        var utme = this.props.utme;
        if (utme.isRecording()) {
            utme.registerEvent('timeout', {
                amount: parseInt(prompt("How long in ms?"), 10)
            });
        }
    },

    validate () {
        var utme = this.props.utme;
        var isValidating = utme.isValidating();
        if (utme.isRecording() || isValidating) {
            if (isValidating) {
                this.toggleHighlight($('.utme-verify'), false);
            }
            utme.isValidating(!isValidating);
        }
    },

    runScenario () {
        var utme = this.props.utme;
        if (!(utme.isRecording() || utme.isPlaying() || utme.isValidating())) {
            utme.runScenario();
        } else {
            utme.stopScenario(false);
        }
    },

    pauseScenario (e) {
        var utme = this.props.utme;
        utme.state.autoRun = !utme.state.autoRun;
        this.forceUpdate();
    },

    step (e) {
        var utme = this.props.utme;
        utme.runNextStep(utme.state.runningScenario, utme.state.runningStep);
    }

});

module.exports = ControlPanel;
