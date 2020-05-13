# Pre-auth Trigger
* AWS Cognito trigger Lambda function used to check if a user is in the correct groups.
* First checks the parameter store to see if there are allowed groups for the app client defined there, then checks if the user making the request belongs to them.
* If nothing is found in the parameter store it falls back to invoking app-specific Lambdas.

# Installation
* After cloning the project execute:

```
npm i
```
* If Serverless Framework is not already installed globally:

```
npm i serverless
```

## Testing

* To test against an app client that **DOES** have groups defined in the parameter store execute: 

```
sls invoke local -f auth -p tests/in-param-store.json
```

* To test against an app client that does **NOT** have groups defined in the parameter store execute: 

```
sls invoke local -f auth -p tests/not-in-param-store.json
```

## Deployment
* To deploy the Lambda  function simply execute:

```
sls deploy
```
