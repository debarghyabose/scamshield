import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error) {
    console.warn('[ScamShield] Falling back after render error:', error)
  }
  render() {
    if (this.state.error) return this.props.fallback ?? null
    return this.props.children
  }
}
