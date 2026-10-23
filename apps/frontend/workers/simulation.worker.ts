// Web Worker for processing high frequency simulation ticks off-thread
self.onmessage = (e) => {
  const { type, payload } = e.data;
  
  if (type === 'START') {
    let tick = 0;
    setInterval(() => {
      tick++;
      self.postMessage({
        type: 'METRICS',
        payload: {
          tick,
          timestamp: Date.now(),
          nodes: [],
          systemHealth: 'GREEN'
        }
      });
    }, 1000);
  }
};
