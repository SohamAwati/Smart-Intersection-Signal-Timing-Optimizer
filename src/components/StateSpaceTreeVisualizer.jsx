import React, { useMemo } from 'react';

/**
 * State-Space Tree Visualizer (Right Panel)
 * Renders the Branch and Bound tree step-by-step with interactive SVG branch lines,
 * node lower bounds, edge costs, pruning indicators, and step controls.
 */
const StateSpaceTreeVisualizer = ({
  solution,
  currentStepIndex,
  onStepChange,
  isPlaying,
  onTogglePlay,
  selectedNodeId,
  onSelectNode,
}) => {
  const currentStep = solution?.chronologicalSteps?.[currentStepIndex] || null;

  // Filter nodes visible up to this step
  const visibleNodes = useMemo(() => {
    if (!solution?.nodes) return [];
    const visibleIds = currentStep?.visibleNodeIds || [1];
    return solution.nodes.filter((n) => visibleIds.includes(n.id));
  }, [solution, currentStep]);

  // Compute 2D tree coordinates (x, y) for each visible node
  const { nodePositions, treeWidth, treeHeight } = useMemo(() => {
    if (visibleNodes.length === 0) return { nodePositions: {}, treeWidth: 500, treeHeight: 600 };

    // Group by level
    const levels = {};
    visibleNodes.forEach((node) => {
      if (!levels[node.level]) levels[node.level] = [];
      levels[node.level].push(node);
    });

    const maxLevel = Math.max(...Object.keys(levels).map(Number));
    const levelHeight = 120;
    const computedHeight = Math.max(500, (maxLevel + 1) * levelHeight + 80);

    // Find max nodes in any single level to determine width
    const maxNodesInLevel = Math.max(...Object.values(levels).map((l) => l.length));
    const nodeSpacingX = Math.max(140, 600 / Math.max(1, maxNodesInLevel));
    const computedWidth = Math.max(600, maxNodesInLevel * nodeSpacingX + 100);

    const positions = {};

    Object.entries(levels).forEach(([lvlStr, nodesInLevel]) => {
      const lvl = Number(lvlStr);
      const count = nodesInLevel.length;
      const totalWidthForLevel = count * nodeSpacingX;
      const startX = (computedWidth - totalWidthForLevel) / 2 + nodeSpacingX / 2;

      nodesInLevel.forEach((node, idx) => {
        positions[node.id] = {
          x: startX + idx * nodeSpacingX,
          y: 50 + lvl * levelHeight,
        };
      });
    });

    return {
      nodePositions: positions,
      treeWidth: computedWidth,
      treeHeight: computedHeight,
    };
  }, [visibleNodes]);

  const totalSteps = solution?.chronologicalSteps?.length || 1;

  return (
    <div className="tree-visualizer-container">
      {/* Visualizer Top Bar & Playback Controls */}
      <div className="tree-header-controls">
        <div className="tree-title-row">
          <h3>State-Space Tree (LCBB)</h3>
          <span className="step-counter-badge">
            Step {currentStepIndex + 1} / {totalSteps}
          </span>
        </div>

        <div className="playback-button-bar">
          <button
            className="ctrl-btn"
            title="Jump to Start"
            disabled={currentStepIndex === 0}
            onClick={() => onStepChange(0)}
          >
            ⏮
          </button>
          <button
            className="ctrl-btn"
            title="Previous Step"
            disabled={currentStepIndex === 0}
            onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
          >
            ◀ Prev
          </button>
          <button
            className={`ctrl-btn play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause Auto-Play' : 'Auto Play Tree Generation'}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            className="ctrl-btn"
            title="Next Step"
            disabled={currentStepIndex >= totalSteps - 1}
            onClick={() => onStepChange(Math.min(totalSteps - 1, currentStepIndex + 1))}
          >
            Next ▶
          </button>
          <button
            className="ctrl-btn"
            title="Jump to Final Tour"
            disabled={currentStepIndex >= totalSteps - 1}
            onClick={() => onStepChange(totalSteps - 1)}
          >
            ⏭
          </button>
        </div>

        {/* Tree Legend */}
        <div className="tree-legend-row">
          <span className="legend-item"><span className="legend-dot active" /> Active / In Queue</span>
          <span className="legend-item"><span className="legend-dot current" /> Just Created</span>
          <span className="legend-item"><span className="legend-dot pruned" /> Pruned (✂️)</span>
          <span className="legend-item"><span className="legend-dot optimal" /> Optimal Tour (⭐)</span>
        </div>
      </div>

      {/* SVG Canvas for Tree Links and Nodes */}
      <div className="tree-canvas-scrollbox">
        <svg
          width={treeWidth}
          height={treeHeight}
          className="tree-svg"
          viewBox={`0 0 ${treeWidth} ${treeHeight}`}
        >
          <defs>
            <linearGradient id="activeLinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="optimalLinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Connecting Branches (Lines between Parent and Children) */}
          {visibleNodes.map((node) => {
            if (!node.parentId || !nodePositions[node.parentId] || !nodePositions[node.id]) {
              return null;
            }
            const parentPos = nodePositions[node.parentId];
            const childPos = nodePositions[node.id];
            const isPruned = node.status === 'PRUNED';
            const isOptimal = node.status === 'OPTIMAL';
            const isCurrent = currentStep?.nodeId === node.id;

            const midX = (parentPos.x + childPos.x) / 2;
            const midY = (parentPos.y + childPos.y) / 2;

            return (
              <g key={`branch-${node.id}`} className="tree-branch-group">
                <line
                  x1={parentPos.x}
                  y1={parentPos.y + 24}
                  x2={childPos.x}
                  y2={childPos.y - 24}
                  stroke={
                    isOptimal
                      ? 'url(#optimalLinkGrad)'
                      : isPruned
                      ? '#ef4444'
                      : isCurrent
                      ? '#38bdf8'
                      : 'rgba(255, 255, 255, 0.25)'
                  }
                  strokeWidth={isOptimal ? 3.5 : isCurrent ? 3 : isPruned ? 1.5 : 2}
                  strokeDasharray={isPruned ? '4 4' : 'none'}
                  filter={isOptimal || isCurrent ? 'url(#glowEffect)' : undefined}
                />
                {/* Edge Label along branch */}
                {node.edge && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-26"
                      y="-11"
                      width="52"
                      height="20"
                      rx="4"
                      fill="rgba(15, 23, 42, 0.9)"
                      stroke={isPruned ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)'}
                      strokeWidth="1"
                    />
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill={isPruned ? '#f87171' : '#38bdf8'}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node.edge[0] + 1}→{node.edge[1] + 1} (${node.edgeCost})
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 2. Tree Nodes */}
          {visibleNodes.map((node) => {
            const pos = nodePositions[node.id];
            if (!pos) return null;

            const isCurrent = currentStep?.nodeId === node.id;
            const isSelected = selectedNodeId === node.id;
            const isOptimal = node.status === 'OPTIMAL';
            const isPruned = node.status === 'PRUNED';

            const fillColor = isOptimal
              ? '#052e16'
              : isPruned
              ? '#450a0a'
              : isCurrent
              ? '#0c4a6e'
              : '#1e293b';

            const strokeColor = isOptimal
              ? '#22c55e'
              : isPruned
              ? '#ef4444'
              : isCurrent
              ? '#38bdf8'
              : 'rgba(255, 255, 255, 0.3)';

            return (
              <g
                key={`node-${node.id}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                className={`tree-node-group ${isCurrent ? 'current-step-pulse' : ''} ${isSelected ? 'selected-node' : ''}`}
                onClick={() => onSelectNode(node.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Outer Glow / Highlight for active node */}
                {(isCurrent || isSelected) && (
                  <rect
                    x="-42"
                    y="-28"
                    width="84"
                    height="56"
                    rx="12"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    filter="url(#glowEffect)"
                  />
                )}

                {/* Node Body Card */}
                <rect
                  x="-38"
                  y="-24"
                  width="76"
                  height="48"
                  rx="10"
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isOptimal || isCurrent || isSelected ? 2 : 1.2}
                />

                {/* Node ID label */}
                <text
                  textAnchor="middle"
                  y="-8"
                  fill="#f8fafc"
                  fontSize="11"
                  fontWeight="bold"
                >
                  Node {node.id} {isOptimal ? '⭐' : isPruned ? '✂️' : ''}
                </text>

                {/* Lower bound cost c(node) */}
                <text
                  textAnchor="middle"
                  y="6"
                  fill={isOptimal ? '#4ade80' : isPruned ? '#f87171' : '#38bdf8'}
                  fontSize="12"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  ĉ = {node.cost}
                </text>

                {/* Path indicator */}
                <text
                  textAnchor="middle"
                  y="18"
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {node.path.map((v) => v + 1).join('→')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Active Step Prompt / Hint at Bottom */}
      <div className="tree-footer-info">
        <span className="info-icon">💡</span>
        <span className="info-text">
          {currentStep?.title || 'Expanding state-space tree node by node.'} Click any node to inspect its row & column reduction matrices!
        </span>
      </div>
    </div>
  );
};

export default StateSpaceTreeVisualizer;
