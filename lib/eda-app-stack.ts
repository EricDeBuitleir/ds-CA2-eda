import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as events from "aws-cdk-lib/aws-lambda-event-sources";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamoDB from "aws-cdk-lib/aws-dynamodb"
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class EDAAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // DynamoDB image table -> similar to tables in API stack from Assignment 1
    const imageTable = new dynamodb.Table(this, "ImageTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "imageName", type: dynamodb.AttributeType.STRING },

      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "ImageTable",
    });

    const imagesBucket = new s3.Bucket(this, "images", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
    });

    // Output
    
    // new cdk.CfnOutput(this, "bucketName", {
    //   value: imagesBucket.bucketName,
    // });


    //DLQ for rejectionEmail
    const rejectQueue = new sqs.Queue(this, "Rejection-Email-DLQ", {
      queueName: "Rejection-Email-DLQ",
      // receiveMessageWaitTime: cdk.Duration.seconds(10),

    });

    // Integration infrastructure

  const imageProcessQueue = new sqs.Queue(this, "img-created-queue", {
    receiveMessageWaitTime: cdk.Duration.seconds(10),
    deadLetterQueue: {
      queue: rejectQueue,
      maxReceiveCount: 1

    },

  });



  const mailerQ = new sqs.Queue(this, "mailer-queue", {
    receiveMessageWaitTime: cdk.Duration.seconds(10),
  });

  const newImageTopic = new sns.Topic(this, "NewImageTopic", {
    displayName: "New Image topic",
  }); 

  // Lambda functions

  const processImageFn = new lambdanode.NodejsFunction(
    this,
    "ProcessImageFn",
    {
      // architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/processImage.ts`,
      timeout: cdk.Duration.seconds(15),
      memorySize: 128,
    }
  );


  // same as mailerFN but since it doesn't exist anymore, simply change the name
  const confirmationMailerFn = new lambdanode.NodejsFunction(this, "confirmation-mailer-function", {
    runtime: lambda.Runtime.NODEJS_16_X,
    memorySize: 1024,
    timeout: cdk.Duration.seconds(3),
    entry: `${__dirname}/../lambdas/confirmationMailer.ts`,
  });

  // same as confirmationMailerFn but to handle the rejection mailer class
  const rejectionMailerFn = new lambdanode.NodejsFunction(this, "rejection-mailer-function", {
    runtime: lambda.Runtime.NODEJS_16_X,
    memorySize: 1024,
    timeout: cdk.Duration.seconds(3),
    entry: `${__dirname}/../lambdas/rejectionMailer.ts`,
  });

  


  // Event triggers

  imagesBucket.addEventNotification(
    s3.EventType.OBJECT_CREATED,
    new s3n.SnsDestination(newImageTopic)  // Changed
);

newImageTopic.addSubscription(
  new subs.SqsSubscription(imageProcessQueue)
);
newImageTopic.addSubscription(
  new subs.SqsSubscription(mailerQ)
  );


  const newImageEventSource = new events.SqsEventSource(imageProcessQueue, {
    batchSize: 5,
    maxBatchingWindow: cdk.Duration.seconds(10),
  });

  const newImageMailEventSource = new events.SqsEventSource(mailerQ, {
    batchSize: 5,
    maxBatchingWindow: cdk.Duration.seconds(10),
  }); 
  const newImageRejectEventSource = new events.SqsEventSource(rejectQueue, {
    batchSize: 5,
    maxBatchingWindow: cdk.Duration.seconds(10),
  }); 

  processImageFn.addEventSource(newImageEventSource);
  rejectionMailerFn.addEventSource(newImageRejectEventSource);


  confirmationMailerFn.addEventSource(newImageMailEventSource);

  // Permissions

  imagesBucket.grantRead(processImageFn);
  imageTable.grantReadWriteData(processImageFn)

  // Output
  
  new cdk.CfnOutput(this, "bucketName", {
    value: imagesBucket.bucketName,
  });

  // same as mailerFn but changed to match refactored name
  confirmationMailerFn.addToRolePolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:SendTemplatedEmail",
      ],
      resources: ["*"],
    })
  );

  // same as confirmation above but to handle rejection
  rejectionMailerFn.addToRolePolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:SendTemplatedEmail",
      ],
      resources: ["*"],
    })
  );
 
  }
}


 

