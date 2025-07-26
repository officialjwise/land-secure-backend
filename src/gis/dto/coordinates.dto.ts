// this is a coordintes DTO file
import { IsNumber } from 'class-validator';
export class CoordinatesDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}
// This DTO is used to validate latitude and longitude values in requests