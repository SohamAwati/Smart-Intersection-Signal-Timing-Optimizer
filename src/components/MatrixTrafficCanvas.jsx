import React, { useEffect, useRef, useState, useMemo } from 'react';


const MatrixTrafficCanvas = ({
  matrixSize,
  costMatrix,
  bestTour,
  bestCost,
}) => {
  const canvasRef = useRef(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [trafficDensity, setTrafficDensity] = useState(12); // number of civilian cars
  const [selectedIntersection, setSelectedIntersection] = useState(1);
  const [isSimPaused, setIsSimPaused] = useState(false);
  const [activeTourLeg, setActiveTourLeg] = useState(0);

  // Compute 2D coordinates for N intersections on the 700x520 canvas
  const nodePositions = useMemo(() => {
    const coords = [];
    const cx = 350;
    const cy = 250;
    const rx = 240;
    const ry = 170;

    for (let i = 0; i < matrixSize; i++) {
      const angle = (2 * Math.PI * i) / matrixSize - Math.PI / 2;
      coords.push({
        id: i + 1,
        idx: i,
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
      });
    }
    return coords;
  }, [matrixSize]);

  // Optimal tour edges
  const optimalEdges = useMemo(() => {
    if (!bestTour || bestTour.length < 2) return [];
    const edges = [];
    for (let i = 0; i < bestTour.length - 1; i++) {
      edges.push({
        from: bestTour[i] - 1,
        to: bestTour[i + 1] - 1,
        fromId: bestTour[i],
        toId: bestTour[i + 1],
      });
    }
    return edges;
  }, [bestTour]);

  // Run the canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let lastTime = performance.now();

    // Civilian cars moving between intersections
    const cars = [];
    for (let i = 0; i < trafficDensity; i++) {
      const fromIdx = Math.floor(Math.random() * matrixSize);
      let toIdx = (fromIdx + 1 + Math.floor(Math.random() * (matrixSize - 1))) % matrixSize;
      const cost = costMatrix[fromIdx]?.[toIdx] || 10;
      cars.push({
        fromIdx,
        toIdx,
        progress: Math.random(), // 0 to 1
        speed: (0.15 / Math.max(2, cost === Infinity ? 20 : cost)),
        color: ['#38bdf8', '#fbbf24', '#cbd5e1', '#a855f7', '#f43f5e'][i % 5],
      });
    }

    // Transit vehicle along optimal tour
    let tourVehicleProgress = 0;
    let tourLegIndex = 0;

    const render = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (!isSimPaused) {
        // Update civilian cars
        cars.forEach((car) => {
          car.progress += car.speed * dt * speedMultiplier;
          if (car.progress >= 1) {
            car.progress = 0;
            car.fromIdx = car.toIdx;
            car.toIdx = (car.fromIdx + 1 + Math.floor(Math.random() * (matrixSize - 1))) % matrixSize;
            const cost = costMatrix[car.fromIdx]?.[car.toIdx] || 10;
            car.speed = (0.15 / Math.max(2, cost === Infinity ? 20 : cost));
          }
        });

        // Update optimal tour vehicle
        if (optimalEdges.length > 0) {
          const currentEdge = optimalEdges[tourLegIndex];
          const legCost = costMatrix[currentEdge.from]?.[currentEdge.to] || 10;
          const legSpeed = 0.25 / Math.max(1, legCost === Infinity ? 10 : legCost);

          tourVehicleProgress += legSpeed * dt * speedMultiplier;
          if (tourVehicleProgress >= 1) {
            tourVehicleProgress = 0;
            tourLegIndex = (tourLegIndex + 1) % optimalEdges.length;
            setActiveTourLeg(tourLegIndex);
          }
        }
      }

      // Draw background (Clean asphalt map)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid background pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 1. Draw Regular Roads between intersections
      for (let i = 0; i < matrixSize; i++) {
        for (let j = 0; j < matrixSize; j++) {
          if (i === j) continue;
          const cost = costMatrix[i]?.[j];
          if (cost === undefined || cost === Infinity) continue;

          const p1 = nodePositions[i];
          const p2 = nodePositions[j];
          if (!p1 || !p2) continue;

          // Road line
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // Center dashed line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 2. Draw Highlighted Optimal Tour Roads (Green Wave Corridors)
      optimalEdges.forEach((edge, idx) => {
        const p1 = nodePositions[edge.from];
        const p2 = nodePositions[edge.to];
        if (!p1 || !p2) return;

        const isCurrentLeg = idx === tourLegIndex;

        // Glowing outer green band
        ctx.strokeStyle = isCurrentLeg
          ? 'rgba(34, 197, 94, 0.6)'
          : 'rgba(34, 197, 94, 0.35)';
        ctx.lineWidth = isCurrentLeg ? 18 : 16;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Asphalt inner lane
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Green directional dashed lane
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Matrix Cost Tag along road
        const midX = (p1.x * 3 + p2.x * 2) / 5;
        const midY = (p1.y * 3 + p2.y * 2) / 5;
        const cost = costMatrix[edge.from]?.[edge.to];

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(midX - 16, midY - 10, 32, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${cost}s`, midX, midY + 4);
      });

      // 3. Draw Civilian Moving Cars
      cars.forEach((car) => {
        const p1 = nodePositions[car.fromIdx];
        const p2 = nodePositions[car.toIdx];
        if (!p1 || !p2) return;

        const cx = p1.x + (p2.x - p1.x) * car.progress;
        const cy = p1.y + (p2.y - p1.y) * car.progress;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // Car Body
        ctx.fillStyle = car.color;
        ctx.beginPath();
        ctx.roundRect(-6, -4, 12, 8, 2);
        ctx.fill();

        // Headlights
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(4, -3, 2, 2);
        ctx.fillRect(4, 1, 2, 2);

        ctx.restore();
      });

      // 4. Draw Optimal Tour Transit Vehicle (Emergency / Smart Fleet)
      if (optimalEdges.length > 0) {
        const currentEdge = optimalEdges[tourLegIndex];
        const p1 = nodePositions[currentEdge.from];
        const p2 = nodePositions[currentEdge.to];

        if (p1 && p2) {
          const vx = p1.x + (p2.x - p1.x) * tourVehicleProgress;
          const vy = p1.y + (p2.y - p1.y) * tourVehicleProgress;
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

          ctx.save();
          ctx.translate(vx, vy);
          ctx.rotate(angle);

          // Glowing aura
          ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, 2 * Math.PI);
          ctx.fill();

          // Vehicle body
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.roundRect(-10, -6, 20, 12, 3);
          ctx.fill();

          // Windshield
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-2, -5, 6, 10);

          // Flashing siren
          ctx.fillStyle = Math.sin(now / 100) > 0 ? '#38bdf8' : '#f87171';
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, 2 * Math.PI);
          ctx.fill();

          ctx.restore();
        }
      }

      // 5. Draw Intersections (Junctions & Traffic Lights)
      nodePositions.forEach((node) => {
        const isSelected = selectedIntersection === node.id;
        const isApproaching =
          optimalEdges.length > 0 &&
          optimalEdges[tourLegIndex]?.toId === node.id;

        // Junction Circle
        ctx.fillStyle = isSelected ? '#1e3a8a' : '#1e293b';
        ctx.strokeStyle = isSelected
          ? '#38bdf8'
          : isApproaching
          ? '#22c55e'
          : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = isSelected ? 3.5 : 2;

        ctx.beginPath();
        ctx.arc(node.x, node.y, 26, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Traffic Light Status (Green for approaching optimal vehicle, otherwise cyclic)
        const isGreen = isApproaching || Math.sin(now / 1500 + node.id) > 0;
        ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(node.x + 18, node.y - 18, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Intersection ID text
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Int ${node.id}`, node.x, node.y + 4);
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    matrixSize,
    costMatrix,
    nodePositions,
    optimalEdges,
    trafficDensity,
    speedMultiplier,
    isSimPaused,
    selectedIntersection,
  ]);

  // Handle clicking on canvas to select an intersection
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    nodePositions.forEach((node) => {
      const dist = Math.hypot(clickX - node.x, clickY - node.y);
      if (dist <= 30) {
        setSelectedIntersection(node.id);
      }
    });
  };

  const currentTourLegEdge = optimalEdges[activeTourLeg];

  return (
    <div className="matrix-traffic-canvas-card">
      <div className="traffic-canvas-header">
        <div>
          <span className="section-badge green">Traffic System According to Matrix</span>
          <h3>City Traffic Simulation ({matrixSize} Intersections)</h3>
          <p className="table-subtitle" style={{ margin: '4px 0 0 0' }}>
            Intersections and roads modeled directly from your {matrixSize}×{matrixSize} cost matrix with Branch & Bound green wave routing.
          </p>
        </div>

        {/* Live Tour Tracker Chip */}
        {bestTour && bestTour.length > 0 && (
          <div className="optimal-tour-chip">
            <span className="chip-label">Optimal Loop:</span>
            <span className="chip-path">{bestTour.join(' → ')}</span>
            <span className="chip-cost">Total Delay: {bestCost}s</span>
          </div>
        )}
      </div>

      {/* Traffic Control Bar */}
      <div className="traffic-controls-bar">
        <div className="ctrl-group">
          <label>Simulation Speed:</label>
          <div className="btn-segmented">
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                className={`segment-btn ${speedMultiplier === s ? 'active' : ''}`}
                onClick={() => setSpeedMultiplier(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="ctrl-group">
          <label>Traffic Density ({trafficDensity} vehicles):</label>
          <input
            type="range"
            min="4"
            max="24"
            value={trafficDensity}
            onChange={(e) => setTrafficDensity(parseInt(e.target.value, 10))}
            className="density-slider"
          />
        </div>

        <button
          className={`pause-btn ${isSimPaused ? 'paused' : ''}`}
          onClick={() => setIsSimPaused(!isSimPaused)}
        >
          {isSimPaused ? '▶ Resume Traffic' : '⏸ Pause Traffic'}
        </button>
      </div>

      {/* Canvas Element */}
      <div className="canvas-wrapper-box">
        <canvas
          ref={canvasRef}
          width={700}
          height={500}
          onClick={handleCanvasClick}
          className="matrix-traffic-canvas"
          title="Click any intersection to inspect connections"
        />

        {/* Floating Active Tour Leg Status */}
        {currentTourLegEdge && (
          <div className="canvas-tour-status-overlay">
            <span className="status-dot-pulse" />
            <span>
              Transit Unit Traveling: <strong>Int {currentTourLegEdge.fromId} → Int {currentTourLegEdge.toId}</strong> (Delay: {costMatrix[currentTourLegEdge.from]?.[currentTourLegEdge.to]}s)
            </span>
          </div>
        )}
      </div>

      {/* Selected Intersection Connections Table (Directly from Matrix) */}
      <div className="intersection-matrix-details-bar">
        <h4>
          Intersection {selectedIntersection} Connected Roads & Matrix Delays:
        </h4>
        <div className="inter-connections-grid">
          {Array.from({ length: matrixSize }, (_, target) => {
            if (target === selectedIntersection - 1) return null;
            const cost = costMatrix[selectedIntersection - 1]?.[target];
            const isTourRoad = optimalEdges.some(
              (e) => e.from === selectedIntersection - 1 && e.to === target
            );

            return (
              <div
                key={target}
                className={`inter-conn-card ${isTourRoad ? 'is-tour' : ''}`}
              >
                <span className="conn-route">
                  Int {selectedIntersection} → Int {target + 1}
                </span>
                <span className="conn-cost">
                  {cost === Infinity ? '∞ (No Road)' : `${cost}s Delay`}
                </span>
                {isTourRoad && <span className="tour-badge-mini">Optimal Route</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MatrixTrafficCanvas;
