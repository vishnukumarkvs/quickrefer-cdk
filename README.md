# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

MATCH p=(j:Job)-[:REQUIRES_SKILL]->() WHERE j.jobTitle="Tokito Engineer" RETURN p LIMIT 25; -> returns record for every skill
MATCH p=()-[:POSTED_JOB]->(j:Job) Where j.jobTitle="ddb developer" RETURN p LIMIT 25;

Returns only list of skills for job
MATCH (j:Job)-[:REQUIRES_SKILL]->(s:Skill)
WHERE j.jobTitle = "Tokito Engineer"
RETURN COLLECT(s.value) AS requiredSkills
LIMIT 1;

Returns id, email, username of poster
MATCH (u:User)-[:POSTED_JOB]->(j:Job)
WHERE j.jobTitle = "ddb developer"
RETURN DISTINCT u.id, u.email, u.username
LIMIT 1;

returns nodes
MATCH p=(j:Job)-[:IN_CITY]->() WHERE j.jobTitle="Tokito Engineer" RETURN p LIMIT 25;
array?
MATCH (j:Job)-[:IN_CITY]->(c:City)
WHERE j.jobTitle = "Tokito Engineer"
RETURN COLLECT(c.name) AS eligibleLocations
LIMIT 1;

almost final 1

```
CALL apoc.cypher.run('
MATCH (job:Job)
OPTIONAL MATCH (job)-[:REQUIRES_SKILL]->(skill:Skill)
OPTIONAL MATCH (job)-[:AT_COMPANY]->(company:Company)
WHERE (coalesce($jobTitle, "") = "" OR job.jobTitle = $jobTitle)
AND (coalesce($skillValue, "") = "" OR skill.value = $skillValue)
AND (coalesce($companyName, "") = "" OR company.name = $companyName)
MATCH (u:User)-[:POSTED_JOB]->(job)
MATCH (j:Job)-[:IN_CITY]->(c:City)
MATCH (j:Job)-[:REQUIRES_SKILL]->(s:Skill)
RETURN job, u,COLLECT(c.name) AS eligibleLocations, COLLECT(s.value) AS requiredSkills
', {jobTitle: "", skillValue: "python", companyName: ""}) YIELD value RETURN value
```

almost final 2

```
CALL apoc.cypher.run('
MATCH (job:Job)
OPTIONAL MATCH (job)-[:REQUIRES_SKILL]->(skill:Skill)
OPTIONAL MATCH (job)-[:AT_COMPANY]->(company:Company)
WHERE (coalesce($jobTitle, "") = "" OR job.jobTitle = $jobTitle)
AND (coalesce($skillValue, "") = "" OR skill.value = $skillValue)
AND (coalesce($companyName, "") = "" OR company.name = $companyName)
MATCH (u:User)-[:POSTED_JOB]->(job)
WITH job, u
MATCH (job)-[:IN_CITY]->(c:City)
WITH job, u, COLLECT(DISTINCT c.name) AS eligibleLocations
MATCH (job)-[:REQUIRES_SKILL]->(s:Skill)
RETURN job, u, eligibleLocations, COLLECT(DISTINCT s.value) AS requiredSkills
', {jobTitle: "", skillValue: "python", companyName: ""}) YIELD value RETURN value
```

almost final 3

```
CALL apoc.cypher.run('
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
WITH job, u, score, COLLECT(DISTINCT c.name) AS eligibleLocations, skills
RETURN job, u, eligibleLocations, skills, score
ORDER BY score DESC
', {jobTitle: "", skillValue: "python", companyName: ""}) YIELD value RETURN value
LIMIT 3

```

added company fetching
CALL apoc.cypher.run('
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
', {jobTitle: "", skillValue: "python", companyName: ""}) YIELD value RETURN value
LIMIT 3
