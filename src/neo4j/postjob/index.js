import { driver } from "./neo4jClient.js";

exports.handler = async function (event) {
  const data = JSON.parse(event.body);

  console.log("request:", JSON.stringify(event, undefined, 2));
  console.log("event data:", data);

  const createJobQuery = `
  CREATE (job:Job {
    jobId: $jobId,
    jobTitle: $restData.jobTitle,
    baseExp: $restData.baseExp,
    highExp: $restData.highExp,
    baseSalary: $restData.baseSalary,
    highSalary: $restData.highSalary,
    date: datetime($restData.date),
    description: $restData.description,
    created_at: datetime(),
    updated_at: datetime()
  })
  WITH job
  FOREACH (skillValue IN $skills |
    MERGE (skill:Skill {name: skillValue})
    MERGE (job)-[:REQUIRES_SKILL]->(skill)
  )
  WITH job
  MERGE (expUnit:Unit {name: $experienceUnit, type: "experience"})
  MERGE (job)-[:HAS_UNIT]->(expUnit)
  WITH job
  MERGE (salUnit:Unit {name: $salaryUnit, type: "salary"})
  MERGE (job)-[:HAS_UNIT]->(salUnit)
  WITH job
  UNWIND $locations as locationEntry
  MERGE (city:City {name: locationEntry.city})
  MERGE (country:Country {name: locationEntry.country})
  MERGE (city)-[:IN_COUNTRY]->(country)
  MERGE (job)-[:IN_CITY]->(city)
  MERGE (com:Company {name: $company})
  MERGE (job)-[:AT_COMPANY]->(com)
  WITH job
  MATCH (user:User {userId: $userid})
  CREATE (user)-[:POSTED_JOB]->(job)
  RETURN job;
`;

  const session = driver.session({ database: "neo4j" });

  try {
    const writeResult = await session.executeWrite((tx) =>
      tx.run(createJobQuery, {
        restData: data.restData,
        skills: data.skills,
        experienceUnit: data.experienceUnit,
        salaryUnit: data.salaryUnit,
        locations: data.locations,
        company: data.company,
        userid: data.userid,
        jobId: data.jobId,
      })
    );
    console.log(`Write result:`, writeResult);
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify("Job data inserted successfully."),
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
      body: JSON.stringify(`Error inserting data: ${error}`),
    };
  } finally {
    await session.close();
  }
};
