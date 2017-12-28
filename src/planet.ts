import * as d3 from 'd3'
import * as GeoJSON from 'geojson'

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
        pts = pts.splice(j, 1)
      } else {
        j++
      }
    }
  }

  return pts
}

function vector3ToLongLat(vec: THREE.Vector3): GeoJSON.Position {
  const sph = new THREE.Spherical().setFromVector3(vec)
  const long = (sph.theta / (2 * Math.PI) * 360 + 180) % 360 - 180
  const lat = -(sph.phi / (2 * Math.PI) * 360) + 90
  return [long, lat]
}

function longLatToVector3(coords: GeoJSON.Position, radius: number): THREE.Vector3 {
  const theta = (coords[0] % 360) / 360 * 2 * Math.PI
  const phi = -(coords[1] - 90) / 360 * 2 * Math.PI
  const sph = new THREE.Spherical(radius, phi, theta)
  return new THREE.Vector3().setFromSpherical(sph)
}

function voronoiPolygons(radius: number): THREE.Vector3[][] {
  const voronoiPoints = randomSpherePoints(radius, 20, 0.2)
  const longLatPts = voronoiPoints.map(vector3ToLongLat)

  const voronoi = d3.geoVoronoi(longLatPts)
  const polys: GeoJSON.FeatureCollection<GeoJSON.Polygon, null> = voronoi.polygons()
  return polys.features.map(poly =>
    poly.geometry.coordinates.map(longLatToVector3.bind(null, null, radius)),
  )
}

export default function genSphere(): THREE.Object3D {
  const geom = new THREE.Geometry()
  geom.vertices = randomSpherePoints(5, 0.25, 0.2)
  const material = new THREE.PointsMaterial({size: 0.5, color: 0xff00ff})

  return new THREE.Points(geom, material)
}
