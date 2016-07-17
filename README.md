# A complete AWS Environment Template

# Overview

This Repo represents an example of the `master` of your AWS based Product Environments.

The idea is that all environments for your Product should be based on a common code and infrastructure base.

Basically we want the `production` environments, the `test` environments and the `development` environments
to be mostly identical and based on the same code.

This allows you for example to spin up a new `test` or `dev` environment with the great feeling that
it will be almost identical to the `production` environment. Which gives you the confidence that your
bugfix or new feature will work in production as expected and without nasty surprises.

# Master, Branch and Fork

Your `master` should contain everything production ready. But you will never spin up an environment
directly from `master`.

To create any `production`, `test`, `development` or `whatever` environment you either create a
branch or a fork.

# Deployment

After you've created a new branch or fork you only have to change the `config.json` with the
parameters for your new environment and then run `npm run deploy`.

This will deploy all configured CloudFormation Stacks and Resources, compile and upload all your Lambdas
and Web/Micro-Sites and populate the databases.

# Security

`master` and every `branch` or `fork` use standard GIT user access management.
It is encouraged to use PRs and reviewed merges. Ownership and accountability are very flexible this way.

The deployed environments use standard AWS access management via IAM and ACL.
This allows for a very granular access control with PCI compliant limits and boundaries.

# TODOs

- Add Hosted Zones to example
- Add CloudFront to example
- Add Websites to example
- Add API Gateway to example
- Add DynamoDB to example
- Add Cognito User and Indentity Pools to example
- Tidy up
- Find more enhancements
- Fix bugs, if any ;)
- Improve performance, if possible ;)

# Contributions

Please contribute, find issues, send pull requests, become part of a better world ;)
