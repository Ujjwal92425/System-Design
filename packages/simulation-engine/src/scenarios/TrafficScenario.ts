export class TrafficScenario {
  static generateTraffic(tick: number, baseQps: number, type: 'CONSTANT' | 'SPIKE' | 'RAMP'): number {
    switch (type) {
      case 'SPIKE':
        // Generate a massive spike every 60 ticks
        return tick % 60 < 5 ? baseQps * 5 : baseQps;
      case 'RAMP':
        // Linear increase of traffic over time
        return baseQps + (tick * 10);
      case 'CONSTANT':
      default:
        return baseQps;
    }
  }
}
