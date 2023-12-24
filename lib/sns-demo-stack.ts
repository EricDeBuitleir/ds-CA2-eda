import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Duration } from "aws-cdk-lib";

import { Construct } from "constructs";
import { SqsDestination } from "aws-cdk-lib/aws-lambda-destinations";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class SNSDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Integration rsources

    const demoTopic = new sns.Topic(this, "DemoTopic", {
      displayName: "Demo topic",
    });

    const queue = new sqs.Queue(this, "all-msg-queue", {
      receiveMessageWaitTime: cdk.Duration.seconds(5),
    });

    const failuresQueue = new sqs.Queue(this, "img-created-queue", {
      receiveMessageWaitTime: cdk.Duration.seconds(5),
    });

    // Lambda handlers

    const processSNSMessageFn = new lambdanode.NodejsFunction(
      this,
      "processSNSMsgFn",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        memorySize: 128,
        timeout: cdk.Duration.seconds(3),
        entry: `${__dirname}/../lambdas/processSNSMsg.ts`,
      }
    );

    const processSQSMessageFn = new lambdanode.NodejsFunction(
      this,
      "processSQSMsgFn",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        memorySize: 128,
        timeout: cdk.Duration.seconds(3),
        entry: `${__dirname}/../lambdas/processSQSMsg.ts`,
      }
    );

    const processFailuresFn = new lambdanode.NodejsFunction(
      this,
      "processFailedMsgFn",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        memorySize: 128,
        timeout: cdk.Duration.seconds(3),
        entry: `${__dirname}/../lambdas/processFailures.ts`,
      }
    );

    // Subscribers

    demoTopic.addSubscription(
      new subs.LambdaSubscription(processSNSMessageFn, {
          filterPolicy: {
            user_type: sns.SubscriptionFilter.stringFilter({
                allowlist: ['Student','Lecturer']
            }),
          },
      })
    );

    demoTopic.addSubscription(
      new subs.SqsSubscription(queue, {
        rawMessageDelivery: true,
        filterPolicy: {
          user_type: sns.SubscriptionFilter.stringFilter({
              denylist: ['Lecturer']  
          }),
          source: sns.SubscriptionFilter.stringFilter({
            matchPrefixes: ['Moodle','Slack']  
        }),
        },
      })
    );

    // Event Sources

    processSQSMessageFn.addEventSource(
      new SqsEventSource(queue, {
        maxBatchingWindow: Duration.seconds(5),
        maxConcurrency: 2,
      })
    );

    processFailuresFn.addEventSource(
      new SqsEventSource(failuresQueue, {
        maxBatchingWindow: Duration.seconds(5),
        maxConcurrency: 2,
      })
    );

    // Output

    new cdk.CfnOutput(this, "topicARN", {
      value: demoTopic.topicArn,
    });
  }
}
