# Quickrefer AWS CDK Infra

This is a Iac repo for Quickrefer website (https://www.quickrefer.in)

The `cdk.json` file tells the CDK Toolkit how to execute your app.

(Previous name of this project is jobdashboard or jt)

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

## Stacks

- Two stacks - QuickReferStaging and QuickReferProd

## Commands

- uses cdk.context.json
- cdk diff QuickReferStaging -c env=staging
- cdk diff QuickReferProd -c env=prod