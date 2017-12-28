import * as ThreeModule from 'three'

// Use AFrame's THREE in place of npm's
declare global {
  const THREE: typeof ThreeModule
}
