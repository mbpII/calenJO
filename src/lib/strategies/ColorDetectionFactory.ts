import { IColorDetectionStrategy } from './IColorDetectionStrategy';
import { CanvasStrategy } from './CanvasStrategy';
import { OpenCVStrategy } from './OpenCVStrategy';

export type StrategyType = 'canvas' | 'opencv';

export class ColorDetectionFactory {
  private static strategies: Map<StrategyType, IColorDetectionStrategy> = new Map();
  
  static getStrategy(type: StrategyType): IColorDetectionStrategy {
    if (!this.strategies.has(type)) {
      switch (type) {
        case 'canvas':
          this.strategies.set(type, new CanvasStrategy());
          break;
        case 'opencv':
          this.strategies.set(type, new OpenCVStrategy());
          break;
        default:
          throw new Error(`Unknown strategy type: ${type}`);
      }
    }
    
    return this.strategies.get(type)!;
  }
  
  static getAllStrategies(): { type: StrategyType; name: string }[] {
    return [
      { type: 'canvas', name: 'Canvas (Fast & Light)' },
      { type: 'opencv', name: 'OpenCV (Robust)' }
    ];
  }
}
