import React, { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { solveMatrixBranchAndBound, PRESETS, cloneMatrix } from './matrixBnB';
import StateSpaceTreeVisualizer from './components/StateSpaceTreeVisualizer';
import NodeCalculationDetail from './components/NodeCalculationDetail';
import MatrixTrafficCanvas from './components/MatrixTrafficCanvas';

function App() {
  // 1. Cost Matrix State
  const [matrixSize, setMatrixSize] = useState(4);
  const [costMatrix, setCostMatrix] = useState(() => cloneMatrix(PRESETS.textbook4.matrix));

  // 2. Sequential Step-by-Step Tree Generation State
  const [currentStepIndex, setCurrentStepIndex] = useState(3); // Start with Root Node created
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const playTimerRef = useRef(null);

  // Solve Matrix Reduction Branch & Bound
  const matrixSolution = useMemo(() => {
    try {
      return solveMatrixBranchAndBound(costMatrix);
    } catch (err) {
      console.error('Error solving matrix BnB:', err);
      return null;
    }
  }, [costMatrix]);

  // Handle Play / Pause for building tree node-by-node
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          const total = matrixSolution?.chronologicalSteps?.length || 1;
          if (prev >= total - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1400);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, matrixSolution]);

  // Handle Changing Matrix Dimension
  const handleSizeChange = (newSize) => {
    const size = Math.max(3, Math.min(6, parseInt(newSize, 10) || 3));
    setMatrixSize(size);
    setIsPlaying(false);

    const newMat = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => {
        if (r === c) return Infinity;
        if (costMatrix[r] && costMatrix[r][c] !== undefined && costMatrix[r][c] !== Infinity) {
          return costMatrix[r][c];
        }
        return (r + 1) * 4 + (c + 1) * 3;
      })
    );
    setCostMatrix(newMat);
    setCurrentStepIndex(3);
    setSelectedNodeId(null);
  };

  // Handle Changing Cell Value
  const handleCellChange = (r, c, val) => {
    if (r === c) return;
    const newMat = cloneMatrix(costMatrix);
    if (val === '' || val.toLowerCase() === 'inf' || val === '∞' || val === '-') {
      newMat[r][c] = Infinity;
    } else {
      const num = parseInt(val, 10);
      newMat[r][c] = isNaN(num) || num < 0 ? Infinity : num;
    }
    setCostMatrix(newMat);
    setCurrentStepIndex(3);
    setSelectedNodeId(null);
    setIsPlaying(false);
  };

  // Load Preset
  const handleLoadPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setMatrixSize(preset.size);
      setCostMatrix(cloneMatrix(preset.matrix));
      setCurrentStepIndex(3);
      setSelectedNodeId(null);
      setIsPlaying(false);
    }
  };

  // Randomize Matrix
  const handleRandomize = () => {
    const newMat = Array.from({ length: matrixSize }, (_, r) =>
      Array.from({ length: matrixSize }, (_, c) => {
        if (r === c) return Infinity;
        return Math.floor(Math.random() * 25) + 3;
      })
    );
    setCostMatrix(newMat);
    setCurrentStepIndex(3);
    setSelectedNodeId(null);
    setIsPlaying(false);
  };

  const currentStep = matrixSolution?.chronologicalSteps?.[currentStepIndex] || null;

  return (
    <div className="app-container full-width-app">
      {/* HEADER */}
      <header className="main-app-header">
        <h1>Smart Intersection Signal Timing Optimizer</h1>
        <p className="header-subtitle">
          Cost Matrix Reduction &amp; Sequential State-Space Tree Generation with <strong>Traffic Simulation Driven by the Matrix</strong>
        </p>
      </header>

      {/* SPLIT-SCREEN WORKSPACE: LEFT (Matrix, Steps, Traffic) vs RIGHT (Tree) */}
      <div className="split-screen-layout">
        {/* =========================================================
            LEFT SIDE COLUMN:
            1. The Matrix Thing (Inputs & Root Reductions)
            2. Each Step of Each Node in Detail
            3. Visual Representation of Traffic System (According to Matrix)
            ========================================================= */}
        <div className="left-content-column">
          {/* SECTION 1: THE MATRIX THING */}
          <div className="matrix-solver-card">
            <div className="matrix-solver-header">
              <div>
                <span className="section-badge">1. Cost Matrix Input</span>
                <h2>Transit Cost Matrix Reduction</h2>
                <p className="table-subtitle" style={{ margin: '4px 0 0 0' }}>
                  Transit travel delays between {matrixSize} city intersections. Enter size and cell costs directly.
                </p>
              </div>
              <div className="preset-buttons-group">
                <button className="preset-btn" onClick={() => handleLoadPreset('textbook4')}>
                  4×4 Textbook
                </button>
                <button className="preset-btn" onClick={() => handleLoadPreset('textbook5')}>
                  5×5 Benchmark
                </button>
                <button className="preset-btn" onClick={() => handleLoadPreset('cityRoute3')}>
                  3×3 Grid
                </button>
                <button className="preset-btn secondary" onClick={handleRandomize}>
                  Randomize
                </button>
              </div>
            </div>

            {/* Matrix Size & Grid Input */}
            <div className="matrix-input-container">
              <div className="matrix-size-control">
                <label>
                  <strong>Matrix Size (N × N):</strong>
                </label>
                <div className="size-selector-buttons">
                  {[3, 4, 5, 6].map((s) => (
                    <button
                      key={s}
                      className={`size-btn ${matrixSize === s ? 'active' : ''}`}
                      onClick={() => handleSizeChange(s)}
                    >
                      {s} × {s}
                    </button>
                  ))}
                </div>
                <span className="size-hint">Directly edit cell delays in seconds (∞ on diagonal):</span>
              </div>

              <div className="matrix-table-wrapper">
                <table className="matrix-grid-table">
                  <thead>
                    <tr>
                      <th className="corner-th">From \ To</th>
                      {Array.from({ length: matrixSize }, (_, c) => (
                        <th key={c}>Node {c + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: matrixSize }, (_, r) => (
                      <tr key={r}>
                        <th className="row-header">Node {r + 1}</th>
                        {Array.from({ length: matrixSize }, (_, c) => {
                          const isDiag = r === c;
                          const val = costMatrix[r] ? costMatrix[r][c] : Infinity;
                          return (
                            <td key={c} className={`matrix-cell-td ${isDiag ? 'diagonal-cell' : ''}`}>
                              {isDiag ? (
                                <span className="diag-symbol">∞</span>
                              ) : (
                                <input
                                  type="text"
                                  value={val === Infinity ? '∞' : val}
                                  onChange={(e) => handleCellChange(r, c, e.target.value)}
                                  className="matrix-cell-input"
                                  title={`Cost from Node ${r + 1} to Node ${c + 1}`}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Initial Row & Column Reduction Stat Pills */}
              {matrixSolution?.rootReduction && (
                <div className="root-reduction-summary-bar">
                  <div className="reduction-pill">
                    <span>Row Reduction Sum (R):</span>
                    <strong>{matrixSolution.rootReduction.rowSum}</strong>
                  </div>
                  <div className="reduction-pill">
                    <span>Column Reduction Sum (C):</span>
                    <strong>{matrixSolution.rootReduction.colSum}</strong>
                  </div>
                  <div className="reduction-pill highlight">
                    <span>Root Lower Bound (Node 1):</span>
                    <strong>LB = {matrixSolution.rootBound}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: EACH STEP OF EACH NODE IN DETAIL */}
          <div className="node-detail-section-wrapper">
            <NodeCalculationDetail
              currentStep={currentStep}
              selectedNodeId={selectedNodeId}
              onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
              matrixSize={matrixSize}
              solution={matrixSolution}
            />
          </div>

          {/* SECTION 3: VISUAL REPRESENTATION OF THE TRAFFIC THING ACCORDING TO MATRIX */}
          <div className="traffic-system-section-wrapper">
            <MatrixTrafficCanvas
              matrixSize={matrixSize}
              costMatrix={costMatrix}
              bestTour={matrixSolution?.bestTour}
              bestCost={matrixSolution?.bestCost}
            />
          </div>
        </div>

        {/* =========================================================
            RIGHT SIDE COLUMN:
            State-Space Tree (Created One by One After Each Step)
            ========================================================= */}
        <div className="right-tree-column">
          <div className="sticky-tree-wrapper">
            <StateSpaceTreeVisualizer
              solution={matrixSolution}
              currentStepIndex={currentStepIndex}
              onStepChange={(newIndex) => {
                setCurrentStepIndex(newIndex);
                setSelectedNodeId(null);
              }}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((prev) => !prev)}
              selectedNodeId={selectedNodeId}
              onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
