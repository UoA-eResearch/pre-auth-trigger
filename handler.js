'use strict';
let AWS = require('aws-sdk');

module.exports.auth = async (event, context, callback) => {
  const SSM = new AWS.SSM({ region: process.env.region });

  try {
    const appClientID = event.callerContext.clientId;
    console.log({ event: event, appClientID: appClientID });

    let paramStoreNeededGroups;
    try { // Get groups from parameter store
      paramStoreNeededGroups = await SSM.getParameter({ Name: `/${process.env.ENV}/cognito/${appClientID}` }).promise()
        .then(res => res.Parameter.Value);
      console.log({ paramStoreNeededGroups: paramStoreNeededGroups });

      if (paramStoreNeededGroups === 'NO_AUTHORISATION_NEEDED') {
        return authResultToCognito(true);
      }
    } catch (e) { console.error('Could not find groups in parameter store: ', JSON.stringify(e)); }

    if (paramStoreNeededGroups) {
      console.log('Found groups in parameter store for appClient:', appClientID);
      return authResultToCognito(paramStoreNeededGroups.split('|').some(x => event.request.userAttributes['custom:Groups'].includes(x)));
    } else {
      console.log('Groups NOT found in parameter store. Trying to execute Lambda function instead...');

      let lambda = new AWS.Lambda();
      const lambdaParameters = {
        FunctionName: `cognito-authorisation-${appClientID}`,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(event)
      }

      lambda.invoke(lambdaParameters, (err, data) => {
        console.log('Response from Lambda:', data);
        return authResultToCognito(data.StatusCode === 200)
      });
    }
  } catch (e) {
    console.error(e);
    return authResultToCognito(false, 'Group membership check failed. Something went wrong.')
  }

  function authResultToCognito(canAccess, errorMsg = 'User is NOT allowed to access the app.') {
    console.log('User can access this app?', canAccess);
    return canAccess ? callback(null, event) : callback(new Error(errorMsg), null);
  }

};
