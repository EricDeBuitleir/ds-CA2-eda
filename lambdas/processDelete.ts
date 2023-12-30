/* eslint-disable import/extensions, import/no-absolute-path */
import { SQSHandler } from "aws-lambda";
import * as dynamoDB from 'aws-cdk-lib/aws-dynamodb';
import {
  GetObjectCommand, 
  PutObjectCommandInput,
  GetObjectCommandInput,
  S3Client,
  PutObjectCommand,
  
} from "@aws-sdk/client-s3";

// class similar to processImage.ts, functions commented out for image checking and syntax changed to allow for Delete Command

// Reference for Deleteing objects: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";



const s3 = new S3Client();

// Reference for consts below (Line 19 and 20): https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html
// const client = new DynamoDBClient({});
// const docClient = DynamoDBDocumentClient.from(client);

const dbClient = createDDbDocClient();

export const handler: SQSHandler = async (event) => {
  console.log("Event ", event);
  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body);  // Parse SQS message
    const snsMessage = JSON.parse(recordBody.Message); // Parse SNS message

    if (snsMessage.Records) {
      console.log("Record body ", JSON.stringify(snsMessage));
      for (const messageRecord of snsMessage.Records) {
        const s3e = messageRecord.s3;
        // const srcBucket = s3e.bucket.name;
        // Object key may have spaces or unicode non-ASCII characters.
        const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));
        // // Infer the image type from the file suffix.
                                                                                                                    // const typeMatch = srcKey.match(/\.([^.]*)$/);
                                                                                                                    // if (!typeMatch) {
                                                                                                                    //   console.log("Could not determine the image type.");
                                                                                                                    //   throw new Error("Could not determine the image type. ");
                                                                                                                    // }
                                                                                                                    // // Check that the image type is supported
                                                                                                                    // const imageType = typeMatch[1].toLowerCase();
                                                                                                                    // if (imageType != "jpeg" && imageType != "png") {
                                                                                                                    //   console.log(`Unsupported image type: ${imageType}`);
                                                                                                                    //   throw new Error("Unsupported image type: ${imageType. ");
                                                                                                                    // }
                                                                                                                    // process image upload 
                                                                                                                    // reference to syntax for deleting an item into DynamoDB: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html
        const deleteItem = new DeleteCommand({
          TableName: "Img",
          Key:{ // Key is used instead of item
            "Name": srcKey,
          },
        });
        await dbClient.send(deleteItem)
      } 
    
    }
  }
  
};

// Function taken from CA1
function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}