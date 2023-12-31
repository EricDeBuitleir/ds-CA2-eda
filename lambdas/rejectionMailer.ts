import { SQSHandler } from "aws-lambda";
// import AWS from 'aws-sdk';
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";
import {SESClient,SendEmailCommand,SendEmailCommandInput} from "@aws-sdk/client-ses";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
if (!SES_EMAIL_TO || !SES_EMAIL_FROM || !SES_REGION) {
  throw new Error(
    "Please add the SES_EMAIL_TO, SES_EMAIL_FROM and SES_REGION environment variables in an env.js file located in the root directory"
  );
}

// CLASS BASED OFF confirmationMailer but to handle rejection.

// type ContactDetails = {
//   name: string;
//   email: string;
//   message: string;
// };

const client = new SESClient({ region: "eu-west-1" });

export const handler: SQSHandler = async (event: any) => {
  console.log("Event ", event);
  for (const snsRecord of event.Records) {
    const recordBody = JSON.parse(snsRecord.body);
    const snsMessage = JSON.parse(recordBody.Message);


    if (snsMessage.Records) {
      console.log("Record body ", JSON.stringify(snsMessage));
      for (const messageRecord of snsMessage.Records) {
        const s3e = messageRecord.s3;
        const srcBucket = s3e.bucket.name;
        // Object key may have spaces or unicode non-ASCII characters.
        const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));
        try {
     
          const supportType = isTypeImgSupported(srcKey)

          if(!supportType){
          const message = `The image we recieved ${srcKey} has been rejected, please send a valid image type. Its URL is s3://${srcBucket}/${srcKey}`;
          // const params = sendEmailParams({ name, email, message });
          await rejectEmail(message);
          console.log("Email stating rejection sent")

          await deleteUnsupportedImg(srcBucket, srcKey)
        }
       } catch (error: unknown) {
          console.log("ERROR is: ", error);
          // return;
        }
      }
    }
  }
};

async function rejectEmail(message: String) {
  try{
  const parameters: SendEmailCommandInput = {
    Destination: {
      ToAddresses: [SES_EMAIL_TO],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          // Data: getHtmlContent({ name, email, message }),
          Data: getHtmlContent(message),

        },
        // Text: {
        //   Charset: "UTF-8",
        //   Data: getTextContent({ name, email, message }),
        // },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Image has been rejected`,
      },
    },
    Source: SES_EMAIL_FROM,
  };
  // return parameters;
  await client.send(new SendEmailCommand(parameters)) // Reference for SendEmailCommand: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/ses/command/SendEmailCommand/
  console.log("Email was rejected");
} catch (error) {
//   console.error("Error sending email:", error);
//   throw error; // rethrow the error to be caught by the caller
}
}




// function getHtmlContent({ name, email, message }: ContactDetails) {
function getHtmlContent(message: String) {

  return `
    <html>
      <body>
        <h2>Sent from: </h2>
        <p style="font-size:18px">${message}</p>
      </body>
    </html> 
  `;
}


function isTypeImgSupported(srcKey: String): boolean {
  return srcKey.endsWith(".jpg") || srcKey.endsWith(".png") || srcKey.endsWith(".jpeg")
}


// async function deleteUnsupportedImg(bucket: string, key: string) {
async function deleteUnsupportedImg(bucket: string,key: string) {
try{
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    console.log(`Object ${key} deleted successfully from bucket ${bucket}`);
  } catch (error) {
    console.error(`Error deleting object ${key} from bucket ${bucket}:`, error);
    throw error;
  }


// function getTextContent({ name, email, message }: ContactDetails) {
//   return `
//     Received an Email. 📬
//     Sent from:
//         👤 ${name}
//         ✉️ ${email}
//     ${message}
//   `;
}