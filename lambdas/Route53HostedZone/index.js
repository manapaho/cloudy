import AWS from 'aws-sdk';
import https from 'https';
import url from 'url';

exports.handler = (event, context) => {

  console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

  // For Delete requests, immediately send a SUCCESS response.
  if (event.RequestType == "Delete") {
    sendResponse(event, context, "SUCCESS");
    return;
  }

  let responseStatus = "FAILED";
  let responseData = {};

  const route53 = new AWS.Route53();

  route53.listHostedZones({}).promise()
    .then(response => {
      console.log('CHECKING IF HOSTEDZONE ALREADY EXISTS');
      return response.HostedZones.find(hostedZone => {
        return hostedZone.Name === `${event.ResourceProperties.Domain}.`;
      });
    })
    .catch(err => {
      console.log('FAILED TO CHECK IF HOSTEDZONE ALREADY EXISTS:', err);
      return null;
    })
    .then(hostedZone => {
      if (!hostedZone) {
        route53.createHostedZone({
          CallerReference: event.ResourceProperties.CallerReference,
          Name: event.ResourceProperties.Domain,
          DelegationSetId: event.ResourceProperties.DelegationSetId
        }).promise()
          .then(response => {
            console.log('CREATED HOSTEDZONE SUCCESSFULLY:', response);
            responseStatus = "SUCCESS";
            responseData['HostedZoneId'] = response.Id.replace('/hostedzone/', '');
            sendResponse(event, context, responseStatus, responseData);
          })
          .catch(err => {
            console.log('FAILED TO CREATE HOSTEDZONE:', err);
            sendResponse(event, context, responseStatus, responseData);
          });
      } else {
        console.log('HOSTEDZONE ALREADY EXISTS');
        responseStatus = "SUCCESS";
        responseData['HostedZoneId'] = hostedZone.Id.replace('/hostedzone/', '');
        sendResponse(event, context, responseStatus, responseData);
      }
    });
};

// Send response to the pre-signed S3 URL
function sendResponse(event, context, responseStatus, responseData) {

  var responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData
  });

  console.log("RESPONSE BODY:\n", responseBody);

  var parsedUrl = url.parse(event.ResponseURL);
  var options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: "PUT",
    headers: {
      "content-type": "",
      "content-length": responseBody.length
    }
  };

  console.log("SENDING RESPONSE...\n");

  var request = https.request(options, function (response) {
    console.log("STATUS: " + response.statusCode);
    console.log("HEADERS: " + JSON.stringify(response.headers));
    // Tell AWS Lambda that the function execution is done
    context.done();
  });

  request.on("error", function (error) {
    console.log("sendResponse Error:" + error);
    // Tell AWS Lambda that the function execution is done
    context.done();
  });

  // write data to request body
  request.write(responseBody);
  request.end();
}
