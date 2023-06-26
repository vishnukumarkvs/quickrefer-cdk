import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import * as dotenv from "dotenv";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Duration } from "aws-cdk-lib";

dotenv.config();

interface MyLambdaProps {
  utilsTable: ITable;
}

export class MyLambdas extends Construct {
  public readonly neo4jLambdaForPostjob: NodejsFunction;
  public readonly neo4jLambdaForSearchByParameter: NodejsFunction;
  public readonly neo4jLambdaForUpdateCompanies: NodejsFunction;

  constructor(scope: Construct, id: string, props: MyLambdaProps) {
    super(scope, id);

    this.neo4jLambdaForPostjob = this.createNeo4jLambdaForPostJob();
    this.neo4jLambdaForSearchByParameter =
      this.createNeo4jLambdaForSearchByParameter();
    // No API Gateway for this lambda
    this.neo4jLambdaForUpdateCompanies =
      this.createNeo4jLambdaForUpdateCompanies(props.utilsTable);
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
      timeout: Duration.seconds(15),
    };

    const neo4jLambda = new NodejsFunction(this, "neo4jLambdaForPostjob", {
      entry: join(__dirname, "..", "src", "neo4j", "postjob", "index.js"),
      ...nodeJsFunctionProps,
    });

    return neo4jLambda;
  }

  private createNeo4jLambdaForSearchByParameter(): NodejsFunction {
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
      timeout: Duration.seconds(15),
    };

    const neo4jLambda = new NodejsFunction(
      this,
      "neo4jLambdaForSearchByParameter",
      {
        entry: join(
          __dirname,
          "..",
          "src",
          "neo4j",
          "searchByParameter",
          "index.js"
        ),
        ...nodeJsFunctionProps,
      }
    );
    return neo4jLambda;
  }

  // No API Gateway for this lambda
  private createNeo4jLambdaForUpdateCompanies(
    utilsTable: ITable
  ): NodejsFunction {
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

    const neo4jLambda = new NodejsFunction(
      this,
      "neo4jLambdaForUpdateCompanies",
      {
        entry: join(
          __dirname,
          "..",
          "src",
          "neo4j",
          "updateCompanies",
          "index.js"
        ),
        ...nodeJsFunctionProps,
      }
    );

    utilsTable.grantWriteData(neo4jLambda);
    return neo4jLambda;
  }
}
