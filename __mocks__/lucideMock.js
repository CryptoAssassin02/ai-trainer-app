const React = require('react');
function makeIcon(name) {
  return function Icon({ className, ...props }) {
    return React.createElement('span', { 'data-testid': 'mock-lucide-icon', 'data-icon': name, className, ...props });
  };
}
module.exports = new Proxy({}, {
  get: (_, prop) => makeIcon(prop)
});
