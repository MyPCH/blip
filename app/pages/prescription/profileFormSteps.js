import React from 'react';
import { translate } from 'react-i18next';
import { FastField, useFormikContext } from 'formik';
import { Box, Flex } from 'rebass/styled-components';
import bows from 'bows';
import isEmpty from 'lodash/isEmpty';
import map from 'lodash/map';
import InputMask from 'react-input-mask';

import { fieldsAreValid, getFieldError } from '../../core/forms';
import i18next from '../../core/language';
import RadioGroup from '../../components/elements/RadioGroup';
import Checkbox from '../../components/elements/Checkbox';
import TextInput from '../../components/elements/TextInput';
import { Caption, Headline } from '../../components/elements/FontStyles';

import {
  fieldsetStyles,
  condensedInputStyles,
  checkboxGroupStyles,
  checkboxStyles,
} from './prescriptionFormStyles';

import {
  sexOptions,
  cgmDeviceOptions,
  pumpDeviceOptions,
  stepValidationFields,
} from './prescriptionFormConstants';

const t = i18next.t.bind(i18next);
const log = bows('PrescriptionAccount');

export const PatientPhone = translate()(props => {
  const { t, meta } = props;
  const patientName = meta.firstName.value;

  const {
    setFieldValue,
    setFieldTouched,
  } = useFormikContext();

  return (
    <Box {...fieldsetStyles}>
      <Headline mb={4}>{t('What is the mobile phone number {{patientName}} will use with Tidepool Loop?', { patientName })}</Headline>
      <FastField
        as={() => (
          <InputMask
            mask="(999) 999-9999"
            alwaysShowMask
            defaultValue={meta.phoneNumber.number.value}
            onBlur={e => {
              setFieldTouched('phoneNumber.number', true);
              setFieldValue('phoneNumber.number', e.target.value);
            }}
          >
            <TextInput
              name="phoneNumber.number"
              id="phoneNumber.number"
              label={t('Phone Number')}
              error={getFieldError(meta.phoneNumber.number)}
              {...condensedInputStyles}
            />
          </InputMask>
        )}
      />
      <Caption mt={5} mb={3}>
        {t('The patient\'s phone number may be used to provide direct assistance regarding their Tidepool account. Standard messaging rates may apply.')}
      </Caption>
    </Box>
  );
});

export const PatientMRN = translate()(props => {
  const { t, meta } = props;
  const patientName = meta.firstName.value;

  return (
    <Box {...fieldsetStyles}>
      <Headline mb={4}>{t('What is {{patientName}}\'s Medical Record Number?', { patientName })}</Headline>
      <FastField
        as={TextInput}
        label={t('Medical Record Number')}
        id="mrn"
        name="mrn"
        error={getFieldError(meta.mrn)}
        {...condensedInputStyles}
      />
    </Box>
  );
});

export const PatientGender = translate()(props => {
  const { t, meta } = props;
  const patientName = meta.firstName.value;

  return (
    <Box {...fieldsetStyles}>
      <Headline mb={4}>{t('What is the {{patientName}}\'s gender?', { patientName })}</Headline>
      <FastField
        as={RadioGroup}
        variant="verticalBordered"
        id="sex"
        name="sex"
        options={sexOptions}
        error={getFieldError(meta.sex)}
      />
    </Box>
  );
});

export const PatientDevices = translate()(props => {
  const { t, meta, devices } = props;
  const patientName = meta.firstName.value;

  const {
    setFieldValue,
  } = useFormikContext();

  return (
    <Box {...fieldsetStyles}>
      <Headline mb={4}>{t('Does {{patientName}} have the necessary prescriptions for Tidepool Loop compatible devices?', { patientName })}</Headline>
      <Flex {...checkboxGroupStyles}>
        {map(pumpDeviceOptions(devices), device => (
          <React.Fragment key={device.value}>
            <FastField
              as={Checkbox}
              id="initialSettings.pumpId"
              name="initialSettings.pumpId"
              key={device.value}
              checked={!isEmpty(meta.initialSettings.pumpId.value)}
              label={device.label}
              onChange={e => {
                setFieldValue('initialSettings.pumpId', e.target.checked ? device.value : '')
              }}
              error={getFieldError(meta.initialSettings.pumpId)}
              {...checkboxStyles}
            />
            <Caption mt={1}>{device.extraInfo}</Caption>
          </React.Fragment>
        ))}
      </Flex>
      <Flex {...checkboxGroupStyles}>
        {map(cgmDeviceOptions(devices), device => (
          <React.Fragment key={device.value}>
            <FastField
              as={Checkbox}
              id="initialSettings.cgmId"
              name="initialSettings.cgmId"
              checked={!isEmpty(meta.initialSettings.cgmId.value)}
              label={device.label}
              onChange={e => {
                setFieldValue('initialSettings.cgmId', e.target.checked ? device.value : '')
              }}
              error={getFieldError(meta.initialSettings.cgmId)}
              {...checkboxStyles}
            />
            <Caption mt={1}>{device.extraInfo}</Caption>
          </React.Fragment>
        ))}
      </Flex>
    </Box>
  );
});

const profileFormSteps = (meta, devices) => ({
  label: t('Complete Patient Profile'),
  subSteps: [
    {
      disableComplete: !fieldsAreValid(stepValidationFields[1][0], meta),
      onComplete: () => log('Patient Phone Number Complete'),
      panelContent: <PatientPhone meta={meta} />
    },
    {
      disableComplete: !fieldsAreValid(stepValidationFields[1][1], meta),
      onComplete: () => log('Patient MRN Complete'),
      panelContent: <PatientMRN meta={meta} />,
    },
    {
      disableComplete: !fieldsAreValid(stepValidationFields[1][2], meta),
      onComplete: () => log('Patient Gender Complete'),
      panelContent: <PatientGender meta={meta} />,
    },
    {
      disableComplete: !fieldsAreValid(stepValidationFields[1][3], meta),
      onComplete: () => log('Patient Devices Complete'),
      panelContent: <PatientDevices meta={meta} devices={devices} />,
    },
  ],
});

export default profileFormSteps;
