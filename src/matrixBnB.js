/**
 * Matrix Reduction Branch and Bound Solver (Least-Cost Branch & Bound for TSP)
 * Full mathematical recording for every node:
 * - Matrix before zeroing
 * - Matrix after setting Row u -> Inf, Col v -> Inf, Sub-tour -> Inf
 * - Row minimums r_i and row reduction sum R
 * - Column minimums c_j and column reduction sum C
 * - Total reduction amount r = R + C
 * - Complete arithmetic substitution: ĉ(child) = ĉ(parent) + M[u][v] + r
 * - Pruning comparisons against current best tour
 */

export const cloneMatrix = (mat) => mat.map((row) => [...row]);

/**
 * Reduce a cost matrix by subtracting row and column minimums.
 */
export const reduceMatrix = (matrix) => {
  const n = matrix.length;
  const mat = cloneMatrix(matrix);
  const rowMins = new Array(n).fill(Infinity);
  let rowSum = 0;

  // 1. Row reduction
  for (let i = 0; i < n; i++) {
    let minVal = Infinity;
    for (let j = 0; j < n; j++) {
      if (mat[i][j] < minVal) {
        minVal = mat[i][j];
      }
    }
    if (minVal !== Infinity && minVal > 0) {
      rowMins[i] = minVal;
      rowSum += minVal;
      for (let j = 0; j < n; j++) {
        if (mat[i][j] !== Infinity) {
          mat[i][j] -= minVal;
        }
      }
    } else {
      rowMins[i] = minVal === Infinity ? Infinity : 0;
    }
  }

  const intermediateMat = cloneMatrix(mat);
  const colMins = new Array(n).fill(Infinity);
  let colSum = 0;

  // 2. Column reduction
  for (let j = 0; j < n; j++) {
    let minVal = Infinity;
    for (let i = 0; i < n; i++) {
      if (mat[i][j] < minVal) {
        minVal = mat[i][j];
      }
    }
    if (minVal !== Infinity && minVal > 0) {
      colMins[j] = minVal;
      colSum += minVal;
      for (let i = 0; i < n; i++) {
        if (mat[i][j] !== Infinity) {
          mat[i][j] -= minVal;
        }
      }
    } else {
      colMins[j] = minVal === Infinity ? Infinity : 0;
    }
  }

  return {
    reducedMatrix: mat,
    intermediateMatrix: intermediateMat,
    rowMins,
    colMins,
    rowSum,
    colSum,
    totalReduction: rowSum + colSum,
  };
};

/**
 * Solve TSP using Reduced Cost Matrix Branch and Bound
 * Returns all nodes with rich step-by-step arithmetic attached to each node.
 */
