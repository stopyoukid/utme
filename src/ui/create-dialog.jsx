var React = require('react');
module.exports = React.createClass({
    render: function () {
        return (
            <form class="utme-scenario-form">
                <Input type="text" label="Scenario Name" ref="scenarioName"/>
                <Input type="text" label="Description (Optional):" ref="description"/>
                <Input type="text" label="Setup Scenarios (Optional, Newline separated):" ref="setupScenarios"/>
                <Input type="text" label="Cleanup Scenarios (Optional, Newline separated):" ref="cleanupScenarios"/>
                <Button bsStyle="primary" ref="saveButton" onClick="{this.saveScenario}">Save</Button>
            </form>
        );
    },

    saveScenario: function (e) {
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