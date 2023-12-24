#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SQSDemoAppStack } from '../lib/sqs-demo-app-stack';

const app = new cdk.App();

const stack = new SQSDemoAppStack(app, 
  'SQSDemo-Stk',
  {
    env: { region: 'eu-west-1' },
  }
)