const React = require('react');

const createIcon = (name) => (props) => React.createElement('span', {
  'data-testid': 'mock-lucide-icon',
  'data-icon': String(name),
  ...props,
});

module.exports = new Proxy({}, {
  get: function get(_target, prop) {
    return createIcon(prop);
  }
});
