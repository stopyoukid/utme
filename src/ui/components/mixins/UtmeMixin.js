/**
 * Mixin that adds crucial configurations to UI elements for utme.
 */

module.exports = {

    componentDidMount () {
        this.updateDOM(this.getDOMNode()); // Initial
    },

    componentDidUpdate () {
        this.updateDOM(this.getDOMNode());
    },

    updateDOM (element) {
        var i = element.children.length;
        while (i --> 0) {
            this.updateDOM(element.children[i]);
        }
        this.addIgnoreAttribute(element);
    },

    /**
     * Adds an ignore attribute so it won't be recorded.
     */
    addIgnoreAttribute (element) {
        element.setAttribute("data-ignore", "true");
    }

};