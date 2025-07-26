import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsConditionallyRequired(condition: (object: any) => boolean, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isConditionallyRequired',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (condition(args.object)) {
            return value !== undefined && value !== null && value !== '';
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} is required for this property type`;
        },
      },
    });
  };
}

export function IsConditionallyForbidden(condition: (object: any) => boolean, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isConditionallyForbidden',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (condition(args.object)) {
            return value === undefined || value === null || value === '';
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} is not allowed for this property type`;
        },
      },
    });
  };
}

export function IsValidSizeUnit(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidSizeUnit',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          const propertyType = obj.type;
          
          const validUnits = {
            land: ['sqm', 'acres', 'hectares'],
            house: ['sqft', 'sqm'],
            apartment: ['sqft', 'sqm'],
            commercial: ['sqft', 'sqm']
          };

          if (propertyType && validUnits[propertyType]) {
            return validUnits[propertyType].includes(value);
          }
          
          return true; // If no property type is set, let the enum validator handle it
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as any;
          const propertyType = obj.type;
          const validUnits = {
            land: ['sqm', 'acres', 'hectares'],
            house: ['sqft', 'sqm'],
            apartment: ['sqft', 'sqm'],
            commercial: ['sqft', 'sqm']
          };
          
          if (propertyType && validUnits[propertyType]) {
            return `Size unit for ${propertyType} must be one of: ${validUnits[propertyType].join(', ')}`;
          }
          
          return `Invalid size unit for property type`;
        },
      },
    });
  };
}
