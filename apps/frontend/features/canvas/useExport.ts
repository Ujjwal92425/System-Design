/**
 * apps/frontend/features/canvas/useExport.ts
 *
 * Hook for exporting the canvas diagram as PNG, SVG, or JSON.
 * Uses the HTML canvas API to rasterize the diagram node layout
 * into a downloadable image file.
 *
 * CHANGE: Implemented from stub — full export with PNG/SVG/JSON
 *          support and auto-download.
 */

'use client';

import { useCallback, useRef } from 'react';
import { useCanvasStore, type CanvasNode, type CanvasEdge } from './useCanvasStore';

type ExportFormat = 'png' | 'svg' | 'json';

interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeMetrics?: boolean;
}

export function useExport() {
  const { nodes, edges } = useCanvasStore();
  const svgRef = useRef<SVGSVGElement | null>(null);

  /**
   * Build a JSON blueprint string from the current canvas state.
   */
  const toJSON = useCallback(
    (pretty = true): string => {
      const blueprint = {
        version: 1,
        exportedAt: new Date().toISOString(),
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodes: nodes.map((n: CanvasNode) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e: CanvasEdge) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          animated: e.animated,
        })),
      };
      return pretty ? JSON.stringify(blueprint, null, 2) : JSON.stringify(blueprint);
    },
    [nodes, edges],
  );

  /**
   * Download a file blob with the given name.
   */
  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  /**
   * Export the diagram as a PNG image.
   * Renders nodes onto an off-screen canvas using their computed positions.
   */
  const exportPNG = useCallback(
    async (filename: string) => {
      // Compute bounding box of all nodes
      if (nodes.length === 0) return;

      const padding = 40;
      const minX = Math.min(...nodes.map((n: CanvasNode) => n.position.x)) - padding;
      const minY = Math.min(...nodes.map((n: CanvasNode) => n.position.y)) - padding;
      const maxX = Math.max(...nodes.map((n: CanvasNode) => n.position.x + 120)) + padding;
      const maxY = Math.max(...nodes.map((n: CanvasNode) => n.position.y + 80)) + padding;
      const width = maxX - minX;
      const height = maxY - minY;

      // Create off-screen canvas
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(2, 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Draw edges as lines
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      for (const edge of edges) {
        const src = nodes.find((n: CanvasNode) => n.id === edge.source);
        const tgt = nodes.find((n: CanvasNode) => n.id === edge.target);
        if (!src || !tgt) continue;

        const sx = src.position.x + 60 - minX;
        const sy = src.position.y + 40 - minY;
        const tx = tgt.position.x + 60 - minX;
        const ty = tgt.position.y + 40 - minY;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }

      // Draw nodes as rounded rectangles
      for (const node of nodes) {
        const x = node.position.x - minX;
        const y = node.position.y - minY;
        const w = 120;
        const h = 80;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.data?.label || node.type, x + w / 2, y + 45);
      }

      // Convert to blob and download
      return new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob, `${filename}.png`);
          }
          resolve();
        }, 'image/png');
      });
    },
    [nodes, edges, downloadBlob],
  );

  /**
   * Export as SVG by building an SVG string from node positions.
   */
  const exportSVG = useCallback(
    async (filename: string) => {
      if (nodes.length === 0) return;

      const padding = 40;
      const minX = Math.min(...nodes.map((n: CanvasNode) => n.position.x)) - padding;
      const minY = Math.min(...nodes.map((n: CanvasNode) => n.position.y)) - padding;
      const maxX = Math.max(...nodes.map((n: CanvasNode) => n.position.x + 120)) + padding;
      const maxY = Math.max(...nodes.map((n: CanvasNode) => n.position.y + 80)) + padding;

      let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" width="${maxX - minX}" height="${maxY - minY}">\n`;
      svg += `  <rect width="100%" height="100%" fill="#f8fafc"/>\n`;

      // Edges
      for (const edge of edges) {
        const src = nodes.find((n: CanvasNode) => n.id === edge.source);
        const tgt = nodes.find((n: CanvasNode) => n.id === edge.target);
        if (!src || !tgt) continue;
        svg += `  <line x1="${src.position.x + 60}" y1="${src.position.y + 40}" x2="${tgt.position.x + 60}" y2="${tgt.position.y + 40}" stroke="#94a3b8" stroke-width="2"/>\n`;
      }

      // Nodes
      for (const node of nodes) {
        svg += `  <rect x="${node.position.x}" y="${node.position.y}" width="120" height="80" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>\n`;
        const label = node.data?.label || node.type;
        svg += `  <text x="${node.position.x + 60}" y="${node.position.y + 45}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#1e293b">${label}</text>\n`;
      }

      svg += '</svg>';
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      downloadBlob(blob, `${filename}.svg`);
    },
    [nodes, edges, downloadBlob],
  );

  /**
   * Main export function — dispatches to the correct format handler.
   */
  const exportDiagram = useCallback(
    async (options: ExportOptions) => {
      const { format, filename = 'architecture-diagram' } = options;

      switch (format) {
        case 'json': {
          const json = toJSON(true);
          const blob = new Blob([json], { type: 'application/json' });
          downloadBlob(blob, `${filename}.json`);
          break;
        }
        case 'png':
          await exportPNG(filename);
          break;
        case 'svg':
          await exportSVG(filename);
          break;
      }
    },
    [toJSON, exportPNG, exportSVG, downloadBlob],
  );

  return { exportDiagram, toJSON };
}
