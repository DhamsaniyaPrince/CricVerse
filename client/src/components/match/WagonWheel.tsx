'use client';

import React from 'react';
import { WagonWheelPoint } from '@/store/slices/matchSlice';

interface WagonWheelProps {
  points: WagonWheelPoint[];
  selectedPlayerId?: string;
}

export default function WagonWheel({ points, selectedPlayerId }: WagonWheelProps) {
  // Filter points if selectedPlayerId is set
  const activePoints = selectedPlayerId 
    ? points.filter(p => p.playerId === selectedPlayerId)
    : points;

  // Convert polar coordinates (angle in degrees, distance 0-100) to Cartesian (x, y inside a 200x200 field)
  const getCoordinates = (angle: number, distance: number) => {
    // 0 degrees is straight down the ground (north on the map, which is negative Y in SVG)
    // Subtracting 90 degrees to align 0 with the top (north)
    const angleRad = ((angle - 90) * Math.PI) / 180;
    
    // Scale distance to fit inside the 80px radius (field radius is 90px)
    const radius = (distance / 100) * 80;
    
    const x = 100 + radius * Math.cos(angleRad);
    const y = 100 + radius * Math.sin(angleRad);
    
    return { x, y };
  };

  const getStrokeColor = (runs: number) => {
    if (runs === 4) return '#66fcf1'; // Teal for 4s
    if (runs === 6) return '#ff007f'; // Magenta for 6s
    if (runs === 0) return '#4b5563'; // Gray for dots
    return '#39ff14'; // Neon Green for singles/doubles/triples
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-[#1f2833]/25 border border-[#66fcf1]/10 rounded-2xl">
      <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-4">Live Wagon Wheel</h4>
      
      <div className="relative w-64 h-64 md:w-72 md:h-72">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Outer Boundary Circle */}
          <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(102, 252, 241, 0.15)" strokeWidth="2" />
          {/* Inner Circle (30-yard circle) */}
          <circle cx="100" cy="100" r="50" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          
          {/* Pitch rectangle in the center */}
          <rect x="96" y="80" width="8" height="40" fill="rgba(255, 255, 255, 0.1)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.5" />
          
          {/* Field sectors lines */}
          <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
          <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />

          {/* Render hitting shots paths */}
          {activePoints.map((point, index) => {
            const { x, y } = getCoordinates(point.angle, point.distance);
            const color = getStrokeColor(point.runs);
            
            return (
              <g key={index}>
                {/* Hit Line from pitch center (100, 100) to boundary coordinates */}
                <line
                  x1="100"
                  y1="100"
                  x2={x}
                  y2={y}
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.8}
                  className="animate-pulse"
                />
                {/* Shot endpoint marker */}
                <circle
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill={color}
                  stroke="#0b0c10"
                  strokeWidth={0.7}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Score color legend */}
      <div className="flex items-center space-x-4 mt-4 text-[10px] font-bold tracking-wider">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4b5563]"></span>
          <span className="text-gray-400">0s</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#39ff14]"></span>
          <span className="text-gray-400">1-3 runs</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#66fcf1]"></span>
          <span className="text-[#66fcf1]">4s</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff007f]"></span>
          <span className="text-[#ff007f]">6s</span>
        </div>
      </div>
    </div>
  );
}
