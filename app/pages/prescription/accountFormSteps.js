import React from 'react';
import { translate } from 'react-i18next';
import { useFormContext, Controller } from 'react-hook-form';
import { Box } from 'rebass/styled-components';
import bows from 'bows';
import InputMask from 'react-input-mask';

import { fieldsAreValid, getFieldError } from '../../core/forms';
import i18next from '../../core/language';
import RadioGroup from '../../components/elements/RadioGroup';
import TextInput from '../../components/elements/TextInput';
import { Caption, Headline } from '../../components/elements/FontStyles';
import { typeOptions } from './prescriptionFormConstants';
import { fieldsetStyles, condensedInputStyles } from './prescriptionFormStyles';

const t = i18next.t.bind(i18next);
const log = bows('PrescriptionAccount');

export const AccountType = translate()(props => {
  const { t, meta } = props;

  return (
    <Box {...fieldsetStyles}>
      <Headline mb={4}>{t('Who are you creating your account for?')}</Headline>
      <Controller
        as={RadioGroup}
        variant="verticalBordered"
        id="type"
        name="type"
        options={typeOptions}
        error={getFieldError(meta.type)}
      />
    </Box>
  );
});

export const PatientInfo = translate()(props => {
  const { t, meta } = props;

  const {
    getValues,
    setValue,
  } = useFormContext();

  const dateFormatRegex = /^(.*)[-|/](.*)[-|/](.*)$/;
  const dateInputFormat = 'MM/DD/YYYY';
  const maskFormat = dateInputFormat.replace(/[A-Z]/g, '9');

  return (
    <Box {...fieldsetStyles}>
      <Headline mb={4}>{t('Please enter patient\'s name and birthdate')}</Headline>
      <Controller
        as={TextInput}
        label={t('First Name')}
        id="firstName"
        name="firstName"
        error={getFieldError(meta.firstName)}
        {...condensedInputStyles}
      />
      <Controller
        as={TextInput}
        label={t('Last Name')}
        id="lastName"
        name="lastName"
        error={getFieldError(meta.lastName)}
        {...condensedInputStyles}
      />
      <Controller
        name="birthday"
        as={() => (
          <InputMask
            mask={maskFormat}
            maskPlaceholder={dateInputFormat}
            alwaysShowMask
            defaultValue={getValues('birthday').replace(dateFormatRegex, '$2/$3/$1')}
            onBlur={e => {
              setValue('birthday', e.target.value.replace(dateFormatRegex, '$3-$1-$2'), true)
            }}
          >
            <TextInput
              name="birthday"
              id="birthday"
              label={t('Patient\'s Birthday')}
              error={getFieldError(meta.birthday)}
              {...condensedInputStyles}
            />
          </InputMask>
        )}
      />
    </Box>
  );
});

export const PatientEmail = translate()(props => {
  const { t, meta, validationSchema } = props;
  console.log('validationSchema', validationSchema);

  const { errors } = useFormContext({ validationSchema });
  console.log('errors', errors);
  return (
    <Box {...fieldsetStyles}>
      <Headline mb={4}>{t('What is the patient\'s email address?')}</Headline>
      <Controller
        as={TextInput}
        label={t('Email Address')}
        id="email"
        name="email"
        error={getFieldError(meta.email)}
        {...condensedInputStyles}
      />
      <Controller
        as={TextInput}
        label={t('Confirm Email Address')}
        id="emailConfirm"
        name="emailConfirm"
        error={getFieldError(meta.emailConfirm)}
        {...condensedInputStyles}
      />
      <Caption mt={5} mb={3}>
        {t('This email will be used for an account set up request to the end user and for all Tidepool correspondence.')}
      </Caption>
    </Box>
  );
});

const accountFormSteps = (meta, validationSchema) => ({
  label: t('Create Patient Account'),
  subSteps: [
    {
      disableComplete: !fieldsAreValid(['type'], meta),
      hideBack: true,
      onComplete: () => log('Account Type Complete'),
      panelContent: <AccountType meta={meta} />
    },
    {
      disableComplete: !fieldsAreValid(['firstName', 'lastName', 'birthday'], meta),
      onComplete: () => log('Patient Info Complete'),
      panelContent: <PatientInfo meta={meta} />,
    },
    {
      disableComplete: !fieldsAreValid(['email', 'emailConfirm'], meta),
      onComplete: () => log('Patient Email Complete'),
      panelContent: <PatientEmail meta={meta} validationSchema={validationSchema} />,
    },
  ],
});

export default accountFormSteps;
