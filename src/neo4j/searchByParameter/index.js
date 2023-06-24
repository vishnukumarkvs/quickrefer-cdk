import { driver } from "./neo4jClient.js";

// https://your-api-endpoint?jobTitle=someTitle&companyName=someName&skillValue=someSkill

exports.handler = async function (event) {
  const data = event.queryStringParameters;

  console.log("request:", JSON.stringify(event, undefined, 2));
  console.log("event data:", data);

  const searchQuery = `
  MATCH (job:Job)
  OPTIONAL MATCH (job)-[:REQUIRES_SKILL]->(skill:Skill)
  OPTIONAL MATCH (job)-[:AT_COMPANY]->(company:Company)
  MATCH (u:User)-[:POSTED_JOB]->(job)
  WITH job, u, collect(skill.value) as skills, company
  WITH job, u, skills,
  CASE WHEN coalesce($jobTitle, "") = "" OR job.jobTitle = $jobTitle THEN 1 ELSE 0 END as jobTitleScore, 
      CASE WHEN coalesce($skillValue, "") = "" OR $skillValue IN skills THEN 1 ELSE 0 END as skillScore, 
      CASE WHEN coalesce($companyName, "") = "" OR company.name = $companyName THEN 1 ELSE 0 END as companyScore
  WITH job, u, skills, jobTitleScore + skillScore + companyScore as score
  MATCH (job)-[:IN_CITY]->(c:City)
  MATCH (job)-[:AT_COMPANY]->(cp:Company)
  WITH job, u, score, COLLECT(DISTINCT c.name) AS eligibleLocations, skills, cp
  RETURN job, u, eligibleLocations, skills, score, cp.name AS company
  ORDER BY score DESC
  LIMIT 100
`;

  const session = driver.session({ database: "neo4j" });

  try {
    const getResult = await session.executeRead((tx) =>
      tx.run(searchQuery, {
        jobTitle: data.jobTitle,
        companyName: data.companyName,
        skillValue: data.skillValue,
      })
    );
    console.log(`Write result:`, getResult);
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        getResult.records.map((record) => record.toObject()) || []
      ),
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
