module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }]
  ],
  plugins: [
    // Handle path aliases
    ['module-resolver', {
      root: ['.'],
      alias: {
        '@/backend': '.'
      }
    }]
  ]
}; 