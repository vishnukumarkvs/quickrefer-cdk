import ddbClient from "./ddbClient";
import { QueryCommand } from "@aws-sdk/client-dynamodb";

exports.handler = async (event) => {
  const userId = event.queryStringParameters.userId;

  if (!userId) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
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
      Select: "SPECIFIC_ATTRIBUTES",
      ProjectionExpression: "seenCount",
    };

    const queryResult = await ddbClient.send(new QueryCommand(params));
    console.log("Queried data", queryResult);

    let sumSeenCount = 0;
    if (queryResult.Items) {
      sumSeenCount = queryResult.Items.reduce(
        (sum, item) => sum + (Number(item.seenCount?.N) || 0),
        0
      );
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sumSeenCount }),
    };
  } catch (error) {
    console.error("Error:", JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Internal server error",
      }),
    };
  }
};
