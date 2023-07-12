# referralssubmit

```
import { driver } from "./neo4jClient.js";
import { PublishCommand } from "@aws-sdk/client-sns";
import snsClient from "./snsClient.js";

exports.handler = async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));
  const data = JSON.parse(event.body);
  console.log("event data:", data);

  const getAllReferrersQuery = `
  MATCH (u:User)-[:WORKS_AT]->(:Company {name: $company})
  WHERE u.isJobReferrer = true
  WITH u.userId AS userId, CASE WHEN u.jobReferralScore > 0 THEN 0 ELSE 1 END as orderField
  ORDER BY orderField, rand()
  WITH collect(userId)[..5] AS userIds
  UNWIND userIds AS userId
  MATCH (referrer:User {userId: userId}), (targetUser:User {userId: $targetUserId})
  MERGE (referrer)-[:IS_GOING_TO_REFFER]->(targetUser)
  WITH userId
  RETURN collect(userId) AS referredUserIds
`;

  const session = driver.session({ database: "neo4j" });

  try {
    const getResult = await session.executeRead((tx) =>
      tx.run(getAllReferrersQuery, {
        company: data.company,
        targetUserId: data.targetUserId,
      })
    );

    console.log(`Write result:`, getResult);
    console.log(`Write 1:`, getResult.records[0]._fields[0]);
    const userList = getResult.records[0]._fields[0];
    console.log(`Write 2:`, userList);
    console.log(typeof userList);
    console.log(userList[0]);

    const promises = userList.rows.map((user) => {
      // Create the parameters for publishing a message
      const params = {
        Message: data.url,
        TopicArn: `arn:aws:sns:us-east-1:895656015678:Referrals`,
        MessageAttributes: {
          user_id: {
            DataType: "String",
            StringValue: user,
          },
        },
      };

      // Create a command object for publishing a message
      const command = new PublishCommand(params);

      // Return a promise for sending the command
      return snsClient.send(command);
    });

    await Promise.all(promises);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify("URL has been sent to the users!"),
    };
  } catch (error) {
    console.error(`Something went wrong: ${error}`);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(`Error fetching data: ${error}`),
    };
  } finally {
    await session.close();
  }
};

```
