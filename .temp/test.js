'use strict';

const AWS = require('aws-sdk');

let x = "/delegationset/NHKXBB6SHGKLN";
console.log(x.replace('/delegationset/', ''));
return;

const route53 = new AWS.Route53();

route53.listHostedZones({}).promise()
  .then(response => {
    console.log(response);
    return response.HostedZones.find(hostedZone => {
      return hostedZone.Name === 'manapaho.com.';
    });
  })
  .catch(err => {
    console.log(err);
  })
  .then(hostedZone => {
    console.log(hostedZone);
  });

return;

/*

route53.listReusableDelegationSets({}).promise()
  .then(response => {
    return response.DelegationSets.find(delegationSet => {
      return delegationSet.CallerReference === 'arn:aws:lambda:us-east-1:238541850529:function:Prod-Wessels-us-east-1-Route53ReusableDelegationSet';
    });
  })
  .catch(err => {
    console.log(err);
  })
  .then(reusableDelegationSet => {
    console.log(reusableDelegationSet);
  });

return;

AWS.config.update({region: 'us-east-1'});

let stackName = 'Prod-Manapaho-us-east-1-NameServerSet';
let responseStatus = "FAILED";
let responseData = {};

let cfn = new AWS.CloudFormation();
cfn.describeStacks({StackName: stackName}).promise()
  .then(data => {
    console.log('333333333333333333333', JSON.stringify(data, null, 2));
    data.Stacks[0].Outputs.forEach(function (output) {
      responseData[output.OutputKey] = output.OutputValue;
    });
    responseStatus = "SUCCESS";
    console.log(JSON.stringify(responseData, null, 2));
  })
  .catch(err => {
    console.log('4444444444444444444444444');
    console.log('FAILED TO DESCRIBE STACK:', err);
  });

return;

const route53 = new AWS.Route53();

route53.listReusableDelegationSets({}).promise()
  .then(response => {
    console.log(response.DelegationSets.find(delegationSet => {
      return delegationSet.CallerReference === 'arn:aws:lambda:us-east-1:238541850529:function:Prod-Manapaho-us-east-1-Route53ReusableDelegationSet';
    }));
  })
  .catch(err => {
    console.log(err);
  });

return;

route53.createReusableDelegationSet({CallerReference: 'createReusableDelegationSet'}).promise()
  .then(response => {
    console.log('XXXXXXXX', JSON.stringify(response, null, 2));
  })
  .catch(err => {
    console.log(err, err.stack);
  });
*/
