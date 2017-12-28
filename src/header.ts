import * as Aframe from 'aframe'
import './shim'
import genPlanet from './planet'

const PLANET = 'planet'

Aframe.registerComponent(PLANET, {
  schema: {},

  init: function() {
    this.el.setObject3D(PLANET, genPlanet())
  },

  update: function() {},

  remove: function() {
    this.el.removeObject3D(PLANET)
  },

  tick: function(time, timeDelta) {
    const period = 3000
    this.el.getObject3D(PLANET).rotation.y = (time % period) / period * 2 * Math.PI
  },
})
