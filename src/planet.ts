import * as GJ from 'geojson'
import * as d3 from 'd3-geo-voronoi'

const EPSILON = 0.0000001

function randomSpherePoints(radius, density, minDistance: number): THREE.Vector3[] {
  const maxPoints = 4 * Math.PI * radius * radius * density

  // Generate uniformly-distributed random spherical coordinates with ocnstant radius
  let pts: THREE.Vector3[] = []
  for (let n = 0; n < maxPoints; n++) {
    // Distribution for phi is not constant, see http://mathworld.wolfram.com/SpherePointPicking.html
    const theta = Math.random() * 2 * Math.PI
    const phi = Math.acos(2 * Math.random() - 1)
    pts.push(new THREE.Vector3().setFromSpherical(new THREE.Spherical(radius, phi, theta)))
  }

  // Remove too-close points
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; ) {
      if (pts[i].distanceToSquared(pts[j]) < minDistance * minDistance) {
        pts.splice(j, 1)
      } else {
        j++
      }
    }
  }

  return pts
}

function vector3ToLongLat(vec: THREE.Vector3): GJ.Position {
  const sph = new THREE.Spherical().setFromVector3(vec)
  const long = (sph.theta / (2 * Math.PI) * 360 + 180) % 360 - 180
  const lat = -(sph.phi / (2 * Math.PI) * 360) + 90
  return [long, lat]
}

function vector3ListToPtCollection(vecs: THREE.Vector3[]): GJ.FeatureCollection<GJ.Point> {
  const geoPts = vecs.map(v => {
    const pos = vector3ToLongLat(v)
    const geom: GJ.Point = {
      type: 'Point',
      coordinates: pos,
    }

    const feature: GJ.Feature<GJ.Point> = {
      type: 'Feature',
      geometry: geom,
      properties: null,
    }

    return feature
  })

  return {
    type: 'FeatureCollection',
    features: geoPts,
  }
}

function longLatToVector3(coords: GJ.Position, radius: number): THREE.Vector3 {
  const theta = (coords[0] % 360) / 360 * 2 * Math.PI
  const phi = -(coords[1] - 90) / 360 * 2 * Math.PI
  const sph = new THREE.Spherical(radius, phi, theta)
  return new THREE.Vector3().setFromSpherical(sph)
}

function voronoiPolygons(spherePoints: THREE.Vector3[]): THREE.Vector3[][] {
  const radius = spherePoints[0].length()
  return d3
    .geoVoronoi()
    .polygons(vector3ListToPtCollection(spherePoints))
    .features.map(poly =>
      poly.geometry.coordinates[0].map(coords => longLatToVector3(coords, radius)),
    )
}

export default function genPlanet(): THREE.Object3D {
  const pts = randomSpherePoints(5, 0.25, 1.4)

  const ptsGeom = new THREE.Geometry()
  ptsGeom.vertices = pts
  const ptsMaterial = new THREE.PointsMaterial({size: 0.5, color: 0xff00ff})
  const ptsObj = new THREE.Points(ptsGeom, ptsMaterial)

  const linesMaterial = new THREE.LineBasicMaterial({linewidth: 5, color: 0x0000ff77})
  const polyObjs = voronoiPolygons(pts).map(poly => {
    const linesGeom = new THREE.Geometry()
    linesGeom.vertices = poly.slice()

    return new THREE.Line(linesGeom, linesMaterial)
  })

  const group = new THREE.Group()
  group.add(ptsObj)
  for (let poly of polyObjs) group.add(poly)
  return group
}
