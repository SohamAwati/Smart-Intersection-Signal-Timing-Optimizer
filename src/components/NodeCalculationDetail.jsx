import React, { useState } from 'react';

/**
 * NodeCalculationDetail
 * Comprehensive, step-by-step arithmetic breakdown for every node in the state-space tree:
 * 1. Node selection & path
 * 2. Exact parent cost, road transit cost, and child matrix reduction values
 * 3. Matrix zeroing (Row u -> Inf, Col v -> Inf, Sub-tour M[v][1] -> Inf)
 * 4. Child row reduction minimums (r_i) & sum R
 * 5. Child column reduction minimums (c_j) & sum C
 * 6. Total child reduction r = R + C
 * 7. Exact numerical addition without abstract formulas
 * 8. Pruning decision against best known tour
 * 9. The resulting child reduced matrix with highlighted zeros
 */
const NodeCalculationDetail = ({
  currentStep,
  selectedNodeId,
  onSelectNode,
  matrixSize,
  solution,
}) => {
  // If user selected a specific node, inspect it; otherwise inspect current step's node
  const activeNode = React.useMemo(() => {
    if (!solution?.nodes || solution.nodes.length === 0) return null;
    if (selectedNodeId) {
      return solution.nodes.find((n) => n.id === selectedNodeId) || solution.nodes[0];
    }
    if (currentStep?.node) {
      return currentStep.node;
    }
    return solution.nodes[0];
  }, [solution, selectedNodeId, currentStep]);

  // Tab inside calculation card: "1. Step-by-Step Calculation", "2. Matrix Zeroing", "3. Row & Col Reductions", "4. Reduced Matrix"
  const [activeSubTab, setActiveSubTab] = useState('calc');

  if (!activeNode) {
    return (
      <div className="node-calc-detail-card empty">
        <p>Run the algorithm or select a node in the tree to view its step-by-step calculation.</p>
      </div>
    );
  }

  const isRoot = activeNode.id === 1;
  const isBranch = !isRoot && !!activeNode.edge1Based;

  return (
    <div className="node-calc-detail-card">
      {/* Node Header & Direct Node Selector */}
      <div className="node-calc-top-bar">
        <div>
          <div className="node-badge-row">
            <span className="calc-badge">
              {isRoot ? 'Root Node (Node 1)' : `Node ${activeNode.id} Calculation`}
            </span>
            <span className={`status-pill ${activeNode.status.toLowerCase()}`}>
              {activeNode.status === 'OPTIMAL' ? '⭐ OPTIMAL TOUR' : activeNode.status === 'PRUNED' ? '✂️ PRUNED' : '🟢 ACTIVE IN QUEUE'}
            </span>
            <span className="depth-badge">Tree Depth: {activeNode.level}</span>
          </div>
          <h3 className="calc-main-title">
            {isRoot
              ? 'Root Lower Bound: Node 1'
              : `Branch (${activeNode.edge1Based[0]} → ${activeNode.edge1Based[1]}): Step-by-Step Calculation`}
          </h3>
          <div className="visited-path-text">
            Traversal Path: <strong>{activeNode.path.map((v) => v + 1).join(' → ')}</strong>
          </div>
        </div>

        {/* Node Quick Switcher */}
        <div className="node-selector-pills-box">
          <span className="selector-title">Inspect Any Node:</span>
          <div className="node-pills-scroll">
            {solution?.nodes?.map((nd) => (
              <button
                key={nd.id}
                className={`node-pill-btn ${activeNode.id === nd.id ? 'active' : ''} ${nd.status.toLowerCase()}`}
                onClick={() => onSelectNode(nd.id)}
                title={`Inspect Node ${nd.id} (Cost: ${nd.cost})`}
              >
                N{nd.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-Tabs for Step Detail */}
      <div className="calc-subtabs-row">
        <button
          className={`calc-subtab-btn ${activeSubTab === 'calc' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('calc')}
        >
          1. Step-by-Step Calculation
        </button>
        {!isRoot && (
          <button
            className={`calc-subtab-btn ${activeSubTab === 'zeroing' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('zeroing')}
          >
            2. Matrix Zeroing (Row & Col → ∞)
          </button>
        )}
        <button
          className={`calc-subtab-btn ${activeSubTab === 'reductions' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('reductions')}
        >
          3. Row & Column Reductions
        </button>
        <button
          className={`calc-subtab-btn ${activeSubTab === 'childmat' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('childmat')}
        >
          4. Reduced Matrix
        </button>
      </div>

      {/* TAB 1: STEP-BY-STEP CALCULATION */}
      {activeSubTab === 'calc' && (
        <div className="calc-tab-pane">
          {/* Direct Calculation Numbers Card (No abstract formula) */}
          <div className="calc-values-summary-banner">
            <div className="calc-values-grid">
              {isRoot ? (
                <>
                  <div className="calc-val-item">
                    <span className="calc-val-label">Row Reductions Sum (R):</span>
                    <span className="calc-val-number">{activeNode.rowSum}</span>
                  </div>
                  <div className="calc-val-item">
                    <span className="calc-val-label">Column Reductions Sum (C):</span>
                    <span className="calc-val-number">{activeNode.colSum}</span>
                  </div>
                  <div className="calc-val-item highlight">
                    <span className="calc-val-label">Initial Lower Bound:</span>
                    <span className="calc-val-number text-highlight">
                      {activeNode.rowSum} + {activeNode.colSum} = <strong>{activeNode.cost}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="calc-val-item">
                    <span className="calc-val-label">Parent Node {activeNode.parentId} Cost:</span>
                    <span className="calc-val-number">{activeNode.parentCost}</span>
                  </div>
                  <div className="calc-val-item">
                    <span className="calc-val-label">Road Transit Cost (Int {activeNode.edge1Based[0]} → {activeNode.edge1Based[1]}):</span>
                    <span className="calc-val-number">+{activeNode.edgeCost}</span>
                  </div>
                  <div className="calc-val-item">
                    <span className="calc-val-label">Matrix Reduction Sum (r = {activeNode.rowSum} + {activeNode.colSum}):</span>
                    <span className="calc-val-number">+{activeNode.reductionSum}</span>
                  </div>
                  <div className="calc-val-item highlight">
                    <span className="calc-val-label">Computed Node {activeNode.id} Cost:</span>
                    <span className="calc-val-number text-highlight">
                      {activeNode.parentCost} + {activeNode.edgeCost} + {activeNode.reductionSum} = <strong>{activeNode.cost}</strong>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Breakdown Steps List */}
          <div className="arithmetic-breakdown-card">
            <h4>Step-by-Step Numerical Breakdown:</h4>
            <div className="calc-steps-list">
              {isRoot ? (
                <>
                  <div className="calc-step-row">
                    <span className="step-circle">1</span>
                    <div>
                      <strong>Row Reduction Sum (R):</strong>
                      <p>Minimum non-infinite value in each row was subtracted. Total subtracted across all rows = {activeNode.rowMins?.map((m) => (m === Infinity ? 0 : m)).join(' + ')} = <strong>{activeNode.rowSum}</strong>.</p>
                    </div>
                  </div>
                  <div className="calc-step-row">
                    <span className="step-circle">2</span>
                    <div>
                      <strong>Column Reduction Sum (C):</strong>
                      <p>Minimum non-infinite value in each column was subtracted. Total subtracted across all columns = {activeNode.colMins?.map((m) => (m === Infinity ? 0 : m)).join(' + ')} = <strong>{activeNode.colSum}</strong>.</p>
                    </div>
                  </div>
                  <div className="calc-step-row">
                    <span className="step-circle">3</span>
                    <div>
                      <strong>Resulting Root Lower Bound:</strong>
                      <p>Total reduction amount = {activeNode.rowSum} + {activeNode.colSum} = <strong>{activeNode.cost}</strong>. Any valid tour must visit all intersections, so no tour can cost less than <strong>{activeNode.cost}</strong>.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="calc-step-row">
                    <span className="step-circle">1</span>
                    <div>
                      <strong>Parent Node Cost:</strong>
                      <p>Parent Node {activeNode.parentId} cost is <strong>{activeNode.parentCost}</strong>.</p>
                    </div>
                  </div>
                  <div className="calc-step-row">
                    <span className="step-circle">2</span>
                    <div>
                      <strong>Road Cost Between Intersections:</strong>
                      <p>Transit delay from Intersection {activeNode.edge1Based[0]} to Intersection {activeNode.edge1Based[1]} from parent matrix is <strong>{activeNode.edgeCost}</strong>.</p>
                    </div>
                  </div>
                  <div className="calc-step-row">
                    <span className="step-circle">3</span>
                    <div>
                      <strong>Child Reductions:</strong>
                      <p>After crossing out Row {activeNode.edge1Based[0]} and Column {activeNode.edge1Based[1]}, row reduction sum R = <strong>{activeNode.rowSum}</strong>, and column reduction sum C = <strong>{activeNode.colSum}</strong>. Total child reduction = {activeNode.rowSum} + {activeNode.colSum} = <strong>{activeNode.reductionSum}</strong>.</p>
                    </div>
                  </div>
                  <div className="calc-step-row">
                    <span className="step-circle">4</span>
                    <div>
                      <strong>Total Lower Bound for Node {activeNode.id}:</strong>
                      <p>{activeNode.parentCost} + {activeNode.edgeCost} + {activeNode.reductionSum} = <strong>{activeNode.cost}</strong>.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Pruning Decision Box */}
          <div className={`pruning-decision-box ${activeNode.status.toLowerCase()}`}>
            <div className="pruning-title">
              {activeNode.status === 'OPTIMAL'
                ? '⭐ Optimal Tour Found!'
                : activeNode.status === 'PRUNED'
                ? '✂️ Subtree Pruned!'
                : '🟢 Promising Subtree Retained in Priority Queue'}
            </div>
            <p>
              {activeNode.status === 'OPTIMAL'
                ? `This node completes the tour ${activeNode.path.map((v) => v + 1).join(' → ')} → 1 with total cost = ${activeNode.cost}. This is the globally optimal solution!`
                : activeNode.status === 'PRUNED'
                ? `Because this node's cost (${activeNode.cost}) is ≥ the best known tour cost (${activeNode.bestCostAtCreation}), no solution in this subtree can beat our best solution. This entire branch is pruned immediately.`
                : `Node cost (${activeNode.cost}) is strictly less than the current best tour. It is added to the LCBB Priority Queue for further branching.`}
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: MATRIX ZEROING */}
      {activeSubTab === 'zeroing' && isBranch && (
        <div className="calc-tab-pane">
          <div className="table-visual-card">
            <h4>
              Matrix After Setting Row {activeNode.edge1Based[0]} & Col {activeNode.edge1Based[1]} → ∞
            </h4>
            <p className="sub-calc-hint">
              Row {activeNode.edge1Based[0]} is set to ∞ because the tour leaves Intersection {activeNode.edge1Based[0]} only once.<br />
              Column {activeNode.edge1Based[1]} is set to ∞ because the tour enters Intersection {activeNode.edge1Based[1]} only once.<br />
              Cell M[{activeNode.edge1Based[1]}][1] is set to ∞ to prevent an early sub-cycle back to start.
            </p>
            <table className="matrix-display-table small">
              <thead>
                <tr>
                  <th>Node</th>
                  {Array.from({ length: matrixSize }, (_, c) => (
                    <th key={c}>Col {c + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeNode.matrixZeroed?.map((row, r) => (
                  <tr key={r}>
                    <th>Row {r + 1}</th>
                    {row.map((val, c) => {
                      const isZeroed =
                        r === activeNode.edge1Based[0] - 1 ||
                        c === activeNode.edge1Based[1] - 1;
                      return (
                        <td
                          key={c}
                          className={
                            val === Infinity
                              ? isZeroed
                                ? 'zeroed-inf'
                                : 'diag-text'
                              : val === 0
                              ? 'zero-highlight'
                              : ''
                          }
                        >
                          {val === Infinity ? '∞' : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ROW & COLUMN REDUCTIONS */}
      {activeSubTab === 'reductions' && (
        <div className="calc-tab-pane">
          <div className="reduction-flex-layout">
            <div className="table-visual-card">
              <h4>Row Minimums (r_i) Subtracted</h4>
              <table className="matrix-display-table small">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Row Minimum (r_i)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeNode.rowMins?.map((m, idx) => (
                    <tr key={idx}>
                      <td>Row {idx + 1}</td>
                      <td className="highlight-td">{m === Infinity ? '0 (all ∞)' : m}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total Row Reductions (R):</th>
                    <th className="text-highlight">{activeNode.rowSum}</th>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="table-visual-card">
              <h4>Column Minimums (c_j) Subtracted</h4>
              <table className="matrix-display-table small">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Column Minimum (c_j)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeNode.colMins?.map((m, idx) => (
                    <tr key={idx}>
                      <td>Col {idx + 1}</td>
                      <td className="highlight-td">{m === Infinity ? '0 (all ∞)' : m}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total Col Reductions (C):</th>
                    <th className="text-highlight">{activeNode.colSum}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className="reduction-total-summary-card">
            <span>Total Reduction for this node:</span>
            <strong>{activeNode.rowSum} + {activeNode.colSum} = {activeNode.reductionSum}</strong>
          </div>
        </div>
      )}

      {/* TAB 4: CHILD REDUCED MATRIX */}
      {activeSubTab === 'childmat' && (
        <div className="calc-tab-pane">
          <div className="table-visual-card">
            <h4>Final Reduced Matrix for Node {activeNode.id}</h4>
            <p className="sub-calc-hint">
              Every row and column that is not completely ∞ now contains at least one 0 (highlighted in green).
            </p>
            <table className="matrix-display-table small">
              <thead>
                <tr>
                  <th>Node</th>
                  {Array.from({ length: matrixSize }, (_, c) => (
                    <th key={c}>Col {c + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeNode.reducedMatrix?.map((row, r) => (
                  <tr key={r}>
                    <th>Row {r + 1}</th>
                    {row.map((val, c) => (
                      <td
                        key={c}
                        className={
                          val === Infinity
                            ? 'diag-text'
                            : val === 0
                            ? 'zero-highlight'
                            : ''
                        }
                      >
                        {val === Infinity ? '∞' : val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeCalculationDetail;
