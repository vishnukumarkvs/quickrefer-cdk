import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config();

export class MyLambdas extends Construct {
  public readonly neo4jLambdaForPostjob: NodejsFunction;
  public readonly neo4jLambdaForTesting: NodejsFunction;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.neo4jLambdaForPostjob = this.createNeo4jLambdaForPostJob();
    this.neo4jLambdaForTesting = this.createNeo4jLambdaForTesting();
  }

  private createNeo4jLambdaForPostJob(): NodejsFunction {
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-sdk"],
      },
      environment: {
        URI: process.env.NEO4J_URI as string,
        USERNAME: process.env.NEO4J_USERNAME as string,
        PASSWORD: process.env.NEO4J_PASSWORD as string,
      },
      runtime: Runtime.NODEJS_18_X,
    };

    const neo4jLambda = new NodejsFunction(this, "neo4jLambdaForPostjob", {
      entry: join(__dirname, "..", "src", "neo4j", "postjob", "index.js"),
      ...nodeJsFunctionProps,
    });

    return neo4jLambda;
  }

  private createNeo4jLambdaForTesting(): NodejsFunction {
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-sdk"],
      },
      environment: {
        URI: process.env.NEO4J_URI as string,
        USERNAME: process.env.NEO4J_USERNAME as string,
        PASSWORD: process.env.NEO4J_PASSWORD as string,
      },
      runtime: Runtime.NODEJS_18_X,
    };

    const neo4jLambda = new NodejsFunction(this, "neo4jLambdaForTesting", {
      entry: join(__dirname, "..", "src", "neo4j", "test", "index.js"),
      ...nodeJsFunctionProps,
    });

    return neo4jLambda;
  }
}
