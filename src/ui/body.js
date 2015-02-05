var React = require('react');
var containers = [];

function findElementContainer (reactElement) {
    for (var i = 0; i < containers.length; i++) {
        if (containers[i].element === reactElement) {
            return containers[i].container;
        }
    }
}

module.exports = {

    append: function (reactElement, className) {
        var styles =  document.createElement('style');
        var container =  document.createElement('div');
        container.className = 'utme-ui' + (className ? ' ' + className : ''); // Add namespace for styles
        document.body.appendChild(container);
        React.render(reactElement, container);
        containers.push({
            container: container,
            element: reactElement
        });
        return reactElement;
    },

    appendComponent: function (reactComponent, className) {
        return this.append(React.createElement(reactComponent), className);
    },

    remove: function (reactElement) {
        var container = findElementContainer(reactElement);
        if (container) {
            React.unmountComponentAtNode(container);
            // In case the element has animations, wait before removing.
            setTimeout(function () {
                document.body.removeChild(container);
            });
        }
    }

};