export const solveMatrixBranchAndBound = (initialCostMatrix) => {
  const n = initialCostMatrix.length;
  const chronologicalSteps = [];
  const allNodes = [];
  let nodeIdCounter = 1;

  // Initial Root Reduction
  const rootReduction = reduceMatrix(initialCostMatrix);
  const rootBound = rootReduction.totalReduction;

  // Root Node (Node 1)
  const rootNode = {
    id: nodeIdCounter++,
    parentId: null,
    vertex: 0, // Intersection 1
    path: [0],
    level: 0,
    cost: rootBound,
    matrix: cloneMatrix(rootReduction.reducedMatrix),
    matrixBefore: cloneMatrix(initialCostMatrix),
    matrixZeroed: cloneMatrix(initialCostMatrix),
    intermediateMatrix: cloneMatrix(rootReduction.intermediateMatrix),
    reducedMatrix: cloneMatrix(rootReduction.reducedMatrix),
    edge: null,
    edge1Based: null,
    edgeCost: 0,
    parentCost: 0,
    reductionSum: rootBound,
    rowMins: rootReduction.rowMins,
    colMins: rootReduction.colMins,
    rowSum: rootReduction.rowSum,
    colSum: rootReduction.colSum,
    status: 'ACTIVE',
    pruneReason: null,
    bestCostAtCreation: Infinity,
  };
  allNodes.push(rootNode);

  // Step 0: Initial Setup
  chronologicalSteps.push({
    stepIndex: 0,
    type: 'ROOT_SETUP',
    title: 'Initial Cost Matrix & Setup',
    description: `Constructed original ${n}×${n} transit cost matrix. Self-travel on diagonal is set to ∞.`,
    nodeId: 1,
    activeNodeId: 1,
    visibleNodeIds: [1],
    node: rootNode,
  });

  // Step 1: Root Row Reduction
  chronologicalSteps.push({
    stepIndex: 1,
    type: 'ROW_REDUCTION',
    title: 'Step 1: Root Row Reduction',
    description: `For each row i, subtract minimum non-infinite value r_i. Total row reduction sum R = ${rootReduction.rowSum}.`,
    nodeId: 1,
    activeNodeId: 1,
    visibleNodeIds: [1],
    node: rootNode,
  });

  // Step 2: Root Column Reduction
  chronologicalSteps.push({
    stepIndex: 2,
    type: 'COL_REDUCTION',
    title: 'Step 2: Root Column Reduction',
    description: `For each column j in the row-reduced matrix, subtract column minimum c_j. Total column reduction sum C = ${rootReduction.colSum}.`,
    nodeId: 1,
    activeNodeId: 1,
    visibleNodeIds: [1],
    node: rootNode,
  });

  // Step 3: Root Node Lower Bound
  chronologicalSteps.push({
    stepIndex: 3,
    type: 'CREATE_ROOT_NODE',
    title: 'Step 3: Root Lower Bound (Node 1 Created)',
    description: `Initial Lower Bound ĉ(1) = Row Reduction (${rootReduction.rowSum}) + Column Reduction (${rootReduction.colSum}) = ${rootBound}. No valid tour can cost less than ${rootBound}.`,
    nodeId: 1,
    activeNodeId: 1,
    visibleNodeIds: [1],
    node: rootNode,
  });

  // Priority queue for Least-Cost Branch and Bound (LCBB)
  let activeQueue = [rootNode];
  let bestTour = null;
  let bestCost = Infinity;

  while (activeQueue.length > 0) {
    // Sort by smallest lower bound (LCBB strategy)
    activeQueue.sort((a, b) => a.cost - b.cost);
    const currNode = activeQueue.shift();

    // Check if current node is pruned by a tour found earlier
    if (currNode.cost >= bestCost) {
      currNode.status = 'PRUNED';
      currNode.pruneReason = `Bound (${currNode.cost}) ≥ Best Tour Cost (${bestCost})`;
      continue;
    }

    // Leaf check: all n vertices visited
    if (currNode.path.length === n) {
      const lastVertex = currNode.vertex;
      const returnCost = currNode.matrix[lastVertex][0];
      const finalCost = currNode.cost + (returnCost === Infinity ? 0 : returnCost);

      if (finalCost < bestCost) {
        bestCost = finalCost;
        bestTour = [...currNode.path, 0];
        currNode.status = 'OPTIMAL';
        currNode.finalTourCost = finalCost;
      } else {
        currNode.status = 'SOLUTION';
        currNode.finalTourCost = finalCost;
      }

      chronologicalSteps.push({
        stepIndex: chronologicalSteps.length,
        type: 'LEAF_TOUR',
        title: `Leaf Node Reached: Complete Tour Formed`,
        description: `Full tour ${currNode.path.map((v) => v + 1).join(' → ')} → 1 formed. Return edge cost = ${returnCost === Infinity ? 0 : returnCost}. Total Tour Cost = ${finalCost}.${finalCost === bestCost ? ' ⭐ New Best Tour Found!' : ''}`,
        nodeId: currNode.id,
        activeNodeId: currNode.id,
        visibleNodeIds: allNodes.map((nd) => nd.id),
        node: currNode,
        finalCost,
        bestCost,
        bestTour: bestTour.map((v) => v + 1),
      });
      continue;
    }

    // Branching: expand all unvisited vertices
    const unvisited = [];
    for (let v = 0; v < n; v++) {
      if (!currNode.path.includes(v)) {
        unvisited.push(v);
      }
    }

    for (const nextVertex of unvisited) {
      const u = currNode.vertex;
      const v = nextVertex;
      const edgeCostInParent = currNode.matrix[u][v];

      if (edgeCostInParent === Infinity) {
        continue; // Unreachable edge
      }

      const matrixBefore = cloneMatrix(currNode.matrix);

      // Create child matrix
      const matrixZeroed = cloneMatrix(currNode.matrix);
      // Row u to Infinity
      for (let j = 0; j < n; j++) matrixZeroed[u][j] = Infinity;
      // Col v to Infinity
      for (let i = 0; i < n; i++) matrixZeroed[i][v] = Infinity;
      // Prevent premature sub-tour
      matrixZeroed[v][0] = Infinity;
      matrixZeroed[v][u] = Infinity;

      // Reduce child matrix
      const childReduction = reduceMatrix(matrixZeroed);
      const r = childReduction.totalReduction;
      const childBound = currNode.cost + edgeCostInParent + r;

      const isPruned = childBound >= bestCost;
      const pruneReason = isPruned
        ? `Bound (${childBound}) ≥ Current Best Tour (${bestCost})`
        : null;


      const childNode = {
        id: nodeIdCounter++,
        parentId: currNode.id,
        vertex: v,
        path: [...currNode.path, v],
        level: currNode.level + 1,
        cost: childBound,
        parentCost: currNode.cost,
        edge: [u, v],
        edge1Based: [u + 1, v + 1],
        edgeCost: edgeCostInParent,
        matrix: cloneMatrix(childReduction.reducedMatrix),
        matrixBefore: cloneMatrix(matrixBefore),
        matrixZeroed: cloneMatrix(matrixZeroed),
        intermediateMatrix: cloneMatrix(childReduction.intermediateMatrix),
        reducedMatrix: cloneMatrix(childReduction.reducedMatrix),
        reductionSum: r,
        rowMins: childReduction.rowMins,
        colMins: childReduction.colMins,
        rowSum: childReduction.rowSum,
        colSum: childReduction.colSum,
        status: isPruned ? 'PRUNED' : 'ACTIVE',
        pruneReason,
        bestCostAtCreation: bestCost,
      };

      allNodes.push(childNode);
      if (!isPruned) {
        activeQueue.push(childNode);
      }

      chronologicalSteps.push({
        stepIndex: chronologicalSteps.length,
        type: 'CHILD_NODE_CREATED',
        title: `Branch (${u + 1} → ${v + 1}): Node ${childNode.id} Created`,
        description: `Branching from Intersection ${u + 1} to Intersection ${v + 1}. Edge Cost = ${edgeCostInParent}. Row ${u + 1} & Col ${v + 1} set to ∞. Child reduction r = ${r}. Lower Bound ĉ = ${childBound}. ${isPruned ? `✂️ Pruned! (≥ Best Tour ${bestCost})` : '🟢 Added to Active Priority Queue.'}`,
        nodeId: childNode.id,
        activeNodeId: childNode.id,
        parentNodeId: currNode.id,
        visibleNodeIds: allNodes.map((nd) => nd.id),
        node: childNode,
        parentNode: currNode,
        isPruned,
        pruneReason,
        bestCost,
      });
    }
  }

  // Mark optimal tour nodes
  if (bestTour) {
    const optimalPathStr = bestTour.slice(0, n).join('-');
    allNodes.forEach((nd) => {
      if (nd.path.join('-') === optimalPathStr) {
        nd.status = 'OPTIMAL';
      }
    });
  }

  // Final Step: Solution Complete
  chronologicalSteps.push({
    stepIndex: chronologicalSteps.length,
    type: 'COMPLETE',
    title: 'Optimal Tour Completed',
    description: `Search complete! The optimal tour is ${bestTour ? bestTour.map((v) => v + 1).join(' → ') : 'None'} with minimum total cost = ${bestCost}.`,
    nodeId: null,
    visibleNodeIds: allNodes.map((nd) => nd.id),
    bestCost,
    bestTour: bestTour ? bestTour.map((v) => v + 1) : [],
  });

  return {
    initialMatrix: initialCostMatrix,
    rootReduction,
    rootBound,
    nodes: allNodes,
    chronologicalSteps,
    totalSteps: chronologicalSteps.length,
    bestTour: bestTour ? bestTour.map((v) => v + 1) : [],
    bestCost,
  };
};

