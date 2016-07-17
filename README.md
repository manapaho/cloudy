# A complete AWS Environment Template

# Overview

This Repo represents an example of the `master` of your AWS based Product Environments.

The idea is that all Environments for your Product should be based on a common code and infrastructure base.

Basically we want the `production` Environments, the `test` Environments and the `development` Environments
to be mostly identical and based on the same code.

This allows you for example to spin up a new `test` or `dev` Environment with the great feeling that
it will be almost identical to the `production` Environments. Which gives you the confidence that your
bugfix or new feature will work in production as expected and without nasty surprises.

# A single master repository

You might be used to scatter all the features of your product across lots of more or less independent
repositories. We think this approach is not very scalable and usually ends up in a very messy code base.

Having everything in a single `master` repository might feel a bit overwhelming but encourages a much
more structured and quality codebase.

AWS itself already provides you with a clear structure of resources and you only need to structure
the parts of your product properly within the repository.

This approach also allows for external repos or code sources holding things not directly related to
your codebase. An example for this would be scrubbed data or external libraries.

# Master, Branch and Fork

Your `master` should contain everything production ready. But you will never spin up an Environment
directly from `master`.

To create any `production`, `test`, `development` or `whatever` Environment you either create a
branch or a fork.

# Development

To develop a new feature or bugfix you just create a new branch or fork, change the `config.json`,
deploy and develop in your `dev` Environment until you are happy.

Then you create a PR and the appropriate person will review and pull it into `master`.
Your new feature or bugfix can then be rolled out to the `production` Environments
by simply reviewing and merging it from `master` into each `production` Environment when convenient.

# Deployment

After you've created a new branch or fork you only have to change the `config.json` with the
parameters for your new Environment and then run `npm run deploy`.

This will deploy all configured CloudFormation Stacks and Resources, compile and upload all your Lambdas
and Web/Micro-Sites and populate the databases.

# Security

`master` and every `branch` or `fork` use standard GIT user access management.
It is encouraged to use PRs and reviewed merges. Ownership and accountability are very flexible this way.

The deployed Environments use standard AWS access management via IAM and ACL.
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
