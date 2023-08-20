import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "./s3Client";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";

const cloudFront = new CloudFrontClient(); // adjust the region accordingly
const distributionId = "EFXXZFXTNKHI6";

exports.handler = async (event) => {
  console.log("event", event);
  const bucketName = process.env.BUCKET_NAME;
  const fileExtension = event.headers["file-extension"]; // assume client sends the file extension in headers

  const requestBody = JSON.parse(event.body);
  const base64String = requestBody.fileData;
  const userId = requestBody.userId;

  // console.log("bucketName", bucketName);
  // console.log("base64String", base64String);
  // console.log("userId", userId);
  // console.log("fileExtension", fileExtension);

  // validate file extension
  if (fileExtension !== "pdf") {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid file type. Only .pdf is supported.",
      }),
    };
  }

  const buffer = Buffer.from(base64String, "base64");
  const fileName = `${userId}.${fileExtension}`;

  const uploadParams = {
    Bucket: bucketName,
    Key: fileName,
    Body: buffer,
    ContentType: "application/pdf",
    ContentDisposition: "inline",
  };

  const pathToInvalidate = `/${fileName}`; // Invalidates a specific file. Use "/*" to invalidate everything.

  const invalidationParams = {
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `${new Date().getTime()}`, // unique string required for each invalidation
      Paths: {
        Quantity: 1,
        Items: [pathToInvalidate],
      },
    },
  };

  try {
    const result = await s3Client.send(new PutObjectCommand(uploadParams));
    console.log("Successfully Uploaded", result);
    try {
      await cloudFront.send(new CreateInvalidationCommand(invalidationParams));
      console.log("Cache invalidated for", pathToInvalidate);
    } catch (error) {
      console.error("Error invalidating cache:", error);
    }
    return {
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "File uploaded successfully",
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Error occurred while trying to upload file",
      }),
    };
  }
};
