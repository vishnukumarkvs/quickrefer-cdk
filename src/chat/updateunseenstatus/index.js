import ddbClient from "./ddbClient";
import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";

exports.handler = async (event) => {
  const body = JSON.parse(event.body);

  const { receiverId, chatId } = body;

  console.log("receiverId", receiverId);
  console.log("chatId", chatId);

  if (!chatId && !receiverId) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "chatId and receiverId is required" }),
    };
  }

  try {
    const resetParams = {
      TableName: process.env.CHAT_SUMMARY,
      Key: {
        userId: { S: receiverId },
        chatId: { S: chatId },
      },
      UpdateExpression: "SET seenCount = :zero",
      ExpressionAttributeValues: {
        ":zero": { N: "0" },
      },
    };
    await ddbClient.send(new UpdateItemCommand(resetParams));
    console.log("Reset to zero done");
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Reset to zero done" }),
    };
  } catch (error) {
    console.error(
      "Reset unseen to zero unsuccessful. Error:",
      JSON.stringify(error, null, 2)
    );
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Reset unseen to zero unsuccessful. Error",
      }),
    };
  }
};
