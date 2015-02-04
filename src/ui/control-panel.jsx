var React = require('react');
var bs = require('react-bootstrap');
var ButtonGroup = bs.ButtonGroup;
var Button = bs.Button;
var Glyphicon = bs.Glyphicon;

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
                { this.renderButtons() }
            </div>
        );
    },

    renderButtons: function () {
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
                <Button ref="stopButton" onClick={this.recordScenario} data-ignore="true">
                    <Glyphicon style={ {color: 'red'} } glyph="stop"/>
                </Button>
                <Button ref="timeoutButton" onClick={this.addTimeout} data-ignore="true">
                    <Glyphicon glyph="time"/>
                </Button>
                <Button ref="validateButton" onClick={this.validate} data-ignore="true">
                    <Glyphicon glyph='ok-sign' style={utme.isValidating ? { color: 'green' } : {} }/>
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
                    <Glyphicon glyph={utme.state.autoRun ? 'pause' : 'play'}/>
                </Button>
                <Button ref="stepButton" onClick={this.step} data-ignore="true" disabled={utme.isPlaying()}>
                    <Glyphicon glyph="step-forward"/>
                </Button>
            </ButtonGroup>
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
        if (utme.isRecording()) {
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