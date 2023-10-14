import { SNSClient } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({
  region: process.env.REGION,
});

export default snsClient;
