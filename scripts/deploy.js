/**
 * Manapaho (https://github.com/Manapaho/)
 *
 * Copyright © 2016 Manapaho. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

'use strict';

/**
 * Import dependencies.
 */
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

/**
 * Load the config.
 */
let config = {};

try {
  config = JSON.parse(fs.readFileSync(path.join(__dirname, `../config.json`), 'utf-8'));
}
catch (err) {
  console.log("Failed to load the Configuration:", err);
}

/**
 * Deploy everything.
 */
config.Stacks.forEach(stackConfig => {

  /**
   * Load the stack definition.
   */
  let stackTemplate = '';
  let stack = {};

  try {
    stackTemplate = fs.readFileSync(path.join(__dirname, `../stacks/${stackConfig.Name}.json`), 'utf-8');
    stack = JSON.parse(stackTemplate);
  }
  catch (err) {
    console.log(`Failed to load the [${stackConfig.Name}] Stack Template:`, err);
    process.exit(1);
  }

  /**
   * Set the region.
   */
  AWS.config.update({region: stackConfig.Region});

  /**
   * Get the services.
   */
  const s3 = new AWS.S3();
  const cloudformation = new AWS.CloudFormation();

  /**
   * Access the S3 lambda bucket.
   */
  const lambdasBucketName = [config.Name.toLowerCase(), stackConfig.Region, 'lambdas'].join('-');
  const lambdasBucketUrl = stackConfig.Region !== 'us-east-1' ? `https://s3-${stackConfig.Region}.amazonaws.com/${lambdasBucketName}` : `https://s3.amazonaws.com/${lambdasBucketName}`;

  let lambdaFiles = [];

  s3.headBucket({Bucket: lambdasBucketName}).promise().then(response => {
    console.log(`[${stackConfig.Name}] Lambdas Bucket will be updated.`);
  }).catch(err => {
    if (err.code !== 'NotFound') {
      console.log(`Failed to access Lambdas Bucket: ${stackConfig.Name}`);
      process.exit(1);
    }

    /**
     * Create the lambdas bucket.
     */
    return s3.createBucket(Object.assign({
      Bucket: lambdasBucketName,
      ACL: 'private'
    }, stackConfig.Region !== 'us-east-1' ? {
      CreateBucketConfiguration: {
        LocationConstraint: stackConfig.Region
      }
    } : null)).promise().then(response => {
      console.log(`Created [${lambdasBucketName}] Lambdas Bucket:`, response);
    }).catch(err => {
      console.log(`Failed to create [${lambdasBucketName}] Lambdas Bucket:`, err);
      process.exit(1);
    });
  }).then(() => {
    /**
     * Upload all lambdas.
     */
    let uploadLambdasPromises = [];
    try {
      lambdaFiles = fs.readdirSync(path.join(__dirname, '../dist/lambdas'));
    } catch (err) {
      console.log(`Failed to access the Lambdas Distribution Folder:`, err);
      process.exit(1);
    }
    lambdaFiles.forEach(lambdaFile => {
      try {
        let lambdaSource = fs.readFileSync(path.join(__dirname, `../dist/lambdas/${lambdaFile}`), 'utf-8');
        let zip = new JSZip();
        zip.file("index.js", lambdaSource);
        uploadLambdasPromises.push(zip.generateAsync({type: 'nodebuffer'}).then(body => {
            return s3.putObject({
              Bucket: lambdasBucketName,
              Key: lambdaFile.replace('.js', '.zip'),
              ACL: 'private',
              Body: body,
              ContentType: 'application/zip'
            }).promise().then(response => {
              console.log(`Uploaded [${lambdaFile}] Lambda File:`, response);
            }).catch(err => {
              console.log(`Failed to upload [${lambdaFile}] Lambda File:`, err);
              process.exit(1);
            });
          })
        );
      } catch (err) {
        console.log(`Failed to access [${lambdaFile}] Lambda File:`, err);
        process.exit(1);
      }
    });
    return Promise.all(uploadLambdasPromises);
  }).then(() => {

    /**
     * Find all nested stacks.
     */
    let nestedStackNames = [];

    for (let resourceKey in stack.Resources) {
      let resource = stack.Resources[resourceKey];
      if (resource.Type === "AWS::CloudFormation::Stack") {
        let match = /(.+?)(?=Stack$)/g.exec(resourceKey);
        if (!match || !match[1]) {
          console.log(`Invalid Nested Stack name: ${resourceKey}`);
          process.exit(1);
        } else {
          nestedStackNames.push(match[1]);
        }
      }
    }

    /**
     * Access the S3 stacks bucket.
     */
    const stacksBucketName = [config.Name.toLowerCase(), stackConfig.Region, 'stacks'].join('-');
    const stacksBucketUrl = stackConfig.Region !== 'us-east-1' ? `https://s3-${stackConfig.Region}.amazonaws.com/${stacksBucketName}` : `https://s3.amazonaws.com/${stacksBucketName}`;

    s3.headBucket({Bucket: stacksBucketName}).promise().then(response => {
      console.log(`[${stackConfig.Name}] Stacks Bucket will be updated.`);
    }).catch(err => {
      if (err.code !== 'NotFound') {
        console.log(`Failed to access Stacks Bucket: ${stackConfig.Name}`);
        process.exit(1);
      }

      /**
       * Create the stacks bucket.
       */
      return s3.createBucket(Object.assign({
        Bucket: stacksBucketName,
        ACL: 'private'
      }, stackConfig.Region !== 'us-east-1' ? {
        CreateBucketConfiguration: {
          LocationConstraint: stackConfig.Region
        }
      } : null)).promise().then(response => {
        console.log(`Created [${stacksBucketName}] Stacks Bucket:`, response);
      }).catch(err => {
        console.log(`Failed to create [${stacksBucketName}] Stacks Bucket:`, err);
        process.exit(1);
      });
    }).then(() => {

      lambdaFiles.forEach(lambdaFile => {
        let split = lambdaFile.split('.');
        stackTemplate = stackTemplate.replace(`${split[0]}.zip`, `${split[0]}.${split[1]}.zip`);
      });

      let uploadStacksPromises = [

        /**
         * Upload the stack to the stacks bucket.
         */
        s3.putObject({
          Bucket: stacksBucketName,
          Key: `${stackConfig.Name}.template`,
          ACL: 'private',
          Body: stackTemplate
        }).promise().then(response => {
          console.log(`Uploaded [${stackConfig.Name}] Stack Template:`, response);
        }).catch(err => {
          console.log(`Failed to upload [${stackConfig.Name}] Stack Template:`, err);
          process.exit(1);
        })
      ];

      /**
       * Upload the nested stacks to the stacks bucket.
       */
      nestedStackNames.forEach(nestedStackName => {
        let nestedStackTemplate = '';
        try {
          nestedStackTemplate = fs.readFileSync(path.join(__dirname, `../stacks/${nestedStackName}.json`), 'utf-8');
        }
        catch (err) {
          console.log(`Failed to load the [${nestedStackName}] Stack Template:`, err);
          process.exit(1);
        }
        lambdaFiles.forEach(lambdaFile => {
          let split = lambdaFile.split('.');
          nestedStackTemplate = nestedStackTemplate.replace(`${split[0]}.zip`, `${split[0]}.${split[1]}.zip`);
        });
        uploadStacksPromises.push(s3.putObject({
            Bucket: stacksBucketName,
            Key: `${nestedStackName}.template`,
            ACL: 'private',
            Body: nestedStackTemplate
          }).promise().then(response => {
            console.log(`Uploaded nested [${nestedStackName}] Stack Template:`, response);
          }).catch(err => {
            console.log(`Failed to upload the nested [${nestedStackName}] Stack Template:`, err);
            process.exit(1);
          })
        );
      });
      return Promise.all(uploadStacksPromises);
    }).then(() => {

      /**
       * Access the CloudFormation stack.
       */
      cloudformation.describeStacks({
        StackName: [config.Name, stackConfig.Region, stackConfig.Name].join('-')
      }).promise().then(response => {

        /**
         * Update an existing stack.
         */
        console.log('Updating Stack: ', response.Stacks[0].StackId);
        cloudformation.updateStack({
          StackName: [config.Name, stackConfig.Region, stackConfig.Name].join('-'),
          Capabilities: ['CAPABILITY_IAM'],
          // DisableRollback: false,
          NotificationARNs: [],
          Parameters: stackConfig.Parameters.concat(nestedStackNames.map(nestedStackName => {
            return {
              ParameterKey: `${nestedStackName}StackTemplateUrl`,
              ParameterValue: `${stacksBucketUrl}/${nestedStackName}.template`,
              UsePreviousValue: false
            }
          }), [{
            ParameterKey: `LambdasBucketName`,
            ParameterValue: lambdasBucketName,
            UsePreviousValue: false
          }, {
            ParameterKey: `EnvironmentPrefix`,
            ParameterValue: `${config.Name}-${stackConfig.Region}-`,
            UsePreviousValue: false
          }]),
          // ResourceTypes: ['AWS::*'],
          StackPolicyBody: JSON.stringify(stackConfig.Policy),
          StackPolicyDuringUpdateBody: JSON.stringify(stackConfig.UpdatePolicy),
          //StackPolicyURL: 'STRING_VALUE',
          Tags: stackConfig.Tags,
          //TemplateBody: 'STRING_VALUE',
          TemplateURL: `${stacksBucketUrl}/${stackConfig.Name}.template`,
          UsePreviousTemplate: false
        }).promise().then(response => {
          console.log('Update in progress...');
          cloudformation.waitFor('stackUpdateComplete', {
            StackName: [config.Name, stackConfig.Region, stackConfig.Name].join('-')
          }).promise().then(response => {
            console.log('Update successful:', JSON.stringify(response, null, 2));
          }).catch(err => {
            console.log('Update failed:', err);
          });
        }).catch(err => {
          console.log('Update failed:', err);
        });
      }).catch(err => {

        /**
         * Create a new stack.
         */
        cloudformation.createStack({
          StackName: [config.Name, stackConfig.Region, stackConfig.Name].join('-'),
          Capabilities: ['CAPABILITY_IAM'],
          // DisableRollback: false,
          NotificationARNs: [],
          OnFailure: 'ROLLBACK',
          Parameters: stackConfig.Parameters.concat(nestedStackNames.map(nestedStackName => {
            return {
              ParameterKey: `${nestedStackName}StackTemplateUrl`,
              ParameterValue: `${stacksBucketUrl}/${nestedStackName}.template`,
              UsePreviousValue: false
            }
          }), [{
            ParameterKey: `LambdasBucketName`,
            ParameterValue: lambdasBucketName,
            UsePreviousValue: false
          }, {
            ParameterKey: `EnvironmentPrefix`,
            ParameterValue: `${config.Name}-${stackConfig.Region}-`,
            UsePreviousValue: false
          }]),
          // ResourceTypes: ['AWS::*'],
          StackPolicyBody: JSON.stringify(stackConfig.Policy),
          //StackPolicyURL: 'STRING_VALUE',
          Tags: stackConfig.Tags,
          //TemplateBody: 'STRING_VALUE',
          TemplateURL: `${stacksBucketUrl}/${stackConfig.Name}.template`,
          TimeoutInMinutes: 60
        }).promise().then(response => {
          console.log('Creation in progress...');
          cloudformation.waitFor('stackCreateComplete', {
            StackName: [config.Name, stackConfig.Region, stackConfig.Name].join('-')
          }).promise().then(response => {
            console.log('Creation successful:', JSON.stringify(response, null, 2));
          }).catch(err => {
            console.log('Creation failed:', err);
          });
        }).catch(err => {
          console.log('Creation failed:', err);
        });
      });
    });
  });

});
