/* global chai */
/* global sinon */
/* global describe */
/* global it */
/* global expect */
/* global beforeEach */
/* global before */
/* global afterEach */
/* global after */
/* global context */

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import trackingMiddleware from '../../../../app/redux/utils/trackingMiddleware';
import moment from 'moment';
import _ from 'lodash';

import isTSA from 'tidepool-standard-action';

import initialState from '../../../../app/redux/reducers/initialState';

import * as ErrorMessages from '../../../../app/redux/constants/errorMessages';
import * as UserMessages from '../../../../app/redux/constants/usrMessages';

import { TIDEPOOL_DATA_DONATION_ACCOUNT_EMAIL, MMOLL_UNITS } from '../../../../app/core/constants';

// need to require() async in order to rewire utils inside
const async = require('../../../../app/redux/actions/async');

describe('Actions', () => {
  const trackMetric = sinon.spy();
  const mockStore = configureStore([
    thunk,
    trackingMiddleware({ metrics: { track: trackMetric } })
  ]);

  afterEach(function() {
    // very important to do this in an afterEach than in each test when __Rewire__ is used
    // if you try to reset within each test you'll make it impossible for tests to fail!
    async.__ResetDependency__('utils');
    trackMetric.resetHistory();
  })

  describe('Asynchronous Actions', () => {
    describe('signup', () => {
      it('should trigger SIGNUP_SUCCESS and it should call signup and get once for a successful request', () => {
        let user = { id: 27 };
        let api = {
          user: {
            signup: sinon.stub().callsArgWith(1, null, user),
          }
        };

        let expectedActions = [
          { type: 'SIGNUP_REQUEST' },
          { type: 'SIGNUP_SUCCESS', payload: { user: { id: 27 } } },
          { type: '@@router/CALL_HISTORY_METHOD', payload: { args: [ '/email-verification' ], method: 'push' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.signup(api, {foo: 'bar'}));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(trackMetric.calledWith('Signed Up')).to.be.true;
      });

      it('should trigger ACCEPT_TERMS_REQUEST if the user user accepted terms in the signup form', () => {
        const acceptedDate = new Date().toISOString();
        const loggedInUserId = false;
        const termsData = { termsAccepted: acceptedDate };
        const user = {
          id: 27,
        };

        const initialStateForTest = _.merge({}, initialState, { blip: { loggedInUserId } });

        const api = {
          user: {
            signup: sinon.stub().callsArgWith(1, null, user),
            acceptTerms: sinon.stub().callsArgWith(1, null, user),
          }
        };

        const accountDetails = {
          termsAccepted: acceptedDate,
        }

        const store = mockStore(initialStateForTest);
        store.dispatch(async.signup(api, accountDetails));

        const actions = store.getActions();

        const action = _.find(actions, { type: 'ACCEPT_TERMS_REQUEST' });
        expect(isTSA(action)).to.be.true;
      });

      it('[409] should trigger SIGNUP_FAILURE and it should call signup once and get zero times for a failed signup request', () => {
        let user = { id: 27 };
        let api = {
          user: {
            signup: sinon.stub().callsArgWith(1, {status: 409, body: 'Error!'}, null),
          }
        };

        let err = new Error(ErrorMessages.ERR_ACCOUNT_ALREADY_EXISTS);
        err.status = 409;

        let expectedActions = [
          { type: 'SIGNUP_REQUEST' },
          { type: 'SIGNUP_FAILURE', error: err, meta: { apiError: {status: 409, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.signup(api, {foo: 'bar'}));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_ACCOUNT_ALREADY_EXISTS });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.signup.callCount).to.equal(1);
      });

      it('[500] should trigger SIGNUP_FAILURE and it should call signup once and get zero times for a failed signup request', () => {
        let user = { id: 27 };
        let api = {
          user: {
            signup: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_SIGNUP);
        err.status = 500;

        let expectedActions = [
          { type: 'SIGNUP_REQUEST' },
          { type: 'SIGNUP_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.signup(api, {foo: 'bar'}));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_SIGNUP });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.signup.callCount).to.equal(1);
      });
    });

    describe('confirmSignup', () => {
      it('should trigger CONFIRM_SIGNUP_SUCCESS and it should call confirmSignup once for a successful request', () => {
        let user = { id: 27 };
        let api = {
          user: {
            confirmSignUp: sinon.stub().callsArgWith(1, null)
          }
        };

        let expectedActions = [
          { type: 'CONFIRM_SIGNUP_REQUEST' },
          { type: 'CONFIRM_SIGNUP_SUCCESS' }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.confirmSignup(api, 'fakeSignupKey'));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.confirmSignUp.calledWith('fakeSignupKey')).to.be.true;
        expect(api.user.confirmSignUp.callCount).to.equal(1);
      });

      it('should trigger CONFIRM_SIGNUP_FAILURE and it should call confirmSignup once for a failed request', () => {
        let user = { id: 27 };
        let api = {
          user: {
            confirmSignUp: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_CONFIRMING_SIGNUP);
        err.status = 500;

        let expectedActions = [
          { type: 'CONFIRM_SIGNUP_REQUEST' },
          { type: 'CONFIRM_SIGNUP_FAILURE', error: err, payload: { signupKey: 'fakeSignupKey' }, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.confirmSignup(api, 'fakeSignupKey'));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_CONFIRMING_SIGNUP });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.confirmSignUp.calledWith('fakeSignupKey')).to.be.true;
        expect(api.user.confirmSignUp.callCount).to.equal(1);
      });

      it('[409] should trigger CONFIRM_SIGNUP_FAILURE and it should call confirmSignup once for a failed request and redirect for password creation', () => {
        let user = { id: 27 };
        let api = {
          user: {
            confirmSignUp: sinon.stub().callsArgWith(1, {status: 409, message: 'User does not have a password'})
          }
        };

        let err = new Error(ErrorMessages.ERR_CONFIRMING_SIGNUP);
        err.status = 409;

        let expectedActions = [
          { type: 'CONFIRM_SIGNUP_REQUEST' },
          { type: 'CONFIRM_SIGNUP_FAILURE', error: err, payload: { signupKey: 'fakeSignupKey' }, meta: { apiError: {status: 409, message: 'User does not have a password'} } },
          { type: '@@router/CALL_HISTORY_METHOD', payload: { args: [ '/verification-with-password?signupKey=fakeSignupKey&signupEmail=g@a.com' ], method: 'push' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.confirmSignup(api, 'fakeSignupKey', 'g@a.com'));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_CONFIRMING_SIGNUP });
        expectedActions[1].error = actions[1].error;

        expect(actions).to.eql(expectedActions);
        expect(api.user.confirmSignUp.calledWith('fakeSignupKey')).to.be.true;
        expect(api.user.confirmSignUp.callCount).to.equal(1);
      });
    });

    describe('verifyCustodial', () => {
      it('should trigger ACKNOWLEDGE_NOTIFICATION for the confirmingSignup notification if set', () => {
        let user = { id: 27 };
        let key = 'fakeSignupKey';
        let email = 'g@a.com';
        let birthday = '07/18/1988';
        let password = 'foobar01';
        let creds = { username: email, password: password };
        let api = {
          user: {
            custodialConfirmSignUp: sinon.stub().callsArgWith(3, null),
            login: sinon.stub().callsArgWith(2, null),
            get: sinon.stub().callsArgWith(0, null, user)
          }
        };

        let expectedAction = { type: 'ACKNOWLEDGE_NOTIFICATION', payload: { acknowledgedNotification: 'confirmingSignup' } };

        let initialStateForTest = _.merge({}, initialState, { blip: { working: { confirmingSignup: { notification: 'hi' } } } });

        let store = mockStore(initialStateForTest);
        store.dispatch(async.verifyCustodial(api, key, email, birthday, password));

        const actions = store.getActions();
        expect(actions[0]).to.eql(expectedAction);
      });

      it('should trigger VERIFY_CUSTODIAL_SUCCESS and it should call verifyCustodial once for a successful request', () => {
        let user = { id: 27, emailVerified: true };
        let key = 'fakeSignupKey';
        let email = 'g@a.com';
        let birthday = '07/18/1988';
        let password = 'foobar01';
        let creds = { username: email, password: password };
        let api = {
          user: {
            custodialConfirmSignUp: sinon.stub().callsArgWith(3, null),
            login: sinon.stub().callsArgWith(2, null),
            get: sinon.stub().callsArgWith(0, null, user)
          }
        };

        let expectedActions = [
          { type: 'VERIFY_CUSTODIAL_REQUEST' },
          { type: 'LOGIN_REQUEST' },
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_SUCCESS', payload: { user: user } },
          { type: 'LOGIN_SUCCESS', payload: { user: user } },
          { type: 'VERIFY_CUSTODIAL_SUCCESS' },
          { type: '@@router/CALL_HISTORY_METHOD', payload: { args: [ '/patients?justLoggedIn=true' ], method: 'push' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let initialStateForTest = _.merge({}, initialState, { blip: { working: { confirmingSignup: { notification: null } } } });

        let store = mockStore(initialStateForTest);
        store.dispatch(async.verifyCustodial(api, key, email, birthday, password));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);

        expect(api.user.custodialConfirmSignUp.calledWith(key, birthday, password)).to.be.true;
        expect(api.user.custodialConfirmSignUp.callCount).to.equal(1);

        expect(trackMetric.calledWith('VCA Home Verification - Verified')).to.be.true;
        expect(trackMetric.calledWith('Logged In')).to.be.true;
      });

      it('should trigger VERIFY_CUSTODIAL_FAILURE and it should call verifyCustodial once for a failed request', () => {
        let user = { id: 27 };
        let key = 'fakeSignupKey';
        let email = 'g@a.com';
        let birthday = '07/18/1988';
        let password = 'foobar01';
        let api = {
          user: {
            custodialConfirmSignUp: sinon.stub().callsArgWith(3, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_CONFIRMING_SIGNUP);
        err.status = 500;

        let expectedActions = [
          { type: 'VERIFY_CUSTODIAL_REQUEST' },
          { type: 'VERIFY_CUSTODIAL_FAILURE', error: err, payload: { signupKey: 'fakeSignupKey' }, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let initialStateForTest = _.merge({}, initialState, { blip: { working: { confirmingSignup: { notification: null } } } });

        let store = mockStore(initialStateForTest);
        store.dispatch(async.verifyCustodial(api, key, email, birthday, password));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_CONFIRMING_SIGNUP });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.custodialConfirmSignUp.calledWith(key, birthday, password)).to.be.true;
        expect(api.user.custodialConfirmSignUp.callCount).to.equal(1);
      });
    });

    describe('resendEmailVerification', () => {
      it('should trigger RESEND_EMAIL_VERIFICATION_SUCCESS and it should call resendEmailVerification once for a successful request', () => {
        const email = 'foo@bar.com';
        let api = {
          user: {
            resendEmailVerification: sinon.stub().callsArgWith(1, null)
          }
        };

        let expectedActions = [
          { type: 'RESEND_EMAIL_VERIFICATION_REQUEST' },
          { type: 'RESEND_EMAIL_VERIFICATION_SUCCESS', payload: {notification: {type: 'alert', message: 'We just sent you an e-mail.'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.resendEmailVerification(api, email));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.resendEmailVerification.calledWith(email)).to.be.true;
        expect(api.user.resendEmailVerification.callCount).to.equal(1);
      });

      it('should trigger RESEND_EMAIL_VERIFICATION_FAILURE and it should call resendEmailVerification once for a failed request', () => {
        const email = 'foo@bar.com';
        let api = {
          user: {
            resendEmailVerification: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_RESENDING_EMAIL_VERIFICATION);
        err.status = 500;

        let expectedActions = [
          { type: 'RESEND_EMAIL_VERIFICATION_REQUEST' },
          { type: 'RESEND_EMAIL_VERIFICATION_FAILURE', error: err, meta: {apiError: {status: 500, body: 'Error!'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.resendEmailVerification(api, email));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_RESENDING_EMAIL_VERIFICATION });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.resendEmailVerification.calledWith(email)).to.be.true;
        expect(api.user.resendEmailVerification.callCount).to.equal(1);
      });
    });

    describe('acceptTerms', () => {
      it('should trigger ACCEPT_TERMS_SUCCESS and it should call acceptTerms once for a successful request', () => {
        let acceptedDate = new Date();
        let loggedInUserId = 500;
        let termsData = { termsAccepted: new Date() };
        let api = {
          user: {
            acceptTerms: sinon.stub().callsArgWith(1, null)
          }
        };

        let expectedActions = [
          { type: 'ACCEPT_TERMS_REQUEST' },
          { type: 'ACCEPT_TERMS_SUCCESS', payload: { userId: loggedInUserId, acceptedDate: acceptedDate } },
          { type: '@@router/CALL_HISTORY_METHOD', payload: { args: [ '/patients?justLoggedIn=true' ], method: 'push' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let initialStateForTest = _.merge({}, initialState, { blip: { loggedInUserId: loggedInUserId } });

        let store = mockStore(initialStateForTest);
        store.dispatch(async.acceptTerms(api, acceptedDate));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.acceptTerms.calledWith(termsData)).to.be.true;
        expect(api.user.acceptTerms.callCount).to.equal(1);
      });

      it('should trigger ACCEPT_TERMS_SUCCESS and it should call acceptTerms once for a successful request, routing to clinic info for clinician', () => {
        let acceptedDate = new Date();
        let loggedInUserId = 500;
        let termsData = { termsAccepted: new Date() };
        let user = {
          roles: ['clinic']
        };
        let api = {
          user: {
            acceptTerms: sinon.stub().callsArgWith(1, null, user)
          }
        };

        let expectedActions = [
          { type: 'ACCEPT_TERMS_REQUEST' },
          { type: 'ACCEPT_TERMS_SUCCESS', payload: { userId: loggedInUserId, acceptedDate: acceptedDate } },
          { type: '@@router/CALL_HISTORY_METHOD', payload: { args: [ '/clinician-details' ], method: 'push' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let initialStateForTest = _.merge({}, initialState, { blip: { loggedInUserId: loggedInUserId } });

        let store = mockStore(initialStateForTest);
        store.dispatch(async.acceptTerms(api, acceptedDate));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.acceptTerms.calledWith(termsData)).to.be.true;
        expect(api.user.acceptTerms.callCount).to.equal(1);
      });

      it('should trigger ACCEPT_TERMS_SUCCESS and should not trigger a route transition if the user is not logged in', () => {
        let acceptedDate = new Date();
        let loggedInUserId = false;
        let termsData = { termsAccepted: new Date() };
        let user = {
          id: 27,
          roles: ['clinic'],
        };
        let api = {
          user: {
            acceptTerms: sinon.stub().callsArgWith(1, null, user)
          }
        };

        let expectedActions = [
          { type: 'ACCEPT_TERMS_REQUEST' },
          { type: 'ACCEPT_TERMS_SUCCESS', payload: { userId: user.id, acceptedDate: acceptedDate } },
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let initialStateForTest = _.merge({}, initialState, { blip: { loggedInUserId: loggedInUserId } });

        let store = mockStore(initialStateForTest);
        store.dispatch(async.acceptTerms(api, acceptedDate, user.id));

        const actions = store.getActions();

        expect(actions).to.eql(expectedActions);
        expect(api.user.acceptTerms.calledWith(termsData)).to.be.true;
        expect(api.user.acceptTerms.callCount).to.equal(1);

        expect(_.find(actions, { type: '@@router/CALL_HISTORY_METHOD' })).to.be.undefined;
      });

      it('should trigger ACCEPT_TERMS_FAILURE and it should call acceptTerms once for a failed request', () => {
        let acceptedDate = new Date();
        let termsData = { termsAccepted: acceptedDate };
        let loggedInUserId = 500;
        let api = {
          user: {
            acceptTerms: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_ACCEPTING_TERMS);
        err.status = 500;

        let expectedActions = [
          { type: 'ACCEPT_TERMS_REQUEST' },
          { type: 'ACCEPT_TERMS_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let initialStateForTest = _.merge({}, initialState, { blip: { loggedInUserId: loggedInUserId } });

        let store = mockStore(initialStateForTest);
        store.dispatch(async.acceptTerms(api, acceptedDate));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_ACCEPTING_TERMS });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.acceptTerms.calledWith(termsData)).to.be.true;
        expect(api.user.acceptTerms.callCount).to.equal(1);
      });
    });

    describe('login', () => {
      it('should trigger LOGIN_SUCCESS and it should call login and user.get once for a successful request', () => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27, emailVerified: true };
        let api = {
          user: {
            login: sinon.stub().callsArgWith(2, null),
            get: sinon.stub().callsArgWith(0, null, user)
          }
        };

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_SUCCESS', payload: { user: user } },
          { type: 'LOGIN_SUCCESS', payload: { user: user } },
          { type: '@@router/CALL_HISTORY_METHOD', payload: { args: [ '/patients?justLoggedIn=true' ], method: 'push' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });



        let store = mockStore({ blip: initialState });
        store.dispatch(async.login(api, creds));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.login.calledWith(creds)).to.be.true;
        expect(api.user.get.callCount).to.equal(1);
        expect(trackMetric.calledWith('Logged In')).to.be.true;
      });

      it('should trigger LOGIN_SUCCESS and it should call login, user.get and patient.get once for a successful request', () => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27, profile: { patient: true }, emailVerified: true };
        let patient = { foo: 'bar' };

        let api = {
          user: {
            login: sinon.stub().callsArgWith(2, null),
            get: sinon.stub().callsArgWith(0, null, user)
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_SUCCESS', payload: { user: user } },
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_SUCCESS', payload: { patient: patient } },
          { type: 'LOGIN_SUCCESS', payload: { user: _.merge({}, user, patient) } },
          { type: '@@router/CALL_HISTORY_METHOD', payload: { args: [ '/patients?justLoggedIn=true' ], method: 'push' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });

        store.dispatch(async.login(api, creds));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.login.calledWith(creds)).to.be.true;
        expect(api.user.get.callCount).to.equal(1);
        expect(api.patient.get.callCount).to.equal(1);
        expect(trackMetric.calledWith('Logged In')).to.be.true;
      });

      it('should trigger LOGIN_SUCCESS and it should redirect a clinician with no clinic profile to the clinician details form', () => {
        const creds = { username: 'bruce', password: 'wayne' };
        const user = { id: 27, roles: [ 'clinic' ], profile: {}, emailVerified: true };
        const patient = { foo: 'bar' };

        const api = {
          user: {
            login: sinon.stub().callsArgWith(2, null),
            get: sinon.stub().callsArgWith(0, null, user)
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        const expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_SUCCESS', payload: { user: user } },
          { type: 'LOGIN_SUCCESS', payload: { user } },
          { type: '@@router/CALL_HISTORY_METHOD', payload: { method: 'push', args: [ '/clinician-details' ] } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        const store = mockStore(initialState);

        store.dispatch(async.login(api, creds));

        const actions = store.getActions();

        expect(actions).to.eql(expectedActions);
        expect(api.user.login.calledWith(creds)).to.be.true;
        expect(api.user.get.callCount).to.equal(1);
        expect(trackMetric.calledWith('Logged In')).to.be.true;
      });


      it('should trigger LOGIN_SUCCESS and it should redirect a clinician with a clinic profile to the patients view', () => {
        const creds = { username: 'bruce', password: 'wayne' };
        const user = { id: 27, roles: ['clinic'], profile: { clinic: true }, emailVerified: true };
        const patient = { foo: 'bar' };

        const api = {
          user: {
            login: sinon.stub().callsArgWith(2, null),
            get: sinon.stub().callsArgWith(0, null, user)
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        const expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_SUCCESS', payload: { user: user } },
          { type: 'LOGIN_SUCCESS', payload: { user } },
          { type: '@@router/CALL_HISTORY_METHOD', payload: { method: 'push', args: ['/patients?justLoggedIn=true'] } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        const store = mockStore(initialState);

        store.dispatch(async.login(api, creds));

        const actions = store.getActions();

        expect(actions).to.eql(expectedActions);
        expect(api.user.login.calledWith(creds)).to.be.true;
        expect(api.user.get.callCount).to.equal(1);
        expect(trackMetric.calledWith('Logged In')).to.be.true;
      });

      it('[400] should trigger LOGIN_FAILURE and it should call login once and user.get zero times for a failed login request', () => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27 };
        let api = {
          user: {
            login: sinon.stub().callsArgWith(2, {status: 400, body: 'Error!'}),
            get: sinon.stub()
          }
        };

        let err = new Error(ErrorMessages.ERR_LOGIN);
        err.status = 400;

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'LOGIN_FAILURE', error: err, payload: null, meta: { apiError: {status: 400, body: 'Error!'}}}
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.login(api, creds));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_LOGIN });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.login.calledWith(creds)).to.be.true;
        expect(api.user.login.callCount).to.equal(1);
        expect(api.user.get.callCount).to.equal(0);
      });

      it('[401] should trigger LOGIN_FAILURE and it should call login once and user.get zero times for a failed login because of wrong password request', () => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27 };
        let api = {
          user: {
            login: sinon.stub().callsArgWith(2, {status: 401, body: 'Wrong password!'}),
            get: sinon.stub()
          }
        };

        let err = new Error(ErrorMessages.ERR_LOGIN_CREDS);
        err.status = 401;

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'LOGIN_FAILURE', error: err, payload: null, meta: { apiError: {status: 401, body: 'Wrong password!'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.login(api, creds));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_LOGIN_CREDS });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.login.calledWith(creds)).to.be.true;
        expect(api.user.login.callCount).to.equal(1);
        expect(api.user.get.callCount).to.equal(0);
      });

      it('[403] should trigger LOGIN_FAILURE and it should call login once and user.get zero times for a failed login because of unverified e-mail', () => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27 };
        let api = {
          user: {
            login: sinon.stub().callsArgWith(2, {status: 403, body: 'E-mail not verified!'}),
            get: sinon.stub()
          }
        };

        let err = null;
        let payload = {isLoggedIn: false, emailVerificationSent: false};

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'LOGIN_FAILURE', error: err, payload: payload, meta: { apiError: {status: 403, body: 'E-mail not verified!'}} },
          { type: '@@router/CALL_HISTORY_METHOD', payload: { args: [ '/email-verification' ], method: 'push' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.login(api, creds));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.login.calledWith(creds)).to.be.true;
        expect(api.user.login.callCount).to.equal(1);
        expect(api.user.get.callCount).to.equal(0);
      });

      it('[500 on user fetch] should trigger LOGIN_FAILURE and it should call login and user.get once for a failed user.get request', () => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27 };
        let api = {
          user: {
            login: sinon.stub().callsArgWith(2, null),
            get: sinon.stub().callsArgWith(0, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_USER);
        err.status = 500;

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } },
          { type: 'LOGIN_FAILURE', error: err, payload: null, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.login(api, creds));

        const actions = store.getActions();
        expect(actions[2].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_USER });
        expectedActions[2].error = actions[2].error;
        expect(actions[3].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_USER });
        expectedActions[3].error = actions[3].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.login.calledWith(creds)).to.be.true;
        expect(api.user.login.callCount).to.equal(1);
        expect(api.user.get.callCount).to.equal(1);
      });

      it('[500 on patient fetch] should trigger LOGIN_FAILURE and it should call login, user.get, and patient.get once for a failed patient.get request', () => {
        let creds = { username: 'bruce', password: 'wayne' };
        let user = { id: 27, profile: { patient: true}, emailVerified: true };
        let api = {
          patient: {
            get: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          },
          user: {
            login: sinon.stub().callsArgWith(2, null),
            get: sinon.stub().callsArgWith(0, null, user)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_PATIENT);
        err.status = 500;

        let expectedActions = [
          { type: 'LOGIN_REQUEST' },
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_SUCCESS', payload: { user: user }},
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_FAILURE', error: err, payload: { link: null }, meta: { apiError: {status: 500, body: 'Error!'} } },
          { type: 'LOGIN_FAILURE', error: err, payload: null, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.login(api, creds));

        const actions = store.getActions();
        expect(actions[4].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_PATIENT });
        expectedActions[4].error = actions[4].error;
        expect(actions[5].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_PATIENT });
        expectedActions[5].error = actions[5].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.login.calledWith(creds)).to.be.true;
        expect(api.user.login.callCount).to.equal(1);
        expect(api.user.get.callCount).to.equal(1);
        expect(api.patient.get.callCount).to.equal(1);
      });
    });

    describe('logout', () => {
      it('should trigger LOGOUT_SUCCESS and it should call logout once for a successful request', () => {
        let api = {
          user: {
            logout: sinon.stub().callsArgWith(0, null)
          }
        };

        let expectedActions = [
          { type: 'LOGOUT_REQUEST' },
          { type: 'DATA_WORKER_REMOVE_DATA_REQUEST', meta: { WebWorker: true, worker: 'data', origin: 'originStub', patientId: 'abc123' }, payload: { predicate: undefined } },
          { type: 'LOGOUT_SUCCESS' },
          { type: '@@router/CALL_HISTORY_METHOD', payload: { args: [ '/' ], method: 'push' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: { ...initialState, currentPatientInViewId: 'abc123' } });
        store.dispatch(async.logout(api));

        const actions = store.getActions();
        actions[1].meta.origin = 'originStub';

        expect(actions).to.eql(expectedActions);
        expect(api.user.logout.callCount).to.equal(1);
        expect(trackMetric.calledWith('Logged Out')).to.be.true;
      });
    });

    describe('setupDataStorage', () => {
      it('should trigger SETUP_DATA_STORAGE_SUCCESS and it should call setupDataStorage once for a successful request', () => {
        let loggedInUserId = 500;
        let patient = { userid: 27, name: 'Bruce' };
        let api = {
          patient: {
            post: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'SETUP_DATA_STORAGE_REQUEST' },
          { type: 'SETUP_DATA_STORAGE_SUCCESS', payload: { userId: loggedInUserId, patient: patient } },
          { type: '@@router/CALL_HISTORY_METHOD', payload: { args: [ '/patients/27/data' ], method: 'push' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let initialStateForTest = _.merge({}, initialState, { blip: { loggedInUserId: loggedInUserId } });

        let store = mockStore(initialStateForTest);
        store.dispatch(async.setupDataStorage(api, patient));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.patient.post.calledWith(patient)).to.be.true;
        expect(api.patient.post.callCount).to.equal(1);
        expect(trackMetric.calledWith('Created Profile')).to.be.true;
      });

      it('should trigger SETUP_DATA_STORAGE_FAILURE and it should call setupDataStorage once for a failed request', () => {
        let loggedInUserId = 500;
        let patient = { id: 27, name: 'Bruce' };
        let api = {
          patient: {
            post: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_DSA_SETUP);
        err.status = 500;

        let expectedActions = [
          { type: 'SETUP_DATA_STORAGE_REQUEST' },
          { type: 'SETUP_DATA_STORAGE_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let initialStateForTest = _.merge({}, initialState, { blip: { loggedInUserId: loggedInUserId } });

        let store = mockStore(initialStateForTest);
        store.dispatch(async.setupDataStorage(api, patient));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_DSA_SETUP });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.patient.post.calledWith(patient)).to.be.true;
        expect(api.patient.post.callCount).to.equal(1);
      });
    });

    describe('removeMembershipInOtherCareTeam', () => {
      it('should trigger REMOVE_MEMBERSHIP_IN_OTHER_CARE_TEAM_SUCCESS and it should call leaveGroup and patient.getAll once for a successful request', () => {
        let patientId = 27;
        let patients = [
          { id: 200 },
          { id: 101 }
        ]
        let api = {
          access: {
            leaveGroup: sinon.stub().callsArgWith(1, null)
          },
          user: {
            getAssociatedAccounts: sinon.stub().callsArgWith(0, null, { patients })
          },
        };

        let expectedActions = [
          { type: 'REMOVE_MEMBERSHIP_IN_OTHER_CARE_TEAM_REQUEST' },
          { type: 'REMOVE_MEMBERSHIP_IN_OTHER_CARE_TEAM_SUCCESS', payload: { removedPatientId: patientId } },
          { type: 'FETCH_ASSOCIATED_ACCOUNTS_REQUEST' },
          { type: 'FETCH_ASSOCIATED_ACCOUNTS_SUCCESS', payload: { patients } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        const callback = sinon.stub();

        store.dispatch(async.removeMembershipInOtherCareTeam(api, patientId, callback));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.access.leaveGroup.calledWith(patientId)).to.be.true;
        expect(api.access.leaveGroup.callCount).to.equal(1)
        expect(api.user.getAssociatedAccounts.callCount).to.equal(1);
        // assert callback contains no error
        sinon.assert.calledOnce(callback);
        sinon.assert.calledWithExactly(callback, null);
      });

      it('should trigger REMOVE_MEMBERSHIP_IN_OTHER_CARE_TEAM_FAILURE and it should call removeMembershipInOtherCareTeam once for a failed request', () => {
        let patientId = 27;
        let error = {status: 500, body: 'Error!'};
        let api = {
          access: {
            leaveGroup: sinon.stub().callsArgWith(1, error)
          }
        };

        let err = new Error(ErrorMessages.ERR_REMOVING_MEMBERSHIP);
        err.status = 500;

        let expectedActions = [
          { type: 'REMOVE_MEMBERSHIP_IN_OTHER_CARE_TEAM_REQUEST' },
          { type: 'REMOVE_MEMBERSHIP_IN_OTHER_CARE_TEAM_FAILURE', error: err, meta: { apiError: error } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        const callback = sinon.stub();

        store.dispatch(async.removeMembershipInOtherCareTeam(api, patientId, callback));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_REMOVING_MEMBERSHIP });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.access.leaveGroup.calledWith(patientId)).to.be.true;
        expect(api.access.leaveGroup.callCount).to.equal(1);
        // assert callback contains the error
        sinon.assert.calledOnce(callback);
        sinon.assert.calledWithExactly(callback, error);
      });
    });

    describe('removeMemberFromTargetCareTeam', () => {
      it('should trigger REMOVE_MEMBER_FROM_TARGET_CARE_TEAM_SUCCESS and it should call api.access.removeMember and callback once for a successful request', () => {
        let memberId = 27;
        let patientId = 456;
        let patient = { id: 546, name: 'Frank' };
        let api = {
          access: {
            removeMember: sinon.stub().callsArgWith(1, null)
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'REMOVE_MEMBER_FROM_TARGET_CARE_TEAM_REQUEST' },
          { type: 'REMOVE_MEMBER_FROM_TARGET_CARE_TEAM_SUCCESS', payload: { removedMemberId: memberId } },
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_SUCCESS', payload: { patient: patient } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        const callback = sinon.stub();

        store.dispatch(async.removeMemberFromTargetCareTeam(api, patientId, memberId, callback));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.access.removeMember.withArgs(memberId).callCount).to.equal(1);
        expect(api.patient.get.withArgs(patientId).callCount).to.equal(1);

        // assert callback contains no error, and the memberId
        sinon.assert.calledOnce(callback);
        sinon.assert.calledWithExactly(callback, null, memberId);
      });

      it('should trigger REMOVE_MEMBER_FROM_TARGET_CARE_TEAM_FAILURE and it should call api.access.removeMember and callback once with error for a failed request', () => {
        let memberId = 27;
        let patientId = 420;
        const error = { status: 500, body: 'Error!' };
        let api = {
          access: {
            removeMember: sinon.stub().callsArgWith(1, error)
          }
        };

        let err = new Error(ErrorMessages.ERR_REMOVING_MEMBER);
        err.status = 500;

        let expectedActions = [
          { type: 'REMOVE_MEMBER_FROM_TARGET_CARE_TEAM_REQUEST' },
          { type: 'REMOVE_MEMBER_FROM_TARGET_CARE_TEAM_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        const callback = sinon.stub();

        store.dispatch(async.removeMemberFromTargetCareTeam(api, patientId, memberId, callback));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_REMOVING_MEMBER });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.access.removeMember.calledWith(memberId)).to.be.true;

        // assert callback contains the error
        sinon.assert.calledOnce(callback);
        sinon.assert.calledWithExactly(callback, error, memberId);
      });
    });

    describe('sendInvite', () => {
      it('should trigger SEND_INVITE_SUCCESS and it should call api.invitation.send and callback once for a successful request', () => {
        let email = 'a@b.com';
        let permissions = {
          view: true
        };
        let invite = { foo: 'bar' };
        let api = {
          invitation: {
            send: sinon.stub().callsArgWith(2, null, invite)
          }
        };

        let expectedActions = [
          { type: 'SEND_INVITE_REQUEST' },
          { type: 'SEND_INVITE_SUCCESS', payload: { invite: invite } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        const callback = sinon.stub();

        store.dispatch(async.sendInvite(api, email, permissions, callback));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.send.calledWith(email, permissions)).to.be.true;

        // assert callback contains no error, and the invite
        sinon.assert.calledOnce(callback);
        sinon.assert.calledWithExactly(callback, null, invite);
      });

      it('should trigger FETCH_PENDING_SENT_INVITES_REQUEST once for a successful request for a data donation account', () => {
        let email = 'a@b.com';
        let permissions = {
          view: true
        };
        let invite = { email: TIDEPOOL_DATA_DONATION_ACCOUNT_EMAIL };
        let api = {
          invitation: {
            send: sinon.stub().callsArgWith(2, null, invite),
            getSent: sinon.stub(),
          }
        };

        let expectedActions = [
          { type: 'SEND_INVITE_REQUEST' },
          { type: 'FETCH_PENDING_SENT_INVITES_REQUEST' },
          { type: 'SEND_INVITE_SUCCESS', payload: { invite: invite } },
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        const callback = sinon.stub();

        store.dispatch(async.sendInvite(api, email, permissions, callback));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.send.calledWith(email, permissions)).to.be.true;

        // assert callback contains no error, and the invite
        sinon.assert.calledOnce(callback);
        sinon.assert.calledWithExactly(callback, null, invite);
      });

      it('should trigger SEND_INVITE_FAILURE when invite has already been sent to the e-mail', () => {
        let email = 'a@b.com';
        let permissions = {
          view: true
        };
        let invitation = { foo: 'bar' };
        const error = { status: 409, body: 'Error!' };
        let api = {
          invitation: {
            send: sinon.stub().callsArgWith(2, error)
          }
        };

        let err = new Error(ErrorMessages.ERR_ALREADY_SENT_TO_EMAIL);
        err.status = 409;

        let expectedActions = [
          { type: 'SEND_INVITE_REQUEST' },
          { type: 'SEND_INVITE_FAILURE', error: err, meta: { apiError: {status: 409, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        const callback = sinon.stub();

        store.dispatch(async.sendInvite(api, email, permissions, callback));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_ALREADY_SENT_TO_EMAIL });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.send.calledWith(email, permissions)).to.be.true;

        // assert callback contains the error
        sinon.assert.calledOnce(callback);
        sinon.assert.calledWithExactly(callback, error, undefined);
      });

      it('should trigger SEND_INVITE_FAILURE and it should call api.invitation.send and callback once with error for a failed request', () => {
        let email = 'a@b.com';
        let permissions = {
          view: true
        };
        let invitation = { foo: 'bar' };
        const error = { status: 500, body: 'Error!' };
        let api = {
          invitation: {
            send: sinon.stub().callsArgWith(2, error)
          }
        };

        let err = new Error(ErrorMessages.ERR_SENDING_INVITE);
        err.status = 500;

        let expectedActions = [
          { type: 'SEND_INVITE_REQUEST' },
          { type: 'SEND_INVITE_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        const callback = sinon.stub();

        store.dispatch(async.sendInvite(api, email, permissions, callback));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_SENDING_INVITE });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.send.calledWith(email, permissions)).to.be.true;

        // assert callback contains the error
        sinon.assert.calledOnce(callback);
        sinon.assert.calledWithExactly(callback, error, undefined);
      });
    });

    describe('cancelSentInvite', () => {
      it('should trigger CANCEL_SENT_INVITE_SUCCESS and it should call api.invitation.cancel and callback once for a successful request', () => {
        let email = 'a@b.com';
        let api = {
          invitation: {
            cancel: sinon.stub().callsArgWith(1, null)
          }
        };

        let expectedActions = [
          { type: 'CANCEL_SENT_INVITE_REQUEST' },
          { type: 'CANCEL_SENT_INVITE_SUCCESS', payload: { removedEmail: email } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        const callback = sinon.stub();

        store.dispatch(async.cancelSentInvite(api, email, callback));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.cancel.calledWith(email)).to.be.true;

        // assert callback contains no error, and the email
        sinon.assert.calledOnce(callback);
        sinon.assert.calledWithExactly(callback, null, email);
      });

      it('should trigger CANCEL_SENT_INVITE_FAILURE and it should call api.invitation.send and callback once with error for a failed request', () => {
        let email = 'a@b.com';
        const error = { status: 500, body: 'Error!' };
        let api = {
          invitation: {
            cancel: sinon.stub().callsArgWith(1, error)
          }
        };

        let err = new Error(ErrorMessages.ERR_CANCELLING_INVITE);
        err.status = 500;

        let expectedActions = [
          { type: 'CANCEL_SENT_INVITE_REQUEST' },
          { type: 'CANCEL_SENT_INVITE_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        const callback = sinon.stub();

        store.dispatch(async.cancelSentInvite(api, email, callback));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_CANCELLING_INVITE });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.cancel.calledWith(email)).to.be.true;

        // assert callback contains the error
        sinon.assert.calledOnce(callback);
        sinon.assert.calledWithExactly(callback, error, email);
      });
    });

    describe('updateDataDonationAccounts', () => {
      it('should trigger UPDATE_DATA_DONATION_ACCOUNTS_SUCCESS and it should add and remove accounts for a successful request', () => {
        let addAccounts = [
          TIDEPOOL_DATA_DONATION_ACCOUNT_EMAIL,
        ];

        let removeAccounts = [
          { email: 'bigdata+NSF@tidepool.org' },
        ];

        let api = {
          invitation: {
            send: sinon.stub().callsArgWith(2, null, { email: TIDEPOOL_DATA_DONATION_ACCOUNT_EMAIL }),
            cancel: sinon.stub().callsArgWith(1, null, { removedEmail: 'bigdata+NSF@tidepool.org' }),
            getSent: sinon.stub(),
          }
        };

        let expectedActions = [
          { type: 'UPDATE_DATA_DONATION_ACCOUNTS_REQUEST' },
          { type: 'SEND_INVITE_REQUEST'},
          { type: 'FETCH_PENDING_SENT_INVITES_REQUEST'},
          { type: 'SEND_INVITE_SUCCESS', payload: { invite: { email: TIDEPOOL_DATA_DONATION_ACCOUNT_EMAIL } } },
          { type: 'CANCEL_SENT_INVITE_REQUEST' },
          { type: 'CANCEL_SENT_INVITE_SUCCESS', payload: { removedEmail: 'bigdata+NSF@tidepool.org' } },
          { type: 'UPDATE_DATA_DONATION_ACCOUNTS_SUCCESS', payload: { dataDonationAccounts: {
            addAccounts: _.map(addAccounts, email => ({ email: email })),
            removeAccounts: _.map(removeAccounts, account => account.email),
          }}}
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(_.assign({}, initialState, {
          blip: { loggedInUserId: 1234 },
        }));

        store.dispatch(async.updateDataDonationAccounts(api, addAccounts, removeAccounts));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
      });

      it('should trigger UPDATE_DATA_DONATION_ACCOUNTS_FAILURE and it should call error once for a failed add account request', () => {
        let addAccounts = [
          TIDEPOOL_DATA_DONATION_ACCOUNT_EMAIL,
        ];

        let removeAccounts = [
          { email: 'bigdata+NSF@tidepool.org' },
        ];

        let err = new Error(ErrorMessages.ERR_UPDATING_DATA_DONATION_ACCOUNTS);
        err.status = 500;

        let sendErr = new Error(ErrorMessages.ERR_SENDING_INVITE);
        sendErr.status = 500;

        let api = {
          invitation: {
            send: sinon.stub().callsArgWith(2, { status: 500, body: 'Error!' } , null),
            cancel: sinon.stub().callsArgWith(1, null, { removedEmail: 'bigdata+NSF@tidepool.org' }),
            getSent: sinon.stub(),
          }
        };

        let expectedActions = [
          { type: 'UPDATE_DATA_DONATION_ACCOUNTS_REQUEST' },
          { type: 'SEND_INVITE_REQUEST' },
          { type: 'SEND_INVITE_FAILURE', error: sendErr, meta: { apiError: { status: 500, body: 'Error!' } } },
          { type: 'CANCEL_SENT_INVITE_REQUEST' },
          { type: 'CANCEL_SENT_INVITE_SUCCESS', payload: { removedEmail: 'bigdata+NSF@tidepool.org' } },
          { type: 'UPDATE_DATA_DONATION_ACCOUNTS_FAILURE', error: err, meta: { apiError: { status: 500, body: 'Error!' } } },
        ];

        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore(_.assign({}, initialState, {
          blip: { loggedInUserId: 1234 },
        }));

        store.dispatch(async.updateDataDonationAccounts(api, addAccounts, removeAccounts));

        const actions = store.getActions();
        expect(actions[2].error).to.deep.include({ message: ErrorMessages.ERR_SENDING_INVITE });
        expectedActions[2].error = actions[2].error;
        expect(actions[5].error).to.deep.include({ message: ErrorMessages.ERR_UPDATING_DATA_DONATION_ACCOUNTS });
        expectedActions[5].error = actions[5].error;
        expect(actions).to.eql(expectedActions);
      });
    });

    describe('dismissDonateBanner', () => {
      it('should trigger DISMISS_BANNER and it should call updatePreferences once for a successful request', () => {
        let preferences = { dismissedDonateYourDataBannerTime: '2017-11-28T00:00:00.000Z' };
        let patient = { id: 500, name: 'Buddy Holly', age: 65 };

        let api = {
          metadata: {
            preferences: {
              put: sinon.stub().callsArgWith(2, null, preferences),
            },
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'DISMISS_BANNER', payload: { type: 'donate' } },
          { type: 'UPDATE_PREFERENCES_REQUEST' },
          { type: 'UPDATE_PREFERENCES_SUCCESS', payload: { updatedPreferences: {
            dismissedDonateYourDataBannerTime: preferences.dismissedDonateYourDataBannerTime,
          } } },
        ];

        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.dismissDonateBanner(api, patient.id));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
      });
    });

    describe('dismissDexcomConnectBanner', () => {
      it('should trigger DISMISS_BANNER and it should call updatePreferences once for a successful request', () => {
        let preferences = { dismissedDexcomConnectBannerTime: '2017-11-28T00:00:00.000Z' };
        let patient = { id: 500, name: 'Buddy Holly', age: 65 };

        let api = {
          metadata: {
            preferences: {
              put: sinon.stub().callsArgWith(2, null, preferences),
            },
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'DISMISS_BANNER', payload: { type: 'dexcom' } },
          { type: 'UPDATE_PREFERENCES_REQUEST' },
          { type: 'UPDATE_PREFERENCES_SUCCESS', payload: { updatedPreferences: {
            dismissedDexcomConnectBannerTime: preferences.dismissedDexcomConnectBannerTime,
          } } },
        ];

        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.dismissDexcomConnectBanner(api, patient.id));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
      });
    });

    describe('clickDexcomConnectBanner', () => {
      it('should trigger DISMISS_BANNER and it should call updatePreferences once for a successful request', () => {
        let preferences = { clickedDexcomConnectBannerTime: '2017-11-28T00:00:00.000Z' };
        let patient = { id: 500, name: 'Buddy Holly', age: 65 };

        let api = {
          metadata: {
            preferences: {
              put: sinon.stub().callsArgWith(2, null, preferences),
            },
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'DISMISS_BANNER', payload: { type: 'dexcom' } },
          { type: 'UPDATE_PREFERENCES_REQUEST' },
          { type: 'UPDATE_PREFERENCES_SUCCESS', payload: { updatedPreferences: {
            clickedDexcomConnectBannerTime: preferences.clickedDexcomConnectBannerTime,
          } } },
        ];

        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.clickDexcomConnectBanner(api, patient.id));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
      });
    });

    describe('dismissShareDataBanner', () => {
      it('should trigger DISMISS_BANNER and it should call updatePreferences once for a successful request', () => {
        let preferences = { dismissedShareDataBannerTime: '2017-11-28T00:00:00.000Z' };
        let patient = { id: 500, name: 'Buddy Holly', age: 65 };

        let api = {
          metadata: {
            preferences: {
              put: sinon.stub().callsArgWith(2, null, preferences),
            },
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'DISMISS_BANNER', payload: { type: 'sharedata' } },
          { type: 'UPDATE_PREFERENCES_REQUEST' },
          { type: 'UPDATE_PREFERENCES_SUCCESS', payload: { updatedPreferences: {
            dismissedShareDataBannerTime: preferences.dismissedShareDataBannerTime,
          } } },
        ];

        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.dismissShareDataBanner(api, patient.id));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
      });
    });

    describe('clickShareDataBanner', () => {
      it('should trigger DISMISS_BANNER and it should call updatePreferences once for a successful request', () => {
        let preferences = { clickedShareDataBannerTime: '2017-11-28T00:00:00.000Z' };
        let patient = { id: 500, name: 'Buddy Holly', age: 65 };

        let api = {
          metadata: {
            preferences: {
              put: sinon.stub().callsArgWith(2, null, preferences),
            },
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'DISMISS_BANNER', payload: { type: 'sharedata' } },
          { type: 'UPDATE_PREFERENCES_REQUEST' },
          { type: 'UPDATE_PREFERENCES_SUCCESS', payload: { updatedPreferences: {
            clickedShareDataBannerTime: preferences.clickedShareDataBannerTime,
          } } },
        ];

        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.clickShareDataBanner(api, patient.id));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
      });
    });

    describe('acceptReceivedInvite', () => {
      it('should trigger ACCEPT_RECEIVED_INVITE_SUCCESS and it should call acceptReceivedInvite once for a successful request', () => {
        let invitation = { key: 'foo', creator: { userid: 500 } };
        let patient = { id: 500, name: 'Buddy Holly', age: 65 };

        let api = {
          invitation: {
            accept: sinon.stub().callsArgWith(2, null, invitation)
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'ACCEPT_RECEIVED_INVITE_REQUEST', payload: { acceptedReceivedInvite: invitation } },
          { type: 'ACCEPT_RECEIVED_INVITE_SUCCESS', payload: { acceptedReceivedInvite: invitation } },
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_SUCCESS', payload: { patient : patient } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.acceptReceivedInvite(api, invitation));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.accept.calledWith(invitation.key, invitation.creator.userid)).to.be.true;
        expect(api.patient.get.calledWith(invitation.creator.userid)).to.be.true;
      });

      it('should trigger ACCEPT_RECEIVED_INVITE_FAILURE and it should call acceptReceivedInvite once for a failed request', () => {
        let invitation = { key: 'foo', creator: { id: 500 } };
        let api = {
          invitation: {
            accept: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_ACCEPTING_INVITE);
        err.status = 500;

        let expectedActions = [
          { type: 'ACCEPT_RECEIVED_INVITE_REQUEST', payload: { acceptedReceivedInvite: invitation } },
          { type: 'ACCEPT_RECEIVED_INVITE_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.acceptReceivedInvite(api, invitation));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_ACCEPTING_INVITE });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.accept.calledWith(invitation.key, invitation.creator.userid)).to.be.true;
      });
    });

    describe('rejectReceivedInvite', () => {
      it('should trigger REJECT_RECEIVED_INVITE_SUCCESS and it should call rejectReceivedInvite once for a successful request', () => {
        let invitation = { key: 'foo', creator: { userid: 500 } };
        let api = {
          invitation: {
            dismiss: sinon.stub().callsArgWith(2, null, invitation)
          }
        };

        let expectedActions = [
          { type: 'REJECT_RECEIVED_INVITE_REQUEST', payload: { rejectedReceivedInvite: invitation } },
          { type: 'REJECT_RECEIVED_INVITE_SUCCESS', payload: { rejectedReceivedInvite: invitation } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.rejectReceivedInvite(api, invitation));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.dismiss.calledWith(invitation.key, invitation.creator.userid)).to.be.true;
      });

      it('should trigger REJECT_RECEIVED_INVITE_FAILURE and it should call rejectReceivedInvite once for a failed request', () => {
        let invitation = { key: 'foo', creator: { id: 500 } };
        let api = {
          invitation: {
            dismiss: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_REJECTING_INVITE);
        err.status = 500;

        let expectedActions = [
          { type: 'REJECT_RECEIVED_INVITE_REQUEST', payload: { rejectedReceivedInvite: invitation } },
          { type: 'REJECT_RECEIVED_INVITE_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.rejectReceivedInvite(api, invitation));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_REJECTING_INVITE });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.dismiss.calledWith(invitation.key, invitation.creator.userid)).to.be.true;
      });
    });

    describe('setMemberPermissions', () => {
      it('should trigger SET_MEMBER_PERMISSIONS_SUCCESS and it should call setMemberPermissions once for a successful request', () => {
        let patientId = 50;
        let patient = { id: 50, name: 'Jeanette Peach' };
        let memberId = 2;
        let permissions = {
          read: false
        };
        let api = {
          access: {
            setMemberPermissions: sinon.stub().callsArgWith(2, null)
          },
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'SET_MEMBER_PERMISSIONS_REQUEST' },
          { type: 'SET_MEMBER_PERMISSIONS_SUCCESS', payload: {
              memberId: memberId,
              permissions: permissions
            }
          },
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_SUCCESS', payload: { patient: patient } },
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.setMemberPermissions(api, patientId, memberId, permissions));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.access.setMemberPermissions.calledWith(memberId, permissions)).to.be.true;
        expect(api.patient.get.calledWith(patientId)).to.be.true;
      });

      it('should trigger SET_MEMBER_PERMISSIONS_FAILURE and it should call setMemberPermissions once for a failed request', () => {
        let patientId = 50;
        let memberId = 2;
        let permissions = {
          read: false
        };
        let api = {
          access: {
            setMemberPermissions: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_CHANGING_PERMS);
        err.status = 500;

        let expectedActions = [
          { type: 'SET_MEMBER_PERMISSIONS_REQUEST' },
          { type: 'SET_MEMBER_PERMISSIONS_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.setMemberPermissions(api, patientId, memberId, permissions));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_CHANGING_PERMS });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.access.setMemberPermissions.calledWith(memberId, permissions)).to.be.true;
      });
    });

    describe('updatePatient', () => {
      it('should trigger UPDATE_PATIENT_SUCCESS and it should call updatePatient once for a successful request', () => {
        let patient = { name: 'Bruce' };
        let api = {
          patient: {
            put: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'UPDATE_PATIENT_REQUEST' },
          { type: 'UPDATE_PATIENT_SUCCESS', payload: { updatedPatient: patient } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.updatePatient(api, patient));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.patient.put.calledWith(patient)).to.be.true;
        expect(trackMetric.calledWith('Updated Profile')).to.be.true;
      });

      it('should trigger UPDATE_PATIENT_FAILURE and it should call updatePatient once for a failed request', () => {
        let patient = { name: 'Bruce' };
        let api = {
          patient: {
            put: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_UPDATING_PATIENT);
        err.status = 500;

        let expectedActions = [
          { type: 'UPDATE_PATIENT_REQUEST' },
          { type: 'UPDATE_PATIENT_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.updatePatient(api, patient));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_UPDATING_PATIENT });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.patient.put.calledWith(patient)).to.be.true;
      });
    });

    describe('updatePreferences', () => {
      it('should trigger UPDATE_PREFERENCES_SUCCESS and it should call updatePreferences once for a successful request', () => {
        let patientId = 1234;
        let preferences = { display: 'all' };
        let api = {
          metadata: {
            preferences: {
              put: sinon.stub().callsArgWith(2, null, preferences)
            }
          }
        };

        let expectedActions = [
          { type: 'UPDATE_PREFERENCES_REQUEST' },
          { type: 'UPDATE_PREFERENCES_SUCCESS', payload: { updatedPreferences: preferences } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.updatePreferences(api, patientId, preferences));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.metadata.preferences.put.calledWith(patientId, preferences)).to.be.true;
      });

      it('should trigger UPDATE_PREFERENCES_FAILURE and it should call updatePreferences once for a failed request', () => {
        let patientId = 1234;
        let preferences = { display: 'all' };
        let api = {
          metadata: {
            preferences: {
              put: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'})
            }
          }
        };

        let err = new Error(ErrorMessages.ERR_UPDATING_PREFERENCES);
        err.status = 500;

        let expectedActions = [
          { type: 'UPDATE_PREFERENCES_REQUEST' },
          { type: 'UPDATE_PREFERENCES_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.updatePreferences(api, patientId, preferences));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_UPDATING_PREFERENCES });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.metadata.preferences.put.calledWith(patientId, preferences)).to.be.true;
      });
    });

    describe('updateSettings', () => {
      it('should trigger UPDATE_SETTINGS_SUCCESS and it should call updateSettings once for a successful request', () => {
        let patientId = 1234;
        let settings = { siteChangeSource: 'cannulaPrime' };
        let api = {
          metadata: {
            settings: {
              put: sinon.stub().callsArgWith(2, null, settings)
            }
          }
        };

        let expectedActions = [
          { type: 'UPDATE_SETTINGS_REQUEST' },
          { type: 'UPDATE_SETTINGS_SUCCESS', payload: { userId: patientId, updatedSettings: settings } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.updateSettings(api, patientId, settings));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.metadata.settings.put.calledWith(patientId, settings)).to.be.true;
      });

      it('should trigger UPDATE_PATIENT_BG_UNITS_REQUEST when bg units are being updated', () => {
          let patientId = 1234;
          let settings = { units: { bg: MMOLL_UNITS} };
          let api = {
            metadata: {
              settings: {
                put: sinon.stub().callsArgWith(2, null, settings)
              }
            }
          };

          let expectedActions = [
            { type: 'UPDATE_SETTINGS_REQUEST' },
            { type: 'UPDATE_PATIENT_BG_UNITS_REQUEST' },
            { type: 'UPDATE_SETTINGS_SUCCESS', payload: { userId: patientId, updatedSettings: settings } },
            { type: 'UPDATE_PATIENT_BG_UNITS_SUCCESS', payload: { userId: patientId, updatedSettings: settings } },
          ];

          _.each(expectedActions, (action) => {
            expect(isTSA(action)).to.be.true;
          });

          let store = mockStore({ blip: initialState });
          store.dispatch(async.updateSettings(api, patientId, settings));

          const actions = store.getActions();
          expect(actions).to.eql(expectedActions);
          expect(api.metadata.settings.put.calledWith(patientId, settings)).to.be.true;
      });

      it('should trigger UPDATE_SETTINGS_FAILURE and it should call updateSettings once for a failed request', () => {
        let patientId = 1234;
        let settings = { siteChangeSource: 'cannulaPrime' };
        let api = {
          metadata: {
            settings: {
              put: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'})
            }
          }
        };

        let err = new Error(ErrorMessages.ERR_UPDATING_SETTINGS);
        err.status = 500;

        let expectedActions = [
          { type: 'UPDATE_SETTINGS_REQUEST' },
          { type: 'UPDATE_SETTINGS_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.updateSettings(api, patientId, settings));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_UPDATING_SETTINGS });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.metadata.settings.put.calledWith(patientId, settings)).to.be.true;
      });

      it('should trigger UPDATE_PATIENT_BG_UNITS_FAILURE and it should call updateSettings once for a failed request', () => {
        let patientId = 1234;
        let settings = { units: { bg: MMOLL_UNITS} };
        let api = {
          metadata: {
            settings: {
              put: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'})
            }
          }
        };

        let err = new Error(ErrorMessages.ERR_UPDATING_SETTINGS);
        err.status = 500;

        let bgErr = new Error(ErrorMessages.ERR_UPDATING_PATIENT_BG_UNITS);
        bgErr.status = 500;

        let expectedActions = [
          { type: 'UPDATE_SETTINGS_REQUEST' },
          { type: 'UPDATE_PATIENT_BG_UNITS_REQUEST' },
          { type: 'UPDATE_SETTINGS_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } },
          { type: 'UPDATE_PATIENT_BG_UNITS_FAILURE', error: bgErr, meta: { apiError: {status: 500, body: 'Error!'} } },
        ];

        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.updateSettings(api, patientId, settings));

        const actions = store.getActions();
        expect(actions[2].error).to.deep.include({ message: ErrorMessages.ERR_UPDATING_SETTINGS });
        expectedActions[2].error = actions[2].error;
        expect(actions[3].error).to.deep.include({ message: ErrorMessages.ERR_UPDATING_PATIENT_BG_UNITS });
        expectedActions[3].error = actions[3].error;
        expect(actions).to.eql(expectedActions);
        expect(api.metadata.settings.put.calledWith(patientId, settings)).to.be.true;
      });
    });

    describe('updateUser', () => {
      it('should trigger UPDATE_USER_SUCCESS and it should call updateUser once for a successful request', () => {
        let loggedInUserId = 400;
        let currentUser = {
          profile: {
            name: 'Joe Bloggs',
            age: 29
          },
          password: 'foo',
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe'
        };

        let formValues = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          },
        };

        let updatingUser = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          },
          preferences: {},
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe'
        };

        let userUpdates = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          },
          preferences: {},
          password: 'foo'
        };

        let updatedUser = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          },
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe',
          password: 'foo'
        };

        let api = {
          user: {
            put: sinon.stub().callsArgWith(1, null, updatedUser)
          }
        };

        let initialStateForTest = _.merge({}, initialState, { allUsersMap: { [loggedInUserId] : currentUser }, loggedInUserId: loggedInUserId });

        let expectedActions = [
          { type: 'UPDATE_USER_REQUEST', payload: { userId: loggedInUserId, updatingUser: updatingUser} },
          { type: 'UPDATE_USER_SUCCESS', payload: { userId: loggedInUserId, updatedUser: updatedUser } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip : initialStateForTest });
        store.dispatch(async.updateUser(api, formValues));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.put.calledWith(userUpdates)).to.be.true;
        expect(trackMetric.calledWith('Updated Account')).to.be.true;
      });

      it('should trigger UPDATE_USER_FAILURE and it should call updateUser once for a failed request', () => {
        let loggedInUserId = 400;
        let currentUser = {
          profile: {
            name: 'Joe Bloggs',
            age: 29
          },
          password: 'foo',
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe'
        };

        let formValues = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          }
        };

        let updatingUser = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          },
          preferences: {},
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe'
        };

        let userUpdates = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          },
          preferences: {},
          password: 'foo'
        };
        let api = {
          user: {
            put: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_UPDATING_USER);
        err.status = 500;

        let initialStateForTest = _.merge({}, initialState, { allUsersMap: { [loggedInUserId] : currentUser }, loggedInUserId: loggedInUserId });

        let expectedActions = [
          { type: 'UPDATE_USER_REQUEST', payload: { userId: loggedInUserId, updatingUser: updatingUser} },
          { type: 'UPDATE_USER_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip : initialStateForTest });
        store.dispatch(async.updateUser(api, formValues));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_UPDATING_USER });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.put.calledWith(userUpdates)).to.be.true;
      });
    });

    describe('updateClinicianProfile', () => {
      it('should trigger UPDATE_USER_SUCCESS and it should call updateClinicianProfile once for a successful request and route user', () => {
        let loggedInUserId = 400;
        let currentUser = {
          profile: {
            name: 'Joe Bloggs',
            age: 29
          },
          password: 'foo',
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe'
        };

        let formValues = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          },
        };

        let updatingUser = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          },
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe'
        };

        let userUpdates = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          },
          password: 'foo'
        };

        let updatedUser = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          },
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe',
          password: 'foo'
        };

        let api = {
          user: {
            put: sinon.stub().callsArgWith(1, null, updatedUser)
          }
        };

        let initialStateForTest = _.merge({}, initialState, { allUsersMap: { [loggedInUserId] : currentUser }, loggedInUserId: loggedInUserId });

        let expectedActions = [
          { type: 'UPDATE_USER_REQUEST', payload: { userId: loggedInUserId, updatingUser: updatingUser} },
          { type: 'UPDATE_USER_SUCCESS', payload: { userId: loggedInUserId, updatedUser: updatedUser } },
          { type: '@@router/CALL_HISTORY_METHOD', payload: { args: [ '/patients?justLoggedIn=true' ], method: 'push' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip : initialStateForTest });
        store.dispatch(async.updateClinicianProfile(api, formValues));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.put.calledWith(userUpdates)).to.be.true;
        expect(trackMetric.calledWith('Updated Account')).to.be.true;
      });

      it('should trigger UPDATE_USER_FAILURE and it should call updateClinicianProfile once for a failed request', () => {
        let loggedInUserId = 400;
        let currentUser = {
          profile: {
            name: 'Joe Bloggs',
            age: 29
          },
          password: 'foo',
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe'
        };

        let formValues = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          }
        };

        let updatingUser = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          },
          emails: [
            'joe@bloggs.com'
          ],
          username: 'Joe'
        };

        let userUpdates = {
          profile: {
            name: 'Joe Steven Bloggs',
            age: 30
          },
          password: 'foo'
        };
        let api = {
          user: {
            put: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_UPDATING_USER);
        err.status = 500;

        let initialStateForTest = _.merge({}, initialState, { allUsersMap: { [loggedInUserId] : currentUser }, loggedInUserId: loggedInUserId });

        let expectedActions = [
          { type: 'UPDATE_USER_REQUEST', payload: { userId: loggedInUserId, updatingUser: updatingUser} },
          { type: 'UPDATE_USER_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip : initialStateForTest });
        store.dispatch(async.updateClinicianProfile(api, formValues));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_UPDATING_USER });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.put.calledWith(userUpdates)).to.be.true;
      });
    });

    describe('requestPasswordReset', () => {
      it('should trigger REQUEST_PASSWORD_RESET_SUCCESS and it should call requestPasswordReset once for a successful request', () => {
        const email = 'foo@bar.com';
        let api = {
          user: {
            requestPasswordReset: sinon.stub().callsArgWith(1, null)
          }
        };

        let expectedActions = [
          { type: 'REQUEST_PASSWORD_RESET_REQUEST' },
          { type: 'REQUEST_PASSWORD_RESET_SUCCESS' }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.requestPasswordReset(api, email));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.requestPasswordReset.calledWith(email)).to.be.true;
      });

      it('should trigger REQUEST_PASSWORD_RESET_FAILURE and it should call requestPasswordReset once for a failed request', () => {
        const email = 'foo@bar.com';
        let api = {
          user: {
            requestPasswordReset: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_REQUESTING_PASSWORD_RESET);
        err.status = 500;

        let expectedActions = [
          { type: 'REQUEST_PASSWORD_RESET_REQUEST' },
          { type: 'REQUEST_PASSWORD_RESET_FAILURE', error: err, meta: {apiError: {status: 500, body: 'Error!'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.requestPasswordReset(api, email));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_REQUESTING_PASSWORD_RESET });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.requestPasswordReset.calledWith(email)).to.be.true;
      });
    });

    describe('confirmPasswordReset', () => {
      it('should trigger CONFIRM_PASSWORD_RESET_SUCCESS and it should call confirmPasswordReset once for a successful requestPasswordReset', () => {
        const payload = {};
        let api = {
          user: {
            confirmPasswordReset: sinon.stub().callsArgWith(1, null)
          }
        };

        let expectedActions = [
          { type: 'CONFIRM_PASSWORD_RESET_REQUEST' },
          { type: 'CONFIRM_PASSWORD_RESET_SUCCESS' }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.confirmPasswordReset(api, payload));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.confirmPasswordReset.calledWith(payload)).to.be.true;
      });

      it('should trigger CONFIRM_PASSWORD_RESET_FAILURE and it should call confirmPasswordReset once for a failed requestPasswordReset', () => {
        const payload = {};
        let api = {
          user: {
            confirmPasswordReset: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
          }
        };

        let err = new Error(ErrorMessages.ERR_CONFIRMING_PASSWORD_RESET);
        err.status = 500;

        let expectedActions = [
          { type: 'CONFIRM_PASSWORD_RESET_REQUEST' },
          { type: 'CONFIRM_PASSWORD_RESET_FAILURE', error: err, meta: {apiError: {status: 500, body: 'Error!'}} }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.confirmPasswordReset(api, payload));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_CONFIRMING_PASSWORD_RESET });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.confirmPasswordReset.calledWith(payload)).to.be.true;
      });
    });

    describe('logError', () => {
      it('should trigger LOG_ERROR_SUCCESS and it should call error once for a successful request', () => {
        let error = 'Error';
        let message = 'Some random detailed error message!';
        let props = {
          stacktrace: true
        };

        let api = {
          errors: {
            log: sinon.stub().callsArgWith(3, null)
          }

        };

        let expectedActions = [
          { type: 'LOG_ERROR_REQUEST' },
          { type: 'LOG_ERROR_SUCCESS' }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.logError(api, error, message, props));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.errors.log.withArgs(error, message, props).callCount).to.equal(1);
      });
    });

    describe('fetchUser', () => {
      it('should trigger FETCH_USER_SUCCESS and it should call user.get once for a successful request', () => {
        let user = { emailVerified: true, username: 'frankie@gmaz.com', id: 306, name: 'Frankie Boyle' };

        let api = {
          user: {
            get: sinon.stub().callsArgWith(0, null, user)
          }
        };

        let expectedActions = [
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_SUCCESS', payload: { user : user } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchUser(api));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.get.callCount).to.equal(1);
      });

      it('should trigger FETCH_USER_FAILURE and it should call error once for a request for user that has not verified email', () => {
        let user = { emailVerified: false, username: 'frankie@gmaz.com', id: 306, name: 'Frankie Boyle' };

        let api = {
          user: {
            get: sinon.stub().callsArgWith(0, null, user)
          }
        };

        let expectedActions = [
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_FAILURE', error: new Error(ErrorMessages.ERR_EMAIL_NOT_VERIFIED), meta: { apiError: null } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchUser(api));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_EMAIL_NOT_VERIFIED });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.get.callCount).to.equal(1);
      });


      it('[401] should trigger FETCH_USER_FAILURE and it should call error once for a failed request', () => {
        let user = { id: 306, name: 'Frankie Boyle' };

        let api = {
          user: {
            get: sinon.stub().callsArgWith(0, { status: 401 }, null)
          }
        };

        let expectedActions = [
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_FAILURE', error: null, meta: { apiError: { status: 401 } } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchUser(api));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.get.callCount).to.equal(1);
      });

      it('[500] should trigger FETCH_USER_FAILURE and it should call error once for a failed request', () => {
        let user = { id: 306, name: 'Frankie Boyle' };

        let api = {
          user: {
            get: sinon.stub().callsArgWith(0, {status: 500, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_USER);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_USER_REQUEST' },
          { type: 'FETCH_USER_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchUser(api));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_USER });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.get.callCount).to.equal(1);
      });
    });

    describe('fetchPendingSentInvites', () => {
      it('should trigger FETCH_PENDING_SENT_INVITES_SUCCESS and it should call error once for a successful request', () => {
        let pendingSentInvites = [ 1, 555, 78191 ];

        let api = {
          invitation: {
            getSent: sinon.stub().callsArgWith(0, null, pendingSentInvites)
          }
        };

        let expectedActions = [
          { type: 'FETCH_PENDING_SENT_INVITES_REQUEST' },
          { type: 'FETCH_PENDING_SENT_INVITES_SUCCESS', payload: { pendingSentInvites : pendingSentInvites } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchPendingSentInvites(api));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.getSent.callCount).to.equal(1);
      });

      it('should trigger FETCH_PENDING_SENT_INVITES_FAILURE and it should call error once for a failed request', () => {
        let pendingSentInvites = [ 1, 555, 78191 ];

        let api = {
          invitation: {
            getSent: sinon.stub().callsArgWith(0, {status: 500, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_PENDING_SENT_INVITES);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_PENDING_SENT_INVITES_REQUEST' },
          { type: 'FETCH_PENDING_SENT_INVITES_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchPendingSentInvites(api));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_PENDING_SENT_INVITES });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.getSent.callCount).to.equal(1);
      });
    });

    describe('fetchPendingReceivedInvites', () => {
      it('should trigger FETCH_PENDING_RECEIVED_INVITES_SUCCESS and it should call error once for a successful request', () => {
        let pendingReceivedInvites = [ 1, 555, 78191 ];

        let api = {
          invitation: {
            getReceived: sinon.stub().callsArgWith(0, null, pendingReceivedInvites)
          }
        };

        let expectedActions = [
          { type: 'FETCH_PENDING_RECEIVED_INVITES_REQUEST' },
          { type: 'FETCH_PENDING_RECEIVED_INVITES_SUCCESS', payload: { pendingReceivedInvites : pendingReceivedInvites } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchPendingReceivedInvites(api));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.getReceived.callCount).to.equal(1);
      });

      it('should trigger FETCH_PENDING_RECEIVED_INVITES_FAILURE and it should call error once for a failed request', () => {
        let pendingReceivedInvites = [ 1, 555, 78191 ];

        let api = {
          invitation: {
            getReceived: sinon.stub().callsArgWith(0, {status: 500, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_PENDING_RECEIVED_INVITES);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_PENDING_RECEIVED_INVITES_REQUEST' },
          { type: 'FETCH_PENDING_RECEIVED_INVITES_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchPendingReceivedInvites(api));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_PENDING_RECEIVED_INVITES });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.invitation.getReceived.callCount).to.equal(1);
      });
    });

    describe('fetchPatient', () => {
      it('should trigger FETCH_PATIENT_SUCCESS and it should call error once for a successful request', () => {
        let patient = { id: 58686, name: 'Buddy Holly', age: 65 };

        let api = {
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_SUCCESS', payload: { patient : patient } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchPatient(api, 58686));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.patient.get.withArgs(58686).callCount).to.equal(1);
      });

      it('should trigger FETCH_PATIENT_SUCCESS without fetching patient if complete patient record is in cache', () => {
        let patient = { id: 58686, name: 'Buddy Holly', age: 65, settings: {} };

        let api = {
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'FETCH_PATIENT_SUCCESS', payload: { patient : patient } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: {
          ...initialState,
          allUsersMap: {
            58686: patient,
            '58686_cacheUntil': 9999999999999,
          }
        } });
        store.dispatch(async.fetchPatient(api, 58686));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.patient.get.callCount).to.equal(0);
      });

      it('should skip the cache and fetch patient if settings are missing in cached patient record', () => {
        let patient = { id: 58686, name: 'Buddy Holly', age: 65, settings: undefined };

        let api = {
          patient: {
            get: sinon.stub().callsArgWith(1, null, patient)
          }
        };

        let expectedActions = [
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_SUCCESS', payload: { patient : patient } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: {
          ...initialState,
          allUsersMap: {
            58686: patient,
            '58686_cacheUntil': 9999999999999,
          }
        } });
        store.dispatch(async.fetchPatient(api, 58686));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.patient.get.withArgs(58686).callCount).to.equal(1);
      });

      it('[500] should trigger FETCH_PATIENT_FAILURE and it should call error once for a failed request', () => {
        let patient = { id: 58686, name: 'Buddy Holly', age: 65 };

        let api = {
          patient: {
            get: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_PATIENT);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_FAILURE', error: err, payload: {link: null}, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchPatient(api, 58686));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_PATIENT });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.patient.get.withArgs(58686).callCount).to.equal(1);
      });

      it('[404] should trigger FETCH_PATIENT_FAILURE and it should call error once for a failed request', () => {
        let patient = { id: 58686, name: 'Buddy Holly', age: 65 };
        let thisInitialState = Object.assign(initialState, {loggedInUserId: 58686});

        let api = {
          patient: {
            get: sinon.stub().callsArgWith(1, {status: 404, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_YOUR_ACCOUNT_NOT_CONFIGURED);
        err.status = 404;

        let expectedActions = [
          { type: 'FETCH_PATIENT_REQUEST' },
          { type: 'FETCH_PATIENT_FAILURE', error: err, payload: {link: {to: '/patients/new', text: UserMessages.YOUR_ACCOUNT_DATA_SETUP}}, meta: { apiError: {status: 404, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: thisInitialState });
        store.dispatch(async.fetchPatient(api, 58686));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_YOUR_ACCOUNT_NOT_CONFIGURED });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.patient.get.withArgs(58686).callCount).to.equal(1);
      });
    });

    describe('fetchAssociatedAccounts', () => {
      it('should trigger FETCH_ASSOCIATED_ACCOUNTS_SUCCESS and it should call error once for a successful request', () => {
        let patients = [
          { id: 58686, name: 'Buddy Holly', age: 65 }
        ]

        let api = {
          user: {
            getAssociatedAccounts: sinon.stub().callsArgWith(0, null, { patients })
          }
        };

        let expectedActions = [
          { type: 'FETCH_ASSOCIATED_ACCOUNTS_REQUEST' },
          { type: 'FETCH_ASSOCIATED_ACCOUNTS_SUCCESS', payload: { patients : patients } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchAssociatedAccounts(api));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.getAssociatedAccounts.callCount).to.equal(1);
      });

      it('should trigger FETCH_ASSOCIATED_ACCOUNTS_FAILURE and it should call error once for a failed request', () => {
        let patients = [
          { id: 58686, name: 'Buddy Holly', age: 65 }
        ]

        let api = {
          user: {
            getAssociatedAccounts: sinon.stub().callsArgWith(0, {status: 500, body: {status: 500, body: 'Error!'}}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_ASSOCIATED_ACCOUNTS);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_ASSOCIATED_ACCOUNTS_REQUEST' },
          { type: 'FETCH_ASSOCIATED_ACCOUNTS_FAILURE', error: err, meta: { apiError: {status: 500, body: {status: 500, body: 'Error!'}} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchAssociatedAccounts(api));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_ASSOCIATED_ACCOUNTS });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.getAssociatedAccounts.callCount).to.equal(1);
      });
    });

    describe('fetchPatientData', () => {
      const patientId = 300;
      const serverTime = '2018-02-01T00:00:00.000Z';

      let options;
      let patientData;
      let teamNotes;
      let uploadRecord;
      let api;
      let rollbar;

      before(() => {
        rollbar = {
          info: sinon.stub(),
        };

        async.__Rewire__('rollbar', rollbar);
      });

      beforeEach(() => {
        options = {
          startDate: '2018-01-01T00:00:00.000Z',
          endDate: '2018-01-30T00:00:00.000Z',
          returnData: false,
          useCache: true,
          initial: true,
        };

        patientData = [
          { id: 25, value: 540.4, type: 'smbg', time: '2018-01-01T00:00:00.000Z' },
          { id: 26, value: 30.8, type: 'smbg', time: '2018-01-30T00:00:00.000Z' },
          { type: 'upload', id: 'upload789', uploadId: '_upload789', time: '2018-06-01T00:00:00.000Z' },
        ];

        uploadRecord = [
          { type: 'upload', id: 'upload123', uploadId: '_upload123', time: '2018-01-15T00:00:00.000Z'}
        ];

        teamNotes = [
          { id: 28, note: 'foo' }
        ];

        api = {
          patientData: {
            get: sinon.stub().callsArgWith(2, null, patientData),
          },
          team: {
            getNotes: sinon.stub().callsArgWith(2, null, teamNotes)
          },
          server: {
            getTime: sinon.stub().callsArgWith(0, null, { data: { time: serverTime } })
          }
        };
      });

      afterEach(() => {
        rollbar.info.resetHistory();
      });

      after(() => {
        async.__ResetDependency__('rollbar');
      });

      context('data is available in cache', () => {
        it('should not trigger FETCH_PATIENT_DATA_REQUEST by default', () => {
          let store = mockStore({ blip: {
            ...initialState,
            data: {
              cacheUntil: 9999999999999,
            },
          } });
          store.dispatch(async.fetchPatientData(api, options, patientId));

          const actions = store.getActions();
          expect(actions).to.not.deep.include({ type: 'FETCH_PATIENT_DATA_REQUEST' });
        });

        it('should not trigger FETCH_PATIENT_DATA_REQUEST if options.useCache is true', () => {
          let store = mockStore({ blip: {
            ...initialState,
            data: {
              cacheUntil: 9999999999999,
            },
          } });
          store.dispatch(async.fetchPatientData(api, { ...options, useCache: true }, patientId));

          const actions = store.getActions();
          expect(actions).to.not.deep.include({ type: 'FETCH_PATIENT_DATA_REQUEST' });
        });

        it('should still trigger FETCH_PATIENT_DATA_REQUEST if options.useCache is false', () => {
          let store = mockStore({ blip: {
            ...initialState,
            data: {
              cacheUntil: 9999999999999,
            },
          }, router: { location: { pathname: `data/${patientId}` } } });
          store.dispatch(async.fetchPatientData(api, { ...options, useCache: false }, patientId));

          const actions = store.getActions();
          expect(actions).to.deep.include({ type: 'FETCH_PATIENT_DATA_REQUEST', payload: { patientId } });
        });
      });

      context('initial data fetch', () => {
        it('trigger FETCH_PATIENT_DATA_FAILURE and it should call error once for a failed request due to intial patient data call returning error', () => {
          api.patientData = {
            get: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'}, null),
          };

          let err = new Error(ErrorMessages.ERR_FETCHING_PATIENT_DATA);
          err.status = 500;

          let expectedActions = [
            { type: 'FETCH_SERVER_TIME_REQUEST'},
            { type: 'FETCH_SERVER_TIME_SUCCESS', payload: { serverTime } },
            { type: 'FETCH_PATIENT_DATA_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
          ];
          _.each(expectedActions, (action) => {
            expect(isTSA(action)).to.be.true;
          });
          let store = mockStore({ blip: initialState });
          store.dispatch(async.fetchPatientData(api, options, patientId));

          const actions = store.getActions();
          expect(actions[2].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_PATIENT_DATA });
          expectedActions[2].error = actions[2].error;
          expect(actions).to.eql(expectedActions);
        });

        it('should use server time (plus 1 day, minus 30) for date range of data fetching if all latest diabetes datums returns empty results', () => {
          let store = mockStore({ blip: {
            ...initialState,
          }, router: { location: { pathname: `data/${patientId}` } } });

          // Set all times in response to 1 year past server time
          api.patientData.get = sinon.stub().callsArgWith(2, null, []);

          store.dispatch(async.fetchPatientData(api, options, patientId));

          expect(api.server.getTime.callCount).to.equal(1);

          expect(api.patientData.get.withArgs(patientId, {
            ...options,
            startDate: '2018-01-02T00:00:00.000Z', // 30 days before serverTime
            endDate: '2018-02-02T00:00:00.000Z', // 1 day beyond serverTime
          }).callCount).to.equal(1);
        });

        it('should fetch the latest data for all diabetes types and pumpSettings', () => {
          let store = mockStore({ blip: {
            ...initialState,
          }, router: { location: { pathname: `data/${patientId}` } } });

          store.dispatch(async.fetchPatientData(api, options, patientId));

          expect(api.patientData.get.withArgs(patientId, {
            type: [
              'cbg',
              'smbg',
              'basal',
              'bolus',
              'wizard',
              'food',
              'pumpSettings',
              'upload',
            ].join(','),
            latest: 1,
            endDate: '2018-02-02T00:00:00.000Z', // 1 day beyond serverTime
          }).callCount).to.equal(1);
        });

        it('should fetch the patient data 30 days prior to the latest diabetes datum time returned', () => {
          let store = mockStore({ blip: {
            ...initialState,
          }, router: { location: { pathname: `data/${patientId}` } } });

          api.patientData.get = sinon.stub().callsArgWith(2, null, patientData);

          store.dispatch(async.fetchPatientData(api, options, patientId));

          expect(api.patientData.get.callCount).to.equal(2);

          // Should set the start date based on the latest smbg, even though the upload is more recent
          expect(api.patientData.get.withArgs(patientId, {
            ...options,
            startDate: '2017-12-31T00:00:00.000Z',
            endDate: '2018-01-31T00:00:00.000Z',
          }).callCount).to.equal(1);
        });
      });

      context('handleFetchSuccess', () => {
        beforeEach(() => {
          options.initial = false;
        });

        context('fetching data for current patient in view', () => {
          it('should trigger FETCH_PATIENT_DATA_SUCCESS and DATA_WORKER_ADD_DATA_REQUEST', () => {
            options.getPumpSettingsUploadRecordById = 'upload123';

            api.patientData = {
              get: sinon.stub()
                .onFirstCall().callsArgWith(2, null, patientData)
                .onSecondCall().callsArgWith(2, null, [ uploadRecord ]),
            };

            let expectedActions = [
              { type: 'FETCH_PATIENT_DATA_REQUEST', payload: { patientId } },
              { type: 'FETCH_PATIENT_DATA_SUCCESS', payload: { patientId } },
              {
                type: 'DATA_WORKER_ADD_DATA_REQUEST',
                meta: { WebWorker: true, worker: 'data', origin: 'http://originStub', patientId },
                payload: {
                  data: JSON.stringify([...patientData, uploadRecord, ...teamNotes]),
                  fetchedCount: 5,
                  patientId: patientId,
                  fetchedUntil: '2018-01-01T00:00:00.000Z',
                  returnData: false,
                },
              },
            ];
            _.each(expectedActions, (action) => {
              expect(isTSA(action)).to.be.true;
            });

            let store = mockStore({ blip: {
              ...initialState,
            }, router: { location: { pathname: `data/${patientId}` } } });
            store.dispatch(async.fetchPatientData(api, options, patientId));

            const actions = store.getActions();
            actions[2].meta.origin = 'http://originStub';
            expect(actions).to.eql(expectedActions);
            expect(api.patientData.get.withArgs(patientId, options).callCount).to.equal(1);
            expect(api.team.getNotes.withArgs(patientId).callCount).to.equal(1);
          });
        });

        context('not fetching data for current patient in view (i.e. stale request)', () => {
          it('should only trigger FETCH_PATIENT_DATA_SUCCESS and not DATA_WORKER_ADD_DATA_REQUEST', () => {
            const otherPatientId = 'xyz123';
            let expectedActions = [
              { type: 'FETCH_PATIENT_DATA_REQUEST', payload: { patientId } },
              { type: 'FETCH_PATIENT_DATA_SUCCESS', payload: { patientId } },
            ];
            _.each(expectedActions, (action) => {
              expect(isTSA(action)).to.be.true;
            });

            let store = mockStore({ blip: {
              ...initialState,
            }, router: { location: { pathname: `data/${otherPatientId}` } } });
            store.dispatch(async.fetchPatientData(api, options, patientId));

            const actions = store.getActions();
            expect(actions).to.eql(expectedActions);
            expect(api.patientData.get.withArgs(patientId, options).callCount).to.equal(1);
            expect(api.team.getNotes.withArgs(patientId).callCount).to.equal(1);
          });
        });
      });

      context('handleFetchErrors', () => {
        it('should trigger FETCH_PATIENT_DATA_FAILURE and it should call error once for a failed request due to patient data call returning error', () => {
          options.initial = false;

          api.patientData = {
            get: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'}, null),
          };

          let err = new Error(ErrorMessages.ERR_FETCHING_PATIENT_DATA);
          err.status = 500;

          let expectedActions = [
            { type: 'FETCH_PATIENT_DATA_REQUEST', payload: { patientId } },
            { type: 'FETCH_PATIENT_DATA_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
          ];
          _.each(expectedActions, (action) => {
            expect(isTSA(action)).to.be.true;
          });

          let store = mockStore({
            blip: initialState,
            router: { location: { pathname: `data/${patientId}` } }
          });
          store.dispatch(async.fetchPatientData(api, options, patientId));

          const actions = store.getActions();
          expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_PATIENT_DATA });
          expectedActions[1].error = actions[1].error;
          expect(actions).to.eql(expectedActions);
          expect(api.patientData.get.withArgs(patientId, options).callCount).to.equal(1);
          expect(api.team.getNotes.withArgs(patientId).callCount).to.equal(1);
        });

        it('should trigger FETCH_PATIENT_DATA_FAILURE and it should call error once for a failed request due to latest pump settings upload call returning error', () => {
          options.initial = true;

          api.patientData = {
            get: sinon.stub()
              .onFirstCall().callsArgWith(2, null, [ ...patientData, { type: 'pumpSettings', uploadId: 'upload123', time: '2018-02-01T00:00:00.000Z' }])
              .onSecondCall().callsArgWith(2, null, patientData)
              .onThirdCall().callsArgWith(2, {status: 500, body: 'Error!'}, null),
          };

          let err = new Error(ErrorMessages.ERR_FETCHING_LATEST_PUMP_SETTINGS_UPLOAD);
          err.status = 500;

          let expectedActions = [
            { type: 'FETCH_SERVER_TIME_REQUEST'},
            { type: 'FETCH_SERVER_TIME_SUCCESS', payload: { serverTime } },
            { type: 'FETCH_PATIENT_DATA_REQUEST', payload: { patientId } },
            { type: 'FETCH_PATIENT_DATA_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
          ];
          _.each(expectedActions, (action) => {
            expect(isTSA(action)).to.be.true;
          });

          let store = mockStore({
            blip: initialState,
            router: { location: { pathname: `data/${patientId}` } }
          });
          store.dispatch(async.fetchPatientData(api, options, patientId));

          const actions = store.getActions();
          expect(actions[3].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_LATEST_PUMP_SETTINGS_UPLOAD });
          expectedActions[3].error = actions[3].error;
          expect(actions).to.eql(expectedActions);
          expect(api.patientData.get.withArgs(patientId, options).callCount).to.equal(1);
          expect(api.team.getNotes.withArgs(patientId).callCount).to.equal(1);
        });

        it('should trigger FETCH_MESSAGE_THREAD_FAILURE and it should call error once for a failed request due to team notes call returning error', () => {
          options.initial = false;

          api.team = {
            getNotes: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'}, null)
          };

          let err = new Error(ErrorMessages.ERR_FETCHING_MESSAGE_THREAD);
          err.status = 500;

          let expectedActions = [
            { type: 'FETCH_PATIENT_DATA_REQUEST', payload: { patientId } },
            { type: 'FETCH_MESSAGE_THREAD_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
          ];
          _.each(expectedActions, (action) => {
            expect(isTSA(action)).to.be.true;
          });

          let store = mockStore({ blip: initialState });
          store.dispatch(async.fetchPatientData(api, options, patientId));

          const actions = store.getActions();
          expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_MESSAGE_THREAD });
          expectedActions[1].error = actions[1].error;
          expect(actions).to.eql(expectedActions);
          expect(api.patientData.get.withArgs(patientId, options).callCount).to.equal(1);
          expect(api.team.getNotes.withArgs(patientId).callCount).to.equal(1);
        });
      });
    });

    describe('fetchSettings', () => {
      it('should trigger FETCH_SETTINGS_SUCCESS and it should call fetchSettings once for a successful request', () => {
        let patientId = 1234;
        let settings = { siteChangeSource: 'cannulaPrime' };
        let api = {
          metadata: {
            settings: {
              get: sinon.stub().callsArgWith(1, null, settings)
            }
          }
        };

        let expectedActions = [
          { type: 'FETCH_SETTINGS_REQUEST' },
          { type: 'FETCH_SETTINGS_SUCCESS', payload: { settings: settings } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchSettings(api, patientId));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.metadata.settings.get.calledWith(patientId)).to.be.true;
      });

      it('should trigger FETCH_SETTINGS_FAILURE and it should call fetchSettings once for a failed request', () => {
        let patientId = 1234;
        let api = {
          metadata: {
            settings: {
              get: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'})
            }
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_SETTINGS);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_SETTINGS_REQUEST' },
          { type: 'FETCH_SETTINGS_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchSettings(api, patientId));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_SETTINGS });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.metadata.settings.get.calledWith(patientId)).to.be.true;
      });
    });

    describe('fetchPrescriptions', () => {
      it('should trigger FETCH_PRESCRIPTIONS_SUCCESS and it should call prescription.getAll once for a successful request', () => {
        let prescriptions = [
          { id: 'one' }
        ];

        let api = {
          prescription: {
            getAll: sinon.stub().callsArgWith(0, null, prescriptions),
          },
        };

        let expectedActions = [
          { type: 'FETCH_PRESCRIPTIONS_REQUEST' },
          { type: 'FETCH_PRESCRIPTIONS_SUCCESS', payload: { prescriptions : prescriptions } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchPrescriptions(api));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.prescription.getAll.callCount).to.equal(1);
      });

      it('should trigger FETCH_PRESCRIPTIONS_FAILURE and it should call error once for a failed request', () => {
        let api = {
          prescription: {
            getAll: sinon.stub().callsArgWith(0, {status: 500, body: 'Error!'}, null),
          },
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_PRESCRIPTIONS);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_PRESCRIPTIONS_REQUEST' },
          { type: 'FETCH_PRESCRIPTIONS_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchPrescriptions(api));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_PRESCRIPTIONS });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.prescription.getAll.callCount).to.equal(1);
      });
    });

    describe('createPrescription', () => {
      it('should trigger CREATE_PRESCRIPTION_SUCCESS and it should call prescription.create once for a successful request', () => {
        let prescription = { id: 'one' };

        let api = {
          prescription: {
            create: sinon.stub().callsArgWith(1, null, prescription),
          },
        };

        let expectedActions = [
          { type: 'CREATE_PRESCRIPTION_REQUEST' },
          { type: 'CREATE_PRESCRIPTION_SUCCESS', payload: { prescription : prescription } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.createPrescription(api, prescription));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.prescription.create.withArgs(prescription).callCount).to.equal(1);
      });

      it('should trigger CREATE_PRESCRIPTION_FAILURE and it should call error once for a failed request', () => {
        let prescription = { id: 'one' };

        let api = {
          prescription: {
            create: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'}, null),
          },
        };

        let err = new Error(ErrorMessages.ERR_CREATING_PRESCRIPTION);
        err.status = 500;

        let expectedActions = [
          { type: 'CREATE_PRESCRIPTION_REQUEST' },
          { type: 'CREATE_PRESCRIPTION_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.createPrescription(api, prescription));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_CREATING_PRESCRIPTION });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.prescription.create.withArgs(prescription).callCount).to.equal(1);
      });
    });

    describe('createPrescriptionRevision', () => {
      it('should trigger CREATE_PRESCRIPTION_REVISION_SUCCESS and it should call prescription.createRevision once for a successful request', () => {
        let prescription = { id: 'one' };

        let api = {
          prescription: {
            createRevision: sinon.stub().callsArgWith(2, null, prescription),
          },
        };

        let expectedActions = [
          { type: 'CREATE_PRESCRIPTION_REVISION_REQUEST' },
          { type: 'CREATE_PRESCRIPTION_REVISION_SUCCESS', payload: { prescription : prescription } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.createPrescriptionRevision(api, prescription, prescription.id));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.prescription.createRevision.withArgs(prescription, prescription.id).callCount).to.equal(1);
      });

      it('should trigger CREATE_PRESCRIPTION_REVISION_FAILURE and it should call error once for a failed request', () => {
        let prescription = { id: 'one' };

        let api = {
          prescription: {
            createRevision: sinon.stub().callsArgWith(2, {status: 500, body: 'Error!'}, null),
          },
        };

        let err = new Error(ErrorMessages.ERR_CREATING_PRESCRIPTION_REVISION);
        err.status = 500;

        let expectedActions = [
          { type: 'CREATE_PRESCRIPTION_REVISION_REQUEST' },
          { type: 'CREATE_PRESCRIPTION_REVISION_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.createPrescriptionRevision(api, prescription, prescription.id));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_CREATING_PRESCRIPTION_REVISION });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.prescription.createRevision.withArgs(prescription, prescription.id).callCount).to.equal(1);
      });
    });

    describe('deletePrescription', () => {
      it('should trigger DELETE_PRESCRIPTION_SUCCESS and it should call prescription.delete once for a successful request', () => {
        let prescriptionId = 'one';

        let api = {
          prescription: {
            delete: sinon.stub().callsArgWith(1, null),
          },
        };

        let expectedActions = [
          { type: 'DELETE_PRESCRIPTION_REQUEST' },
          { type: 'DELETE_PRESCRIPTION_SUCCESS', payload: { prescriptionId : prescriptionId } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.deletePrescription(api, prescriptionId));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.prescription.delete.withArgs(prescriptionId).callCount).to.equal(1);
      });

      it('should trigger DELETE_PRESCRIPTION_FAILURE and it should call error once for a failed request', () => {
        let prescriptionId = 'one';

        let api = {
          prescription: {
            delete: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'}, null),
          },
        };

        let err = new Error(ErrorMessages.ERR_DELETING_PRESCRIPTION);
        err.status = 500;

        let expectedActions = [
          { type: 'DELETE_PRESCRIPTION_REQUEST' },
          { type: 'DELETE_PRESCRIPTION_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.deletePrescription(api, prescriptionId));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_DELETING_PRESCRIPTION });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.prescription.delete.withArgs(prescriptionId).callCount).to.equal(1);
      });
    });

    describe('fetchDevices', () => {
      it('should trigger FETCH_DEVICES_SUCCESS and it should call devices.getAll once for a successful request', () => {
        let devices = [
          { id: 'one' }
        ];

        let api = {
          devices: {
            getAll: sinon.stub().callsArgWith(0, null, devices),
          },
        };

        let expectedActions = [
          { type: 'FETCH_DEVICES_REQUEST' },
          { type: 'FETCH_DEVICES_SUCCESS', payload: { devices : devices } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchDevices(api));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.devices.getAll.callCount).to.equal(1);
      });

      it('should trigger FETCH_DEVICES_FAILURE and it should call error once for a failed request', () => {
        let api = {
          devices: {
            getAll: sinon.stub().callsArgWith(0, {status: 500, body: 'Error!'}, null),
          },
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_DEVICES);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_DEVICES_REQUEST' },
          { type: 'FETCH_DEVICES_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchDevices(api));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_DEVICES });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.devices.getAll.callCount).to.equal(1);
      });
    });

    describe('fetchMessageThread', () => {
      it('should trigger FETCH_MESSAGE_THREAD_SUCCESS and it should call error once for a successful request', () => {
        let messageThread = [
          { message: 'Foobar' }
        ]

        let api = {
          team: {
            getMessageThread: sinon.stub().callsArgWith(1, null, messageThread)
          }
        };

        let expectedActions = [
          { type: 'FETCH_MESSAGE_THREAD_REQUEST' },
          { type: 'FETCH_MESSAGE_THREAD_SUCCESS', payload: { messageThread : messageThread } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchMessageThread(api, 300));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.team.getMessageThread.withArgs(300).callCount).to.equal(1);
      });

      it('should trigger FETCH_MESSAGE_THREAD_FAILURE and it should call error once for a failed request', () => {
        let messageThread = [
          { message: 'Foobar' }
        ]

        let api = {
          team: {
            getMessageThread: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_MESSAGE_THREAD);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_MESSAGE_THREAD_REQUEST' },
          { type: 'FETCH_MESSAGE_THREAD_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchMessageThread(api, 400));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_MESSAGE_THREAD });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.team.getMessageThread.withArgs(400).callCount).to.equal(1);
      });
    });

    describe('fetchDataSources', () => {
      it('should trigger FETCH_DATA_SOURCES_SUCCESS and it should call error once for a successful request', () => {
        let dataSources = [
          { id: 'strava' },
          { id: 'fitbit' },
        ];

        let api = {
          user: {
            getDataSources: sinon.stub().callsArgWith(0, null, dataSources)
          }
        };

        let expectedActions = [
          { type: 'FETCH_DATA_SOURCES_REQUEST' },
          { type: 'FETCH_DATA_SOURCES_SUCCESS', payload: { dataSources : dataSources } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchDataSources(api));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.getDataSources.callCount).to.equal(1);
      });

      it('should trigger FETCH_DATA_SOURCES_FAILURE and it should call error once for a failed request', () => {
        let api = {
          user: {
            getDataSources: sinon.stub().callsArgWith(0, {status: 500, body: 'Error!'}, null)
          }
        };

        let err = new Error(ErrorMessages.ERR_FETCHING_DATA_SOURCES);
        err.status = 500;

        let expectedActions = [
          { type: 'FETCH_DATA_SOURCES_REQUEST' },
          { type: 'FETCH_DATA_SOURCES_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.fetchDataSources(api));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_FETCHING_DATA_SOURCES });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.getDataSources.callCount).to.equal(1);
      });
    });

    describe('connectDataSource', () => {
      it('should trigger CONNECT_DATA_SOURCE_SUCCESS and it should call error once for a successful request', () => {
        let restrictedToken = { id: 'blah.blah.blah'};
        let url = 'fitbit.url';
        let api = {
          user: {
            createRestrictedToken: sinon.stub().callsArgWith(1, null, restrictedToken),
            createOAuthProviderAuthorization: sinon.stub().callsArgWith(2, null, url),
          }
        };

        let expectedActions = [
          { type: 'CONNECT_DATA_SOURCE_REQUEST' },
          { type: 'CONNECT_DATA_SOURCE_SUCCESS', payload: {
            authorizedDataSource : { id: 'fitbit', url: url}}
          }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.connectDataSource(api, 'fitbit', { path: [ '/v1/oauth/fitbit' ] }, { providerType: 'oauth', providerName: 'fitbit' }));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.createRestrictedToken.withArgs({ path: [ '/v1/oauth/fitbit' ] }).callCount).to.equal(1);
        expect(api.user.createOAuthProviderAuthorization.withArgs('fitbit', restrictedToken.id).callCount).to.equal(1);
      });

      it('should trigger CONNECT_DATA_SOURCE_FAILURE and it should call error once for an unexpected provider type', () => {
        let api = {
          user: {
            createRestrictedToken: sinon.stub(),
            createOAuthProviderAuthorization: sinon.stub(),
          }
        };

        let err = new Error(ErrorMessages.ERR_CONNECTING_DATA_SOURCE);

        let expectedActions = [
          { type: 'CONNECT_DATA_SOURCE_REQUEST' },
          { type: 'CONNECT_DATA_SOURCE_FAILURE', error: err, meta: { apiError: 'Unknown data source type' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.connectDataSource(api, 'strava', { path: [ '/v1/oauth/strava' ] }, { providerType: 'unexpected', providerName: 'strava' }));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_CONNECTING_DATA_SOURCE });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.createRestrictedToken.callCount).to.equal(0);
        expect(api.user.createOAuthProviderAuthorization.callCount).to.equal(0);
      });

      it('should trigger CONNECT_DATA_SOURCE_FAILURE and it should call error once for a failed request', () => {
        let api = {
          user: {
            createRestrictedToken: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'}, null),
            createOAuthProviderAuthorization: sinon.stub(),
          }
        };

        let err = new Error(ErrorMessages.ERR_CONNECTING_DATA_SOURCE);
        err.status = 500;

        let expectedActions = [
          { type: 'CONNECT_DATA_SOURCE_REQUEST' },
          { type: 'CONNECT_DATA_SOURCE_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.connectDataSource(api, 'strava', { path: [ '/v1/oauth/strava' ] }, { providerType: 'oauth', providerName: 'strava' }));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_CONNECTING_DATA_SOURCE });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.createRestrictedToken.withArgs({ path: [ '/v1/oauth/strava' ] }).callCount).to.equal(1);
        expect(api.user.createOAuthProviderAuthorization.callCount).to.equal(0);
      });
    });

    describe('disconnectDataSource', () => {
      it('should trigger DISCONNECT_DATA_SOURCE_SUCCESS and it should call error once for a successful request', () => {
        let restrictedToken = { id: 'blah.blah.blah'};
        let api = {
          user: {
            deleteOAuthProviderAuthorization: sinon.stub().callsArgWith(1, null, restrictedToken),
          }
        };

        let expectedActions = [
          { type: 'DISCONNECT_DATA_SOURCE_REQUEST' },
          { type: 'DISCONNECT_DATA_SOURCE_SUCCESS', payload: {}}
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });

        let store = mockStore({ blip: initialState });
        store.dispatch(async.disconnectDataSource(api, 'fitbit', { providerType: 'oauth', providerName: 'fitbit' }));

        const actions = store.getActions();
        expect(actions).to.eql(expectedActions);
        expect(api.user.deleteOAuthProviderAuthorization.withArgs('fitbit').callCount).to.equal(1);
      });

      it('should trigger DISCONNECT_DATA_SOURCE_FAILURE and it should call error once for an unexpected provider type', () => {
        let api = {
          user: {
            deleteOAuthProviderAuthorization: sinon.stub(),
          }
        };

        let err = new Error(ErrorMessages.ERR_DISCONNECTING_DATA_SOURCE);

        let expectedActions = [
          { type: 'DISCONNECT_DATA_SOURCE_REQUEST' },
          { type: 'DISCONNECT_DATA_SOURCE_FAILURE', error: err, meta: { apiError: 'Unknown data source type' } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.disconnectDataSource(api, 'strava', { providerType: 'unexpected', providerName: 'strava' }));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_DISCONNECTING_DATA_SOURCE });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.deleteOAuthProviderAuthorization.callCount).to.equal(0);
      });

      it('should trigger DISCONNECT_DATA_SOURCE_FAILURE and it should call error once for a failed request', () => {
        let api = {
          user: {
            deleteOAuthProviderAuthorization: sinon.stub().callsArgWith(1, {status: 500, body: 'Error!'}, null),
          }
        };

        let err = new Error(ErrorMessages.ERR_DISCONNECTING_DATA_SOURCE);
        err.status = 500;

        let expectedActions = [
          { type: 'DISCONNECT_DATA_SOURCE_REQUEST' },
          { type: 'DISCONNECT_DATA_SOURCE_FAILURE', error: err, meta: { apiError: {status: 500, body: 'Error!'} } }
        ];
        _.each(expectedActions, (action) => {
          expect(isTSA(action)).to.be.true;
        });
        let store = mockStore({ blip: initialState });
        store.dispatch(async.disconnectDataSource(api, 'strava', { providerType: 'oauth', providerName: 'strava' }));

        const actions = store.getActions();
        expect(actions[1].error).to.deep.include({ message: ErrorMessages.ERR_DISCONNECTING_DATA_SOURCE });
        expectedActions[1].error = actions[1].error;
        expect(actions).to.eql(expectedActions);
        expect(api.user.deleteOAuthProviderAuthorization.withArgs('strava').callCount).to.equal(1);
      });
    });
  });
});
