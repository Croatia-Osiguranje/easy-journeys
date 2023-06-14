import { Field, FormHelper } from '@crosig/easy-forms';
import { Step } from '../models/step';
import { JourneyValue } from '../models/journey-value';
import { JourneyError } from '../exceptions/journey.exception';
import get from 'lodash-es/get';
import { ArrayHelper } from './array.helper'; 

/**
 * Helper class that handles activeSteps data manipulation
 */
export class DataHelper {
  /**
   * Looks for value in apiData or field.value of all steps
   * @param steps that will be searched for field,
   * @param fieldId Id of the field/apiData or path to the field/apiData (ex. subform.subform.someField.object.value) or you can go directly to someField.object.value
   * @Note: it cannot return whole subform object, only field.value
   */
  public static findById(fieldId: string, steps: Array<Step>): any {
    let fieldValue = null;
    for (const step of steps) {
      const foundFieldValue = this.getFieldValue(fieldId, step);
      if (foundFieldValue != null) {
        fieldValue = foundFieldValue;
        break;
      }
      const foundApiDataValue = this.getApiDataValue(fieldId, step);
      if (foundApiDataValue != null) {
        fieldValue = foundApiDataValue;
        break;
      }
    }
    return fieldValue;
  }

  private static getFieldValue(fieldId: string, step: Step): any {
    let fieldValue = null;
    let objectPath = fieldId.split('.');
    for (const fieldKey of objectPath) {
      const field = step.getChildById(fieldKey);
      if (!field) {
        break;
      }
      objectPath = objectPath.filter((value) => value !== fieldKey);
      fieldValue = field.value;
    }
    if (!objectPath?.length) {
      return fieldValue;
    }
    return get(fieldValue, objectPath.join('.'));
  }

  public static getApiDataValue(apiDataId: string, step: Step): any {
    const objectPath = apiDataId.split('.');
    const fieldKey = objectPath.shift();
    // eslint-disable-next-line prefer-const
    if (!step.apiData) {
      return;
    }
    const fieldValue = ArrayHelper.findNested(step?.apiData, fieldKey)?.value;
    if (!objectPath?.length) {
      return fieldValue;
    }
    return get(fieldValue, objectPath.join('.'));
  }

  public static extractModel<T>(className: any, steps: Array<Step>, includeEmpty = false, mapper?: any): T {
    const model: T = new className();
    const objectProperties = Object.keys(model as any);

    if (objectProperties.length === 0) {
      throw new JourneyError(
        'Journey Builder Error: Please Assign values for properties you wish to get values for!!!'
      );
    }

    objectProperties.forEach((property) => {
      steps.forEach((step) => {
        step.children.forEach((field) => {
          if (field.id === property) {
            if (field.value) {
              model[property as keyof T] = field.value;
              return;
            }
            if (!includeEmpty) {
              delete model[property as keyof T];
            }
          }
        });

        if (step.apiData) {
          step.apiData.forEach((field) => {
            if (field.id === property) {
              if (field.value) {
                model[property as keyof T] = field.value;
                return;
              }
              if (!includeEmpty) {
                delete model[property as keyof T];
              }
            }
          });
        }
      });
    });

    if (!mapper) {
      return model;
    }

    return this.applyPropertyMapper(model, mapper);
  }

  public static applyPropertyMapper(model: any, mapper: any) {
    Object.keys(mapper).forEach((key) => {
      if (model.hasOwnProperty(key)) {
        const newProperty = mapper[key];
        model[newProperty] = model[key];
        delete model[key];
      }
    });
    return model;
  }

  public static batchInsert(fields: Array<any>, steps: Array<Step>): Array<Step> {
    steps.forEach((step) => {
      FormHelper.whenLeaf(step.children, (field: Field) => {
        const insertedValue = fields.find((item) => item.id === field.id);

        if (insertedValue) {
          field.value = insertedValue.value;
        }
      });

      step.apiData?.forEach((field: JourneyValue) => {
        fields.forEach((newField) => {
          if (newField.id === field.id) {
            field.value = newField.value;
          }
        });
      });
    });
    return steps;
  }

  /**
   * Accepts array of type Journey values and returns object. id => property, value => value
   * @param values Array of Journey values object
   */
  public static valuesToObject(values: Array<JourneyValue>) {
    const result: any = {};
    values.forEach((item) => {
      return (result[item.id] = item.value);
    });

    return result;
  }

  public static validateFields(steps: Step[]) {
    const idsObject: any = {};
    steps.forEach((step) => {
      FormHelper.whenLeaf(step.children, (field: Field) => {
        if (idsObject[field.id] !== undefined) {
          throw new JourneyError('duplicated id <<children: ' + field.id + '>>');
        }
        idsObject[field.id] = 'exist';
      });
      step?.apiData?.forEach((item) => {
        if (idsObject[item.id] !== undefined) {
          throw new JourneyError('duplicated id <<apiData: ' + item.id + '>>');
        }
        idsObject[item.id] = 'exists';
      });
    });
  }
}
