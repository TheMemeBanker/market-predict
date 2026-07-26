import { useRef, useEffect, useState } from 'react';
import { usePrediction } from '../../context/PredictionContext';

export const PriceChart = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [animatedPoints, setAnimatedPoints] = useState([]);
  const lastPointRef = useRef(null);

  const { priceHistory, lockPrice, roundStatus, timeRemaining, startPrice } = usePrediction();

  // Stock-like line with sharp edges on big moves, smoother on small moves
  const drawStockLine = (ctx, points) => {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      // Calculate the vertical change (price movement)
      const yChange = Math.abs(p2.y - p1.y);
      const xChange = p2.x - p1.x;

      // Threshold for sharp vs smooth - bigger moves get sharp edges
      const sharpThreshold = 8; // pixels

      if (yChange > sharpThreshold) {
        // Sharp/angular movement for significant price changes
        // Draw a slight step pattern for more realistic stock movement
        const midX = p1.x + xChange * 0.6;
        ctx.lineTo(midX, p1.y);
        ctx.lineTo(p2.x, p2.y);
      } else if (yChange > 3) {
        // Medium movement - slight curve
        const tension = 0.15;
        const p0 = points[Math.max(0, i - 1)];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      } else {
        // Small movement - straight line (most common in real charts)
        ctx.lineTo(p2.x, p2.y);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceHistory.length < 2) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 70, bottom: 40, left: 20 };

    // Animation frame
    let pulsePhase = 0;
    let glowIntensity = 0;

    const animate = () => {
      pulsePhase += 0.08;
      glowIntensity = 0.5 + Math.sin(pulsePhase) * 0.3;

      // Clear canvas with slight trail effect for smoothness
      ctx.fillStyle = 'rgba(10, 14, 23, 1)';
      ctx.fillRect(0, 0, width, height);

      // Calculate price range with some padding
      const prices = priceHistory.map(p => p.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = (maxPrice - minPrice) || 0.01;
      const paddedMin = minPrice - priceRange * 0.1;
      const paddedMax = maxPrice + priceRange * 0.1;
      const paddedRange = paddedMax - paddedMin;

      // Chart dimensions
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      // Draw subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;

      // Horizontal grid lines
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        // Price labels
        const price = paddedMax - (paddedRange / 5) * i;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`$${price.toFixed(2)}`, width - padding.right + 8, y + 4);
      }

      // Vertical grid lines (time-based)
      for (let i = 0; i <= 6; i++) {
        const x = padding.left + (chartWidth / 6) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
      }

      // Draw starting price baseline - THE KEY REFERENCE LINE
      // Show during ENTIRE round (active, locked, settled) - not just active
      if (startPrice && (roundStatus === 'active' || roundStatus === 'locked' || roundStatus === 'settled')) {
        const startY = padding.top + ((paddedMax - startPrice) / paddedRange) * chartHeight;

        if (startY >= padding.top && startY <= height - padding.bottom) {
          // Zone shading - subtle background colors
          // ROCKET zone (above the line) - green tint
          const rocketGradient = ctx.createLinearGradient(0, padding.top, 0, startY);
          rocketGradient.addColorStop(0, 'rgba(57, 255, 20, 0.08)');
          rocketGradient.addColorStop(1, 'rgba(57, 255, 20, 0.02)');
          ctx.fillStyle = rocketGradient;
          ctx.fillRect(padding.left, padding.top, chartWidth, startY - padding.top);

          // REKT zone (below the line) - red tint
          const rektGradient = ctx.createLinearGradient(0, startY, 0, height - padding.bottom);
          rektGradient.addColorStop(0, 'rgba(255, 49, 49, 0.02)');
          rektGradient.addColorStop(1, 'rgba(255, 49, 49, 0.08)');
          ctx.fillStyle = rektGradient;
          ctx.fillRect(padding.left, startY, chartWidth, height - padding.bottom - startY);

          // Main horizontal dotted baseline - PROMINENT
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(padding.left, startY);
          ctx.lineTo(width - padding.right, startY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Start price label on RIGHT side
          const startPriceLabel = `$${startPrice.toFixed(2)}`;
          ctx.font = 'bold 11px monospace';
          const labelWidth = ctx.measureText(startPriceLabel).width + 12;

          // Background for start price label
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.roundRect(width - padding.right + 4, startY - 10, labelWidth, 20, 3);
          ctx.fill();

          // Start price text
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.fillText(startPriceLabel, width - padding.right + 10, startY + 4);

          // "ENTRY" label on left side
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('ROUND START', padding.left + 8, startY - 10);

          // Zone labels - ROCKET above, REKT below
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'right';

          // ROCKET label (above line)
          ctx.fillStyle = 'rgba(57, 255, 20, 0.4)';
          ctx.fillText('🚀 ROCKET ZONE', width - padding.right - 8, startY - 25);

          // REKT label (below line)
          ctx.fillStyle = 'rgba(255, 49, 49, 0.4)';
          ctx.fillText('💀 REKT ZONE', width - padding.right - 8, startY + 35);

          // Current change percentage - prominent display
          const currentPrice = priceHistory[priceHistory.length - 1]?.price;
          if (currentPrice) {
            const changePercent = ((currentPrice - startPrice) / startPrice) * 100;
            const isAbove = currentPrice >= startPrice;

            // Change badge on left
            const changeText = `${isAbove ? '+' : ''}${changePercent.toFixed(3)}%`;
            ctx.font = 'bold 14px monospace';
            const changeWidth = ctx.measureText(changeText).width + 16;

            // Badge background
            ctx.fillStyle = isAbove ? 'rgba(57, 255, 20, 0.2)' : 'rgba(255, 49, 49, 0.2)';
            ctx.beginPath();
            ctx.roundRect(padding.left + 8, startY + 6, changeWidth, 24, 4);
            ctx.fill();
            ctx.strokeStyle = isAbove ? 'rgba(57, 255, 20, 0.5)' : 'rgba(255, 49, 49, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Change text
            ctx.fillStyle = isAbove ? '#39ff14' : '#ff3131';
            ctx.textAlign = 'left';
            ctx.fillText(changeText, padding.left + 16, startY + 23);
          }
        }
      }

      // Draw lock price line if locked
      if (roundStatus === 'locked' && lockPrice) {
        const lockY = padding.top + ((paddedMax - lockPrice) / paddedRange) * chartHeight;

        // Glowing lock line
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, lockY);
        ctx.lineTo(width - padding.right, lockY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`LOCK: $${lockPrice.toFixed(2)}`, padding.left + 8, lockY - 8);
      }

      // Calculate smooth point positions
      const points = priceHistory.map((p, i) => ({
        x: padding.left + (i / (priceHistory.length - 1)) * chartWidth,
        y: padding.top + ((paddedMax - p.price) / paddedRange) * chartHeight,
        price: p.price,
      }));

      // Determine trend - ALWAYS compare to startPrice during active rounds
      const lastPrice = priceHistory[priceHistory.length - 1]?.price;
      const referencePrice = (roundStatus === 'active' && startPrice) ? startPrice : priceHistory[0]?.price;
      const isUp = lastPrice >= referencePrice;

      // Line color based on whether we're above or below the round's start price
      const lineColor = isUp ? '#39ff14' : '#ff3131';
      const glowColor = isUp ? 'rgba(57, 255, 20,' : 'rgba(255, 49, 49,';

      // Draw gradient fill under line
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, `${glowColor}0.25)`);
      gradient.addColorStop(0.5, `${glowColor}0.08)`);
      gradient.addColorStop(1, `${glowColor}0)`);

      ctx.beginPath();
      ctx.moveTo(points[0].x, height - padding.bottom);
      drawStockLine(ctx, points);
      ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw main price line with glow
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 12 * glowIntensity;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'bevel'; // Sharper joins for stock-like appearance
      drawStockLine(ctx, points);
      ctx.stroke();

      // Second pass for brighter core
      ctx.shadowBlur = 4;
      ctx.lineWidth = 1.5;
      drawStockLine(ctx, points);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Current price indicator (pulsing dot)
      const lastPoint = points[points.length - 1];
      const pulseSize = 12 + Math.sin(pulsePhase * 2) * 4;

      // Outer pulse ring
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, pulseSize + 8, 0, Math.PI * 2);
      ctx.fillStyle = `${glowColor}${0.1 * glowIntensity})`;
      ctx.fill();

      // Middle glow
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, pulseSize, 0, Math.PI * 2);
      const pulseGradient = ctx.createRadialGradient(
        lastPoint.x, lastPoint.y, 0,
        lastPoint.x, lastPoint.y, pulseSize
      );
      pulseGradient.addColorStop(0, `${glowColor}0.8)`);
      pulseGradient.addColorStop(0.5, `${glowColor}0.3)`);
      pulseGradient.addColorStop(1, `${glowColor}0)`);
      ctx.fillStyle = pulseGradient;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Price tag at current position
      const priceTag = `$${lastPrice.toFixed(2)}`;
      ctx.font = 'bold 13px monospace';
      const tagWidth = ctx.measureText(priceTag).width + 16;
      const tagX = Math.min(lastPoint.x + 15, width - padding.right - tagWidth - 5);
      const tagY = lastPoint.y - 20;

      // Tag background
      ctx.fillStyle = isUp ? 'rgba(57, 255, 20, 0.9)' : 'rgba(255, 49, 49, 0.9)';
      ctx.beginPath();
      ctx.roundRect(tagX, tagY - 10, tagWidth, 22, 4);
      ctx.fill();

      // Tag text
      ctx.fillStyle = isUp ? '#000000' : '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(priceTag, tagX + 8, tagY + 5);

      // DRAMATIC LOCK LINE - starts at 30 seconds, builds intensity
      if (timeRemaining <= 30 && timeRemaining >= 0 && roundStatus === 'active') {
        // Calculate intensity based on time remaining (more intense as we approach 0)
        const urgency = 1 - (timeRemaining / 30); // 0 at 30s, 1 at 0s
        const isUrgent = timeRemaining <= 10;
        const isCritical = timeRemaining <= 5;

        // The lock line position - sweeps in from right edge
        // At 30s: at right edge of chart
        // At 0s: at the current price position
        const lockLineX = width - padding.right - (urgency * (width - padding.right - lastPoint.x - 20));

        // Danger zone shading - grows more intense
        const dangerOpacity = Math.min(0.3, urgency * 0.3);
        const dangerGradient = ctx.createLinearGradient(lockLineX, 0, width - padding.right, 0);
        dangerGradient.addColorStop(0, `rgba(255, 49, 49, ${dangerOpacity})`);
        dangerGradient.addColorStop(1, 'rgba(255, 49, 49, 0)');
        ctx.fillStyle = dangerGradient;
        ctx.fillRect(lockLineX, padding.top, width - padding.right - lockLineX, chartHeight);

        // Pulsing glow intensity
        const pulseSpeed = isCritical ? 8 : (isUrgent ? 4 : 2);
        const glowPulse = 0.5 + Math.sin(pulsePhase * pulseSpeed) * 0.5;

        // Main LOCK line - vertical sweeping line
        const lineGlow = isCritical ? 30 : (isUrgent ? 20 : 10);
        ctx.shadowColor = '#ff3131';
        ctx.shadowBlur = lineGlow * glowPulse;

        // Line color intensifies
        const lineAlpha = 0.4 + urgency * 0.6;
        ctx.strokeStyle = `rgba(255, 49, 49, ${lineAlpha})`;
        ctx.lineWidth = isCritical ? 4 : (isUrgent ? 3 : 2);

        ctx.beginPath();
        ctx.moveTo(lockLineX, padding.top);
        ctx.lineTo(lockLineX, height - padding.bottom);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // "LOCK" label at top - gets bigger and more dramatic
        const labelSize = isCritical ? 18 : (isUrgent ? 16 : 12);
        ctx.fillStyle = isCritical ? '#ff3131' : `rgba(255, 49, 49, ${0.5 + urgency * 0.5})`;
        ctx.font = `bold ${labelSize}px sans-serif`;
        ctx.textAlign = 'center';

        const lockLabel = isCritical ? '⚡ LOCKING ⚡' : (isUrgent ? '🔒 LOCKING' : 'LOCK');
        ctx.fillText(lockLabel, lockLineX, padding.top - 10);

        // Countdown timer on the line - BIG and dramatic in final seconds
        if (isUrgent) {
          const countdownSize = isCritical ? 48 : 32;
          ctx.font = `bold ${countdownSize}px monospace`;
          ctx.fillStyle = '#ff3131';

          // Pulsing effect for countdown
          const countdownScale = 1 + (isCritical ? Math.sin(pulsePhase * 10) * 0.1 : 0);
          ctx.save();
          ctx.translate(lockLineX, height / 2);
          ctx.scale(countdownScale, countdownScale);

          const displayTime = timeRemaining <= 0 ? '0' : Math.ceil(timeRemaining).toString();
          ctx.fillText(displayTime, 0, 0);
          ctx.restore();

          // "PRICE LOCKS IN" text
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = 'rgba(255, 49, 49, 0.8)';
          ctx.fillText('PRICE LOCKS IN', lockLineX, height / 2 + 35);
        }

        // Warning stripes at very end (last 3 seconds)
        if (timeRemaining <= 3) {
          const stripeCount = 8;
          const stripeWidth = 6;
          const stripeGap = 12;

          for (let i = 0; i < stripeCount; i++) {
            const stripeX = lockLineX - (i * stripeGap) - 10;
            if (stripeX > padding.left) {
              ctx.fillStyle = `rgba(255, 49, 49, ${0.3 - i * 0.03})`;
              ctx.fillRect(stripeX, padding.top, stripeWidth, chartHeight);
            }
          }
        }

        // Animated particles flying toward lock line in final 10 seconds
        if (isUrgent) {
          const particleCount = isCritical ? 8 : 4;
          for (let i = 0; i < particleCount; i++) {
            const particleProgress = ((pulsePhase * 2 + i * 0.5) % 1);
            const particleX = lastPoint.x + (lockLineX - lastPoint.x) * particleProgress;
            const particleY = padding.top + (chartHeight * 0.2) + (chartHeight * 0.6) * (i / particleCount);
            const particleSize = 3 + Math.sin(pulsePhase * 4 + i) * 2;

            ctx.beginPath();
            ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 49, 49, ${0.8 - particleProgress * 0.6})`;
            ctx.fill();
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [priceHistory, lockPrice, roundStatus, timeRemaining, startPrice]);

  return (
    <div className="glass-card rounded-xl md:rounded-2xl p-2 md:p-3 border border-white/10 h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 md:gap-3">
          <img
            src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
            alt="SOL"
            className="w-5 h-5 md:w-6 md:h-6 rounded-full"
          />
          <div>
            <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider">
              <span className="text-[#39ff14]">$SOL</span>
              <span className="text-gray-400">/</span>
              <span>USD</span>
            </h3>
            <p className="text-[8px] md:text-[9px] text-gray-500 uppercase tracking-wider">Pyth Oracle</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg bg-white/5 border border-white/10">
          <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39ff14] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-[#39ff14]"></span>
          </span>
          <span className="text-[9px] md:text-[10px] text-gray-400 font-semibold">LIVE</span>
        </div>
      </div>
      <div className="relative" style={{ height: 'calc(100% - 32px)' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
        {priceHistory.length < 2 && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e17]">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-[#39ff14] border-t-transparent rounded-full"></div>
              <span className="text-gray-500 font-semibold">Loading price data...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
