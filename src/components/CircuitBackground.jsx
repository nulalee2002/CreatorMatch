import { useEffect, useRef } from 'react';

export function CircuitBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;
    let width = 0;
    let height = 0;
    let nodes = [];
    let traces = [];
    const GRID = 60;
    const COLORS = ['#d4a941', '#77CFE2'];

    function regenerateNodes() {
      nodes = [];
      traces = [];
      for (let x = 0; x <= width + GRID; x += GRID) {
        for (let y = 0; y <= height + GRID; y += GRID) {
          if (Math.random() > 0.6) {
            nodes.push({
              x, y,
              pulse: Math.random() * Math.PI * 2,
              pulseSpeed: 0.01 + Math.random() * 0.02,
              color: COLORS[Math.floor(Math.random() * COLORS.length)],
              size: 1.5 + Math.random() * 2,
            });
          }
        }
      }
      nodes.forEach((node, i) => {
        nodes.forEach((other, j) => {
          if (i >= j) return;
          const dx = Math.abs(node.x - other.x);
          const dy = Math.abs(node.y - other.y);
          if ((dx === GRID && dy === 0) || (dx === 0 && dy === GRID)) {
            if (Math.random() > 0.4) {
              traces.push({
                x1: node.x, y1: node.y,
                x2: other.x, y2: other.y,
                color: node.color,
                progress: Math.random(),
                speed: 0.002 + Math.random() * 0.003,
                active: Math.random() > 0.5,
              });
            }
          }
        });
      });
    }

    function resize() {
      width = document.documentElement.clientWidth || window.innerWidth;
      height = document.documentElement.clientHeight || window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      regenerateNodes();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      traces.forEach(trace => {
        if (!trace.active) return;
        ctx.beginPath();
        ctx.moveTo(trace.x1, trace.y1);
        ctx.lineTo(trace.x2, trace.y2);
        ctx.strokeStyle = trace.color + '18';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        trace.progress += trace.speed;
        if (trace.progress > 1) {
          trace.progress = 0;
          trace.active = Math.random() > 0.3;
        }
        const px = trace.x1 + (trace.x2 - trace.x1) * trace.progress;
        const py = trace.y1 + (trace.y2 - trace.y1) * trace.progress;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = trace.color + 'AA';
        ctx.fill();
      });
      traces.forEach(trace => {
        if (!trace.active && Math.random() > 0.998) {
          trace.active = true;
          trace.progress = 0;
        }
      });
      nodes.forEach(node => {
        node.pulse += node.pulseSpeed;
        const alpha = 0.3 + Math.sin(node.pulse) * 0.2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = node.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });
      animationId = requestAnimationFrame(draw);
    }

    // Use setTimeout to ensure DOM is fully laid out
    // before reading viewport dimensions
    const initTimer = setTimeout(() => {
      resize();
      draw();
    }, 100);

    window.addEventListener('resize', resize);

    return () => {
      clearTimeout(initTimer);
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.45,
        display: 'block',
      }}
    />
  );
}
