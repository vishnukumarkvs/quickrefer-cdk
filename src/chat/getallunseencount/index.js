import ddbClient from "./ddbClient";
import { QueryCommand } from "@aws-sdk/client-dynamodb";

exports.handler = async (event) => {
  const userId = event.queryStringParameters.userId;

  if (!userId) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "userId is required" }),
    };
  }

  try {
    const params = {
      TableName: process.env.CHAT_SUMMARY,
      KeyConditionExpression: "userId = :userIdValue",
      ExpressionAttributeValues: {
        ":userIdValue": { S: userId },
      },
      Select: "SUM",
      ProjectionExpression: "seenCount",
    };
    const queryResult = await ddbClient.send(new QueryCommand(params));
    console.log("Queried data", queryResult);
    const sumSeenCount = queryResult.Items[0]?.seenCount?.N || 0;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sumSeenCount }),
    };
  } catch (error) {
    console.error("Error:", JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Interna; server error",
      }),
    };
  }
};
