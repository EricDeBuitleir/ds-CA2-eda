import { SQSHandler } from "aws-lambda";
// import AWS from 'aws-sdk';
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";
import {SESClient,SendEmailCommand,SendEmailCommandInput,} from "@aws-sdk/client-ses";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

if (!SES_EMAIL_TO || !SES_EMAIL_FROM || !SES_REGION) {
  throw new Error(
    "Please add the SES_EMAIL_TO, SES_EMAIL_FROM and SES_REGION environment variables in an env.js file located in the root directory"
  );
}

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
          // const { name, email, message }: ContactDetails = {
          //   name: "The Photo Album",
          //   email: SES_EMAIL_FROM,
          //   message: `We received your Image. Its URL is s3://${srcBucket}/${srcKey}`,
          // };
          if(supportType){
          const message = `We received your Image. Its URL is s3://${srcBucket}/${srcKey}`;
          // const params = sendEmailParams({ name, email, message });
          await sendEmail(message);
        }
      } catch (error: unknown) {
          console.log("ERROR is: ", error);
          // return;
        }
      }
    }
  }
};

// same as mailer from class, just with  email and name taken out, as well as using DynamoDB send syntax
async function sendEmail(message: String) {
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
        Data: `New image Upload`,
      },
    },
    Source: SES_EMAIL_FROM,
  };
  // return parameters;
  await client.send(new SendEmailCommand(parameters)) // Reference for SendEmailCommand: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/ses/command/SendEmailCommand/
  console.log("Email sent successfully");
} catch (error) {
  console.error("Error sending email:", error);
  throw error; // rethrow the error to be caught by the caller
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



// function getTextContent({ name, email, message }: ContactDetails) {
//   return `
//     Received an Email. 📬
//     Sent from:
//         👤 ${name}
//         ✉️ ${email}
//     ${message}
//   `;
// }