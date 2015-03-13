var React = require('react');
var UtmeMixin = require('../mixins/UtmeMixin');
var HasSettingsMixin = require('../mixins/HasSettingsMixin');
var bs = require('react-bootstrap');
var Input = bs.Input;
var Grid = bs.Grid;
var Col = bs.Col;
var Row = bs.Row;

var RunSettingsPane = React.createClass({
    mixins: [UtmeMixin, HasSettingsMixin],

    settingsNS:  "runner.",

    propTypes: {
        settings: React.PropTypes.object.isRequired
    },

    render () {
        var self = this;
        var settingsKey = (this.settingsNS || "base.") + 'speed';
        return (
            <Grid fluid>
                <Row>
                    <Col xs={6}>
                         <Input type="select" label='Run Speed' defaultValue={this.props.settings.get(settingsKey)} onChange={
                            function (e) { self.updateSetting(settingsKey, e.target.value); }
                          }>
                          <option value="fastest">Fastest</option>
                          <option value="realtime">Realtime</option>
                          <option value="2">2x</option>
                          <option value="4">4x</option>
                          <option value="10">10x</option>
                        </Input>
                    </Col>
                </Row>
            </Grid>
        );
    }
});

module.exports = RunSettingsPane;
