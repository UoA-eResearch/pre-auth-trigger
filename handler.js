'use strict';
let AWS = require('aws-sdk');

module.exports.auth = async function (event, context, callback) {
  try {
    const SSM = new AWS.SSM({ region: process.env.region });
    const appClientID = event.callerContext.clientId;
    let paramStoreNeededGroups;
    console.log({ event: event, appClientID: appClientID });

    try { // Get groups from parameter store
      paramStoreNeededGroups = await SSM.getParameter({ Name: `/${process.env.ENV}/cognito/${appClientID}` }).promise()
        .then(res => res.Parameter.Value);

      console.log('paramStoreNeededGroups', paramStoreNeededGroups);
      if (paramStoreNeededGroups === 'NO_AUTHORISATION_NEEDED') return authResultToCognito(true);
    } catch (e) { console.error('Could not find groups in parameter store: ', JSON.stringify(e)); }

    if (paramStoreNeededGroups)
      return authResultToCognito(paramStoreNeededGroups.split('|').some(x => event.request.userAttributes['custom:Groups'].includes(x)));

    console.log('Groups NOT found in parameter store. Trying to execute Lambda function instead...');
    let lambdaResponse = await new Promise((resolve, reject) => {
      const lambdaParameters = {
        FunctionName: `cognito-authorisation-${appClientID}`,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(event)
      };

      return new AWS.Lambda().invoke(lambdaParameters, (err, data) => err ? reject(err) : resolve(data)).promise();
    });

    console.log('Lambda response:', lambdaResponse);
    return authResultToCognito(lambdaResponse.StatusCode == 200);
  } catch (e) { console.error(e); return authResultToCognito(false, 'Group membership check failed. Something went wrong.'); }

  function authResultToCognito(canAccess, errorMsg = 'User is NOT allowed to access the app.') {
    console.log('User can access this app?', canAccess);
    canAccess ? callback(null, event) : callback(new Error(errorMsg), null);
  }
};