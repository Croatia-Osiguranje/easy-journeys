import { Quote } from '../tests/data/steps/quote';
import { QouteStepsEnum } from '../tests/data/steps/quote-steps-enum';
import { ActiveStepsCollection } from './active-steps.collection';
import { Field } from '@crosig/easy-forms';
import { History } from './history';
import { Step } from './step';

export class VehicleTestSearchModel {
  yearOfManufacture = 0;
  vehicleManufacturerName = '';
  color = '';
}

const vehicleApiDataSave = { yearOfManufacture: 2002, color: 'Red', vehicleManufacturerName: 'OPEL' };
const vehicleFieldsSave = { plate: 'ZG123AB', chassis: 'xvdwerA2341dasvasdggah' };

const chooseCoverageConfigData: any = [
  { id: 'proposal', value: [] },
  { id: 'bonusProtectPrice', value: 0 },
  { id: 'contactIDs', value: {} },
];

describe('ActiveStepsCollection Class', () => {
  let activeSteps: ActiveStepsCollection;

  beforeEach(() => {
    activeSteps = new ActiveStepsCollection(Quote, null, { includePath: false });
    activeSteps.setCurrentStep(activeSteps.getStepById(QouteStepsEnum.contactInfo)!);
  });

  it('loadStep() should create instance of ActiveStepsCollection', () => {
    expect(activeSteps).toBeInstanceOf(ActiveStepsCollection);
  });

  it('Steps inside collection should be of type Array', () => {
    expect(Array.isArray(activeSteps.all())).toBe(true);
  });

  it('Steps inside collection should have elements', () => {
    expect(activeSteps.all().length).toBeGreaterThan(0);
  });

  it('Every steps inside collection should be instance of Step', () => {
    const stepsInstances = activeSteps.all().every((step) => step instanceof Step);
    expect(stepsInstances).toBe(true);
  });

  it('Every steps inside collection should be instance of Step', () => {
    const stepsInstances = activeSteps.all().every((step) => step instanceof Step);
    expect(stepsInstances).toBe(true);
  });

  it('Every field inside every step should be instance of Field', () => {
    const stepsInstances = activeSteps.all().every((step) => step.children.every((field) => field instanceof Field));
    expect(stepsInstances).toBe(true);
  });

  it('getNext() should return #enterCustomerDetails for next step.', () => {
    activeSteps.setCurrentStep(activeSteps.getStepById(QouteStepsEnum.vehicle)!);
    const nextStep = activeSteps.getNext();
    expect(nextStep?.id).toBe(QouteStepsEnum.enterCustomerDetails);
  });

  it('getPrevious() should return #vehicle for next step.', () => {
    activeSteps.setCurrentStep(activeSteps.getStepById(QouteStepsEnum.enterCustomerDetails)!);
    const nextStep = activeSteps.getPrevious();
    expect(nextStep?.id).toBe(QouteStepsEnum.vehicle);
  });

  it('getPreviousWithUrl() should skip contactInfo step that does not change url and return #vehicle.', () => {
    activeSteps.setCurrentStep(activeSteps.getStepById(QouteStepsEnum.chooseCoverages)!);
    const nextStep = activeSteps.getPreviousWithUrl();
    expect(nextStep?.id).toBe(QouteStepsEnum.enterCustomerDetails);
  });

  it('getFirst() should return first step in collection.', () => {
    const first = activeSteps.getFirst();
    expect(first.id).toEqual(QouteStepsEnum.vehicle);
  });

  it('getCurrentStep() should return current contactInfo step.', () => {
    expect(activeSteps.getCurrentStep().id).toEqual(QouteStepsEnum.contactInfo);
  });

  it('all() should return array of Steps.', () => {
    const allSteps = activeSteps.all();
    expect(Array.isArray(allSteps)).toBe(true);
    const stepsInstances = allSteps.every((step) => step instanceof Step);
    expect(stepsInstances).toBe(true);
  });

  it('getStepBySlug() should return correct Step.', () => {
    const step = activeSteps.getStepBySlug('placanje');
    expect(step?.id).toBe(QouteStepsEnum.payment);
  });

  it('getStepById() should return correct Step.', () => {
    const step = activeSteps.getStepById(QouteStepsEnum.recap);
    expect(step?.id).toBe(QouteStepsEnum.recap);
  });

  it('setCurrentStep() should set new current step.', () => {
    activeSteps.setCurrentStep(activeSteps.getStepById(QouteStepsEnum.recap)!);
    expect(activeSteps.getCurrentStep().id).toEqual(QouteStepsEnum.recap);
  });

  it('isFirst() should return true if given step is first step.', () => {
    const step = activeSteps.getStepById(QouteStepsEnum.vehicle);

    expect(activeSteps.isFirst(step!)).toBe(true);
  });

  it('isFirst() should return false if given step is not the first step.', () => {
    const step = activeSteps.getStepById(QouteStepsEnum.payment);

    expect(activeSteps.isFirst(step!)).toBe(false);
  });

  it('getStepIndexById() should return positive number if step is found.', () => {
    const index = activeSteps.getStepIndexById(QouteStepsEnum.payment);
    expect(index > 0).toBe(true);
  });

  it('getStepIndexById() should return negative number if step is not found.', () => {
    const index = activeSteps.getStepIndexById('NonExistingId');
    expect(index < 0).toBe(true);
  });

  it('stepsBeforeArevalid() should return true when all steps before given step are valid', () => {
    const steps = activeSteps.all();
    steps[0].valid = true; // vehicle
    steps[1].valid = true; // enterCustomerDetails
    steps[2].valid = true; // contactInfo

    const coverages = activeSteps.getStepById(QouteStepsEnum.chooseCoverages);

    expect(activeSteps.stepsBeforeAreValid(coverages!)).toBe(true);
  });

  it('stepsBeforeArevalid() should return false when all steps before given step are not valid', () => {
    const steps = activeSteps.all();
    steps[0].valid = true; // vehicle
    steps[1].valid = false; // enterCustomerDetails
    steps[2].valid = true; // contactInfo

    const coverages = activeSteps.getStepById(QouteStepsEnum.chooseCoverages);
    expect(activeSteps.stepsBeforeAreValid(coverages!)).toBe(false);
  });

  it('getFirstInvalidStep() shoud return #enterCustomerDetails as a first invalid step from activeSteps.', () => {
    const steps = activeSteps.all();
    steps[0].valid = true; // vehicle
    steps[1].valid = false; // enterCustomerDetails
    steps[2].valid = true; // contactInfo

    const invalidStep = activeSteps.getFirstInvalidStep();
    expect(invalidStep?.id).toBe(QouteStepsEnum.enterCustomerDetails);
  });

  it('setCurrentStepValid() should set current step valid property to true.', () => {
    expect(activeSteps.getCurrentStep().valid).toBe(false);
    activeSteps.setCurrentStepValid();
    expect(activeSteps.getCurrentStep().valid).toBe(true);
  });

  it('getFirstInvalidStep() should return first invalid step in collection.', () => {
    activeSteps.setCurrentStep(activeSteps.getStepById(QouteStepsEnum.vehicle)!);
    activeSteps.setCurrentStepValid();
    const firstInvalidStep = activeSteps.getFirstInvalidStep();
    expect(firstInvalidStep?.id).toEqual(QouteStepsEnum.enterCustomerDetails);
  });

  it('saveStep() with no fields with last argument as true should change step to be valid.', () => {
    activeSteps.saveStep(QouteStepsEnum.contactInfo, {}, true);
    const step = activeSteps.getStepById(QouteStepsEnum.contactInfo);
    expect(step?.valid).toBe(true);
  });

  it('saveApiData() should save provided values in apiData and not reset other fields: Option: resetMissing default', () => {
    activeSteps.saveApiData(QouteStepsEnum.vehicle, { vehiclePolicyDetails: 'notToBeResetInNextCall' });

    activeSteps.saveApiData(QouteStepsEnum.vehicle, vehicleApiDataSave);

    const testingValues: VehicleTestSearchModel =
      activeSteps.getValuesByModel<VehicleTestSearchModel>(VehicleTestSearchModel);
    expect({ ...testingValues }).toEqual(vehicleApiDataSave);
    expect(activeSteps.getValueById('vehiclePolicyDetails')).toBe('notToBeResetInNextCall');
  });

  it('saveApiData() should save provided values in apiData and not reset other fields: Option: resetMissing false', () => {
    activeSteps.saveApiData(QouteStepsEnum.vehicle, { vehiclePolicyDetails: 'notToBeResetInNextCall' });

    activeSteps.saveApiData(QouteStepsEnum.vehicle, vehicleApiDataSave, false);

    const testingValues: VehicleTestSearchModel =
      activeSteps.getValuesByModel<VehicleTestSearchModel>(VehicleTestSearchModel);
    expect({ ...testingValues }).toEqual(vehicleApiDataSave);
    expect(activeSteps.getValueById('vehiclePolicyDetails')).toBe('notToBeResetInNextCall');
  });

  it('saveApiData() should save provided values in apiData and  reset other fields: Option: resetMissing true', () => {
    activeSteps.saveApiData(QouteStepsEnum.vehicle, { vehiclePolicyDetails: 'notToBeResetInNextCall' });

    activeSteps.saveApiData(QouteStepsEnum.vehicle, vehicleApiDataSave, true);
    const testingValues: VehicleTestSearchModel =
      activeSteps.getValuesByModel<VehicleTestSearchModel>(VehicleTestSearchModel);
    expect({ ...testingValues }).toEqual(vehicleApiDataSave);
    expect(activeSteps.getValueById('vehiclePolicyDetails')).toBe('');
  });

  it('saveFields() should save provided values into Step form fields', () => {
    activeSteps.saveFields(QouteStepsEnum.vehicle, vehicleFieldsSave);

    expect(activeSteps.getValueById('plate')).toEqual('ZG123AB');
    expect(activeSteps.getValueById('chassis')).toEqual('xvdwerA2341dasvasdggah');
  });

  it('saveFieldVisibility() should set visible to false for a #name', () => {
    const field = activeSteps
      .getStepById(QouteStepsEnum.enterCustomerDetails)
      ?.children.find((control: any) => control.id === 'name');
    activeSteps.setFieldVisibility(QouteStepsEnum.enterCustomerDetails, 'name', false);
    expect(field?.visible).toBe(false);
    activeSteps.setFieldVisibility(QouteStepsEnum.enterCustomerDetails, 'name', true);
    expect(field?.visible).toBe(true);
  });

  it('getApiData() should retrieve apiData for given Ste', () => {
    const coveragesApiData = activeSteps.getApiData(QouteStepsEnum.chooseCoverages);

    expect(coveragesApiData).toEqual(chooseCoverageConfigData);
  });

  it('formFieldExists() should return true if form field exist, false if not.', () => {
    let fieldExist = activeSteps.formFieldExists(QouteStepsEnum.chooseCoverages, 'cart');
    expect(fieldExist).toBe(true);
    fieldExist = activeSteps.formFieldExists(QouteStepsEnum.chooseCoverages, '__nonExistingField_');
    expect(fieldExist).toBe(false);
  });

  it('apiDataFieldExists() should return true if apiData field exist, false if not.', () => {
    let fieldExist = activeSteps.apiDataFieldExists(QouteStepsEnum.chooseCoverages, 'proposal');
    expect(fieldExist).toBe(true);
    fieldExist = activeSteps.apiDataFieldExists(QouteStepsEnum.chooseCoverages, '__nonExistingField_');
    expect(fieldExist).toBe(false);
  });

  it('addApiData() should add apiDataValues to given step', () => {
    activeSteps.addAPIData(QouteStepsEnum.chooseCoverages, { id: 'products', value: [{ id: 25, price: 0 }] });
    expect(Array.isArray(activeSteps.getValueById('products'))).toBe(true);
    expect(activeSteps.getValueById('products')).toEqual([{ id: 25, price: 0 }]);
  });

  it('clearApiData() should clear apiData on given step', () => {
    activeSteps.saveApiData(
      QouteStepsEnum.chooseCoverages,
      { proposal: [{ status: 'ERROR' }], bonusProtectPrice: 150, contactIDs: { id: '25252', legalId: '25252' } },
      false
    );
    activeSteps.clearApiData(QouteStepsEnum.chooseCoverages);
    expect(activeSteps.getApiData(QouteStepsEnum.chooseCoverages)).toEqual(chooseCoverageConfigData);
  });

  it('reset() should reset activeSteps Collection properties.', () => {
    activeSteps.reset();
    expect(activeSteps.all()).toEqual([]);
    expect(activeSteps.getCurrentStep()).toEqual(new Step());
    const initialHistory: History = new History();
    const fetchetHistory = activeSteps.getHistory();
    expect(fetchetHistory).toEqual(initialHistory);
  });

  it('resetStep() should reset step to initial values.', () => {
    activeSteps.saveApiData(QouteStepsEnum.vehicle, vehicleApiDataSave, false);
    activeSteps.saveFields(QouteStepsEnum.vehicle, { yearOfManufacture: 2002, vehicleManufacturerName: 'OPEL' });

    const stepConfig = Quote.find((config) => config.id === QouteStepsEnum.vehicle);
    activeSteps.resetStep(QouteStepsEnum.vehicle, []);

    const vehicleFormData = activeSteps.getApiData(QouteStepsEnum.vehicle);

    expect(vehicleFormData).toEqual(stepConfig?.apiData);
    expect(activeSteps.getValueById('yearOfManufacture')).toEqual('');
    expect(activeSteps.getValueById('vehicleManufacturerName')).toEqual('');
  });

  it('resetStep() should reset step to initial values except for the second argument properties', () => {
    activeSteps.saveApiData(QouteStepsEnum.vehicle, vehicleApiDataSave, false);
    activeSteps.saveFields(QouteStepsEnum.vehicle, { plate: 'ZG123AB', chasis: 'xvdwerA2341dasvasdggah' });

    const stepConfig = Quote.find((config) => config.id === QouteStepsEnum.vehicle);
    activeSteps.resetStep(QouteStepsEnum.vehicle, ['plate']);

    const vehicleFormData = activeSteps.getApiData(QouteStepsEnum.vehicle);

    expect(vehicleFormData).toEqual(stepConfig?.apiData);
    expect(activeSteps.getValueById('plate')).toEqual('ZG123AB');
    expect(activeSteps.getValueById('chassis')).toEqual('');
  });

  it('invalidateStepsAfter() should set all steps to valid = false after given stepId', () => {
    activeSteps.all().forEach((step) => (step.valid = true));
    const allValid = activeSteps.all().every((step) => step.valid);
    expect(allValid).toBe(true);

    activeSteps.invalidateStepsAfter(QouteStepsEnum.chooseCoverages);
    const stepsValidties = activeSteps.all().map((step) => step.valid);
    expect(stepsValidties).toEqual([true, true, true, true, false, false]);
  });

  it('insertBefore() should insert step before current step', () => {
    const stepsWithpath = new ActiveStepsCollection(Quote, null, {
      includePath: true,
    });
    const stepToBeInserted = stepsWithpath.getStepById(QouteStepsEnum.whatIsDamaged);
    activeSteps.insertBefore(activeSteps.getCurrentStep().id, [stepToBeInserted!.id]);
    expect(activeSteps.getPrevious()?.id === stepToBeInserted!.id).toBe(true);
  });

  it('insertAfter() should insert step after current step', () => {
    const stepsWithpath = new ActiveStepsCollection(Quote, null, {
      includePath: true,
    });
    const stepToBeInserted = stepsWithpath.getStepById(QouteStepsEnum.whatIsDamaged);
    activeSteps.insertAfter(activeSteps.getCurrentStep().id, [stepToBeInserted!.id]);
    expect(activeSteps.getNext()?.id === stepToBeInserted!.id).toBe(true);
  });

  it('insert() should insert step on specific position', () => {
    const stepsWithpath = new ActiveStepsCollection(Quote, null, {
      includePath: true,
    });
    const stepToBeInserted = stepsWithpath.getStepById(QouteStepsEnum.whatIsDamaged);
    activeSteps.insert(0, [stepToBeInserted!.id]);
    expect(activeSteps.getFirst().id === stepToBeInserted!.id).toBe(true);
  });

  it('insert() validation should throw Journey error after inserting step on specific position', () => {
    const stepToBeInserted = activeSteps.getStepById(QouteStepsEnum.payment);
    expect(() => activeSteps.insert(0, [stepToBeInserted!.id])).toThrowError();
  });

  it('removeSteps() should remove steps by given IDs.', () => {
    activeSteps.removeSteps([QouteStepsEnum.vehicle, QouteStepsEnum.chooseCoverages]);
    expect(activeSteps.all().length).toBe(4);
    const stepInCollection = activeSteps.all().map((step) => step.id);
    expect(stepInCollection).toEqual([
      QouteStepsEnum.enterCustomerDetails,
      QouteStepsEnum.contactInfo,
      QouteStepsEnum.recap,
      QouteStepsEnum.payment,
    ]);
    expect(activeSteps.getStepById(QouteStepsEnum.vehicle)).toBe(undefined);
    expect(activeSteps.getStepById(QouteStepsEnum.chooseCoverages)).toBe(undefined);
  });

  it('saveToModel() should save provided values by key to journey models', () => {
    const config = { saveTo: ['contact.address.streetNumber'] };
    const value = 53;
    const expectedResult = {
      contact: {
        address: {
          streetNumber: 53,
        },
      },
    };
    activeSteps.saveToModel(config, value);
    expect(activeSteps.getModels()).toEqual(expectedResult);
  });

  it(`saveToModel() should save provided values by key to journey models.
  Option #use should pick given property in object inside value`, () => {
    const config = {
      saveTo: ['contact.address.streetNumber'],
      use: 'city.streetNumber',
    };

    const value = {
      city: {
        streetNumber: 53,
      },
    };

    const expectedResult = {
      contact: {
        address: {
          streetNumber: 53,
        },
      },
    };

    activeSteps.saveToModel(config, value);
    expect(activeSteps.getModels()).toEqual(expectedResult);
  });
});
