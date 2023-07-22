import { driver } from "./neo4jClient.js";

exports.handler = async (event) => {
  const session = driver.session({ database: "neo4j" });

  const jobData = JSON.parse(event.job_data);

  try {
    // Error handling for mandatory fields
    if (!jobData["Job Poster"] || jobData["Job Poster"].trim() === "") {
      throw new Error("Job Poster must not be null or empty string");
    }
    if (!jobData["Job Title"] || jobData["Job Title"].trim() === "") {
      throw new Error("Job Title must not be null or empty string");
    }

    // Data normalization for optional fields
    const jobDescription =
      jobData["Job Description"] && jobData["Job Description"].trim() !== ""
        ? jobData["Job Description"]
        : "No data available";
    const jobLocation =
      jobData["Job Location"] && jobData["Job Location"].trim() !== ""
        ? jobData["Job Location"]
        : "Not provided";
    const skills = jobData["Technical Skills"]
      ? jobData["Technical Skills"].split(",").map((skill) => skill.trim())
      : [];

    const result = await session.run(
      `
            CREATE (n:Job {jobPoster: $jobPoster, jobTitle: $jobTitle, jobDescription: $jobDescription, jobLocation: $jobLocation, jobUrl: $url}) 
            WITH n
            UNWIND $skills AS skill
            MERGE (s:Skill {name: skill})
            MERGE (n)-[:REQUIRES_SKILL]->(s)
            RETURN n
            `,
      {
        jobPoster: jobData["Job Poster"],
        jobTitle: jobData["Job Title"],
        jobDescription: jobDescription,
        jobLocation: jobLocation,
        skills: skills,
        url: jobData["Job Url"],
      }
    );

    const singleRecord = result.records[0];
    const node = singleRecord.get(0);

    console.log(node.properties);

    await session.close();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Job node created and mapped to skills in Neo4j successfully.",
      }),
    };
  } catch (error) {
    console.error("Error processing data or creating node in Neo4j", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing data or creating node in Neo4j",
        error: error.message,
      }),
    };
  } finally {
    await driver.close();
  }
};
