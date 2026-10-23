'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid configurations
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#eef2ff', // Warm slate/lavender
    primaryTextColor: '#3730a3',
    lineColor: '#FF6600', // Accent orange
    signalColor: '#FF6600',
    signalTextColor: '#c2410c',
    actorBkg: '#fff7ed',
    actorBorder: '#f97316',
    actorTextColor: '#c2410c',
    noteBkgColor: '#fffbeb',
    noteBorderColor: '#f59e0b',
  },
  securityLevel: 'loose',
});

interface MermaidProps {
  chart?: string;
}

export function Mermaid(props: MermaidProps) {
  const { chart } = props;
  console.log('Mermaid component props:', props);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const renderChart = async () => {
      if (!containerRef.current) return;
      if (!chart) {
        console.warn('Mermaid component: chart is undefined or empty', props);
        return;
      }

      const uniqueId = `mermaid-${Math.floor(Math.random() * 1000000)}`;
      try {
        setError(null);
        // Clear previous content
        containerRef.current.innerHTML = '';
        
        // Parse and render the diagram
        const cleanChart = chart.trim();
        const { svg } = await mermaid.render(uniqueId, cleanChart);
        
        if (active) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        console.error('Mermaid Render Error:', err);
        if (active) {
          setError('Failed to render flow diagram.');
        }
        // Remove bad elements that mermaid might have appended to document body
        const badEl = document.getElementById(uniqueId);
        if (badEl) badEl.remove();
        const bindEl = document.getElementById(`d${uniqueId}`);
        if (bindEl) bindEl.remove();
      }
    };

    renderChart();

    return () => {
      active = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl my-4 text-xs font-mono">
        <p className="font-bold">Diagram Render Error:</p>
        <pre className="mt-1 white-space-pre-wrap">{chart}</pre>
      </div>
    );
  }

  return (
    <div className="relative group my-6">
      {/* Label Badge */}
      <div 
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          fontSize: '9px',
          color: '#FF6600',
          fontWeight: 700,
          letterSpacing: '0.08em',
          zIndex: 1,
        }} 
        className="mono animate-pulse-edge"
      >
        SYSTEM SEQUENCE DIAGRAM
      </div>

      <div
        ref={containerRef}
        style={{
          background: '#FAF9F5', // Warm paper color
          border: '2px solid var(--border)',
          borderRadius: '12px',
          padding: '48px 24px 24px 24px', // extra top padding for label
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflowX: 'auto',
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}
