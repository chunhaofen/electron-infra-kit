// Common utilities shared across windows

// Error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
})

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})

// Log when window is ready
console.log('Window loaded:', document.title)
