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

function pointToLongLat(vec: THREE.Vector3): GJ.Position {
  const sph = new THREE.Spherical().setFromVector3(vec)
  const long = (sph.theta / (2 * Math.PI) * 360 + 180) % 360 - 180
  const lat = -(sph.phi / (2 * Math.PI) * 360) + 90
  return [long, lat]
}

function pointsToGeoJSON(vecs: THREE.Vector3[]): GJ.FeatureCollection<GJ.Point> {
  const geoPts = vecs.map(v => {
    const pos = pointToLongLat(v)
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

function longLatToPoint(coords: GJ.Position, radius: number): THREE.Vector3 {
  const theta = (coords[0] % 360) / 360 * 2 * Math.PI
  const phi = -(coords[1] - 90) / 360 * 2 * Math.PI
  const sph = new THREE.Spherical(radius, phi, theta)
  return new THREE.Vector3().setFromSpherical(sph)
}

function voronoiCellSphere(spherePoints: THREE.Vector3[]): CellSphere {
  const radius = spherePoints[0].length()

  const geoVoronoi = d3.geoVoronoi()
  const geoPts = pointsToGeoJSON(spherePoints)
  const cells = geoVoronoi
    .polygons(geoPts)
    .features.map(poly => ({
      site: longLatToPoint(poly.properties.site.geometry.coordinates, radius),
      boundary: poly.geometry.coordinates[0].map(coords => longLatToPoint(coords, radius)),
    }))
    .map(p => ({site: p.site, boundary: p.boundary, neighbors: []}))

  for (let linkFeature of geoVoronoi.links(geoPts).features) {
    const sourceIdx = linkFeature.properties.source.index
    const targetIdx = linkFeature.properties.target.index
    cells[sourceIdx].neighbors.push(targetIdx)
    cells[targetIdx].neighbors.push(sourceIdx)
  }

  return {radius, cells}
}

export function genCellSphere(radius, density, minDistance: number): CellSphere {
  return voronoiCellSphere(randomSpherePoints(radius, density, minDistance))
}

export function toObject3D(cellSphere: CellSphere): THREE.Object3D {
  const ptsGeom = new THREE.Geometry()
  const ptsMaterial = new THREE.PointsMaterial({size: 0.2, color: 0xdd00dd})

  const linesMaterial = new THREE.LineBasicMaterial({linewidth: 5, color: 0x0000dd33})
  const polyObjs = cellSphere.cells.map(poly => {
    const linesGeom = new THREE.Geometry()
    linesGeom.vertices = poly.boundary.slice()
    ptsGeom.vertices.push(poly.site) // TODO Avoid mutation in map function?

    return new THREE.Line(linesGeom, linesMaterial)
  })
  const ptsObj = new THREE.Points(ptsGeom, ptsMaterial)

  const sphereGeom = new THREE.SphereGeometry(cellSphere.radius * 0.99, 20, 20)
  const sphereMaterial = new THREE.MeshBasicMaterial({color: 0x777777})
  const sphere = new THREE.Mesh(sphereGeom, sphereMaterial)

  const group = new THREE.Group()
  group.add(ptsObj)
  for (let poly of polyObjs) group.add(poly)
  group.add(sphere)
  return group
}

export type CellSphere = {
  radius: number
  cells: {
    site: THREE.Vector3
    boundary: THREE.Vector3[]
    neighbors: number[]
  }[]
}