/**
 * Standard Presets
 */
export const PRESETS = {
  textbook4: {
    name: 'Standard Textbook 4×4 (Horowitz & Sahni)',
    size: 4,
    labels: ['Intersection 1', 'Intersection 2', 'Intersection 3', 'Intersection 4'],
    matrix: [
      [Infinity, 10, 15, 20],
      [5, Infinity, 9, 10],
      [6, 13, Infinity, 12],
      [8, 8, 9, Infinity],
    ],
  },
  textbook5: {
    name: 'Classic 5×5 Urban Transit Network',
    size: 5,
    labels: ['Intersection 1', 'Intersection 2', 'Intersection 3', 'Intersection 4', 'Intersection 5'],
    matrix: [
      [Infinity, 20, 30, 10, 11],
      [15, Infinity, 16, 4, 2],
      [3, 5, Infinity, 2, 4],
      [19, 6, 18, Infinity, 3],
      [16, 4, 7, 16, Infinity],
    ],
  },
  cityRoute3: {
    name: '3×3 Mini Downtown Triangle',
    size: 3,
    labels: ['Intersection 1', 'Intersection 2', 'Intersection 3'],
    matrix: [
      [Infinity, 8, 12],
      [7, Infinity, 6],
      [10, 9, Infinity],
    ],
  },
};
