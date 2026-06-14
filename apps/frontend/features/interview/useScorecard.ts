'use client';

import { useCallback } from 'react';

export interface RubricItem {
  id: string;
  name: string;
  weight: number;
  passed: boolean;
  score: number;
}

export interface MissedItem {
  id: string;
  name: string;
  hint?: string;
}

export interface ScorecardResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  rubricResults: RubricItem[];
  missedItems: MissedItem[];
  aiFeedback: string;
}

interface NodeMetrics {
  id: string;
  type: string;
  label?: string;
  data?: { label?: string };
}

interface EdgeMetrics {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface DesignData {
  nodes: NodeMetrics[];
  edges: EdgeMetrics[];
}

export function useScorecard() {
  const score = useCallback((design: DesignData, promptText?: string): ScorecardResult => {
    const { nodes, edges } = design;

    const rubricResults: RubricItem[] = [];
    const missedItems: MissedItem[] = [];

    // 1. Entry point check (LB, DNS, CDN)
    const hasLoadBalancer = nodes.some(n =>
      n.type === 'LOAD_BALANCER' || n.type === 'API_GATEWAY' || n.type === 'CDN' || n.type === 'DNS'
    );
    rubricResults.push({
      id: 'entry',
      name: 'Entry point (Load Balancer / API Gateway / CDN / DNS)',
      weight: 10,
      passed: hasLoadBalancer,
      score: hasLoadBalancer ? 10 : 0,
    });
    if (!hasLoadBalancer) {
      missedItems.push({
        id: 'entry',
        name: 'Load Balancer / API Gateway',
        hint: 'Add a load balancer or API gateway as the entry point to distribute traffic.',
      });
    }

    // 2. Compute layer
    const hasCompute = nodes.some(n =>
      n.type === 'WEB_SERVER' || n.type === 'MICROSERVICE' || n.type === 'APP_SERVER'
    );
    rubricResults.push({
      id: 'compute',
      name: 'Compute layer (Web Server / Microservice)',
      weight: 15,
      passed: hasCompute,
      score: hasCompute ? 15 : 0,
    });
    if (!hasCompute) {
      missedItems.push({
        id: 'compute',
        name: 'Compute / Application Server',
        hint: 'Add a web server or microservice to handle business logic.',
      });
    }

    // 3. Database
    const hasDatabase = nodes.some(n =>
      n.type === 'DATABASE_SQL' || n.type === 'DATABASE_NOSQL'
    );
    rubricResults.push({
      id: 'database',
      name: 'Database (SQL / NoSQL)',
      weight: 15,
      passed: hasDatabase,
      score: hasDatabase ? 15 : 0,
    });
    if (!hasDatabase) {
      missedItems.push({
        id: 'database',
        name: 'Database',
        hint: 'Add a database for persistent storage.',
      });
    }

    // 4. Cache
    const hasCache = nodes.some(n => n.type === 'CACHE' || n.type === 'REDIS');
    rubricResults.push({
      id: 'cache',
      name: 'Cache layer (Redis / Memcached)',
      weight: 10,
      passed: hasCache,
      score: hasCache ? 10 : 0,
    });
    if (!hasCache) {
      missedItems.push({
        id: 'cache',
        name: 'Cache Layer',
        hint: 'Add a cache (Redis) to reduce database load and improve latency.',
      });
    }

    // 5. Message Queue
    const hasQueue = nodes.some(n => n.type === 'QUEUE' || n.type === 'MESSAGE_QUEUE');
    rubricResults.push({
      id: 'queue',
      name: 'Message Queue / Async Processing',
      weight: 10,
      passed: hasQueue,
      score: hasQueue ? 10 : 0,
    });
    if (!hasQueue) {
      missedItems.push({
        id: 'queue',
        name: 'Message Queue',
        hint: 'Add a message queue (Kafka / RabbitMQ) for async processing and decoupling.',
      });
    }

    // 6. CDN
    const hasCDN = nodes.some(n => n.type === 'CDN');
    rubricResults.push({
      id: 'cdn',
      name: 'CDN for static content delivery',
      weight: 5,
      passed: hasCDN,
      score: hasCDN ? 5 : 0,
    });
    if (!hasCDN) {
      missedItems.push({
        id: 'cdn',
        name: 'CDN',
        hint: 'Add a CDN to serve static assets and reduce latency for global users.',
      });
    }

    // 7. Connections (edges) exist
    const hasEdges = edges.length > 0;
    rubricResults.push({
      id: 'connections',
      name: 'Correct connections between components',
      weight: 10,
      passed: hasEdges,
      score: hasEdges ? 10 : 0,
    });
    if (!hasEdges) {
      missedItems.push({
        id: 'connections',
        name: 'Service Connections',
        hint: 'Connect your components with edges to show data flow.',
      });
    }

    // 8. Topological correctness — at least 3+ distinct layers
    const layerTypes = new Set(nodes.map(n => {
      if (['CLIENT', 'MOBILE_APP', 'BROWSER'].includes(n.type)) return 'client';
      if (['LOAD_BALANCER', 'API_GATEWAY', 'CDN', 'DNS'].includes(n.type)) return 'entry';
      if (['WEB_SERVER', 'MICROSERVICE', 'APP_SERVER'].includes(n.type)) return 'compute';
      if (['DATABASE_SQL', 'DATABASE_NOSQL', 'CACHE', 'REDIS', 'OBJECT_STORAGE'].includes(n.type)) return 'data';
      if (['QUEUE', 'MESSAGE_QUEUE', 'KAFKA'].includes(n.type)) return 'messaging';
      return 'other';
    }));
    const layerCount = layerTypes.size;
    rubricResults.push({
      id: 'layers',
      name: `Multi-layer architecture (${layerCount}/3+ distinct layers)`,
      weight: 10,
      passed: layerCount >= 3,
      score: Math.min(10, layerCount * 3),
    });
    if (layerCount < 3) {
      missedItems.push({
        id: 'layers',
        name: 'Layered Architecture',
        hint: 'Add more layers (client → load balancer → compute → database) for a complete architecture.',
      });
    }

    // 9. Node count (reasonable size)
    const nodeCount = nodes.length;
    rubricResults.push({
      id: 'size',
      name: `Architecture completeness (${nodeCount} components)`,
      weight: 5,
      passed: nodeCount >= 4,
      score: Math.min(5, nodeCount),
    });

    // 10. Search/Indexing
    const hasSearch = nodes.some(n => n.type === 'SEARCH_ENGINE');
    rubricResults.push({
      id: 'search',
      name: 'Search / Indexing capability',
      weight: 5,
      passed: hasSearch,
      score: hasSearch ? 5 : 0,
    });

    // 11. Observability
    const hasObservability = nodes.some(n =>
      n.type === 'OBSERVABILITY' || n.type === 'MONITORING' || n.type === 'LOGGING'
    );
    rubricResults.push({
      id: 'observability',
      name: 'Observability (monitoring / logging)',
      weight: 5,
      passed: hasObservability,
      score: hasObservability ? 5 : 0,
    });

    // 12. Security
    const hasSecurity = nodes.some(n =>
      n.type === 'AUTH_SERVICE' || n.type === 'SECURITY'
    );
    rubricResults.push({
      id: 'security',
      name: 'Security / Authentication service',
      weight: 5,
      passed: hasSecurity,
      score: hasSecurity ? 5 : 0,
    });
    if (!hasSecurity) {
      missedItems.push({
        id: 'security',
        name: 'Authentication / Security',
        hint: 'Add an auth service or security layer.',
      });
    }

    // 13. Notification
    const hasNotification = nodes.some(n => n.type === 'NOTIFICATION_SERVICE');
    rubricResults.push({
      id: 'notifications',
      name: 'Notification service',
      weight: 5,
      passed: hasNotification,
      score: hasNotification ? 5 : 0,
    });

    // Calculate totals
    const maxScore = rubricResults.reduce((sum, r) => sum + r.weight, 0);
    const totalScore = rubricResults.reduce((sum, r) => sum + r.score, 0);
    const percentage = Math.round((totalScore / maxScore) * 100);

    // Grade
    let grade = 'L5 Senior Engineer';
    if (percentage >= 90) grade = 'L6+ Principal Architect';
    else if (percentage >= 75) grade = 'L5 Senior Engineer';
    else if (percentage >= 55) grade = 'L4 Systems Engineer';
    else grade = 'Needs Improvement';

    // AI Feedback
    let aiFeedback = '';
    if (percentage >= 90) {
      aiFeedback = 'Excellent architecture! You covered all major components including load balancing, compute, caching, databases, messaging, observability, and security. The design is production-ready with proper separation of concerns.';
    } else if (percentage >= 75) {
      aiFeedback = 'Strong architecture with most major components present. Consider adding missing layers like caching, message queues, or observability to make this production-grade.';
    } else if (percentage >= 55) {
      aiFeedback = 'Good foundation but missing several critical components. Focus on adding a cache layer, message queue, and proper entry point (load balancer/CDN). Ensure all components are connected.';
    } else {
      aiFeedback = 'The architecture needs significant improvement. Start with the core components: load balancer, web server, database, and cache. Build up from there with proper connections between each layer.';
    }

    return {
      totalScore,
      maxScore,
      percentage,
      grade,
      rubricResults,
      missedItems,
      aiFeedback,
    };
  }, []);

  return { score };
}
