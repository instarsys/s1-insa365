import { ValidationError } from './ValidationError';

export class GpsOutOfRangeError extends ValidationError {
  public readonly locationName?: string;
  public readonly distance?: number;

  constructor(message: string, locationName?: string, distance?: number) {
    super(message, 'gps');
    this.locationName = locationName;
    this.distance = distance;
  }
}
