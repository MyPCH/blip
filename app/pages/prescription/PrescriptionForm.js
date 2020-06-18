import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';
import bows from 'bows';
import { Controller, useForm, FormContext } from 'react-hook-form';
import { DevTool } from '@hookform/devtools';
import get from 'lodash/get';

import { getFieldsMeta } from '../../core/forms';
import { useLocalStorage } from '../../core/hooks';
import prescriptionSchema from './prescriptionSchema';
import accountFormSteps from './accountFormSteps';
import profileFormSteps from './profileFormSteps';
import therapySettingsFormSteps from './therapySettingsFormSteps';
import { defaultUnits, defaultValues, validCountryCodes } from './prescriptionFormConstants';

import Checkbox from '../../components/elements/Checkbox';
import Stepper from '../../components/elements/Stepper';

/* global crypto, Uint8Array, Promise */

const log = bows('PrescriptionForm');

const withPrescription = Component => props => {
  // Until backend service is ready, get prescriptions from localStorage
  const [prescriptions] = useLocalStorage('prescriptions', {});

  const id = get(props, 'routeParams.id', '');
  const prescription = get(prescriptions, id);

  return <Component prescription={prescription} {...props} />
};

const PrescriptionForm = props => {
  const { t, prescription } = props;

  const bgUnits = get(prescription, 'initialSettings.bloodGlucoseUnits', defaultUnits.bloodGlucose);
  const pumpId = get(prescription, 'initialSettings.pumpId', '');

  const validationSchema = prescriptionSchema(pumpId, bgUnits);

  const form = useForm({
    defaultValues: {
      id: get(props, 'routeParams.id', ''),
      state: get(prescription, 'state', 'draft'),
      type: get(prescription, 'type', ''),
      firstName: get(prescription, 'firstName', ''),
      lastName: get(prescription, 'lastName', ''),
      birthday: get(prescription, 'birthday', ''),
      email: get(prescription, 'email', ''),
      emailConfirm: get(prescription, 'email', ''),
      phoneNumber: {
        countryCode: get(prescription, 'phoneNumber.countryCode', validCountryCodes[0]),
        number: get(prescription, 'phoneNumber.number', ''),
      },
      mrn: get(prescription, 'mrn', ''),
      sex: get(prescription, 'sex', ''),
      initialSettings: {
        bloodGlucoseUnits: bgUnits,
        pumpId: pumpId,
        cgmType: get(prescription, 'initialSettings.cgmType', ''),
        insulinType: get(prescription, 'initialSettings.insulinType', ''),
        suspendThreshold: {
          value: get(prescription, 'initialSettings.suspendThreshold.value', defaultValues(bgUnits).suspendThreshold),
          units: defaultUnits.suspendThreshold,
        },
        basalRateMaximum: {
          value: get(prescription, 'initialSettings.basalRateMaximum.value', defaultValues(bgUnits).basalRateMaximum),
          units: defaultUnits.basalRate,
        },
        bolusAmountMaximum: {
          value: get(prescription, 'initialSettings.bolusAmountMaximum.value', defaultValues(bgUnits).bolusAmountMaximum),
          units: defaultUnits.bolusAmount,
        },
        bloodGlucoseTargetSchedule: get(prescription, 'initialSettings.bloodGlucoseTargetSchedule', [{
          high: defaultValues(bgUnits).bloodGlucoseTarget.high,
          low: defaultValues(bgUnits).bloodGlucoseTarget.low,
          start: 0,
        }]),
        basalRateSchedule: get(prescription, 'initialSettings.basalRateSchedule', [{
          rate: defaultValues(bgUnits).basalRate,
          start: 0,
        }]),
        carbohydrateRatioSchedule: get(prescription, 'initialSettings.carbohydrateRatioSchedule', [{
          amount: defaultValues(bgUnits).carbRatio,
          start: 0,
        }]),
        insulinSensitivitySchedule: get(prescription, 'initialSettings.insulinSensitivitySchedule', [{
          amount: defaultValues(bgUnits).insulinSensitivityFactor,
          start: 0,
        }]),
      },
      training: get(prescription, 'training', ''),
    },
    validationSchema,
    mode: 'onChange',
  }); // form contains all useForm functions

  const onSubmit = data => console.log(data);
  const values = form.getValues({ nest: true });
  console.log('values', values);

  const getFieldMeta = (fieldKey) => ({
    dirty: form.formState.dirtyFields.has(fieldKey),
    touched: get(form.formState.touched, fieldKey),
    error: get(form.errors, fieldKey, {}),
    value: get(values, fieldKey),
  });

  const meta = getFieldsMeta(prescriptionSchema(pumpId, bgUnits), getFieldMeta);

  /* WIP Scaffolding Start */
  const sleep = m => new Promise(r => setTimeout(r, m));

  // Until backend service is ready, save prescriptions to localStorage
  const [prescriptions, setPrescriptions] = useLocalStorage('prescriptions', {});

  const initialAsyncState = () => ({ pending: false, complete: false });
  const [finalAsyncState, setFinalAsyncState] = React.useState(initialAsyncState());
  const [stepAsyncState, setStepAsyncState] = React.useState(initialAsyncState());
  const [prescriptionReviewed, setPrescriptionReviewed] = React.useState(false);

  const renderStepConfirmation = (name, label, checked, onChange) => (
    <Checkbox
      checked={checked}
      name={name}
      label={label}
      onChange={onChange}
      required
    />
  );

  const handleStepSubmit = async () => {
    function uuidv4() {
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16) // eslint-disable-line no-bitwise
      );
    }

    const prescriptionValues = values => {
      const prescription = { ...values };
      delete prescription.emailConfirm;
      prescription.state = 'draft';
      return prescription;
    };

    setStepAsyncState({ pending: true, complete: false });

    const id = values.id || uuidv4();
    if (!values.id) form.setValue('id', id);

    await sleep(1000);

    setPrescriptions({
      ...prescriptions,
      [id]: {
        ...prescription,
        ...prescriptionValues(values),
        id,
      },
    });

    setStepAsyncState({ pending: false, complete: true });
  };
  /* WIP Scaffolding End */

  const stepperProps = {
    'aria-label': t('New Prescription Form'),
    backText: t('Previous Step'),
    completeText: t('Save and Continue'),
    id: 'prescription-form-steps',
    onStepChange: (newStep) => {
      setPrescriptionReviewed(false);
      setFinalAsyncState(initialAsyncState());
      setStepAsyncState(initialAsyncState());
      log('Step to', newStep.join(','));
    },
    steps: [
      {
        ...accountFormSteps(meta, validationSchema),
        onComplete: handleStepSubmit,
        asyncState: stepAsyncState,
      },
      {
        ...profileFormSteps(meta),
        onComplete: handleStepSubmit,
        asyncState: stepAsyncState,
      },
      {
        ...therapySettingsFormSteps(meta),
        onComplete: handleStepSubmit,
        asyncState: stepAsyncState,
      },
      {
        label: 'Review and Send Prescription',
        onComplete: async () => {
          setFinalAsyncState({ pending: true, complete: false });
          await sleep(2000);
          setFinalAsyncState({ pending: false, complete: true });
        },
        disableComplete: !prescriptionReviewed || finalAsyncState.complete,
        asyncState: finalAsyncState,
        completed: finalAsyncState.complete,
        completeText: finalAsyncState.complete ? t('Prescription Sent') : t('Send Prescription'),
        panelContent: renderStepConfirmation(
          'review-checkbox',
          'The prescription details are correct',
          prescriptionReviewed,
          (e) => setPrescriptionReviewed(e.target.checked),
        ),
      },
    ],
    themeProps: {
      wrapper: {
        mx: 3,
        my: 2,
        px: 2,
        py: 4,
        bg: 'white',
      },
      panel: {
        padding: 3,
      },
      actions: {
        justifyContent: 'center',
      }
    },
  };

  const params = () => new URLSearchParams(location.search);
  const activeStepParamKey = `${stepperProps.id}-step`;
  const activeStepsParam = params().get(activeStepParamKey);
  const storageKey = 'prescriptionForm';

  // When a user comes to this component initially, without the active step and subStep set by the
  // Stepper component in the url, we delete any persisted state from localStorage.
  // As well, when editing an existing prescription, we delete it so that the current prescription
  // values replace whatever values were previously stored
  if (prescription || (get(localStorage, storageKey) && activeStepsParam === null)) delete localStorage[storageKey];

  return (
    <FormContext {...form}>
      <form id="prescription-form" onSubmit={form.handleSubmit(onSubmit)}>
        <Controller as="input" type="hidden" name="id" />
        <Stepper {...stepperProps} />
        {/* <Persist name={storageKey} /> */}
      </form>

      <DevTool control={form.control} />
    </FormContext>
  );
};

PrescriptionForm.propTypes = {
  location: PropTypes.shape({
    pathname: PropTypes.string,
    search: PropTypes.string,
  }),
};

PrescriptionForm.defaultProps = {
  location: window.location,
};

PrescriptionForm.displayName = 'PrescriptionForm';

export default translate()(withPrescription(PrescriptionForm));
