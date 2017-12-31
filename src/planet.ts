import * as Voronoi from './voronoi'

export default function generate() {
  const cellSphere = Voronoi.genCellSphere(10, 0.4, 0.5)
  const group = new THREE.Group()

  for (let cell of cellSphere.cells) {
    // Build a matrix and its inverse to transform cell boundary from planet location such that:
    // - Cell boundary lies in XY plane
    // - Voronoi cell site coincident with (0, 0, 0)
    // Coordinate system is right-handed with +X right, +Y up, and +Z towards

    const spherical = new THREE.Spherical().setFromVector3(cell.site)

    const replaceCellRot = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(spherical.phi - Math.PI / 2, spherical.theta, 0, 'YXZ'),
    )
    const replaceCellTranslate = new THREE.Matrix4().makeTranslation(0, 0, cellSphere.radius)
    const replaceCell = new THREE.Matrix4().multiplyMatrices(replaceCellRot, replaceCellTranslate)
    const focusCell = new THREE.Matrix4().getInverse(replaceCell, true)

    const focusedBoundary = cell.boundary.map(pt =>
      new THREE.Vector3().copy(pt).applyMatrix4(focusCell),
    )

    const filledCell = fillCell(focusedBoundary)
    const filledMat = new THREE.Matrix4().copy(filledCell.matrix)
    filledCell.matrix.multiplyMatrices(replaceCell, filledMat)
    filledCell.matrixAutoUpdate = false

    group.add(filledCell)
  }

  group.add(Voronoi.toObject3D(cellSphere))

  return group
}

function fillCell(boundary: THREE.Vector3[]): THREE.Object3D {
  return new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 10), new THREE.MeshNormalMaterial())
}
